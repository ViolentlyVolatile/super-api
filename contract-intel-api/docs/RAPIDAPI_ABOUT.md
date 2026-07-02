## Who it's for

GovCon SaaS builders, BD teams automating pipeline discovery, market analysts sizing federal niches, and defense/industrial suppliers tracking incumbents.

## What you get

One clean JSON API over **$700B+/year** of US federal contracting activity — normalized from USAspending.gov and SAM.gov so you don't have to.

| Endpoint | What it does |
|---|---|
| `POST /v1/awards/search` | Prime contract awards, filterable by keyword, NAICS, PSC, agency, vendor, amount, and action-date window |
| `GET /v1/awards/{internal_id}` | The full federal record for any award |
| `POST /v1/recompetes/search` | **Recompete Radar** — contracts ending in your window (1–36 months), each scored 0–100 so bigger, sooner-expiring contracts rank first |
| `POST /v1/analytics/spending` | Spending grouped by NAICS, PSC, agency, or recipient — market sizing in one call |
| `GET /v1/opportunities/search` | Live solicitations with set-aside and deadline fields, linked to the official SAM.gov notice |

## Quickstart

**1. Subscribe** to any plan (Basic is free — 50 calls/month) to get your `X-RapidAPI-Key`.

**2. Call the flagship endpoint** — find defense IT contracts expiring in the next 12 months, scored by recompete priority:

```bash
curl -X POST \
  'https://federal-contract-intelligence.p.rapidapi.com/v1/recompetes/search' \
  -H 'X-RapidAPI-Key: YOUR_KEY' \
  -H 'X-RapidAPI-Host: federal-contract-intelligence.p.rapidapi.com' \
  -H 'Content-Type: application/json' \
  -d '{"months_ahead": 12, "naics_codes": ["541512"], "min_amount": 10000000, "limit": 50}'
```

**3. Get back ranked, ready-to-use results:**

```json
{
  "page": 1,
  "limit": 2,
  "has_next": false,
  "results": [
    {
      "award_id": "36C10B18N0003",
      "internal_id": "CONT_AWD_36C10B18N0003_3600_36C10B18D5000_3600",
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

Every request field is optional except where noted — send an empty body to browse, or narrow with any combination of filters.

## Pagination

List endpoints return `{ page, limit, has_next, results }`. Increment `page` (or `offset` for `/v1/opportunities/search`) while `has_next` is `true`.

## Why not scrape it yourself?

Two upstream systems, different auth, pagination, date formats, and rate caps. We normalize all of it, cache hot queries, and maintain the recompete scan so you don't have to. Incumbent platforms (GovWin, HigherGov, GovTribe) sell this same intelligence through dashboards at $300–1,000/seat/month — this delivers it as an API.

## Notes

Data is public-domain US government data. Independent service; not affiliated with the US government. Award data reflects USAspending reporting lags (days to weeks). Recompete output is a statistical signal, not a guarantee of re-solicitation.
