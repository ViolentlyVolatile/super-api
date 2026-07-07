---
title: Telegram has ~1 billion users and no read API — so I built one in a day (Day 5 of 60)
series: 60 APIs in 60 Days
tags: api, buildinpublic, showdev, webdev
cover_image:
published: false
---

Day 5 of building one commercial API every day for 60 days.

Today's is the one I'm most surprised nobody has nailed: **reading public Telegram channels as clean JSON.**

## The gap

Telegram has roughly **a billion monthly users**. Huge crypto communities, news channels, OSINT sources, brands — all posting in public channels anyone can read in a browser.

But there's no official API to *read* a channel you don't own. The Bot API only sees chats your bot is in. MTProto means spinning up a full client session, phone-number auth, and a library most people don't want in their stack. If you just want "give me @durov's latest posts as JSON," you're out of luck.

## The insight

Telegram already publishes every public channel as a plain web page: `t.me/s/<channel>`. Open `https://t.me/s/durov` logged-out and you'll see the profile, subscriber count, and recent posts with view counts and reactions — served to any anonymous visitor, no account required.

That's the whole product. Fetch that page, parse it, return structured JSON. No MTProto, no bot token, no login, nothing private.

## What it does

Three endpoints:

- `GET /v1/channel/{username}` → profile: title, description, verified flag, photo, subscriber count, and photo/video/link counters.
- `GET /v1/channel/{username}/posts` → recent posts, newest first: text, view counts, reaction totals, media URLs, link previews, forward info. With `?limit=` (1–100), `?before=` cursor pagination, and `?q=` keyword filtering.
- `GET /v1/channel/{username}/posts/{id}` → a single post.

Example:

```
GET /v1/channel/durov
{
  "channel": {
    "title": "Pavel Durov",
    "verified": true,
    "subscribers": 11800000,
    "subscribers_text": "11.8M",
    "counters": { "photos": {...}, "videos": {...}, "links": {...} }
  }
}
```

Notice `subscribers` is a real integer. The page says "11.8M"; the API parses that into `11800000` for you and keeps the original text alongside it. Small thing, but it's the difference between "data" and "a string you now have to clean."

## Things that were fiddlier than expected

**Pagination.** `t.me/s/` serves oldest-last and pages backward with a `?before=<post_id>` cursor. To answer `?limit=45` I walk up to 5 pages, normalize everything newest-first, dedupe on post id, and hand back a `next_before` cursor so callers can keep going.

**Reactions.** Telegram renders reaction emoji as little sprite images, not characters. Counts are reliable (`"65.7K"` → `65700`); the exact emoji identity is best-effort. I'd rather ship honest "count is solid, emoji may be blank" than fake precision.

**Approximate numbers everywhere.** "2.87K", "11.8M", "635" — one parser turns them all into integers, original text preserved.

## Boring by design

It's a Supabase Edge Function (Deno), zero dependencies, stateless — nothing stored, nothing logged. A short in-memory cache smooths out repeat calls. Fail-closed auth. Cold path (bad route / bad input) answers in ~100ms; a real channel fetch is sub-second; a deep 5-page walk is ~1.7s.

## On the legal side

Public, logged-out data only — the same bytes `t.me` shows any anonymous browser. No private channels, no groups, no user accounts, no credentials. That's the defensible posture US courts have carved out for scraping public pages (the logged-out distinction from *Meta v. Bright Data*). Callers are still responsible for privacy law (GDPR etc.) when they store results — which the listing says plainly.

## Who it's for

Crypto/trading communities monitoring channels, OSINT and threat-intel teams, marketing folks vetting influencers or watching competitors, news aggregators, and anyone building Telegram content feeds without touching MTProto.

That's Day 5. Free tier to try it, cheap paid tiers if it's useful.

Following along with the "60 APIs in 60 Days" series — one commercial API, every day. Day 6 tomorrow. 👋
