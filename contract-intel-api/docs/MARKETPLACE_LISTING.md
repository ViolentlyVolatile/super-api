# Marketplace Listing Copy (ready to paste)

## Name

**Federal Contract Intelligence — Awards, Opportunities & Recompete Radar**

## Tagline (≤80 chars)

Search $700B+/yr of US federal contracts. Know what's expiring before the RFP.

## Category

Data / Business / Government

## Short description

One JSON API over US federal contracting: search awards by keyword, NAICS, PSC, agency or vendor; pull live SAM.gov solicitations; group spending by market dimension; and — the killer feature — **Recompete Radar**, which surfaces contracts expiring in the next N months, scored and ranked, so you see tomorrow's bids today. Data sources are official (USAspending.gov, SAM.gov). Platforms sell this signal at $300–1,000/seat/month; here it's an API call.

## Long description

**Who it's for**

GovCon SaaS builders, BD teams automating pipeline discovery, market analysts sizing federal niches, and defense/industrial suppliers tracking incumbents and competitors.

**What you get**

- `POST /v1/awards/search` — prime contract awards, filterable by keywords, NAICS, PSC, awarding agency, vendor name, amount range, and date window; clean, stable JSON.
- `GET /v1/awards/{id}` — the full federal record for any award.
- `POST /v1/recompetes/search` — contracts whose period of performance ends within your window (1–36 months), each with `months_until_expiry` and a 0–100 `recompete_score` that ranks bigger, sooner-expiring contracts first.
- `POST /v1/analytics/spending` — spending totals grouped by NAICS, PSC, agency, or recipient, scoped by fiscal year. Market sizing in one call.
- `GET /v1/opportunities/search` — live solicitations, presolicitations, and sources-sought from SAM.gov with set-aside and deadline fields, each linking back to the official notice.

**Why this beats scraping it yourself**

The two upstream systems have different auth models, pagination styles, date formats, and field vocabularies, plus daily rate caps. We normalize all of it, cache hot queries, translate errors into sane HTTP semantics, and maintain the recompete scan logic so you don't have to.

**Reliability & provenance**

Data is public-domain US government data, refreshed from source on every cache miss (15 min TTL; 6 h for recompete scans). This service is independent and not affiliated with the US government. Award data reflects USAspending reporting lags; recompete output is a statistical signal, not a guarantee of re-solicitation.

## Example call

```bash
curl -X POST https://<host>/v1/recompetes/search \
  -H "X-API-Key: KEY" -H "Content-Type: application/json" \
  -d '{"months_ahead": 12, "agency": "Department of Defense", "min_amount": 5000000}'
```

## FAQ (for the listing)

**Where does the data come from?** USAspending.gov and SAM.gov — the US government's official spending and procurement systems.

**How fresh is it?** Live opportunities are near-real-time from SAM.gov. Award data follows federal reporting cycles (typically days to a few weeks behind signature).

**Can I resell outputs in my product?** Yes — underlying data is public domain; your subscription covers the service. Attribution appreciated, not required.

**Do you cover state/local contracts?** Not yet — federal prime contracts today; subawards and state/local are on the roadmap.
