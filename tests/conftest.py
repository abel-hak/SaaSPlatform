"""
Shared pytest fixtures for all backend tests.
Uses an in-memory SQLite DB so tests never touch the real Postgres instance.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# ── point settings at a safe test environment BEFORE importing the app ────────
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
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
    """Register a user and return their auth tokens + email."""
    payload = {
        "org_name": "Test Org",
        "email": "test@example.com",
        "password": "StrongPass123!",
    }
    res = client.post("/auth/register", json=payload)
    assert res.status_code == 200, res.json()
    return {"email": payload["email"], "password": payload["password"], **res.json()}


@pytest.fixture()
def auth_headers(registered_user):
    """Return authorization headers for the registered user."""
    return {"Authorization": f"Bearer {registered_user['access_token']}"}
