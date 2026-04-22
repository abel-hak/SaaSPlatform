import os
import sentry_sdk
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .db import engine
from . import models  # noqa: F401
from .routes_auth import router as auth_router
from .routes_team import router as team_router
from .routes_usage import router as usage_router
from .routes_audit import router as audit_router
from .routes_documents import router as documents_router
from .routes_assistant import router as assistant_router
from .routes_billing import router as billing_router
from .routes_settings import router as settings_router
from .routes_apikeys import router as apikeys_router


settings = get_settings()

# ── Sentry ────────────────────────────────────────────────────────────────────
# Set SENTRY_DSN in .env to enable. Safe to leave unset in development.
_sentry_dsn = os.getenv("SENTRY_DSN", "")
if _sentry_dsn:
    sentry_sdk.init(
        dsn=_sentry_dsn,
        environment=settings.app_env,
        traces_sample_rate=0.1,   # 10% of requests traced for performance
        send_default_pii=False,    # don't send emails / passwords to Sentry
    )
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title=settings.app_name)

# CORS: in production only allow FRONTEND_ORIGIN; in dev also allow localhost
_cors_origins = [str(settings.frontend_origin)]
if settings.app_env == "development":
    _cors_origins += ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


@app.middleware("http")
async def security_and_state_middleware(request: Request, call_next):
    """
    1. Prepares request.state for auth dependencies.
    2. Injects security headers on every response.
    """
    request.state.user = None
    request.state.org = None
    response = await call_next(request)

    # Security headers (OWASP recommendations)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self';"
    )
    # Remove server fingerprinting header
    try:
        del response.headers["server"]
    except KeyError:
        pass
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = "HTTP_ERROR"
    if exc.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        code = "LIMIT_EXCEEDED"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": code},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    # Simple readiness check: ensure DB can be reached
    try:
        with engine.connect() as conn:
            conn.execute(models.Organization.__table__.select().limit(1))
    except Exception:
        raise HTTPException(status_code=503, detail="Database not ready")
    return {"status": "ready"}


app.include_router(auth_router)
app.include_router(team_router)
app.include_router(usage_router)
app.include_router(audit_router)
app.include_router(documents_router)
app.include_router(assistant_router)
app.include_router(billing_router)
app.include_router(settings_router)
app.include_router(apikeys_router)
