from datetime import datetime, timedelta, timezone
import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from . import schemas
from .audit import log_audit_event
from .config import PlanName, get_settings
from .db import get_db
from .dependencies import get_current_org, get_current_user
from .email_service import send_password_reset_email
from .models import Organization, PasswordResetToken, Usage, User
from .redis_client import blacklist_token, is_token_blacklisted, rate_limit
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
async def register(request: Request, payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # Rate-limit registrations per IP to prevent abuse (Security #6)
    client_ip = request.client.host if request.client else "unknown"
    if not await rate_limit(f"register:{client_ip}", limit=5, window_seconds=3600):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many registration attempts. Try again later.")

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

    now = datetime.now(timezone.utc)
    user = User(
        org_id=org.id,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role="owner",
        is_verified=True,
        last_login=now,
    )
    db.add(user)

    usage = Usage(org_id=org.id, period=f"{now.year:04d}-{now.month:02d}", seats_used=1)
    db.add(usage)

    db.commit()
    db.refresh(user)

    log_audit_event(db, org.id, user.id, "login", {"method": "register"})

    access = create_access_token(str(user.id))
    refresh = create_refresh_token(str(user.id))
    return schemas.TokenPair(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=schemas.TokenPair, responses={400: {"model": schemas.ErrorResponse}})
async def login(request: Request, payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    # Rate-limit login attempts per email to prevent brute-force (Security #6)
    if not await rate_limit(f"login:{payload.email}", limit=10, window_seconds=60):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many login attempts. Try again in a minute.")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password")
    user.last_login = datetime.now(timezone.utc)
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
async def refresh(payload: schemas.RefreshRequest, db: Session = Depends(get_db)):
    from jose import JWTError, jwt

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

    # Bug 10: Check if this refresh token has been revoked
    jti = decoded.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    user = db.query(User).filter(User.id == sub).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Blacklist the consumed refresh token (token rotation)
    if jti:
        import math
        exp = decoded.get("exp", 0)
        remaining = max(0, math.ceil(exp - datetime.now(timezone.utc).timestamp()))
        await blacklist_token(jti, remaining)

    access = create_access_token(str(user.id))
    new_refresh = create_refresh_token(str(user.id))
    return schemas.TokenPair(access_token=access, refresh_token=new_refresh)


@router.post("/logout", responses={200: {"description": "Logged out"}})
async def logout(payload: schemas.RefreshRequest):
    """Revoke the provided refresh token so it cannot be reused."""
    from jose import JWTError, jwt

    settings = get_settings()
    try:
        decoded = jwt.decode(
            payload.refresh_token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        jti = decoded.get("jti")
        if jti:
            import math
            exp = decoded.get("exp", 0)
            remaining = max(0, math.ceil(exp - datetime.now(timezone.utc).timestamp()))
            await blacklist_token(jti, remaining)
    except JWTError:
        pass  # Token already invalid — still OK to return 200
    return {"status": "ok"}


@router.post("/password/reset", responses={200: {"description": "Password reset email sent"}})
def password_reset_request(payload: schemas.PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Do not leak whether the email exists
        return {"status": "ok"}
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    reset = PasswordResetToken(user_id=user.id, token=token, expires_at=expires)
    db.add(reset)
    db.commit()

    # Bug 3 fix: actually deliver the reset link
    settings = get_settings()
    send_password_reset_email(
        email=user.email,
        token=token,
        frontend_origin=str(settings.frontend_origin),
    )
    return {"status": "ok"}


@router.post("/password/reset/confirm", responses={400: {"model": schemas.ErrorResponse}})
def password_reset_confirm(payload: schemas.PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    reset = db.query(PasswordResetToken).filter(PasswordResetToken.token == payload.token).first()
    now = datetime.now(timezone.utc)
    if not reset or reset.used_at or reset.expires_at.replace(tzinfo=timezone.utc) < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token")
    user = db.query(User).filter(User.id == reset.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")
    user.password_hash = get_password_hash(payload.new_password)
    reset.used_at = now
    db.commit()
    return {"status": "ok"}


@router.get("/me", response_model=schemas.MeResponse)
def me(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    org = db.query(Organization).filter(Organization.id == user.org_id).first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return schemas.MeResponse(user=user, organization=org)

