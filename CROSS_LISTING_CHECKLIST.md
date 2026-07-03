# Super_API — Cross-Listing Checklist

Goal: get every new daily API live on multiple marketplaces with near-zero extra effort. Build the reusable assets **once**, then run the per-API steps for each new product.

Marketplaces, in priority order:
1. **RapidAPI** — primary transaction layer (billing, keys, metering handled for you).
2. **Zyla API Hub** — closest RapidAPI competitor; second general listing.
3. **APILayer Marketplace** — curated, data/validation/utility focus. Best fit for data APIs (FCI, Contact Validation).
4. **Postman API Network** — free discovery + docs, no billing. Top-of-funnel only.

---

## Part A — Build once (reusable asset kit)

These are the same across every marketplace. Keep them in a template folder and copy per API.

- [ ] **One-liner** (≤120 chars) — what the API does + who it's for.
- [ ] **Long description** (150–300 words) — problem, what it returns, 1–2 concrete use cases.
- [ ] **Category + tags** — pick the primary category once; reuse the tag list.
- [ ] **Logo / icon** (square, 512×512 PNG) — one per API, consistent Super_API style.
- [ ] **OpenAPI spec** (`openapi.yaml`) — single source of truth; most marketplaces import it directly.
- [ ] **Endpoint list** with method, path, params, and example response for each.
- [ ] **Copy-paste code snippet** (curl + one language, e.g. Python `requests`).
- [ ] **Pricing tiers** — decide Free / Pro / Ultra limits once, reuse everywhere.
- [ ] **Terms + support email** (karan@nexmath.com).

> Tip: keep all of the above in a `marketplace-assets/<api-name>/` folder in this repo so cross-listing is copy-paste, not rewrite.

---

## Part B — Per-API steps (run for each new daily API)

### 1. RapidAPI (primary)
- [ ] Create API listing; import `openapi.yaml`.
- [ ] Set base URL to the live backend (Supabase Edge / Render).
- [ ] Configure plans: Free / Pro / Ultra with quotas + overage.
- [ ] Paste long description, tags, logo.
- [ ] Test each endpoint from the RapidAPI test console.
- [ ] Confirm CORS + auth header pass-through work.
- [ ] Publish. Copy the public listing URL.

### 2. Zyla API Hub
- [ ] Submit new API; import OpenAPI spec or add endpoints manually.
- [ ] Reuse description, tags, logo, pricing tiers.
- [ ] Point to the **same** live backend (no new deploy needed).
- [ ] Test endpoints; submit for review.
- [ ] Record listing URL.

### 3. APILayer Marketplace (data/utility APIs only)
- [ ] Only list if the API is data/validation/utility (FCI, Contact Validation — yes; niche calculators — skip unless data-flavored).
- [ ] Apply/submit API; provide spec + description.
- [ ] Reuse pricing tiers.
- [ ] Test + submit for review.
- [ ] Record listing URL.

### 4. Postman API Network (free exposure)
- [ ] Publish the OpenAPI spec as a public Postman workspace/collection.
- [ ] Add description + example requests.
- [ ] Link back to the RapidAPI listing as the paid subscribe path.
- [ ] Record workspace URL.

### 5. Funnel wire-up (the step that actually drives views)
- [ ] Add all listing URLs to a central tracker (see Part C).
- [ ] Every dev.to post for this API ends with: one concrete use case + copy-paste snippet + the RapidAPI subscribe link.
- [ ] Cross-link: RapidAPI/Zyla descriptions mention the dev.to writeup.

---

## Part C — Central tracker

Keep one row per API so you can see coverage at a glance.

| API | RapidAPI | Zyla | APILayer | Postman | dev.to post |
|-----|----------|------|----------|---------|-------------|
| FCI (Contract Intel) | ☐/link | ☐ | ☐ | ☐ | ☐ |
| Contact Validation | ☐/link | ☐ | ☐ | ☐ | ☐ |
| VibeGuard | ☐/link | ☐ | — | ☐ | ☐ |
| Manufacturing Toolbox | ☐/link | ☐ | — | ☐ | ☐ |

---

## Rules of thumb

- **One backend, many storefronts.** Never re-deploy per marketplace — every listing points at the same live endpoint. Marketplaces are just discovery + billing skins.
- **Data APIs → all four. Niche/calculator APIs → RapidAPI + Zyla + Postman** (skip APILayer).
- **Discovery comes from your funnel, not the marketplace.** The cross-listing multiplies surfaces, but dev.to + cross-links are what convert.
- **Batch it.** Do Part B for the day's API in one sitting right after it goes live on RapidAPI, while the assets are fresh.
