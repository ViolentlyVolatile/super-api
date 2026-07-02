# Cold Outreach Email Templates

Send from karan@nexmath.com. 10–15 personalized sends beat 200 blasts — you need ~3 paying customers to clear $100 MRR week one. Keep every email under 120 words; the demo screenshot does the selling.

**The one trick that works:** before emailing, run the prospect's own NAICS/agency through Recompete Radar and attach the top-5 results as a screenshot. You're not describing the product, you're handing them their own pipeline.

---

## Template 1 — GovCon SaaS builders (find on: Product Hunt, GitHub repos touching USAspending/SAM, r/GovernmentContracting tool threads)

**Subject:** the recompete data layer you were about to build

Hi {name},

Saw {product} — nice work on {specific feature}. If you're pulling from USAspending or SAM.gov directly, you already know the pain: two auth models, two pagination styles, daily rate caps.

I run an API that normalizes both, plus a scored "contracts expiring in N months" endpoint most platforms gate behind $300+/seat pricing. One POST, ranked JSON out.

Free tier is 100 req/mo if you want to poke at it: {link}. If it saves you a sprint, the paid tiers start at $19.

Happy to add fields you need — I ship weekly.

Karan

---

## Template 2 — BD/capture consultants at small primes (find on: LinkedIn search "capture manager" OR "BD consultant" + "GovCon", APTAC/PTAC events)

**Subject:** {agency} contracts expiring before FY27 — list attached

Hi {name},

I pulled the {NAICS or agency} contracts over ${amount} that expire in the next 12 months — screenshot attached. Each one is a likely recompete; the incumbents are named.

This came out of an API I built on official USAspending/SAM.gov data. It's the same expiring-contract signal GovWin sells at $1k/seat, priced at $19–249/month for people who'd rather have it in a spreadsheet.

Want me to run your exact NAICS codes and send the full list? No charge, no strings.

Karan

---

## Template 3 — Teams currently paying for GovWin/HigherGov/GovTribe (find on: LinkedIn posts complaining about tool costs, G2 reviews mentioning price)

**Subject:** cutting the ${current tool} bill without losing the recompete feed

Hi {name},

Saw your note about {tool} pricing. If the main thing your team pulls from it is the expiring-contracts / recompete feed, that specific signal is reproducible from public data — I've packaged it as an API: scored, filterable by NAICS/PSC/agency/amount, $249/mo for 250k requests (vs. per-seat licensing).

It won't replace {tool}'s full workflow suite. It will feed the same data into your own tracker for ~5% of the cost.

15-min demo, or just grab the free tier and test your own portfolio: {link}.

Karan

---

## Follow-up cadence

- Day 3: one-line bump ("Any interest? Happy to run your NAICS through it either way.")
- Day 8: send one new expiring contract relevant to them, then stop.
- Track sends in a sheet: name, segment, date, NAICS used, reply Y/N. Double down on whichever segment replies.
