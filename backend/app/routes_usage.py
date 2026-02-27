from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from . import schemas
from .config import PlanName, get_plan_limits
from .db import get_db
from .dependencies import get_current_org, get_usage_for_org
from .models import Organization


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

