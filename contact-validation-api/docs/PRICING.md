# Pricing — Contact Validation API (RapidAPI)

Toothpaste strategy: cheap, high-volume, impulse-purchase price points.
Marginal cost ≈ $0 (Supabase free tier: 500K invocations/mo; paid tier $10/mo for 2M+).

| Plan | Price | Requests/mo | Rate limit | Overage |
|---|---|---|---|---|
| Basic (free) | $0 | 500 / mo (hard limit) | 10 req/min | — |
| Pro | $5 / mo | 10,000 | 60 req/min | $0.001 / req |
| Ultra | $15 / mo | 50,000 | 300 req/min | $0.0006 / req |
| Mega | $49 / mo | 250,000 | 1000 req/min | $0.0004 / req |

Notes:
- A /batch call with N items counts as 1 request at the gateway — a deliberate
  value kicker vs competitors who charge per lookup. Mention it in marketing.
- All endpoints on all tiers (no endpoint gating — same honest approach as FCI).
- Competitor anchor: single-purpose email validators charge $0.0025–0.004/verification;
  we bundle email+phone and undercut.
- Watch Supabase invocations once past ~400K/mo → upgrade org to Pro ($10/mo net,
  still ~80%+ gross margin at Mega tier).
