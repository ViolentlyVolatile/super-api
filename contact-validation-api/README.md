# Contact Validation API

Email + phone validation in one cheap, fast, mass-market API. By NexMath.

**Live base URL:** `https://nikyyzcmspzsdktxhtae.supabase.co/functions/v1/contact-validation`
**Hosting:** Supabase Edge Functions (project `super-api-contact-validation`, us-east-1, free tier)
**RapidAPI listing (PUBLIC):** https://rapidapi.com/karan-WuSc97Oof/api/contact-validation-email-phone
**RapidAPI proxy host:** `contact-validation-email-phone.p.rapidapi.com`

## Why

Every signup form, CRM import, and outreach list needs contact validation. This is
the "toothpaste" of APIs — used by masses, sold cheap, near-zero marginal cost
(pure compute + free DNS-over-HTTPS; no paid upstream).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | none | API info |
| GET | `/health` | none | Health check |
| GET/POST | `/email?email=...` | key | Validate one email |
| GET/POST | `/phone?phone=...&country=US` | key | Validate one phone |
| POST | `/batch` | key | Up to 100 emails/phones per request |

**Auth:** `X-API-Key: <key>` header, `Authorization: Bearer <key>`, or `?api_key=` query param.
Also accepts `X-RapidAPI-Proxy-Secret` when fronted by RapidAPI.

### Email response

```json
{
  "email": "john.doe@gmial.com",
  "valid": true,
  "score": 70,
  "deliverable": "risky",
  "reason": "possible_domain_typo",
  "syntax": { "valid": true, "local_part": "john.doe", "domain": "gmial.com" },
  "domain": { "mx_found": true, "mx_records": ["mail.gmial.com"], "disposable": false, "free_provider": false },
  "flags": { "role_address": false, "disposable": false, "free_provider": false },
  "did_you_mean": "john.doe@gmail.com"
}
```

Checks: RFC syntax, live MX lookup (DNS-over-HTTPS, Cloudflare→Google fallback, 1h cache),
disposable-domain detection (~4k domains fetched daily from the disposable-email-domains
project + embedded fallback), free-provider flag, role-address flag (admin@, info@, ...),
typo suggestion (Levenshtein vs 26 popular providers), 0–100 quality score,
`deliverable`: `yes | risky | no | unknown`.

### Phone response

```json
{
  "phone": "9876543210", "valid": true, "possible": true, "reason": null,
  "e164": "+919876543210", "international": "+91 98765 43210",
  "national": "098765 43210", "country": "IN", "calling_code": "+91", "type": "MOBILE"
}
```

Powered by libphonenumber metadata (240+ regions). `country` param is an optional
ISO-2 hint for numbers without `+` prefix. `type`: MOBILE, FIXED_LINE,
FIXED_LINE_OR_MOBILE, TOLL_FREE, PREMIUM_RATE, VOIP, etc.

### Batch

```json
POST /batch
{ "emails": ["a@b.com"], "phones": ["+14155552671", {"phone": "9876543210", "country": "IN"}], "default_country": "US" }
```

Returns per-item results + summary counts. Max 100 items total per request.

## Privacy

Stateless. No inputs stored or logged. Good selling point — keep it true.

## Architecture

- `supabase/functions/contact-validation/` — Deno edge function (index/router, email.ts, phone.ts, data.ts)
- Secrets: `CV_MASTER_API_KEY` / `CV_RAPIDAPI_PROXY_SECRET` env vars (deployed copy carries a
  real fallback key that is NOT committed here; repo keeps `CHANGE_ME_MASTER_KEY`)
- Deployed via Supabase MCP `deploy_edge_function` (no CLI needed). Redeploys must include
  ALL files (index.ts, email.ts, phone.ts, data.ts, deno.json) or the import map breaks.

## Ops notes

- Supabase free tier: 500K function invocations/mo. Paused after ~1 week of inactivity —
  keep-alive ping on /health recommended (UptimeRobot).
- The other project in the org (NexShape3D) is INACTIVE; free tier allows 2 active projects.
