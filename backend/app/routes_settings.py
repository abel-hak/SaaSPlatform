from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from .audit import log_audit_event
from .db import get_db
from .dependencies import get_current_org, get_current_user, require_role
from .models import Organization, User
from .security import get_password_hash, verify_password


router = APIRouter(prefix="/settings", tags=["settings"])


class OrgUpdateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


@router.patch("/org", response_model=dict)
def update_org(
    payload: OrgUpdateRequest,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    org.name = payload.name
    db.commit()
    log_audit_event(db, org.id, user.id, "org_updated", {"name": payload.name})
    return {"status": "ok"}


@router.delete(
    "/org",
    status_code=204,
    dependencies=[Depends(require_role("owner"))],
)
def delete_org(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    org_id = org.id
    db.delete(org)
    db.commit()
    log_audit_event(db, org_id, user.id, "org_deleted", {})


@router.post("/profile/password", response_model=dict)
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    return {"status": "ok"}

