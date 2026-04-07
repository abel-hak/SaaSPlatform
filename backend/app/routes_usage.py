from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from . import schemas
from .config import PlanName, get_plan_limits
from .db import get_db
from .dependencies import get_current_org, get_current_user, get_usage_for_org
from .models import AuditLog, Organization, User


router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("/", response_model=schemas.UsageResponse)
def get_usage(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
):
    usage = get_usage_for_org(db, org.id)
    plan: PlanName = org.plan  # type: ignore[assignment]
    limits = get_plan_limits(plan)

    ai_limit = limits["max_ai_queries"]
    doc_limit = limits["max_documents"]
    seat_limit = limits["max_users"]

    warnings: list[str] = []

    def maybe_warn(used: int, limit: int | None, label: str, unit: str) -> None:
        if limit is None or limit == 0:
            return
        ratio = used / limit
        if 0.8 <= ratio < 1.0:
            warnings.append(f"You've used {int(ratio * 100)}% of your {label} {unit} this month.")

    maybe_warn(usage.ai_queries_used, ai_limit, "AI query", "limit")
    maybe_warn(usage.documents_uploaded, doc_limit, "document upload", "limit")
    maybe_warn(usage.seats_used, seat_limit, "team seat", "limit")

    return schemas.UsageResponse(
        usage=schemas.UsageMetrics(
            period=usage.period,
            ai_queries_used=usage.ai_queries_used,
            ai_queries_limit=ai_limit,
            documents_uploaded=usage.documents_uploaded,
            documents_limit=doc_limit,
            seats_used=usage.seats_used,
            seats_limit=seat_limit,
            warnings=warnings,
        )
    )


@router.get("/analytics", response_model=schemas.AnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    date_col = func.date(AuditLog.created_at)

    query_rows = (
        db.query(date_col, func.count())
        .filter(
            AuditLog.org_id == org.id,
            AuditLog.action == "ai_query",
            AuditLog.created_at >= start_of_month,
        )
        .group_by(date_col)
        .all()
    )
    query_map = {str(row[0]): row[1] for row in query_rows}

    doc_rows = (
        db.query(date_col, func.count())
        .filter(
            AuditLog.org_id == org.id,
            AuditLog.action == "document_uploaded",
            AuditLog.created_at >= start_of_month,
        )
        .group_by(date_col)
        .all()
    )
    doc_map = {str(row[0]): row[1] for row in doc_rows}

    daily = []
    total_queries = 0
    total_documents = 0
    current = start_of_month
    while current <= now:
        d = current.strftime("%Y-%m-%d")
        q = query_map.get(d, 0)
        doc = doc_map.get(d, 0)
        daily.append(schemas.DailyUsagePoint(date=d, queries=q, documents=doc))
        total_queries += q
        total_documents += doc
        current += timedelta(days=1)

    return schemas.AnalyticsResponse(
        daily=daily,
        total_queries=total_queries,
        total_documents=total_documents,
    )

