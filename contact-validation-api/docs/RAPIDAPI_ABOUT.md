## Email + phone validation in one cheap, fast API

Stop fake signups, bounced emails, and junk phone numbers before they enter your database. One subscription covers both checks — competitors charge for each separately. Stateless: nothing you send is stored or logged.

## What you get

| Endpoint | What it does |
|---|---|
| `GET /email` | Syntax, live MX lookup, disposable & role-address detection, free-provider flag, typo autocorrect (`did_you_mean`), and a 0–100 deliverability score |
| `GET /phone` | Validate numbers across 240+ regions — E.164 formatting, region, calling code, and line type (mobile / fixed / VOIP / toll-free) |
| `POST /batch` | Up to 100 emails and/or phones in a single request (1 call = 1 request) |

## Quickstart

**1. Subscribe** (Basic is free — 500 checks/month) to get your `X-RapidAPI-Key`.

**2. Validate an email:**

```bash
curl 'https://contact-validation-email-phone.p.rapidapi.com/email?email=jhon@gmial.com' \
  -H 'X-RapidAPI-Key: YOUR_KEY' \
  -H 'X-RapidAPI-Host: contact-validation-email-phone.p.rapidapi.com'
```

**3. Get back a scored, actionable verdict — including a typo fix:**

```json
{
  "email": "jhon@gmial.com",
  "valid": true,
  "score": 70,
  "deliverable": "risky",
  "reason": "possible_domain_typo",
  "domain": { "mx_found": true, "disposable": false, "free_provider": true },
  "flags": { "role_address": false, "disposable": false, "free_provider": true },
  "did_you_mean": "jhon@gmail.com"
}
```

## Fast mode — skip the network when you only need syntax

The MX/deliverability lookup is the only network call in the request. For high-volume, latency-sensitive screening (form fields, autocomplete), add **`mx=false`** to get a network-free, sub-second syntax + disposable + typo check:

```
GET /email?email=user@example.com&mx=false
```

The response comes back with `reason: "mx_check_skipped"` and `deliverable: "unknown"` so you know deliverability wasn't tested. On `/batch`, send `"check_mx": false` to apply it to the whole batch.

## Deliverable verdicts

`yes` (MX present, clean) · `risky` (disposable, role, or likely typo) · `no` (no mail server) · `unknown` (lookup skipped or DNS failed). Use `score` for a single 0–100 signal, or `deliverable` + `flags` for rules.

## Notes

Validation is syntax + DNS + heuristics — it does not send mail or perform SMTP probing, so it can't detect a full mailbox. The disposable-domain list refreshes daily from the community `disposable-email-domains` project. Independent service.
