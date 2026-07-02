---
title: How to Find Expiring US Federal Contracts Before the RFP Drops (Free API)
published: false
tags: api, python, govtech, showdev
canonical_url:
---

Every year the US government awards **$700B+ in contracts**. Most of them have a fixed end date — and when a contract ends, the work usually doesn't. It gets re-solicited. If you know a contract expires in 9 months, you know an RFP is coming before it's ever announced.

BD teams at large contractors pay **$300–1,000 per seat per month** for platforms that surface this signal (GovWin, HigherGov, GovTribe). I built an API that gives it to you in one call, with a free tier.

## The recompete signal, in one request

```bash
curl -X POST "https://federal-contract-intelligence.p.rapidapi.com/v1/recompetes/search" \
  -H "X-RapidAPI-Key: YOUR_KEY" \
  -H "X-RapidAPI-Host: federal-contract-intelligence.p.rapidapi.com" \
  -H "Content-Type: application/json" \
  -d '{
    "months_ahead": 12,
    "agency": "Department of Defense",
    "min_amount": 5000000,
    "limit": 10
  }'
```

Response — contracts ending within 12 months, ranked by a 0–100 score (bigger contracts expiring sooner rank higher):

```json
{
  "results": [
    {
      "award_id": "...",
      "recipient_name": "RAYTHEON COMPANY",
      "amount": 376900000.0,
      "end_date": "2027-06-15",
      "awarding_agency": "Department of Defense",
      "months_until_expiry": 11.4,
      "recompete_score": 38.8
    }
  ]
}
```

(That's a real row from today's data — a $377M Raytheon contract expiring in under a year.)

Each result tells you: who holds the work today, how big it is, and how long until it's up for grabs. That's your call list.

## Where the data comes from

Everything is built on official, public-domain US government sources — USAspending.gov for awards and SAM.gov for live solicitations. You could absolutely scrape these yourself. I did, and here's what you'd be signing up for: two different auth models, three date formats, inconsistent field vocabularies (`NAICS` is sometimes a string, sometimes an object), pagination that can't filter on period-of-performance end dates server-side, and daily rate caps. The API normalizes all of it and caches hot queries.

## What else it does

**Search $700B of awards** by keyword, NAICS, PSC, agency, vendor, or amount:

```python
import httpx

r = httpx.post(
    "https://federal-contract-intelligence.p.rapidapi.com/v1/awards/search",
    headers={"X-RapidAPI-Key": KEY, "X-RapidAPI-Host": "federal-contract-intelligence.p.rapidapi.com"},
    json={"recipient_search_text": "Lockheed", "min_amount": 100_000_000, "limit": 10},
)
for a in r.json()["results"]:
    print(a["award_id"], a["recipient_name"], f'${a["amount"]:,.0f}')
```

**Market sizing in one call** — total spending grouped by vendor, NAICS, PSC, or agency:

```python
r = httpx.post(
    ".../v1/analytics/spending",
    headers={...},  # same as above
    json={"dimension": "recipient", "naics_codes": ["336411"], "fiscal_year": 2025},
)
# -> top aircraft-manufacturing vendors by federal revenue, FY2025
```

**Live solicitations** from SAM.gov with set-aside and deadline fields, each linking to the official notice.

## Build ideas

- A nightly cron that diffs recompete results for your NAICS codes and emails new entries — a "deals expiring soon" alert your sales team will actually read
- A competitor dashboard: one vendor's award history + expiration timeline
- Market-entry analysis: which agencies buy what you sell, and from whom

## Try it

Free tier is 50 requests/month, no card required: **[Federal Contract Intelligence on RapidAPI](https://rapidapi.com/karan-WuSc97Oof/api/federal-contract-intelligence)**

The recompete output is a statistical signal (contracts get extended, re-scoped, or insourced), not a guarantee of re-solicitation. Data reflects USAspending reporting lags — typically days to a few weeks. Independent service; not affiliated with the US government.

Questions or feature requests — drop a comment. Subawards and state/local data are next on the roadmap.
