from datetime import datetime, timedelta
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from . import schemas
from .audit import log_audit_event
from .config import PlanName
from .db import get_db
from .dependencies import get_current_org, get_current_user
from .models import Organization, PasswordResetToken, Usage, User
from .security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["auth"])


def _slugify(name: str) -> str:
    base = "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-")
    base = "-".join(filter(None, base.split("-")))
    return base or "org"


@router.post("/register", response_model=schemas.TokenPair, responses={400: {"model": schemas.ErrorResponse}})
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )

    slug_base = _slugify(payload.org_name)
    slug = slug_base
    idx = 1
    while db.query(Organization).filter(Organization.slug == slug).first():
        slug = f"{slug_base}-{idx}"
        idx += 1

    org = Organization(name=payload.org_name, slug=slug, plan="free")
    db.add(org)
    db.flush()

    user = User(
        org_id=org.id,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role="owner",
        is_verified=True,
        last_login=datetime.utcnow(),
    )
    db.add(user)

    usage = Usage(org_id=org.id, period=f"{datetime.utcnow().year:04d}-{datetime.utcnow().month:02d}", seats_used=1)
    db.add(usage)

    db.commit()
    db.refresh(user)

    log_audit_event(db, org.id, user.id, "login", {"method": "register"})

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    return schemas.TokenPair(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=schemas.TokenPair, responses={400: {"model": schemas.ErrorResponse}})
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    log_audit_event(db, org.id, user.id, "login", {"method": "password"})

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    return schemas.TokenPair(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=schemas.TokenPair, responses={401: {"model": schemas.ErrorResponse}})
def refresh(payload: schemas.RefreshRequest, db: Session = Depends(get_db)):
    from jose import JWTError, jwt

    from .config import get_settings

    settings = get_settings()

    try:
        decoded = jwt.decode(payload.refresh_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    sub = decoded.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(User).filter(User.id == sub).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    return schemas.TokenPair(access_token=access, refresh_token=refresh)


@router.post("/password/reset", responses={200: {"description": "Password reset email queued"}})
def password_reset_request(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Do not leak existence
        return {"status": "ok"}
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    reset = PasswordResetToken(user_id=user.id, token=token, expires_at=expires)
    db.add(reset)
    db.commit()
    # In real production, enqueue email job here.
    return {"status": "ok"}


@router.post("/password/reset/confirm", responses={400: {"model": schemas.ErrorResponse}})
def password_reset_confirm(payload: schemas.PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    reset = db.query(PasswordResetToken).filter(PasswordResetToken.token == payload.token).first()
    if not reset or reset.used_at or reset.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")
    user.password_hash = get_password_hash(payload.new_password)
    reset.used_at = datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@router.get("/me", response_model=schemas.MeResponse)
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return schemas.MeResponse(user=user, organization=org)

