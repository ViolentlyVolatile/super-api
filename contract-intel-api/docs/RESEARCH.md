# Gap Research Summary (July 2026)

## Method

Surveyed API marketplaces and the commercial landscape across industrial, defense-adjacent, and general data domains, looking for: proven willingness to pay, weak/overpriced incumbents, and data we can use commercially at zero licensing cost.

## Shortlist evaluated

**1. Federal contract intelligence (BUILT).** Demand proven: GovCon platforms charge $300–1,000/seat/mo (GovWin, HigherGov, GovTribe) and niche tools $399/mo (ProcuraFederal). Existing marketplace APIs (GovSpend, GovCon API, Interzoid, Apify scrapers) are thin wrappers — none offer recompete forecasting, the highest-value signal, as an API. Data: USAspending (no key) + SAM.gov (free key), public domain, no redistribution restriction. Risk: moderate competition, mitigated by the recompete differentiator and price.

**2. ECCN / export-control classification API.** Biggest true gap — only enterprise suites exist (Descartes Visual Compliance, ~$25k+/yr); zero developer-priced options. Deferred, not rejected: classification accuracy carries liability, needs careful advisory positioning and an eval harness. Strong candidate for API #2 — reuses this project's auth/billing scaffolding.

**3. NSN / defense parts cross-reference.** DLA public data, near-zero competition, but smallest market. Candidate for API #3.

**Rejected: industrial parts obsolescence/cross-reference** — demand is strong but the data (Z2Data, Accuris/IHS) is proprietary; not buildable without licensing.

## Channel economics

RapidAPI: 25% + processing, 8M devs, fastest discovery. Postman API Network: free listing, 40M devs, no billing. Direct via merchant of record (Paddle/Lemon Squeezy/Dodo, ~5%): highest margin, required anyway because Stripe India is invite-only. Decision: all three, RapidAPI first.

## India feasibility

All data sources are public US government data (no ITAR/EAR restriction on the data itself). SAM.gov accounts and API keys are available to non-US persons. RapidAPI pays out to India (PayPal/wire). MoR checkout solves US sales-tax and Stripe-availability problems. GST: exports of services are zero-rated; keep FIRA per remittance.

## Sources

- RapidAPI economics: rapidapi.com docs; buildmvpfast.com RapidAPI alternatives roundup
- Incumbent pricing: procurafederal.com; govcongiants.com; contractradar.io
- Existing thin competitors: govconapi.com; govspendapi.com; interzoid.com; Apify listings
- Data terms: sam.gov/about/terms-of-use; open.gsa.gov/api; api.sam.gov/docs/rate-limits
- ECCN landscape: visualcompliance.com; gitnux.org export-compliance comparison; tariffwolf.com
- Payments from India: support.stripe.com (invite-only India); paddle.com; lemonsqueezy.com; dodopayments.com
