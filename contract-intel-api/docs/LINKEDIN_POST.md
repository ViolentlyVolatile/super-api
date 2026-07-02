# LinkedIn Launch Post

Post between 8–10am US Eastern (5:30–7:30pm IST) on a weekday — that's when GovCon BD people scroll. Add 3–5 hashtags max. Put the link in the FIRST COMMENT, not the body (LinkedIn suppresses posts with external links).

---

**Post body:**

Every US federal contract has an end date. When it ends, the work usually gets re-solicited.

Which means a list of contracts expiring in the next 12 months is, effectively, a list of next year's RFPs — visible today.

BD teams at large contractors pay $300–1,000 per seat per month for platforms that surface this signal. Small contractors and independent consultants mostly go without.

So I built the signal as an API.

One request: "DoD contracts over $5M ending within 12 months, NAICS 541512." One response: ranked list, each contract scored 0–100 by size and time-to-expiry, straight from official USAspending.gov and SAM.gov data.

It also covers award search (who won what, by keyword/NAICS/agency/vendor), live SAM.gov solicitations, and market-sizing analytics — spending totals by NAICS, agency, or recipient in one call.

Pricing starts free (50 requests/month, no card) and tops out at $249/month — less than one seat of any incumbent platform.

If you're building GovCon tooling, running BD at a small prime, or just want your pipeline in a spreadsheet instead of a $12k/year dashboard: link in the first comment.

What would make this indispensable for your BD workflow? Genuinely asking — I ship fast.

#GovCon #FederalContracting #BusinessDevelopment #API #DefenseIndustry

---

**First comment (post immediately after publishing):**

Live here with a free tier → [your RapidAPI listing URL]

Docs and example calls included. Recompete Radar is the endpoint to try first: POST /v1/recompetes/search with {"months_ahead": 12, "agency": "Department of Defense", "min_amount": 5000000}.

---

**Follow-up engagement plan (first 48h):**

- Reply to every comment; each reply re-ranks the post.
- DM anyone who comments with a GovCon title (BD, capture, proposals) — offer to run their NAICS through Recompete Radar and send them the top 10 as a screenshot. That screenshot converts.
- Repost after 1 week with a concrete result ("X signups, most-requested feature was Y, shipped it").
