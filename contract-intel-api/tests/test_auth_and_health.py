from tests.conftest import AUTH


def test_health_needs_no_auth(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_missing_key_rejected(client):
    r = client.post("/v1/awards/search", json={})
    assert r.status_code == 401


def test_bad_key_rejected(client):
    r = client.post("/v1/awards/search", json={}, headers={"X-API-Key": "nope"})
    assert r.status_code == 401


def test_rapidapi_proxy_secret_accepted(client, respx_mock=None):
    import respx
    from httpx import Response

    with respx.mock(assert_all_called=False) as mock:
        mock.post("https://api.usaspending.gov/api/v2/search/spending_by_award/").mock(
            return_value=Response(200, json={"results": [], "page_metadata": {"hasNext": False}})
        )
        r = client.post(
            "/v1/awards/search",
            json={},
            headers={"X-RapidAPI-Proxy-Secret": "rapid-secret", "X-RapidAPI-User": "sub1"},
        )
    assert r.status_code == 200


def test_openapi_served(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    paths = r.json()["paths"]
    for p in [
        "/v1/awards/search",
        "/v1/awards/{internal_id}",
        "/v1/recompetes/search",
        "/v1/analytics/spending",
        "/v1/opportunities/search",
        "/health",
    ]:
        assert p in paths, f"missing {p}"
