# Reddit posts — Contact Validation API

Suggested timing: Monday after July 4th weekend (same playbook as FCI). One subreddit per day max; don't cross-post the same day. Flair as "Show & Tell"/"Project" where available.

---

## r/SideProject

**Title:** I built an email + phone validation API that costs $0-5/mo because the incumbents charge per lookup

**Body:**

Every product I've shipped needed the same boring plumbing: validate an email, validate a phone number, block disposable addresses. The existing APIs charge ~$0.0025 per email *and* make phone validation a separate product.

So I bundled both into one API on RapidAPI:

- Email: syntax + live MX + disposable detection (4k domains, auto-updated) + typo autocorrect ("gmial.com → gmail.com") + 0-100 score
- Phone: 240+ regions, E.164 formatting, line type (mobile/landline/VoIP)
- Batch: 100 items = 1 API call, so list cleaning is 10-50x cheaper
- Stateless: nothing stored

Free tier is 500 calls/mo, paid starts at $5. Runs on a single Supabase Edge Function, so my hosting cost is $0 — pricing reflects that.

Link: https://rapidapi.com/karan-WuSc97Oof/api/contact-validation-email-phone

Happy to answer anything about the build (DNS-over-HTTPS for MX checks in Deno was the interesting bit).

---

## r/webdev (text post, no link in body — link in comment if asked, per sub rules)

**Title:** TIL you can do live MX-record validation from an edge function using DNS-over-HTTPS — no sockets needed

**Body:**

Was building an email validator and hit a wall: edge runtimes (Supabase/Deno Deploy/Workers) don't give you raw UDP for DNS lookups.

Turns out Cloudflare and Google both run DNS-over-HTTPS endpoints that return JSON:

`https://cloudflare-dns.com/dns-query?name=gmail.com&type=MX` with header `accept: application/dns-json`

Response includes the full MX record set. Add a 1-hour in-memory cache and a fallback resolver and you have production-grade MX validation in ~40 lines, entirely inside fetch(). NXDOMAIN comes back as Status 3, so you can distinguish "domain doesn't exist" from "no mail server".

Used this to build a contact validation API — the whole email pipeline (syntax, MX, disposable list, typo suggestions) runs in one edge function with zero infrastructure.

---

## r/Entrepreneur / r/EntrepreneurRideAlong

**Title:** Launched my 2nd micro-API in 24 hours: $0 hosting, $5 price point, aiming for volume

**Body:**

Strategy: "toothpaste products" — things used by masses, bought cheap, repurchased forever. For APIs that means utilities every app needs.

Last week: federal contract intelligence API (niche, $19-249/mo).
This week: email + phone validation API (mass market, $0-49/mo).

The unit economics of the second one: hosting is a free-tier edge function, DNS lookups are free, the disposable-domain data is open source. Marginal cost per request ≈ $0. Every subscriber is essentially pure margin, and the free tier costs me nothing to give away.

Distribution: RapidAPI marketplace (built-in demand for "email validation" searches) + dev.to writeups + being useful in relevant threads.

Will report back with subscriber numbers in a month. Ask me anything.
