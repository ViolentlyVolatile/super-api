# Reddit Launch Posts

Post from your personal account, not a brand account. Reply to every comment within the first 2 hours — Reddit rewards engagement. If a mod removes it, message them politely and ask what would make it acceptable; most allow tools with a free tier if you engage rather than drop a link.

---

## 1. r/GovernmentContracting (primary — this is the buyer)

**Title:** I built a tool that finds contracts expiring in the next N months (the "recompete radar" GovWin charges $1k/seat for) — free tier, feedback wanted

**Body:**

Long-time lurker. I kept seeing the same complaint here: the platforms that surface expiring contracts and upcoming recompetes (GovWin, HigherGov, GovTribe) cost $300–1,000 per seat per month, which prices out small shops and independent BD consultants.

All of that signal comes from public data — USAspending.gov and SAM.gov. The hard part is that the two systems have different auth, pagination, date formats, and field names, and neither will hand you "show me DoD contracts over $5M ending in the next 12 months" in one query.

So I built that query. You give it a window (1–36 months), optional NAICS/PSC/agency/vendor/amount filters, and it returns contracts whose period of performance ends inside the window, each with months-until-expiry and a 0–100 score (bigger contracts expiring sooner rank higher). It also does award search, live SAM.gov solicitations, and spending-by-NAICS/agency market sizing.

It's an API rather than a dashboard, so it's aimed at people building their own pipeline trackers or spreadsheets — but if you can run one curl command or use Postman, you can use it. Free tier is 50 requests/month, no card.

Honest caveats: award data carries USAspending's reporting lag, and an expiring contract is a statistical signal, not a guarantee of re-solicitation — options get exercised, work gets pulled in-house. It's a prioritization tool, not a crystal ball.

Search "Federal Contract Intelligence" on RapidAPI, or I'll drop the link in a comment if that's kosher with mods.

What signal would make this actually useful for your BD process? Incumbent win-rate history? Set-aside filtering on the recompete scan? I'm one person and can ship fast.

---

## 2. r/SideProject or r/EntrepreneurRideAlong (secondary — builder audience)

**Title:** Incumbents charge $300–1,000/seat/mo for US federal contract intel. I rebuilt the core signal as a $19/mo API.

**Body:**

The US government awards $700B+/year in contracts. When a contract ends, the work usually gets re-solicited — so a list of contracts expiring in the next 12 months is effectively a list of tomorrow's RFPs. BD teams pay GovWin/HigherGov/GovTribe hundreds per seat per month for this.

The raw data is free (USAspending.gov, SAM.gov). The moat is normalization: two auth models, two pagination styles, inconsistent date formats, daily rate caps. I spent the effort once and sell it as an API: award search, live solicitations, spending analytics, and a scored "expiring soon" scan.

Stack: FastAPI + httpx, in-process cache, one $7 Render container. Costs are near-zero because the data is public — margin is price minus the 25% RapidAPI cut. Free tier to hook devs, $19/$79/$249 tiers above.

Launched this week. Happy to answer anything about building on government data, RapidAPI economics, or the recompete scoring.

---

## Posting notes

- Space the two posts a day apart; don't crosspost the identical text.
- r/GovernmentContracting: read the sub rules first; if direct promo is banned, post as a question ("How do small shops track recompetes without paying for GovWin?") and mention the tool in comments when asked.
- Do NOT post the RapidAPI link in the body if the sub is strict — put it in your profile and first comment.
