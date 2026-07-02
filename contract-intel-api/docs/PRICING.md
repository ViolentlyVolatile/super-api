# Pricing Plan

Positioning: the incumbents charge $300–1,000/seat/month for dashboards (GovWin, HigherGov, GovTribe). We undercut hard on price and sell to developers instead of BD teams. Costs are near-zero (public data, one small container), so margin is the sale price minus marketplace commission.

## Tiers (RapidAPI and direct)

| Tier | Price | Quota | Recompete Radar | Notes |
|---|---|---|---|---|
| **Free** | $0 | 100 req/mo, 5 req/min | 5 results max | Hook tier — enough to prototype |
| **Starter** | $19/mo | 5,000 req/mo | Full | Indie devs, single project |
| **Pro** | $79/mo | 50,000 req/mo | Full | The volume tier most GovCon SaaS tools land on |
| **Business** | $249/mo | 250,000 req/mo + email support | Full | Undercuts every incumbent seat license |
| Overage | $1 per 1,000 req | — | — | Applies to Starter and up |

Rationale: $19 anchors as an impulse buy; $79 is where comparable niche data APIs cluster; $249 is still <1 seat of any incumbent, making the "build your own dashboard" pitch trivial for buyers.

## Net revenue per channel

| Channel | Take rate | You keep of $79 |
|---|---|---|
| RapidAPI | 25% + processing | ~$55 |
| Postman API Network | 0% (lead-gen only, billing is yours) | ~$75 (via MoR) |
| Direct (Paddle / Lemon Squeezy / Dodo as merchant of record) | ~5% + $0.50 | ~$74 |

India-specific: Stripe is invite-only in India, so direct billing should run through a merchant of record (Paddle, Lemon Squeezy, or Dodo Payments — all onboard Indian individuals and handle US sales tax/EU VAT). RapidAPI pays out internationally via PayPal/wire. For Indian GST export-of-services compliance, keep FIRA records per remittance (MoRs and banks provide these; Playto Pay auto-generates them if that matters).

## Launch sequence

1. List on RapidAPI with all four tiers (discovery + billing handled).
2. List free on Postman API Network pointing at your docs page (pure exposure).
3. Stand up a one-page site with MoR checkout for the Pro/Business tiers; steer heavy users off RapidAPI over time (email in your `contact` field, changelog links in docs).
