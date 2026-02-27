from datetime import datetime, timedelta
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import schemas
from .audit import log_audit_event
from .db import get_db
from .dependencies import (
    enforce_plan_limits,
    get_current_org,
    get_current_user,
    get_usage_for_org,
    require_role,
)
from .models import Invite, Organization, Usage, User


router = APIRouter(prefix="/team", tags=["team"])


@router.get("/", response_model=schemas.MemberListResponse)
def list_members(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    members = (
        db.query(User)
        .filter(User.org_id == org.id)
        .order_by(User.created_at.asc())
        .all()
    )
    usage = get_usage_for_org(db, org.id)
    seats_limit = None
    if org.plan == "free":
        seats_limit = 1
    elif org.plan == "pro":
        seats_limit = 5
    return schemas.MemberListResponse(
        members=members,
        seats_used=usage.seats_used,
        seats_limit=seats_limit,
    )


@router.post("/invites", dependencies=[Depends(require_role("owner", "admin"))])
def invite_member(
    payload: schemas.InviteCreateRequest,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
):
    usage = get_usage_for_org(db, org.id)
    enforce_plan_limits(org, usage, kind="seats")

    existing = db.query(User).filter(User.org_id == org.id, User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already in organization")

    token = secrets.token_urlsafe(32)
    invite = Invite(
        org_id=org.id,
        email=payload.email,
        token=token,
        role=payload.role,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invite)
    db.commit()

    log_audit_event(
        db,
        org.id,
        current_user.id,
        "member_invited",
        {"email": payload.email, "role": payload.role},
    )

    # In production, send invite email including token.
    return {"status": "ok"}


@router.post("/invites/accept")
def accept_invite(payload: schemas.InviteAcceptRequest, db: Session = Depends(get_db)):
    invite = db.query(Invite).filter(Invite.token == payload.token).first()
    if not invite or invite.expires_at < datetime.utcnow() or invite.accepted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired invite")

    org = db.query(Organization).filter(Organization.id == invite.org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization not found")

    from .security import get_password_hash, create_access_token, create_refresh_token
    from .dependencies import get_current_period

    existing = db.query(User).filter(User.org_id == org.id, User.email == invite.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already joined")

    user = User(
        org_id=org.id,
        email=invite.email,
        password_hash=get_password_hash(payload.password),
        role=invite.role,
        is_verified=True,
        last_login=datetime.utcnow(),
    )
    db.add(user)

    period = get_current_period()
    usage = db.query(Usage).filter(Usage.org_id == org.id, Usage.period == period).first()
    if not usage:
        usage = Usage(org_id=org.id, period=period, ai_queries_used=0, documents_uploaded=0, seats_used=0)
        db.add(usage)
        db.flush()
    usage.seats_used += 1

    invite.accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(user)

    log_audit_event(db, org.id, user.id, "member_invited", {"email": invite.email, "accepted": True})

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    return schemas.TokenPair(access_token=access, refresh_token=refresh)


@router.patch(
    "/members/{member_id}/role",
    dependencies=[Depends(require_role("owner", "admin"))],
)
def update_member_role(
    member_id: str,
    payload: schemas.MemberRoleUpdateRequest,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
):
    if current_user.id == member_id and current_user.role == "owner" and payload.role != "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot demote self")

    member = db.query(User).filter(User.id == member_id, User.org_id == org.id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    member.role = payload.role
    db.commit()

    log_audit_event(
        db,
        org.id,
        current_user.id,
        "role_changed",
        {"member_id": str(member.id), "new_role": payload.role},
    )
    return {"status": "ok"}


@router.delete(
    "/members/{member_id}",
    dependencies=[Depends(require_role("owner", "admin"))],
)
def remove_member(
    member_id: str,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    current_user: User = Depends(get_current_user),
):
    if str(current_user.id) == member_id and current_user.role == "owner":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owner cannot remove self")
    member = db.query(User).filter(User.id == member_id, User.org_id == org.id).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    db.delete(member)

    from .dependencies import get_current_period
    from .models import Usage

    period = get_current_period()
    usage = db.query(Usage).filter(Usage.org_id == org.id, Usage.period == period).first()
    if usage and usage.seats_used > 0:
        usage.seats_used -= 1

    db.commit()

    log_audit_event(
        db,
        org.id,
        current_user.id,
        "member_removed",
        {"member_id": member_id},
    )
    return {"status": "ok"}

