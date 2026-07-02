# Usage Guide

Base URL: your deployment (e.g. `https://api.yourdomain.com`) or the RapidAPI proxy URL.
Auth: `X-API-Key: <key>` header on every request (RapidAPI subscribers use RapidAPI's standard headers instead).

## 1. Search contract awards — `POST /v1/awards/search`

Find who won what. All filter fields are optional.

```bash
curl -s -X POST "$BASE/v1/awards/search" \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{
    "keywords": ["radar", "maintenance"],
    "naics_codes": ["336411"],
    "agency": "Department of Defense",
    "min_amount": 1000000,
    "start_date": "2024-10-01",
    "end_date": "2025-09-30",
    "sort": "Award Amount",
    "order": "desc",
    "limit": 25,
    "page": 1
  }'
```

Response rows include `internal_id` — pass it to `GET /v1/awards/{internal_id}` for the complete federal record (officers, place of performance, executive compensation, transaction history).

Python:

```python
import httpx

r = httpx.post(
    f"{BASE}/v1/awards/search",
    headers={"X-API-Key": KEY},
    json={"recipient_search_text": "Lockheed", "limit": 10},
)
for a in r.json()["results"]:
    print(a["award_id"], a["recipient_name"], a["amount"])
```

## 2. Recompete Radar — `POST /v1/recompetes/search`

The signal endpoint: contracts ending inside your window are likely to be re-solicited, so business development teams can position **before** the RFP drops.

```bash
curl -s -X POST "$BASE/v1/recompetes/search" \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{
    "months_ahead": 12,
    "naics_codes": ["541512"],
    "agency": "Department of Defense",
    "min_amount": 5000000,
    "limit": 50
  }'
```

Each result adds `months_until_expiry` and `recompete_score` (0–100; larger contracts expiring sooner rank higher). Results are sorted by score. Responses are cached ~6 h — expiry windows don't move fast.

JavaScript:

```js
const res = await fetch(`${BASE}/v1/recompetes/search`, {
  method: "POST",
  headers: { "X-API-Key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ months_ahead: 6, min_amount: 10_000_000 }),
});
const { results } = await res.json();
console.table(results.map(r => ({
  id: r.award_id, vendor: r.recipient_name,
  ends: r.end_date, score: r.recompete_score,
})));
```

## 3. Spending analytics — `POST /v1/analytics/spending`

Market sizing in one call. `dimension` is one of `naics`, `psc`, `awarding_agency`, `recipient`.

```bash
# Top defense vendors in aircraft manufacturing, FY2025
curl -s -X POST "$BASE/v1/analytics/spending" \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d '{"dimension": "recipient", "naics_codes": ["336411"], "agency": "Department of Defense", "fiscal_year": 2025}'
```

## 4. Live opportunities — `GET /v1/opportunities/search`

Open solicitations straight from SAM.gov, normalized.

```bash
curl -s "$BASE/v1/opportunities/search?naics=336411&notice_type=o&days_back=30&limit=25" \
  -H "X-API-Key: $KEY"
```

Query params: `keywords`, `naics`, `notice_type` (`p` presolicitation, `o` solicitation, `k` combined synopsis, `r` sources sought, `s` special notice), `set_aside` (`SBA`, `8A`, `WOSB`, `SDVOSBC`…), `days_back`, `limit`, `offset`. Each row carries `ui_link` to the notice on sam.gov.

## Recipes

**"Alert me on expiring contracts in my niche"** — nightly cron: `POST /v1/recompetes/search` with your NAICS + `months_ahead: 18`; diff against yesterday's IDs; notify on new entrants.

**"Score an opportunity's incumbent"** — from an opportunity's NAICS + agency, `POST /v1/awards/search` with `recipient_search_text` of the suspected incumbent to gauge their footprint before bidding.

**"Market share dashboard"** — `POST /v1/analytics/spending` with `dimension: "recipient"` per fiscal year 2021–2025; plot the trend.

## Errors

| Status | Meaning |
|---|---|
| 401 | Missing/invalid `X-API-Key` |
| 422 | Invalid request body (details in response) |
| 429 | Per-minute rate limit hit — honor `Retry-After` |
| 502 | Upstream government API returned an error (body includes upstream detail) |
| 503 | Upstream rate-limited us, or SAM.gov key not configured on this deployment |

## Fair-use notes

Award data lags real-world signature by days–weeks (USAspending reporting cycles). Cache-friendly: identical queries within 15 min (6 h for recompetes) are served from cache and don't count against upstream capacity.
