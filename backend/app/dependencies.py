from typing import Annotated, Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from .config import PlanName, get_plan_limits
from .db import get_db
from .models import Organization, Usage, User
from .security import verify_token


CurrentUser = Annotated[User, Depends(lambda request: get_current_user(request))]
CurrentOrg = Annotated[Organization, Depends(lambda request: get_current_org(request))]


def _get_auth_header(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization.split(" ", 1)[1]


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = _get_auth_header(request.headers.get("Authorization"))
    try:
        payload = verify_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user_id = UUID(sub)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    request.state.user = user
    return user


def get_current_org(request: Request, db: Session = Depends(get_db)) -> Organization:
    user: User = getattr(request.state, "user", None)
    if not user:
        user = get_current_user(request, db)
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    request.state.org = org
    return org


def require_role(*roles: str):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency


def get_current_period() -> str:
    from datetime import datetime

    now = datetime.utcnow()
    return f"{now.year:04d}-{now.month:02d}"


def get_usage_for_org(db: Session, org_id: UUID, period: Optional[str] = None) -> Usage:
    if period is None:
        period = get_current_period()
    usage = db.query(Usage).filter(Usage.org_id == org_id, Usage.period == period).first()
    if not usage:
        usage = Usage(org_id=org_id, period=period, ai_queries_used=0, documents_uploaded=0, seats_used=0)
        db.add(usage)
        db.commit()
        db.refresh(usage)
    return usage


def enforce_plan_limits(
    org: Organization,
    usage: Usage,
    kind: str,
):
    """Raise HTTP 429 if limits are exceeded for kind: 'ai_queries', 'documents', or 'seats'."""
    plan: PlanName = org.plan  # type: ignore[assignment]
    limits = get_plan_limits(plan)
    if kind == "ai_queries":
        max_q = limits["max_ai_queries"]
        if max_q is not None and usage.ai_queries_used >= max_q:
            raise HTTPException(
                status_code=429,
                detail="AI query limit exceeded for current plan. Upgrade to continue.",
            )
    elif kind == "documents":
        max_docs = limits["max_documents"]
        if max_docs is not None and usage.documents_uploaded >= max_docs:
            raise HTTPException(
                status_code=429,
                detail="Document upload limit exceeded for current plan. Upgrade to continue.",
            )
    elif kind == "seats":
        max_users = limits["max_users"]
        if max_users is not None and usage.seats_used >= max_users:
            raise HTTPException(
                status_code=429,
                detail="Team seat limit reached for current plan. Upgrade to invite more members.",
            )

