## The backend plumbing your AI code generator never writes for you

You shipped an app with Lovable, Bolt, Cursor, or v0. It works — but it has no API-key system, no rate limiting, no usage metering, and it trusts whatever JSON your LLM spits out. **VibeGuard** is those missing pieces behind one key.

## What you get

| Endpoint | What it does |
|---|---|
| `POST /keys` | Issue an API key for one of *your* app's users (name, per-minute rate limit, monthly quota, metadata) |
| `GET /keys` · `DELETE /keys/{id}` | List and revoke keys |
| `POST /verify` | Verify a key **and** enforce its rate limit **and** meter usage — in one call |
| `GET /usage` | Per-key usage report for the current month |
| `POST /guard/json` | Extract, repair, and schema-validate JSON from raw LLM output |
| `POST /guard/prompt` | Heuristic prompt-injection detection with a 0–100 score |
| `POST /guard/pii` | Detect and redact PII and leaked secrets (emails, cards, SSNs, API keys, tokens) |

## Quickstart

**1. Subscribe** (Basic is free — 1,000 calls/month) to get your `X-RapidAPI-Key`.

**2. Repair whatever your model returned** — no key management required for the guard endpoints:

```bash
curl -X POST \
  'https://vibeguard.p.rapidapi.com/guard/json' \
  -H 'X-RapidAPI-Key: YOUR_KEY' \
  -H 'X-RapidAPI-Host: vibeguard.p.rapidapi.com' \
  -H 'Content-Type: application/json' \
  -d '{"text": "Sure! Here is the JSON:\n```json\n{name:\"Ada\", active:True,}\n```"}'
```

**3. Get back clean, parsed JSON plus the list of repairs applied:**

```json
{
  "ok": true,
  "json": { "name": "Ada", "active": true },
  "repairs": ["extracted_from_code_fence", "replaced_python_literals",
              "removed_trailing_commas", "quoted_unquoted_keys"],
  "schema_valid": null,
  "schema_errors": []
}
```

Pass a JSON Schema in `schema` and VibeGuard validates the repaired object against it.

## The one-call key check

`POST /verify` does three things atomically so you don't have to wire up Redis or a rate limiter:

```json
{ "key": "vg_ab12…", "cost": 1 }
```

returns `{"valid": true, "remaining_month": 942, "reason": null}` — or `429` with `reason: "rate_limited"`, or `404` for an unknown key. Keys you issue are stored as SHA-256 hashes; the raw key is shown once at creation and never again.

## Why not build it yourself

Because your generator didn't, and wiring auth + rate limiting + metering + output validation by hand is a week you'd rather spend shipping. VibeGuard is stateless where it can be (all three `/guard/*` endpoints store nothing) and Postgres-backed where it must be (keys and usage).

## Notes

Prompt-injection scoring is a heuristic signal, not a guarantee — use it to flag and review, not as your only defense. PII redaction is pattern-based; validate before relying on it for compliance. Independent service; not affiliated with any model provider.
