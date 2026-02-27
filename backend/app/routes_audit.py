from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from . import schemas
from .config import PlanName, get_plan_limits
from .db import get_db
from .dependencies import get_current_org, get_current_user, require_role
from .models import AuditLog, Organization, User


router = APIRouter(prefix="/audit-log", tags=["audit"])


@router.get("/", response_model=schemas.AuditLogListResponse, dependencies=[Depends(require_role("owner", "admin"))])
def list_audit_log(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
    action: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    plan: PlanName = org.plan  # type: ignore[assignment]
    limits = get_plan_limits(plan)
    if not limits["audit_log"]:
        raise HTTPException(status_code=403, detail="Audit log not available on current plan")

    q = db.query(AuditLog).filter(AuditLog.org_id == org.id)

    if action:
        q = q.filter(AuditLog.action == action)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if start:
        q = q.filter(AuditLog.created_at >= start)
    if end:
        q = q.filter(AuditLog.created_at <= end)

    total = q.with_entities(func.count()).scalar() or 0
    items = (
        q.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return schemas.AuditLogListResponse(items=items, total=total)

