# Super_API — 60 APIs in 60 Days: Execution Plan (v4 FINAL)

**Status:** 4/60 shipped · Locked July 3, 2026.
**v4 change:** Manufacturing = Day 4 ONLY (Manufacturing Toolbox, 11 endpoints, counts as 1). Filament tracker, machine specs DB, model search, DFM checker CUT. All categories pull forward; days 49–60 = 12 open slots.
**v5 change (July 7, 2026):** Day 5 = Telegram Channel Intelligence (replaces Pincode + IFSC, which moves to the Days 49–60 candidate pool; Pinterest Webscraper considered then parked in candidate pool). India Stack now Days 6–14 (9 APIs).

## Locked decisions
- Risk: 🟢 open data + 🟡 public-page scraping only. No anti-bot 🔴 targets. GST = legal route only (GSP/official API).
- Cadence: strict 1 API/day. L-effort ships thin v1, deepens post-Day-60.
- Manufacturing Toolbox spec ready: `manufacturing-toolbox/BUILD_PLAN.md` + `openapi.yaml`.

## Shipped
| # | API | Notes |
|---|-----|-------|
| 1 | FCI — Federal Contract Intelligence | USAspending; live |
| 2 | Contact Validation | Email + phone |
| 3 | VibeGuard | Market to vibe-coders only |
| 4 | Manufacturing Toolbox | 11 endpoints; live on RapidAPI |

## Operating principles
- One repo template cloned daily: Supabase Edge Function + RapidAPI listing + OpenAPI spec + dev.to post + testing-dashboard entry.
- Data moat > wrapper. Reusable infra: scraper-cron template, dataset-loader, LLM-parse template.
- Pricing default: freemium 50–100 req/mo → $9/$29/$99. AI/compute endpoints paid-tier only.
- Kill criteria: 0 subscribers + <100 free signups in 30 days → freeze, keep listed.

---

## Roadmap (# = day = build order)

### Day 4 — Manufacturing Toolbox (1 API, 11 endpoints)
| # | API | Scope | Effort | Risk |
|---|-----|-------|--------|------|
| 4 | Manufacturing Toolbox | 3DP quote, STL analyze, G-code analyze, CNC estimate, feeds/speeds, ISO fits, threads, tolerance stackup, molding + PCB estimates, materials DB. Caller-configurable rates. | L (spec done) | 🟢 |

### Day 5 — Telegram Channel Intelligence
| # | API | v1 scope | Effort | Risk |
|---|-----|----------|--------|------|
| 5 | Telegram Channel Intelligence | Public channels via t.me/s/ web preview (logged-out, no API key): channel info + subscribers, recent posts w/ views/reactions/forwards/media, keyword filter. Buyers: crypto, OSINT, marketing. ~1B MAU platform, thin RapidAPI competition. | M | 🟡 |

### India Stack — Days 6–14 (9 APIs)
| # | API | v1 scope / decision | Effort | Risk |
|---|-----|---------------------|--------|------|
| 6 | India AQI | City + station level, CPCB normalized | S | 🟢 |
| 7 | Mutual Fund NAV + Returns | AMFI NAVAll + computed returns/SIP math | S | 🟢 |
| 8 | Mandi (Agri) Prices | Agmarknet/data.gov.in, clean commodity+market schema | M | 🟢 |
| 9 | Indian Holidays + Panchang | National/state holidays + muhurat/tithi endpoints | S | 🟢 |
| 10 | PAN/Aadhaar Format Validator | Offline checksum/format validation (no PII lookup) | S | 🟢 |
| 11 | Fuel Prices India | Daily petrol/diesel/CNG by city | S | 🟡 |
| 12 | EV Charging Stations India | Open govt data, geo-search | S | 🟢 |
| 13 | GST Verification | LEGAL ROUTE ONLY: GSP partner/official API; resell + caching | M | 🟢 |
| 14 | MCA Company + Director Lookup | Master-data subset v1; proven demand | L | 🟡 |

