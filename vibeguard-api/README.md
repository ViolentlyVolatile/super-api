# VibeGuard API

**The backend plumbing your AI code generator never writes for you.**

You vibe-coded an app with Lovable, Bolt, v0, or Cursor. It looks great. Then you realize: there's no API key system for your users, no rate limiting, no usage tracking, and your LLM calls randomly break on malformed JSON while users paste "ignore all previous instructions" into your chat box.

VibeGuard is one API that fixes all of it. No backend to write, no infra to run.

## Two modules, one subscription

### 1. Keys, rate limits & metering — auth for YOUR app's users
- `POST /keys` — issue an API key for a user of your app (set per-minute rate limit + monthly quota)
- `POST /verify` — the magic endpoint: verify key + enforce rate limit + count usage, in ONE call. Drop it at the top of your handler.
- `GET /keys`, `DELETE /keys/{key_id}`, `GET /usage` — list, revoke, report

```js
// The only backend code your AI app needs for user API keys:
const res = await fetch(VIBEGUARD + "/verify", {
  method: "POST",
  headers: { "X-RapidAPI-Key": RAPID_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ key: userSuppliedKey })
});
if (!res.ok) return reply(429, "Slow down or upgrade!");
```

### 2. LLM Guard — make model output & input safe
- `POST /guard/json` — extract JSON from markdown fences/prose, repair trailing commas, single quotes, Python `True/None`, truncated output, unquoted keys; optional JSON-Schema validation. Never `JSON.parse`-crash again.
- `POST /guard/prompt` — prompt-injection scoring (0–100) across 7 attack categories: instruction override, prompt extraction, jailbreak personas, delimiter smuggling, exfiltration, obfuscation, coercion.
- `POST /guard/pii` — detect + redact emails, phones, credit cards (Luhn-checked), SSNs, IPs, IBANs, and leaked secrets (OpenAI/Stripe/GitHub/AWS/Google/Slack keys, JWTs) before text hits your LLM or your logs.

## Live

Base URL: `https://gowzizftqkcuxyzdvrqo.supabase.co/functions/v1/vibeguard`

- `GET /` — endpoint index (open)
- `GET /health` — liveness (open)
- Everything else: `X-API-Key` header (direct) or subscribe on RapidAPI.

## Architecture

Supabase Edge Function (Deno) + Postgres. Rate limiting is a fixed one-minute window enforced atomically in a single `verify_key` Postgres function (one round trip per verify). Keys stored as SHA-256 hashes — plaintext is shown once at creation and never stored. Tenants are isolated by RapidAPI subscriber identity; keys cannot be probed across tenants. Guard endpoints are stateless.

## Repo layout

- `index.ts` — router, auth, CORS
- `keys.ts` — key CRUD, verify, usage (Postgres-backed)
- `guard_json.ts` — JSON extraction/repair + minimal schema validator
- `guard_prompt.ts` — injection heuristics (weighted rules, diminishing per-category)
- `guard_pii.ts` — PII/secret detectors + redaction
- `docs/openapi.json` — OpenAPI 3.0 spec for RapidAPI import

Secrets: repo keeps `CHANGE_ME` placeholders; real master key + RapidAPI proxy secret are baked into the deployed copy only (env-first).
