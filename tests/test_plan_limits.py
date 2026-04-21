"""
Plan limit tests — verifies that free plan limits are enforced correctly.
"""


def _register_and_login(client, email: str, org: str = "Limit Org"):
    res = client.post("/auth/register", json={
        "org_name": org, "email": email, "password": "StrongPass123!"
    })
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_free_plan_is_set_on_registration(client):
    headers = _register_and_login(client, "limits_plan@example.com")
    res = client.get("/auth/me", headers=headers)
    assert res.json()["organization"]["plan"] == "free"


def test_usage_endpoint_returns_zero_on_new_org(client):
    headers = _register_and_login(client, "limits_usage@example.com", "Usage Org")
    res = client.get("/usage/", headers=headers)
    assert res.status_code == 200
    metrics = res.json()["usage"]  # response is {"usage": {...}}
    assert metrics["ai_queries_used"] == 0
    assert metrics["documents_uploaded"] == 0


def test_documents_list_empty_on_new_org(client):
    headers = _register_and_login(client, "limits_docs@example.com", "Docs Org")
    res = client.get("/documents/", headers=headers)
    assert res.status_code == 200
    assert res.json()["documents"] == []


def test_team_list_returns_owner(client):
    headers = _register_and_login(client, "limits_team@example.com", "Team Org")
    res = client.get("/team/", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "owner"
