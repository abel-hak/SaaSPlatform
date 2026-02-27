from datetime import datetime
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from . import schemas
from .audit import log_audit_event
from .config import PlanName, get_plan_limits, get_settings
from .db import get_db
from .dependencies import get_current_org, get_current_user
from .models import Organization, StripeEvent, User


settings = get_settings()
stripe.api_key = settings.stripe_secret_key


router = APIRouter(prefix="/billing", tags=["billing"])


PLAN_PRICE_MAP: dict[PlanName, str] = {
    "pro": settings.stripe_price_pro_monthly,
    "enterprise": settings.stripe_price_enterprise_monthly,
    "free": "",
}


@router.post("/checkout-session", response_model=schemas.CheckoutSessionResponse)
def create_checkout_session(
    payload: schemas.CheckoutSessionRequest,
    request: Request,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    if payload.plan == "free":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Free plan does not require checkout")

    price_id = PLAN_PRICE_MAP[payload.plan]
    if not price_id:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Stripe price not configured")

    # Ensure customer exists
    customer_id = org.stripe_customer_id
    if not customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"org_id": str(org.id)},
        )
        customer_id = customer["id"]
        org.stripe_customer_id = customer_id
        db.commit()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.frontend_origin}/app/billing?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.frontend_origin}/app/billing",
        client_reference_id=str(org.id),
        metadata={"org_id": str(org.id), "target_plan": payload.plan},
    )

    log_audit_event(
        db,
        org.id,
        user.id,
        "plan_upgrade_initiated",
        {"target_plan": payload.plan, "session_id": session["id"]},
    )

    return schemas.CheckoutSessionResponse(url=session["url"])


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    payload = await request.body()
    if stripe_signature is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Stripe-Signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.stripe_webhook_secret,
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")

    # Idempotency check
    event_id = event["id"]
    existing = db.query(StripeEvent).filter(StripeEvent.id == event_id).first()
    if existing:
        return {"status": "ok"}
    db.add(StripeEvent(id=event_id))

    event_type = event["type"]

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        org_id = session.get("metadata", {}).get("org_id")
        target_plan = session.get("metadata", {}).get("target_plan")
        subscription_id = session.get("subscription")
        if org_id and target_plan and subscription_id:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if org:
                org.plan = target_plan
                org.stripe_subscription_id = subscription_id
                db.commit()
                log_audit_event(
                    db,
                    org.id,
                    None,
                    "plan_upgraded",
                    {"plan": target_plan, "subscription_id": subscription_id},
                )

    elif event_type == "customer.subscription.updated":
        sub = event["data"]["object"]
        subscription_id = sub["id"]
        status_ = sub["status"]
        items = sub["items"]["data"]
        price_id = items[0]["price"]["id"] if items else None
        org = db.query(Organization).filter(Organization.stripe_subscription_id == subscription_id).first()
        if org and price_id:
            new_plan: Optional[PlanName] = None
            for plan, pid in PLAN_PRICE_MAP.items():
                if pid == price_id:
                    new_plan = plan
                    break
            if new_plan:
                org.plan = new_plan
                db.commit()
                log_audit_event(
                    db,
                    org.id,
                    None,
                    "plan_changed",
                    {"plan": new_plan, "status": status_},
                )

    elif event_type == "customer.subscription.deleted":
        sub = event["data"]["object"]
        subscription_id = sub["id"]
        org = db.query(Organization).filter(Organization.stripe_subscription_id == subscription_id).first()
        if org:
            org.plan = "free"
            org.stripe_subscription_id = None
            db.commit()
            log_audit_event(
                db,
                org.id,
                None,
                "plan_downgraded",
                {"reason": "subscription_deleted"},
            )

    elif event_type == "invoice.payment_failed":
        invoice = event["data"]["object"]
        subscription_id = invoice.get("subscription")
        org = db.query(Organization).filter(Organization.stripe_subscription_id == subscription_id).first()
        if org:
            log_audit_event(
                db,
                org.id,
                None,
                "payment_failed",
                {"invoice_id": invoice.get("id")},
            )

    db.commit()
    return {"status": "ok"}


@router.get("/portal", response_model=schemas.BillingPortalResponse)
def billing_portal(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    if not org.stripe_customer_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No Stripe customer for organization")
    session = stripe.billing_portal.Session.create(
        customer=org.stripe_customer_id,
        return_url=settings.stripe_customer_portal_return_url,
    )
    return schemas.BillingPortalResponse(url=session["url"])

