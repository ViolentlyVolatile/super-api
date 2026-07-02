# Federal Contract Intelligence API

One clean JSON API over US federal contracting data: **award search, live solicitations, spending analytics, and Recompete Radar** (contracts expiring soon — i.e. predictable upcoming bids). Sources are USAspending.gov and SAM.gov — public-domain US government data, so there are no data licensing costs.

Incumbent platforms (GovWin, HigherGov, GovTribe) sell this intelligence at $300–1,000/seat/month through web dashboards. This product sells it to developers as an API.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| POST | `/v1/awards/search` | Search prime contract awards (keyword, NAICS, PSC, agency, vendor, amount, dates) |
| GET | `/v1/awards/{internal_id}` | Full detail for one award |
| POST | `/v1/recompetes/search` | **Recompete Radar** — contracts whose period of performance ends within N months, ranked by a 0–100 priority score |
| POST | `/v1/analytics/spending` | Spending totals grouped by NAICS / PSC / agency / recipient (market sizing, competitor analysis) |
| GET | `/v1/opportunities/search` | Live solicitations from SAM.gov (requires a free SAM.gov API key on the server) |
| GET | `/health` | Liveness probe, no auth |

Interactive docs are auto-served at `/docs` (Swagger) and `/redoc`; the machine-readable spec is [`openapi.json`](openapi.json).

## Quick start (local)

```bash
pip install -r requirements.txt
cp .env.example .env          # set FCI_API_KEYS, optionally FCI_SAM_API_KEY
uvicorn app.main:app --port 8080
curl -s -X POST localhost:8080/v1/awards/search \
  -H "X-API-Key: <your key>" -H "Content-Type: application/json" \
  -d '{"keywords":["radar"],"agency":"Department of Defense","limit":5}'
```

## Configuration

All via environment variables (prefix `FCI_`) — see [.env.example](.env.example). Key ones:

`FCI_API_KEYS` (comma-separated direct-customer keys) · `FCI_RAPIDAPI_PROXY_SECRET` (from the RapidAPI provider dashboard) · `FCI_SAM_API_KEY` (free from any sam.gov account; only needed for `/v1/opportunities/*`) · `FCI_RATE_LIMIT_PER_MINUTE` (default 120).

## Authentication

Direct customers send `X-API-Key: <key>`. Requests proxied by RapidAPI are authenticated by the `X-RapidAPI-Proxy-Secret` header RapidAPI injects; RapidAPI meters subscriber quotas itself.

## Tests and verification

```bash
pip install -r requirements-dev.txt
pytest                          # 14 unit tests, upstreams fully mocked
python scripts/smoke_test.py    # LIVE checks against USAspending/SAM.gov — run before every deploy
```

The smoke test exists because unit tests mock the upstream APIs; only the smoke test catches upstream schema drift.

## Deploy

```bash
docker build -t contract-intel-api .
docker run -p 8080:8080 --env-file .env contract-intel-api
```

Run one container per replica (the cache is in-process). See [docs/DEPLOY.md](docs/DEPLOY.md) for Render/Fly.io walkthroughs and the marketplace onboarding checklist, [docs/USAGE.md](docs/USAGE.md) for full request examples, [docs/PRICING.md](docs/PRICING.md) for the tier plan, and [docs/MARKETPLACE_LISTING.md](docs/MARKETPLACE_LISTING.md) for ready-to-paste listing copy.

## Data notes and disclaimers

Underlying data is produced by the US government and is public domain; this service adds normalization, analytics, and the recompete model. Not affiliated with or endorsed by the US government. Award data reflects USAspending reporting lags (typically days to weeks). Recompete results are a statistical signal, not a guarantee a solicitation will be issued.
