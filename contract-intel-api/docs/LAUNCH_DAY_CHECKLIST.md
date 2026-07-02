# Launch-Day Checklist — First Dollar Plan

Deployment (Render) and the RapidAPI listing already exist. What's left is verification + distribution.

**Timing warning:** tomorrow is July 3 — the US GovCon audience disappears for the July 4th weekend. Do everything below tomorrow, but hold the Reddit and LinkedIn posts until **Monday, July 6, 8–10am US Eastern**. Dev.to, Postman, and outreach prep are evergreen — ship those tomorrow.

---

## Morning — verify the pipe is sellable (60–90 min)

- [ ] Hit `https://contract-intel-api-gln8.onrender.com/health` — confirm 200 and SAM key configured.
- [ ] Run the live smoke test locally: `FCI_SAM_API_KEY=<key> python scripts/smoke_test.py` — all checks green.
- [ ] RapidAPI listing audit:
  - [ ] All 4 tiers live: Free 100/mo, Starter $19, Pro $79, Business $249, overage $1/1k.
  - [ ] `FCI_RAPIDAPI_PROXY_SECRET` is set on Render (locks out non-RapidAPI traffic).
  - [ ] Copy the exact `*.p.rapidapi.com` hostname from the listing's code snippet.
- [ ] **Subscribe to your own Free tier from a second account and make one real call.** You must experience the exact signup → key → first-call flow a customer will. Fix any friction now.
- [ ] Paste 2–3 real responses into the listing's example fields (run the `docs/USAGE.md` curls).
- [ ] Payout method configured on RapidAPI (PayPal or wire).

## Midday — publish the evergreen channels (60 min)

- [ ] Fix the proxy hostname in `docs/DEVTO_LAUNCH_POST.md` if it differs, set `published: true`, publish on dev.to.
- [ ] Cross-post the identical article to Medium (set the dev.to URL as canonical, or vice versa).
- [ ] Postman: import `docs/postman_collection.json` into a public workspace, run each request once so saved examples show real data, publish to the Postman API Network. Link back to the RapidAPI listing in the workspace description.

## Afternoon — outreach prep (60 min)

- [ ] Build the target list: 10 names per segment from `docs/OUTREACH_EMAILS.md` (LinkedIn + G2 + GitHub searches listed there).
- [ ] For each: run their NAICS/agency through `POST /v1/recompetes/search`, screenshot the top 5.
- [ ] Send the first 10 emails (Template 2 converts fastest — it leads with their own data).

## Monday July 6, 8–10am ET — the visibility push (30 min)

- [ ] LinkedIn post from `docs/LINKEDIN_POST.md` (link in first comment).
- [ ] Reddit post #1 from `docs/REDDIT_POSTS.md` (r/GovernmentContracting).
- [ ] Sit in the comments for 2 hours. Reply to everything.
- [ ] Tuesday: Reddit post #2 (r/SideProject).

## Ongoing (10 min/day)

- [ ] Uptime monitor pointed at `/health` (UptimeRobot free tier).
- [ ] Weekly cron: `python scripts/smoke_test.py`.
- [ ] Check RapidAPI analytics daily: signups, calls per subscriber, which endpoint. Free users making >50 calls are your upsell DM list.
- [ ] Day-3 follow-ups on outreach; log replies.

---

## What "money tomorrow" realistically looks like

First revenue comes from either (a) a RapidAPI browser who hits Starter $19 impulse-buy — driven by listing quality and the dev.to post, or (b) an outreach reply converting to Pro/Business — driven by the personalized screenshot. Expect (a) in days, (b) in 1–2 weeks but 4–13x the revenue. Do both; don't skip the boring listing-audit steps — a broken first-call experience kills every dollar downstream.
