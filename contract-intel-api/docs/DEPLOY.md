# Deploy & Go-Live Checklist

## 0. Prerequisites

- A SAM.gov account → Account Details → generate API key (free; enables `/v1/opportunities/*` and raises rate limits). Non-US individuals can register.
- Generate 1+ long random API keys for direct customers: `python -c "import secrets; print(secrets.token_urlsafe(32))"`.

## 1. Host the container

Any container host works; the app is stateless (cache is in-process). Two cheap options:

**Render** — create a Web Service from the repo, environment = Docker, port 8080, add the `FCI_*` env vars, pick the $7 instance. Done.

**Fly.io** — `fly launch --no-deploy`, set port 8080 in fly.toml, `fly secrets set FCI_API_KEYS=... FCI_SAM_API_KEY=...`, `fly deploy`.

Scale by adding replicas; each replica keeps its own cache (fine — worst case a few duplicate upstream hits). If you outgrow that, swap `app/cache.py` for Redis.

## 2. Smoke test against live upstreams (mandatory)

```bash
FCI_SAM_API_KEY=<key> python scripts/smoke_test.py
```

All checks must pass. Unit tests mock the government APIs, so **only this step proves the real integration** — rerun it after any USAspending/SAM schema change announcement and on a weekly cron.

## 3. List on RapidAPI

1. Provider dashboard → Add New API → import `openapi.json`.
2. Set base URL to your deployment.
3. Copy the **Proxy Secret** RapidAPI shows you → set `FCI_RAPIDAPI_PROXY_SECRET` on the host → redeploy. From then on only RapidAPI (and your direct keys) can call the service.
4. Create the four tiers from `docs/PRICING.md` (Free 100/mo, Starter $19, Pro $79, Business $249).
5. Paste listing copy from `docs/MARKETPLACE_LISTING.md`; add 2–3 example responses (run the curl examples in `docs/USAGE.md` and paste real output).
6. Payouts: configure PayPal or wire (both pay out to India).

## 4. List on Postman API Network (free exposure)

Import `openapi.json` into a public Postman workspace, add the usage examples as a collection, publish to the API Network. Zero cost, links back to your RapidAPI listing or direct checkout.

## 5. Direct channel (highest margin)

- Merchant of record for an India-based seller: **Paddle**, **Lemon Squeezy**, or **Dodo Payments** (all handle US sales tax/EU VAT and onboard Indian individuals; Stripe India is invite-only).
- One-page site: pitch + pricing + `POST /v1/recompetes/search` live demo + checkout. On purchase (webhook), append the customer's new key to `FCI_API_KEYS` (or move keys to a small DB/env-sync when volume justifies it).
- Keep FIRA/remittance records per payout for Indian GST export-of-services compliance.

## 6. Operations

- **Monitoring**: point an uptime checker at `/health` (returns SAM config status too).
- **Weekly cron**: `python scripts/smoke_test.py` — catches upstream drift before customers do.
- **Upstream capacity**: USAspending has no key/quota; SAM.gov registered keys get 1,000 req/day — the 15-min cache multiplies effective capacity; if opportunities traffic grows, request a higher SAM tier or shard across keys.
- **Support**: the `contact` email in the OpenAPI spec is shown in `/docs`; answer within 24h on Business tier.

## Legal footing (summary)

Underlying data: US government works, public domain, no redistribution restriction (SAM.gov public API terms require using the public API for public data — which is exactly what this service does). The service itself, docs, scoring model, and normalization are your commercial IP. Include the non-affiliation disclaimer (already in README and listing copy) wherever the product is sold. This is general information, not legal advice — have terms of service reviewed before large enterprise deals.
