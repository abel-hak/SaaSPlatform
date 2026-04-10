import hashlib
import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import schemas
from .audit import log_audit_event
from .db import get_db
from .dependencies import get_current_org, get_current_user, require_role
from .models import ApiKey, Organization, User


router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


@router.get("/", response_model=schemas.ApiKeyListResponse)
def list_api_keys(
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.org_id == org.id, ApiKey.revoked_at.is_(None))
        .order_by(ApiKey.created_at.desc())
        .all()
    )
    return schemas.ApiKeyListResponse(keys=keys)


@router.post(
    "/",
    response_model=schemas.ApiKeyCreatedResponse,
    status_code=201,
    dependencies=[Depends(require_role("owner", "admin"))],
)
def create_api_key(
    payload: schemas.ApiKeyCreateRequest,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    active_count = (
        db.query(ApiKey)
        .filter(ApiKey.org_id == org.id, ApiKey.revoked_at.is_(None))
        .count()
    )
    if active_count >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 active API keys per organization.",
        )

    raw_key = f"aurora_{secrets.token_urlsafe(32)}"
    prefix = raw_key[:12]

    key = ApiKey(
        org_id=org.id,
        created_by=user.id,
        name=payload.name,
        key_prefix=prefix,
        key_hash=_hash_key(raw_key),
    )
    db.add(key)
    db.commit()
    db.refresh(key)

    log_audit_event(db, org.id, user.id, "api_key_created", {"key_name": payload.name})

    return schemas.ApiKeyCreatedResponse(
        id=key.id,
        name=key.name,
        key=raw_key,
        key_prefix=prefix,
    )


@router.delete(
    "/{key_id}",
    status_code=204,
    dependencies=[Depends(require_role("owner", "admin"))],
)
def revoke_api_key(
    key_id: UUID,
    db: Session = Depends(get_db),
    org: Organization = Depends(get_current_org),
    user: User = Depends(get_current_user),
):
    key = (
        db.query(ApiKey)
        .filter(ApiKey.id == key_id, ApiKey.org_id == org.id, ApiKey.revoked_at.is_(None))
        .first()
    )
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")

    key.revoked_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(db, org.id, user.id, "api_key_revoked", {"key_name": key.name})
