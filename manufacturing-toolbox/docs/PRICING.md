# Pricing (live on RapidAPI 2026-07-03)

| Plan | Price | Requests/mo | Limit type | Overage | Rate limit |
|---|---|---|---|---|---|
| BASIC | $0 | 100 | Hard | — | 10/min |
| PRO ⭐ (Recommended) | $19/mo | 5,000 | Soft | $0.005/req | RapidAPI default (1,000/hr) |
| ULTRA | $79/mo | 50,000 | Soft | $0.002/req | RapidAPI default |
| MEGA | $199/mo | 250,000 | Soft | $0.0015/req | RapidAPI default |

Notes:
- BUILD_PLAN's 3-tier scheme adapted to RapidAPI's 4 default plan slots (matches Contact Validation / VibeGuard pattern).
- BUILD_PLAN's "STL/G-code cost 3x credits" idea not implementable on RapidAPI's per-request billing — dropped for v1; revisit if heavy-file abuse shows up (30 MB file cap is the backstop).
- Known RapidAPI quirk: public pricing strip may show a "BASIC (Deprecated) $0" artifact — same as FCI/contact-validation/vibeguard; removal is consequential, left alone.
- Listing: https://rapidapi.com/karan-WuSc97Oof/api/manufacturing-toolbox-3d-print-cnc-machinist-calcs
