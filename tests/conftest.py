import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── Ensure project root is on path so 'backend' package resolves ──────────────
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# ── point settings at a safe test environment BEFORE importing the app ────────
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_aurora.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET", "test-secret-key-32chars-xxxxxxxxx")
os.environ.setdefault("GROQ_API_KEY", "gsk_test_placeholder")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_placeholder")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
os.environ.setdefault("STRIPE_PRICE_PRO_MONTHLY", "price_placeholder")
os.environ.setdefault("STRIPE_PRICE_ENTERPRISE_MONTHLY", "price_placeholder")
os.environ.setdefault("STRIPE_CUSTOMER_PORTAL_RETURN_URL", "http://localhost:5173/app/billing")
os.environ.setdefault("FRONTEND_ORIGIN", "http://localhost:5173")

from backend.app.main import app  # noqa: E402  (must be after env setup)
from backend.app.db import Base, get_db  # noqa: E402
from unittest.mock import AsyncMock, patch  # noqa: E402


# ── Mock Redis everywhere it's imported (patch at point of use) ────────────────
@pytest.fixture(autouse=True)
def mock_redis():
    """Disable Redis for all tests — rate limiting always allows, blacklist always clean."""
    with (
        patch("backend.app.routes_auth.rate_limit", new=AsyncMock(return_value=True)),
        patch("backend.app.routes_auth.is_token_blacklisted", new=AsyncMock(return_value=False)),
        patch("backend.app.routes_auth.blacklist_token", new=AsyncMock(return_value=None)),
    ):
        yield


# ── Build a test-only SQLite database ─────────────────────────────────────────
TEST_DB_URL = "sqlite:///./test_aurora.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    """Create all tables once per test session."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    """FastAPI TestClient with DB override."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    """Register a user with a unique email and return their auth tokens."""
    import uuid
    unique = uuid.uuid4().hex[:8]
    payload = {
        "org_name": f"Test Org {unique}",
        "email": f"test_{unique}@example.com",
        "password": "StrongPass123!",
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 200, res.json()
    return {"email": payload["email"], "password": payload["password"], **res.json()}


@pytest.fixture()
def auth_headers(registered_user):
    """Return authorization headers for the registered user."""
    return {"Authorization": f"Bearer {registered_user['access_token']}"}
