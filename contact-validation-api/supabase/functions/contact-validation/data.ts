// Static data sets for contact validation.

// Popular mailbox providers (used for free_provider flag + typo suggestions).
export const FREE_PROVIDERS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.co.in",
  "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it", "yahoo.com.br",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.it",
  "outlook.com", "outlook.in", "live.com", "live.co.uk", "msn.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "protonmail.com", "proton.me",
  "zoho.com", "zohomail.in", "gmx.com", "gmx.de", "gmx.net", "mail.com",
  "yandex.com", "yandex.ru", "mail.ru", "qq.com", "163.com", "126.com",
  "naver.com", "daum.net", "rediffmail.com", "web.de", "t-online.de",
  "orange.fr", "wanadoo.fr", "free.fr", "libero.it", "virgilio.it",
  "uol.com.br", "bol.com.br", "terra.com.br", "comcast.net", "verizon.net",
  "att.net", "sbcglobal.net", "cox.net", "bellsouth.net", "shaw.ca",
  "rogers.com", "btinternet.com", "sky.com", "tutanota.com", "fastmail.com",
  "hey.com", "pm.me", "duck.com",
]);

// Domains used for typo suggestion (most common real providers).
export const POPULAR_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "aol.com", "live.com", "msn.com", "protonmail.com", "proton.me",
  "zoho.com", "gmx.com", "mail.com", "yandex.com", "mail.ru", "qq.com",
  "comcast.net", "verizon.net", "att.net", "me.com", "fastmail.com",
  "googlemail.com", "hotmail.co.uk", "yahoo.co.uk", "web.de", "orange.fr",
];

// Role-based local parts (not personal mailboxes; risky for outreach).
export const ROLE_LOCALS = new Set([
  "admin", "administrator", "webmaster", "hostmaster", "postmaster",
  "info", "contact", "support", "help", "helpdesk", "sales", "marketing",
  "billing", "accounts", "accounting", "finance", "hr", "jobs", "careers",
  "recruiting", "office", "mail", "email", "enquiry", "enquiries",
  "inquiries", "team", "hello", "hi", "press", "media", "legal",
  "compliance", "security", "abuse", "noc", "root", "sysadmin", "it",
  "noreply", "no-reply", "donotreply", "do-not-reply", "notifications",
  "newsletter", "news", "feedback", "orders", "service", "services",
  "customerservice", "customer.service", "privacy", "partnerships",
  "partners", "dev", "developers", "api", "test", "testing", "demo",
]);

