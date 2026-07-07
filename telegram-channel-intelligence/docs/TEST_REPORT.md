# Telegram Channel Intelligence — Test Report

Date: 2026-07-07 · Function version 1.0.1 · deployment `..._0b20b390-..._2`
Method: live calls to the Supabase edge function; status codes confirmed via Supabase edge-function logs (definitive, since the HTTP client hides non-200 bodies).

## Auth & method tests
| Case | Expected | Actual | Latency |
|---|---|---|---|
| No API key | 401 | **401** | 102ms |
| Wrong API key | 401 | 401 (fail-closed) | — |
| Valid key | 200 | **200** | ~700ms |
| `/health` (no auth) | 200 | **200** | 101ms |
| `/` info (no auth) | 200 | **200** | 378ms |
| `OPTIONS` (CORS preflight) | 204 | 204 | — |
| `POST` (unsupported) | 405 | 405 | — |

## Edge cases
| Case | Expected | Actual | Latency |
|---|---|---|---|
| Bad username `@@` | 400 | **400** | 80ms |
| Nonexistent channel | 404 | **404** | 662ms |
| Unknown route `/v1/nonsense` | 404 | **404** | 141ms |
| `limit=200` (over max) | clamp to 100 | **count=100**, pages_scanned=5, next_before=349 | 1656ms |

## Functional correctness (real channels, multiple categories)
| Channel | Category | Result |
|---|---|---|
| @durov | founder/personal | 200, 11.8M subs, verified=true |
| @telegram | official | 200, posts + keyword filter `q=update` works |
| @cointelegraph | crypto | 200, 352K subs, files counter parsed |
| @bloomberg | news/finance | 200, 161K subs |

## Pagination & keyword filter
- `posts?limit=45` → returned exactly 45, walked 3 pages, newest-first (ids 530→483), `next_before=468`. ✔
- `posts?limit=200` → clamped to 100, walked max 5 pages, `next_before` cursor returned. ✔
- `posts?q=update` on @telegram → only matching posts returned, `query` echoed. ✔
- Single post `/posts/530` → exact post returned with views 3.53M, reactions, links. ✔

## Latency profile
- No-upstream paths (auth fail, bad route, bad username): 80–141ms.
- Single t.me fetch (channel info / warm): 500–750ms.
- Multi-page walks (45–100 posts, 3–5 upstream pages): 1.6–1.7s.
- All well under the 12s upstream timeout. 120s in-memory cache serves repeat calls from the warm isolate.

## Throttling / rate limiting
The edge function itself is intentionally stateless and does NOT rate-limit — rate limiting is enforced by the RapidAPI gateway per plan (BASIC 5/min … MEGA 1000/min). Gateway throttling can only be exercised end-to-end once the listing is published and a test subscription exists; that step is pending (blocked on completing the RapidAPI listing). Function-level concurrency showed no errors across parallel calls.

## Verdict
All functional, auth, and edge-case tests pass. No 5xx observed. Ready for RapidAPI publication; gateway rate-limit verification to follow once listed.
