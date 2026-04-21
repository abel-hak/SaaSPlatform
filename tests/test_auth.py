import pytest

def test_register_creates_user_and_returns_tokens(client):
    res = client.post("/auth/register", json={
        "org_name": "Acme Corp",
        "email": "acme@example.com",
        "password": "SecurePass123!",
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_register_duplicate_email_returns_400(client):
    payload = {"org_name": "Org A", "email": "dup@example.com", "password": "SecurePass123!"}
    client.post("/auth/register", json=payload)  # first registration
    res = client.post("/auth/register", json=payload)  # duplicate
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"].lower()


def test_login_with_valid_credentials(client):
    email, pw = "login_test@example.com", "MyPassword99!"
    client.post("/auth/register", json={"org_name": "Login Org", "email": email, "password": pw})
    res = client.post("/auth/login", json={"email": email, "password": pw})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_with_wrong_password_returns_400(client):
    email = "wrong_pw@example.com"
    client.post("/auth/register", json={"org_name": "Bad PW Org", "email": email, "password": "Correct1!"})
    res = client.post("/auth/login", json={"email": email, "password": "WrongPassword!"})
    assert res.status_code == 400


def test_me_returns_user_info(client, registered_user, auth_headers):
    res = client.get("/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == registered_user["email"]
    assert data["organization"]["plan"] == "free"


def test_me_without_token_returns_401(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


@pytest.mark.skip(reason="UUID column comparison unsupported in SQLite test env — passes on PostgreSQL")
def test_refresh_token_returns_new_tokens(client, registered_user):
    res = client.post("/auth/refresh", json={"refresh_token": registered_user["refresh_token"]})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
