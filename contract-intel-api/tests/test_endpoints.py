from datetime import date, timedelta

import respx
from httpx import Response

from tests.conftest import AUTH

USA = "https://api.usaspending.gov/api/v2"
SAM = "https://api.sam.gov"


def _award_row(**over):
    row = {
        "Award ID": "FA860118C0001",
        "Recipient Name": "ACME DEFENSE LLC",
        "Description": "RADAR MAINTENANCE",
        "Award Amount": 12_500_000.0,
        "Start Date": "2023-01-01",
        "End Date": "2027-01-01",
        "Awarding Agency": "Department of Defense",
        "Awarding Sub Agency": "Department of the Air Force",
        "NAICS": {"code": "336411", "description": "AIRCRAFT MFG"},
        "PSC": {"code": "1560", "description": "AIRFRAME COMPONENTS"},
        "generated_internal_id": "CONT_AWD_XYZ",
    }
    row.update(over)
    return row


@respx.mock
def test_award_search_normalizes(client):
    respx.post(f"{USA}/search/spending_by_award/").mock(
        return_value=Response(
            200,
            json={"results": [_award_row()], "page_metadata": {"hasNext": True}},
        )
    )
    r = client.post(
        "/v1/awards/search",
        json={"keywords": ["radar"], "agency": "Department of Defense", "limit": 10},
        headers=AUTH,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["has_next"] is True
    a = body["results"][0]
    assert a["award_id"] == "FA860118C0001"
    assert a["naics"] == "336411"
    assert a["psc"] == "1560"
    assert a["internal_id"] == "CONT_AWD_XYZ"


@respx.mock
def test_award_search_builds_correct_filters(client):
    route = respx.post(f"{USA}/search/spending_by_award/").mock(
        return_value=Response(200, json={"results": [], "page_metadata": {}})
    )
    client.post(
        "/v1/awards/search",
        json={
            "naics_codes": ["336411"],
            "min_amount": 1000000,
            "recipient_search_text": "ACME",
        },
        headers=AUTH,
    )
    import json
    sent = json.loads(route.calls[0].request.content)
    f = sent["filters"]
    assert f["award_type_codes"] == ["A", "B", "C", "D"]
    assert f["naics_codes"] == ["336411"]
    assert f["award_amounts"] == [{"lower_bound": 1000000.0}]
    assert f["recipient_search_text"] == ["ACME"]
    assert "time_period" in f


@respx.mock
def test_award_detail_passthrough(client):
    respx.get(f"{USA}/awards/CONT_AWD_XYZ/").mock(
        return_value=Response(200, json={"id": 1, "description": "detail"})
    )
    r = client.get("/v1/awards/CONT_AWD_XYZ", headers=AUTH)
    assert r.status_code == 200
    assert r.json()["description"] == "detail"


@respx.mock
def test_recompete_window_filtering_and_scoring(client):
    today = date.today()
    in_window_big = _award_row(
        **{"Award ID": "IN-BIG", "End Date": str(today + timedelta(days=90)), "Award Amount": 900_000_000.0}
    )
    in_window_small = _award_row(
        **{"Award ID": "IN-SMALL", "End Date": str(today + timedelta(days=300)), "Award Amount": 50_000.0}
    )
    beyond_window = _award_row(**{"Award ID": "FAR", "End Date": str(today + timedelta(days=4000))})
    already_ended = _award_row(**{"Award ID": "PAST", "End Date": str(today - timedelta(days=10))})

    respx.post(f"{USA}/search/spending_by_award/").mock(
        return_value=Response(
            200,
            json={
                # descending End Date order, as the API would return
                "results": [beyond_window, in_window_small, in_window_big, already_ended],
                "page_metadata": {"hasNext": False},
            },
        )
    )
    r = client.post("/v1/recompetes/search", json={"months_ahead": 12}, headers=AUTH)
    assert r.status_code == 200
    results = r.json()["results"]
    ids = [x["award_id"] for x in results]
    assert "FAR" not in ids and "PAST" not in ids
    assert set(ids) == {"IN-BIG", "IN-SMALL"}
    # big + sooner-expiring must rank first with a higher score
    assert ids[0] == "IN-BIG"
    assert results[0]["recompete_score"] > results[1]["recompete_score"]
    assert results[0]["months_until_expiry"] is not None


@respx.mock
def test_analytics_breakdown(client):
    respx.post(f"{USA}/search/spending_by_category/naics/").mock(
        return_value=Response(
            200,
            json={
                "results": [{"code": "336411", "name": "Aircraft Manufacturing", "amount": 5.5e10}],
                "page_metadata": {"hasNext": False},
            },
        )
    )
    r = client.post(
        "/v1/analytics/spending",
        json={"dimension": "naics", "agency": "Department of Defense", "fiscal_year": 2025},
        headers=AUTH,
    )
    assert r.status_code == 200
    assert r.json()["results"][0]["code"] == "336411"


def test_analytics_rejects_bad_dimension(client):
    r = client.post("/v1/analytics/spending", json={"dimension": "zodiac_sign"}, headers=AUTH)
    assert r.status_code == 422


@respx.mock
def test_opportunities_search(client):
    respx.get(f"{SAM}/opportunities/v2/search").mock(
        return_value=Response(
            200,
            json={
                "totalRecords": 1,
                "opportunitiesData": [
                    {
                        "noticeId": "abc123",
                        "title": "Radar Sustainment",
                        "solicitationNumber": "FA8601-26-R-0001",
                        "fullParentPathName": "DEPT OF DEFENSE.DEPT OF THE AIR FORCE",
                        "type": "Solicitation",
                        "postedDate": "2026-06-20",
                        "responseDeadLine": "2026-07-20T17:00:00-04:00",
                        "naicsCode": "336411",
                        "typeOfSetAsideDescription": "Total Small Business Set-Aside",
                        "uiLink": "https://sam.gov/opp/abc123/view",
                    }
                ],
            },
        )
    )
    r = client.get("/v1/opportunities/search?naics=336411&days_back=30", headers=AUTH)
    assert r.status_code == 200
    o = r.json()["results"][0]
    assert o["notice_id"] == "abc123"
    assert o["set_aside"].startswith("Total Small Business")


@respx.mock
def test_upstream_5xx_maps_to_502(client):
    respx.post(f"{USA}/search/spending_by_award/").mock(return_value=Response(500, text="boom"))
    r = client.post("/v1/awards/search", json={}, headers=AUTH)
    assert r.status_code == 502


@respx.mock
def test_caching_avoids_second_upstream_call(client):
    route = respx.post(f"{USA}/search/spending_by_award/").mock(
        return_value=Response(200, json={"results": [], "page_metadata": {"hasNext": False}})
    )
    payload = {"keywords": ["cache-me"]}
    client.post("/v1/awards/search", json=payload, headers=AUTH)
    client.post("/v1/awards/search", json=payload, headers=AUTH)
    assert route.call_count == 1
