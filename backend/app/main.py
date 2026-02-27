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


settings = get_settings()

app = FastAPI(title=settings.app_name)

# Allow local dev origins explicitly to avoid CORS issues
cors_origins = {
    str(settings.frontend_origin),
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_org_rls_header(request: Request, call_next):
    """
    For each authenticated request, ensure that PostgreSQL current_setting('app.current_org_id')
    is set by the request handlers before executing RLS-protected queries.
    This middleware mainly prepares request.state for later use.
    """
    request.state.user = None
    request.state.org = None
    response = await call_next(request)
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

# Additional routers (organizations, billing, documents, assistant, audit, usage, etc.) are included elsewhere.

