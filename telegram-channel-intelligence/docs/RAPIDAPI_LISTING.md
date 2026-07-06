# RapidAPI Listing Copy — Telegram Channel Intelligence

**Name:** Telegram Channel Intelligence — Posts, Subscribers & Monitoring
**Category:** Data / Social
**Short description (one-liner):**
Any public Telegram channel as clean JSON: subscriber counts, posts with views & reactions, media, keyword search. No Telegram account or bot token needed.

**Long description / API Overview:**

Telegram has ~1 billion users, but there's no official API to read public channels you don't own. This API fixes that.

Give it any public channel username and get structured JSON back: channel profile (title, description, verified status, subscriber count, media counters), recent posts (full text, view counts, reaction totals, photos, videos, link previews, forward info), single-post lookup, cursor pagination, and keyword filtering across recent posts.

Use cases: monitor crypto/trading channels, OSINT and threat intelligence, influencer vetting for marketing campaigns, competitor channel tracking, news aggregation, and building Telegram content feeds into your product.

- 100% public, logged-out data — the same content t.me shows any anonymous visitor. No accounts, no credentials, nothing private.
- Zero setup: one GET request, JSON out. No MTProto, no bot tokens, no Telegram app registration.
- Numbers parsed for you: "11.8M subscribers" → 11800000 (original text preserved).
- Stateless and fast; responses typically under 1s.

**Plans (defaults, adjust in Studio):**
| Plan | Price | Quota | Rate | Overage |
|---|---|---|---|---|
| BASIC | $0 | 150 req/mo (hard) | 10/min | — |
| PRO (Recommended) | $9 | 10,000 req/mo (soft) | 60/min | $0.0012 |
| ULTRA | $29 | 50,000 req/mo (soft) | 180/min | $0.0008 |
| MEGA | $99 | 250,000 req/mo (soft) | 600/min | $0.0005 |

**Deployment notes (internal):**
- Base URL: https://nikyyzcmspzsdktxhtae.supabase.co/functions/v1/telegram-intel
- Import `openapi.yaml` via Definitions → CI/CD (iframe-realm File constructor gotcha applies).
- After listing is created, copy the RapidAPI proxy secret into the deployed function (TCI_RAPIDAPI_PROXY_SECRET fallback) and redeploy.
- Health endpoint for UptimeRobot: /health (existing monitor on this Supabase project already keeps it warm).
- dev.to Day 5 post: "Telegram has 1B users and no read API — so I built one in a day" (series: 60 APIs in 60 Days).
