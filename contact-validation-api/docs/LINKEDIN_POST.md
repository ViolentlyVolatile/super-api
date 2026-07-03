# LinkedIn post — Contact Validation API

Suggested timing: Monday July 6, morning (pair with FCI post already scheduled — space them a few hours apart or push this to Tuesday).

---

Shipped: Contact Validation API 🚀

Every signup form, CRM import, and outreach campaign needs the same two checks — is this email real, is this phone number real. Most teams pay two vendors for that.

We bundled both into one API under NexMath's Super API line:

✅ Email: syntax, live MX check, disposable-domain detection (4,000+ domains, refreshed daily), typo autocorrect ("gmial.com → gmail.com"), 0–100 quality score
✅ Phone: 240+ regions, E.164 formatting, line-type detection (mobile / landline / VoIP)
✅ Batch: validate 100 contacts in a single API call — list cleaning at a fraction of per-lookup pricing
✅ Private by design: stateless, nothing stored

Free tier: 500 requests/month. Paid from $5/month.

Built the whole thing on serverless edge infrastructure in a day — marginal cost per request is effectively zero, and the pricing passes that on.

Try it: https://rapidapi.com/karan-WuSc97Oof/api/contact-validation-email-phone

#API #SaaS #DataQuality #EmailValidation #BuildInPublic
