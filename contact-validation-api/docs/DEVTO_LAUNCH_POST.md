# dev.to launch post — Contact Validation API

**Title:** I bundled email + phone validation into one $0 API (because paying for two subscriptions is silly)

**Tags:** api, webdev, javascript, showdev

---

Every signup form needs the same two checks: is this email real, and is this phone number real? Yet the API market makes you buy them separately — one vendor for email verification, another for phone lookup, two subscriptions, two SDKs.

I built [Contact Validation API](https://rapidapi.com/karan-WuSc97Oof/api/contact-validation-email-phone) to do both in one call, with a free tier that covers most side projects (500 requests/month, no card).

## What it checks

**Email** — one GET request returns:

```json
{
  "email": "john.doe@gmial.com",
  "valid": true,
  "score": 70,
  "deliverable": "risky",
  "reason": "possible_domain_typo",
  "domain": { "mx_found": true, "disposable": false, "free_provider": false },
  "flags": { "role_address": false },
  "did_you_mean": "john.doe@gmail.com"
}
```

That's RFC syntax, a live MX lookup, disposable-domain detection (4,000+ domains, list refreshed daily), role-address and free-provider flags, and — my favorite — typo autocorrect. `gmial.com`, `yahooo.com`, `hotmial.com`: instead of losing the user, you get `did_you_mean` and can prompt them to fix it.

**Phone** — powered by libphonenumber metadata, 240+ regions:

```json
{
  "phone": "9876543210", "valid": true, "e164": "+919876543210",
  "country": "IN", "calling_code": "+91", "type": "MOBILE"
}
```

**Batch** — `POST /batch` takes up to 100 emails + phones and counts as ONE request. Cleaning a 10k-row lead list costs 100 requests, not 10,000. Per-lookup competitors charge $0.0025–0.004 per email; do the math.

## How it's built (the fun part)

The whole thing runs as a single Supabase Edge Function (Deno). No servers, no cold-start-prone free dynos:

- MX checks via DNS-over-HTTPS (Cloudflare primary, Google fallback) with an in-memory cache — no raw socket needed in the edge runtime
- The disposable-domain blocklist is fetched at runtime from the open-source disposable-email-domains project and cached for 24h, so it stays current without redeploys
- Typo suggestions are a bounded Levenshtein against the ~26 most common mailbox providers
- Phone parsing is `npm:libphonenumber-js` via Deno's npm specifiers

Stateless by design: nothing is stored, which makes the GDPR story one sentence long.

## Try it

Free tier: 500 req/mo → [rapidapi.com/.../contact-validation-email-phone](https://rapidapi.com/karan-WuSc97Oof/api/contact-validation-email-phone). Would love feedback — especially edge cases where the scoring feels wrong.

---
*Publish from Karan's dev.to account (ka_shah). Canonical URL: none. Cover image: optional — reuse logo.*
