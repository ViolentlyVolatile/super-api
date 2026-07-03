# Super_API Security Audit — 4 Live APIs

**Date:** 2026-07-03
**Scope:** FCI (Render/FastAPI), Contact Validation, VibeGuard, Manufacturing Toolbox (Supabase Edge)
**Method:** Static source review + live Postgres verification (anon-role impersonation, function ACLs, RLS state). Live HTTP header/method probing was limited (bash sandbox down, `web_fetch` can't send custom headers); items marked *code-confirmed* were verified in source, *DB-confirmed* against the live database.
**Vuln classes requested:** auth/proxy bypass, input validation/injection, rate-limit/abuse, data/error leakage.

---

## Severity summary

| ID | Severity | API(s) | Issue |
|----|----------|--------|-------|
| F1 | **HIGH** | Contact Validation, Mfg Toolbox | Fail-open "bootstrap mode" — no env secrets ⇒ API fully open |
| F2 | **HIGH** | Mfg Toolbox | SSRF via `stl_url` / `gcode_url` server-side fetch |
| F3 | **MEDIUM** | All 3 Supabase | Static proxy-secret is the only gate against direct-origin billing bypass |
| F3b | **MEDIUM** | VibeGuard | Tenant spoofing — `X-RapidAPI-User` trusted on direct-origin calls |
| F4 | **MEDIUM** | VibeGuard | `verify_key()` is PUBLIC-executable `SECURITY DEFINER` (DB-confirmed) |
| F5 | **LOW→MED** | VibeGuard | Broad anon/authenticated DML grants on all tables; only RLS deny-all protects them (DB-confirmed) |
| F6 | **LOW** | VibeGuard, CV, Mfg | Verbose error/DB-message leakage in 4xx/5xx bodies |
| F7 | **LOW** | VibeGuard | `verify_key` meters usage *before* cross-tenant ownership check |
| F8 | **LOW** | FCI | In-memory rate limiter grows unbounded; per-process only |
| F9 | INFO | FCI | Gateway keyword filter blocks legit "select * from"-style searches |

---

## HIGH

### F1 — Fail-open bootstrap auth (Contact Validation & Manufacturing Toolbox) — *code-confirmed*
`authorized()` in both functions ends with:
```ts
// Bootstrap mode: if neither secret is configured yet, allow (pre-launch).
if ((!MASTER_API_KEY || MASTER_API_KEY === "CHANGE_ME_MASTER_KEY") && !RAPIDAPI_PROXY_SECRET)
  return true;
```
The repo copy ships `CHANGE_ME_MASTER_KEY` and an empty proxy secret. Real secrets live **only in the deployed env vars**. If either function is ever redeployed without those env vars set (fresh project, migration, forgotten secret, teammate deploy), auth silently returns `true` for everyone → the API is fully open, unauthenticated, and unmetered. This is a latent single-point failure that produces *no error* — it just quietly stops charging.

VibeGuard and FCI do **not** have this flaw; they default-deny.

**Fix:** delete the bootstrap branch. Fail closed — if no credential is configured, return 401 and log a startup warning.

### F2 — SSRF in Manufacturing Toolbox `fetchBytes()` — *code-confirmed*
`/v1/3dp/quote`, `/v1/3dp/analyze`, and `/v1/gcode/analyze` accept `stl_url` / `gcode_url` and fetch them server-side:
```ts
const res = await fetch(u, { signal: ctrl.signal, redirect: "follow" });
```
Only `http`/`https` scheme is checked. There is **no block on private/loopback/link-local ranges**, and redirects are followed. Any authenticated subscriber (cheapest tier) can make the edge function issue requests to internal hosts, cloud metadata endpoints, `127.0.0.1`, or arbitrary third parties — SSRF / blind port-scan / request-proxy. The `content-length` size guard is bypassable (omit or lie about the header via chunked transfer).

**Fix:** resolve the hostname, reject RFC-1918 / `127.0.0.0/8` / `169.254.0.0/16` / `::1` / `fc00::/7`; disallow redirects (`redirect: "manual"`) or re-validate each hop; consider `https`-only; enforce a streamed byte cap instead of trusting `content-length`.

---

## MEDIUM

### F3 — Direct-origin billing bypass via static proxy secret (all 3 Supabase APIs) — *code-confirmed*
The Supabase base URLs are public and the origin trusts a **single static** `x-rapidapi-proxy-secret`. Anyone holding that secret bypasses RapidAPI entirely — unlimited free calls, no metering. The secret is long-lived, never rotated/expired, and (per your own launch notes) is readable in the Studio "firewall" input and is stored in plaintext in your project memory files. Treat it as a high-value credential.

**Fix:** rotate the proxy secret on a schedule and immediately if it was ever shown/screenshared; if RapidAPI publishes egress IPs, allowlist them at the edge; store the secret only in the deployed env, never in repo/notes.

### F3b — Tenant spoofing on direct-origin calls (VibeGuard) — *code-confirmed*
Tenant identity is `` `ra_${req.headers.get("x-rapidapi-user")}` ``. RapidAPI's gateway sets that header truthfully, but on a **direct** origin call (with the proxy secret from F3) the attacker sets `X-RapidAPI-User` to any value and *becomes any tenant* — listing, creating, and revoking that tenant's API keys and reading their usage. F3 + F3b together = full multi-tenant compromise if the proxy secret leaks.

**Fix:** don't derive trust from a client-settable header on the origin. Bind tenants to something the gateway signs, or gate `/keys`, `/usage`, `/verify` behind an additional server-side check.

### F4 — `verify_key()` publicly executable (VibeGuard) — *DB-confirmed*
Live ACL: `proacl = {=X/postgres, postgres=X/postgres, service_role=X/postgres}` → `=X` means **PUBLIC has EXECUTE**, and it's `SECURITY DEFINER`. It's reachable by anyone holding the project's public anon key via `POST /rest/v1/rpc/verify_key`, completely outside the edge function — which means the edge function's cross-tenant ownership guard (keys.ts F7) is bypassed. Damage requires a known key *hash*, but this is unintended attack surface that also writes to your usage tables.

**Fix:**
```sql
REVOKE EXECUTE ON FUNCTION public.verify_key(text, integer) FROM anon, authenticated, public;
```
The edge function uses the service-role key, which retains EXECUTE.
Remediation: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

### F5 — Broad table grants, protected only by RLS deny-all (VibeGuard) — *DB-confirmed*
`anon` and `authenticated` hold full `SELECT/INSERT/UPDATE/DELETE/TRUNCATE` on `tenants`, `api_keys`, `monthly_usage`, `usage_counters` (default Supabase grants). Today they're safe: RLS is **enabled with no policy** on all four (verified `relrowsecurity=true`; anon impersonation `SELECT count(*) FROM api_keys` → **0 rows**). So nothing is exposed *right now*. The risk is fragility: adding one permissive policy, or disabling RLS on any of these, instantly exposes **every tenant's key hashes and usage** for read/write to the public anon key.

**Fix:** `REVOKE ALL ON public.{tenants,api_keys,monthly_usage,usage_counters} FROM anon, authenticated;` (defense in depth — the function's service-role key is unaffected).

---

## LOW / INFO

### F6 — Error/DB-message leakage — *code-confirmed*
- VibeGuard `index.ts` 500: `{ error: "Internal error", detail: String(err) }` — leaks internal exception text.
- VibeGuard `keys.ts` / `handleVerify`: returns raw Postgres `error.message` to the client.
- Contact Validation & Mfg Toolbox: 500/422 return raw `e.message`.
**Fix:** log the detail server-side; return a generic message + error code to callers.

### F7 — Metering before ownership check (VibeGuard) — *code-confirmed*
`handleVerify` runs the `verify_key` RPC (which rate-limits + increments usage) *before* confirming the key belongs to the caller's tenant. A subscriber who knows another tenant's raw key can nudge that key's usage/rate window before getting `key_not_found`. Minor quota-abuse/DoS.
**Fix:** resolve/verify tenant ownership before metering, or pass tenant into the RPC.

### F8 — FCI in-memory rate limiter — *code-confirmed*
`_hits: dict[str, deque]` creates one entry per distinct key/user/IP and never evicts empty buckets → slow unbounded memory growth (DoS over time); state is per-process (won't hold if scaled beyond one Render instance) and resets on restart. `X-RapidAPI-User` is also client-settable on direct-origin calls but only shifts the burst bucket (low impact). FCI otherwise fails closed correctly (`demo_mode=False`, empty keys ⇒ 401).
**Fix:** evict empty deques periodically / cap distinct keys, or move to a shared store if you scale out.

### F9 — Gateway keyword filter (FCI) — INFO
Threat-protection blocks free-text containing `select * from`, etc. Not a vulnerability, but it silently 400s legitimate searches — first thing to relax if users report failing queries.

---

## What's already solid
- API keys stored as SHA-256 hashes, shown once, never returned.
- `DELETE /keys/{id}` validates UUID shape before the query.
- Batch capped at 100; guard text capped at 200 KB; file uploads capped at 30 MB.
- RLS enabled on all VibeGuard tables (deny-all verified).
- VibeGuard and FCI fail **closed** on missing credentials.
- No string-built SQL — all DB access is parameterized RPC / PostgREST.

## Remediation status (updated 2026-07-04)

| ID | Status | Detail |
|----|--------|--------|
| F1 | ✅ Fixed & deployed | Bootstrap fail-open branch removed from Contact Validation (v4) and Manufacturing Toolbox (v3); both now fail closed. Live-verified unauth → 401. |
| F2 | ✅ Fixed & deployed | SSRF guard added to Mfg Toolbox `fetchBytes` — private/loopback/link-local hosts rejected pre-request (`url_not_allowed` 400), redirects no longer followed. Live-verified: `127.0.0.1`, `169.254.169.254`, `10.x` all blocked; public URLs still fetch. |
| F3 | ⚠️ Manual | Rotate the RapidAPI proxy secret for each Supabase API. Not auto-rotated: the new secret must be updated in the RapidAPI gateway (Studio → Gateway/Firewall) and the deployed function in the same change, or gateway traffic breaks. Also purge the secrets from notes/screenshots. |
| F3b | ⚠️ Accepted-risk / mitigated | VibeGuard tenant = `ra_<X-RapidAPI-User>`. Spoofing requires BOTH the proxy secret (F3) and a victim's RapidAPI username; F7 now scopes metering to owned keys, shrinking the blast radius. Full fix needs gateway-signed identity — tracked, not code-fixable at the origin. |
| F4 | ✅ Fixed | `REVOKE EXECUTE ON verify_key FROM public/anon/authenticated` applied & verified (ACL now `service_role` only). |
| F5 | ✅ Fixed | `REVOKE ALL` on tenants/api_keys/monthly_usage/usage_counters from anon+authenticated applied & verified (grants now NONE; service_role unaffected). |
| F6 | ✅ Fixed & deployed | Raw exception/DB messages no longer returned to callers in VibeGuard (v4), Contact Validation (v4), Mfg Toolbox (v3); details logged server-side, generic message to client. |
| F7 | ✅ Fixed & deployed | VibeGuard `handleVerify` confirms key ownership BEFORE metering (v4). Live-verified: bogus key → 404 `key_not_found`, own key → 200. |
| F8 | ✅ Fixed in repo (deploy pending) | FCI limiter now sweeps idle buckets once per window (bounded memory). Needs a Render manual deploy (auto-deploy is off). |
| F9 | ⚠️ Manual (info) | RapidAPI gateway Threat-Protection keyword filter blocks legit `select * from`-style searches — loosen in Studio → Gateway if users report failing queries. Not a vulnerability. |

Repo copies keep `CHANGE_ME` placeholders; real secrets live only in the deployed function copies. `security/probe_suite.mjs` re-verifies all of the above — the two SSRF checks now PASS.

## Recommended fix order
1. **F1** — remove bootstrap fail-open (CV + Mfg). ~2 lines each, redeploy.
2. **F4 + F5** — `REVOKE` on VibeGuard (SQL, seconds, zero downtime).
3. **F2** — SSRF guard on Mfg Toolbox URL fetch.
4. **F3/F3b** — rotate proxy secret; stop storing it in notes; harden tenant trust.
5. **F6–F8** — error hygiene, metering order, rate-limiter eviction.
