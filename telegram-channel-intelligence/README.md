# Telegram Channel Intelligence API

**Day 5 of 60 APIs in 60 Days.** Structured JSON for any **public** Telegram channel — no Telegram account, no bot token, no MTProto plumbing.

Telegram has ~1B monthly users and **no official API for reading channels you don't own**. This API turns Telegram's own public t.me web preview into clean REST endpoints: channel profiles with subscriber counts, recent posts with views/reactions/media, pagination, and keyword filtering.

**Who buys this:** crypto communities (channel monitoring), OSINT / threat-intel teams, marketing agencies (influencer vetting, competitor watch), news aggregators, AI teams needing Telegram content feeds.

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /v1/channel/{username}` | title, description, verified flag, photo, subscribers + photo/video/link counters |
| `GET /v1/channel/{username}/posts` | recent posts, newest first: text, views, reactions, media URLs, link previews. `?limit=` (1–100), `?before={post_id}` pagination, `?q=` keyword filter |
| `GET /v1/channel/{username}/posts/{id}` | a single post |
| `GET /health` | health check (no auth) |

Base URL: `https://nikyyzcmspzsdktxhtae.supabase.co/functions/v1/telegram-intel`
Auth: `X-API-Key` header (or via RapidAPI gateway).

## Example

```
GET /v1/channel/durov
→ { "channel": { "title": "Pavel Durov", "subscribers": 11800000, "verified": true, ... } }

GET /v1/channel/telegram/posts?q=update&limit=5
→ { "count": 5, "next_before": 429, "posts": [ { "id": 449, "views": 1170000, "text": "...", ... } ] }
```

## Architecture

Supabase Edge Function (Deno), zero dependencies, stateless. Fetches `t.me/s/{username}` (logged-out public preview), parses with regex, 120s in-memory cache per warm isolate, max 5 upstream pages per request. Fail-closed auth (master key or RapidAPI proxy secret), env-first with `TCI_MASTER_API_KEY` / `TCI_RAPIDAPI_PROXY_SECRET` (repo copy ships `CHANGE_ME`).

## Data policy & legal posture

Public, logged-out data only — exactly what t.me serves any anonymous visitor. No private channels, no groups, no user profiles, no login, no credential use (Meta v. Bright Data posture: logged-out scraping of public pages). Callers are responsible for complying with privacy laws (e.g. GDPR) when storing results.

## Known limitations (v1)

- Reaction **counts** are exact as displayed; reaction **emoji identity** is best-effort and may be empty (t.me renders reactions as images).
- Approximate numbers ("11.8M") are parsed to integers; `_text` fields keep the original.
- Only channels with public web preview enabled; a handful of channels disable it.
- Subscriber history/growth tracking is a v2 candidate (needs storage).
