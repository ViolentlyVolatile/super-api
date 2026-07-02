# Federal Contract Intelligence API

Search **$700B+/year** of US federal contracting activity through one clean JSON API — award history, live solicitations, spending analytics, and the flagship **Recompete Radar** that surfaces contracts expiring soon, *before* the RFP drops. All data is normalized from USAspending.gov and SAM.gov (public-domain US government data).

Incumbent platforms (GovWin, HigherGov, GovTribe) sell this intelligence through dashboards at $300–1,000/seat/month. This delivers it to developers as an API.

## Who it's for

GovCon SaaS builders, BD teams automating pipeline discovery, market analysts sizing federal niches, and defense/industrial suppliers tracking incumbents.

## Quickstart

**1.** Subscribe to any plan (Basic is free — 50 calls/month) to get your `X-RapidAPI-Key`.

**2.** Call the flagship endpoint — defense IT contracts expiring in the next 12 months, scored by recompete priority:

```bash
curl -X POST \
  'https://federal-contract-intelligence.p.rapidapi.com/v1/recompetes/search' \
  -H 'X-RapidAPI-Key: YOUR_KEY' \
  -H 'X-RapidAPI-Host: federal-contract-intelligence.p.rapidapi.com' \
  -H 'Content-Type: application/json' \
  -d '{"months_ahead": 12, "naics_codes": ["541512"], "min_amount": 10000000, "limit": 50}'
```

**3.** Get back ranked, ready-to-use results:

```json
{
  "page": 1,
  "limit": 2,
  "has_next": false,
  "results": [
    {
      "award_id": "36C10B18N0003",
      "recipient_name": "ORACLE HEALTH GOVERNMENT SERVICES, INC.",
      "amount": 1496628663.21,
      "end_date": "2027-05-16",
      "awarding_agency": "Department of Veterans Affairs",
      "naics": "541512",
      "months_until_expiry": 10.4,
      "recompete_score": 65.3
    }
  ]
}
```

## Endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/v1/awards/search` | Prime contract awards — filter by keyword, NAICS, PSC, agency, vendor, amount, action-date window |
| GET | `/v1/awards/{internal_id}` | Full USAspending record for one award |
| POST | `/v1/recompetes/search` | **Recompete Radar** — contracts ending in your window (1–36 months), scored 0–100 |
| POST | `/v1/analytics/spending` | Spending grouped by NAICS, PSC, agency, or recipient — market sizing in one call |
| GET | `/v1/opportunities/search` | Live SAM.gov solicitations with set-aside and deadline fields |

Every request field is optional except where noted — send a minimal body to browse, or combine filters to narrow.

## Pagination

List endpoints return `{ page, limit, has_next, results }`. Increment `page` (or `offset` for `/v1/opportunities/search`) while `has_next` is `true`.

## Common recipes

- **Alert on expiring contracts in your niche** — nightly `POST /v1/recompetes/search` with your NAICS + `months_ahead: 18`; diff against yesterday's IDs; notify on new entrants.
- **Score an opportunity's incumbent** — from an opportunity's NAICS + agency, `POST /v1/awards/search` with `recipient_search_text` to gauge the incumbent's footprint before bidding.
- **Market-share dashboard** — `POST /v1/analytics/spending` with `dimension: "recipient"` per fiscal year; plot the trend.

## Errors

| Status | Meaning |
|---|---|
| 401 | Missing/invalid key |
| 422 | Invalid request body (details in response) |
| 429 | Rate limit hit — honor `Retry-After` |
| 502 | Upstream government API error |
| 503 | Upstream rate-limited, or SAM.gov key not configured |

## Notes

Data is public-domain US government data. Independent service; not affiliated with the US government. Award data reflects USAspending reporting lags (days to weeks). Recompete output is a statistical signal, not a guarantee of re-solicitation.