### AI-Powered Parsers — Days 15–22 (8 APIs)
| # | API | v1 scope | Effort | Risk |
|---|-----|----------|--------|------|
| 15 | Resume Parser | PDF/docx → structured JSON | M | 🟢 |
| 16 | Job Posting Parser | Salary/skills/remote normalization | S | 🟢 |
| 17 | Invoice/Receipt OCR → JSON | LLM line-item extraction | M | 🟢 |
| 18 | Contract Clause Extractor | Parties, dates, obligations, red flags | M | 🟢 |
| 19 | Structured-Data-from-URL | URL + JSON schema in → filled JSON out | M | 🟡 |
| 20 | Audio Transcription | Whisper-based, per-minute pricing | M | 🟢 |
| 21 | AI Content Detector | Score + confidence, clear disclaimers | S | 🟢 |
| 22 | Multilingual Moderation | Toxicity/profanity incl. Hinglish | M | 🟢 |

### Developer Utilities — Days 23–34 (12 APIs)
| # | API | Effort | Risk |
|---|-----|--------|------|
| 23 | Tech-Stack Detector | S | 🟡 |
| 24 | WHOIS + Domain Age + DNS Health | S | 🟢 |
| 25 | SSL Cert Expiry Monitor + webhook | S | 🟢 |
| 26 | Logo + Brand Color Extractor | S | 🟡 |
| 27 | OpenGraph/Metadata Extractor | S | 🟢 |
| 28 | Redirect Chain Unroller + Link Safety | S | 🟢 |
| 29 | RSS Finder + Feed-to-JSON | S | 🟢 |
| 30 | Website Change Monitor + diff webhook | M | 🟡 |
| 31 | IP Intelligence (VPN/proxy/DC) | M | 🟢 |
| 32 | User-Agent Parser + Bot Detector | S | 🟢 |
| 33 | Global Holidays + Business-Day Calc | S | 🟢 |
| 34 | Screenshot + HTML-to-PDF | M | 🟢 |

### Content, SEO & Social — Days 35–41 (7 APIs)
| # | API | Effort | Risk |
|---|-----|--------|------|
| 35 | Article Extractor + AI Summary | S | 🟡 |
| 36 | YouTube Data + Transcripts | M | 🟡 |
| 37 | Reddit Keyword/Trend Monitor | M | 🟡 |
| 38 | News Sentiment by Company/Topic | M | 🟢 |
| 39 | Launch Tracker (Product Hunt + HN) | S | 🟢 |
| 40 | App Store Intelligence (iOS+Android) | M | 🟡 |
| 41 | Expired/Dropping Domains Finder | M | 🟡 |

### US Gov Data (survivors) — Days 42–48 (7 APIs)
| # | API | v1 decision | Effort | Risk |
|---|-----|-------------|--------|------|
| 42 | SAM.gov Entity + Exclusions | Mirror monthly extract into Postgres | S | 🟢 |
| 43 | EDGAR Insider Trades | Form 4 first; 13F/8-K as v2 | M | 🟢 |
| 44 | FDA Recalls | All recalls via openFDA | S | 🟢 |
| 45 | OSHA Violations | OSHA only; WHD later | M | 🟢 |
| 46 | Trademark Search + Watch | Search + watch-webhook day 1 | M | 🟢 |
| 47 | Patent Search + AI Summary | Search free, AI summary paid | M | 🟢 |
| 48 | FEMA Flood Zone Lookup | Address input via free Census geocoder | M | 🟢 |

### Days 49–60 — 12 OPEN SLOTS
To be decided around Day 40 based on what's actually selling. Candidate pools:
- v2 expansions of winners (e.g., Toolbox DFM endpoint, EDGAR 13F, more MCA depth)
- More India (Pincode + IFSC Unified Lookup [moved from Day 5], train status, e-challan-adjacent, regional language tools)
- Revived kills if demand signals appear (layoffs tracker, hiring signals, Pinterest Webscraper [🔴 — only via wrapper provider, cost model first])
- New ideas from dev.to/RapidAPI feedback during the run

## Weekly rhythm & marketing
- Mon–Sat ship; Sun = S-effort API + retro + schedule dev.to posts + dashboard update.
- Every API = 1 dev.to post ("60 APIs in 60 Days", ka_shah). Collections: Maker/Manufacturing, India Stack, AI Parse, Dev Toolbox, Content Intel, Gov Data.
- Cross-sell: VibeGuard ↔ IP-Intel/UA-Parser; FCI ↔ SAM/EDGAR/Patents.

## Success metrics
60 listed by Day 60 · ≥40 with paying-tier funnel · ≥5 with paying customers · dev.to series ≥10k views.