// Embedded fallback list of well-known disposable domains.
// The full list (~4k domains) is fetched at runtime from the
// disposable-email-domains project and cached in memory; this fallback is
// only used if that fetch fails on a cold start.
export const DISPOSABLE_FALLBACK = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net",
  "guerrillamail.org", "guerrillamail.biz", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com",
  "tempmail.net", "tempmail.dev", "temp-mail.io", "tempmailo.com",
  "throwawaymail.com", "trashmail.com", "trashmail.de", "trash-mail.com",
  "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.org",
  "getnada.com", "nada.email", "dispostable.com", "maildrop.cc",
  "mailnesia.com", "mintemail.com", "mohmal.com", "spam4.me", "spamgourmet.com",
  "mytemp.email", "mailcatch.com", "inboxkitten.com", "fakeinbox.com",
  "fakemailgenerator.com", "emailondeck.com", "mailsac.com", "moakt.com",
  "tmpmail.org", "tmpmail.net", "tmail.ws", "burnermail.io", "spamex.com",
  "mailexpire.com", "meltmail.com", "armyspy.com", "cuvox.de", "dayrep.com",
  "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com", "rhyta.com",
  "superrito.com", "teleworm.us", "grr.la", "guerrillamailblock.com",
  "pokemail.net", "spam.la", "mvrht.com", "mailtemp.info", "tempail.com",
  "tempr.email", "discard.email", "discardmail.com", "spambog.com",
  "spambog.de", "spambog.ru", "0-mail.com", "0815.ru", "33mail.com",
  "anonbox.net", "anonymbox.com", "byom.de", "chacuo.net", "crazymailing.com",
  "dropmail.me", "emailfake.com", "emlpro.com", "haribu.net", "imgof.com",
  "incognitomail.com", "kurzepost.de", "lifebyfood.com", "linshiyouxiang.net",
  "mail-temporaire.fr", "mailbox52.ga", "mailde.de", "mailhazard.com",
  "mailhz.me", "mailimate.com", "mailismagic.com", "mailme.lv", "mailme24.com",
  "mailmetrash.com", "mailmoat.com", "mailnull.com", "mailshell.com",
  "mailslite.com", "mailzilla.com", "mbx.cc", "mega.zik.dj", "mierdamail.com",
  "mailinator.net", "mailinator.org", "mailinator2.com", "notmailinator.com",
  "objectmail.com", "obobbo.com", "odnorazovoe.ru", "one-time.email",
  "onewaymail.com", "online.ms", "opayq.com", "ordinaryamerican.net",
  "owlpic.com", "pancakemail.com", "pjjkp.com", "plexolan.de",
  "politikerclub.de", "poofy.org", "pookmail.com", "privacy.net",
  "privatdemail.net", "proxymail.eu", "prtnx.com", "putthisinyourspamdatabase.com",
  "quickinbox.com", "rcpt.at", "reallymymail.com", "realtyalerts.ca",
  "recode.me", "recursor.net", "regbypass.com", "rmqkr.net", "royal.net",
  "rtrtr.com", "s0ny.net", "safe-mail.net", "safersignup.de", "safetymail.info",
  "safetypost.de", "sandelf.de", "saynotospams.com", "selfdestructingmail.com",
  "sendspamhere.com", "shieldedmail.com", "shiftmail.com", "shitmail.me",
  "shortmail.net", "sibmail.com", "skeefmail.com", "slaskpost.se",
  "slopsbox.com", "smellfear.com", "snakemail.com", "sneakemail.com",
  "snkmail.com", "sofimail.com", "sofort-mail.de", "sogetthis.com",
  "soodonims.com", "spam.su", "spamavert.com", "spambob.com", "spambob.net",
  "spambob.org", "spambox.info", "spambox.us", "spamcannon.com",
  "spamcannon.net", "spamcero.com", "spamcon.org", "spamcorptastic.com",
  "spamcowboy.com", "spamcowboy.net", "spamcowboy.org", "spamday.com",
  "spamfree24.com", "spamfree24.de", "spamfree24.org", "spamherelots.com",
  "spamhereplease.com", "spamhole.com", "spamify.com", "spaminator.de",
  "spamkill.info", "spaml.com", "spaml.de", "spammotel.com", "spamobox.com",
  "spamoff.de", "spamslicer.com", "spamspot.com", "spamthis.co.uk",
  "spamthisplease.com", "spamtrail.com", "speed.1s.fr", "supergreatmail.com",
  "supermailer.jp", "suremail.info", "tagyourself.com", "talkinator.com",
  "tapchicuoihoi.com", "teewars.org", "teleosaurs.xyz", "temporarily.de",
  "temporarioemail.com.br", "temporaryemail.net", "temporaryforwarding.com",
  "temporaryinbox.com", "temporarymailaddress.com", "thanksnospam.info",
  "thankyou2010.com", "thc.st", "thisisnotmyrealemail.com", "throam.com",
  "tilien.com", "tittbit.in", "tizi.com", "tmailinator.com", "toomail.biz",
  "tradermail.info", "trash2009.com", "trashdevil.com", "trashemail.de",
  "trashymail.com", "trialmail.de", "trillianpro.com", "tyldd.com",
  "uggsrock.com", "umail.net", "uroid.com", "vidchart.com", "viditag.com",
  "viewcastmedia.com", "vomoto.com", "vubby.com", "wasteland.rfc822.org",
  "webemail.me", "weg-werf-email.de", "wegwerf-emails.de", "wegwerfadresse.de",
  "wegwerfemail.com", "wegwerfemail.de", "wegwerfmail.de", "wegwerfmail.net",
  "wegwerfmail.org", "wh4f.org", "whyspam.me", "willhackforfood.biz",
  "willselfdestruct.com", "winemaven.info", "wronghead.com", "wuzup.net",
  "wuzupmail.net", "xagloo.com", "xemaps.com", "xents.com", "xmaily.com",
  "xoxy.net", "yep.it", "yogamaven.com", "yopmail.pp.ua", "yourdomain.com",
  "yuurok.com", "zehnminutenmail.de", "zippymail.info", "zoemail.net",
  "zomg.info",
]);

export const DISPOSABLE_LIST_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf";
