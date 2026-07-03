# Manufacturing Toolbox API — 1-Day Build Plan (API #4)

One Supabase Edge Function, one RapidAPI listing, 11 endpoints across 5 sub-API groups.
Decisions: counts as 1 API · caller-configurable cost params with defaults · pure compute, zero scraping (🟢).

## Repo structure
```
manufacturing-toolbox/
├── supabase/functions/toolbox/
│   ├── index.ts            # router: /v1/{group}/{op}, auth via RapidAPI proxy secret
│   ├── lib/
│   │   ├── stl.ts          # binary+ASCII STL parse: volume (signed tetrahedra), area, bbox, triangle count
│   │   ├── mesh_checks.ts  # manifold edges, degenerate tris, shell count, wall-thickness heuristic
│   │   ├── gcode.ts        # stream-parse G-code: time est (accel-naive + firmware comment fallback), E-length → filament
│   │   ├── cnc.ts          # machining cost model + feeds/speeds tables + ISO 286 fits + thread specs
│   │   ├── stackup.ts      # worst-case + RSS
│   │   ├── molding.ts      # tooling + per-part cost curves (cavity count, material, cycle est)
│   │   ├── pcb.ts          # fab+assembly parametric estimate
│   │   └── materials.ts    # ~100-entry seed JSON (alloys, steels, Al, Ti, plastics: density, tensile, modulus, Tm, cost class)
│   └── data/*.json         # static tables: SFM/chip-load, ISO fits, threads (UNC/UNF/metric), materials
└── openapi.yaml
```
No database needed for v1 — all static JSON bundled with the function. (Postgres only if/when we add saved-quote history as a paid feature.)

## Endpoints (all POST unless noted)
| Group | Endpoint | In | Out |
|---|---|---|---|
| 3DP | `/v1/3dp/quote` | STL (base64 or URL) + optional params (material, $/kg, infill %, layer h, speed, $/kWh, machine rate, margin) | volume cm³, mass g, print time, material/energy/machine cost, suggested price |
| 3DP | `/v1/3dp/analyze` | STL | watertight?, non-manifold edges, shells, bbox, min-wall flag, printability score |
| 3DP | `/v1/gcode/analyze` | G-code file | time, filament mm/g, cost, layer count, per-feature time split |
| CNC | `/v1/cnc/estimate` | material, stock dims, removal %, tolerance class, finish, qty | setup + per-part cost range, batch curve |
| CNC | `/v1/cnc/feeds-speeds` | material + tool type/diameter + operation | RPM, feed, DOC/WOC ranges |
| CNC | GET `/v1/cnc/fits/{size}/{fit}` | e.g. 25/H7g6 | hole/shaft limits, clearance range |
| CNC | GET `/v1/cnc/threads/{spec}` | e.g. M8x1.25, 1/4-20 | tap drill, pitch/minor dia, torque class |
| Tol | `/v1/tolerance/stackup` | array of dims + tolerances | worst-case, RSS, contributor ranking |
| Mold | `/v1/molding/estimate` | part vol, material, cavities, complexity 1-5, qty | tooling cost, per-part cost @ qty breaks |
| PCB | `/v1/pcb/estimate` | layers, dims, qty, finish, assembly? | fab + assembly cost range, leadtime class |
| Mat | GET `/v1/materials/{id}` + `/v1/materials/search` | id/query | properties JSON |

## Day-of schedule (10 hrs)
1. **H1:** clone template repo, router + auth + error envelope
2. **H2–3:** stl.ts + mesh_checks.ts (test with 5 sample STLs incl. broken ones)
3. **H4:** gcode.ts (test: Prusa + Cura + Bambu sample files)
4. **H5:** cnc.ts + static tables (fits/threads/SFM data — generate tables via script, spot-check against Machinery's Handbook values)
5. **H6:** stackup + molding + pcb + materials (small modules, mostly formulas)
6. **H7:** deploy, run all endpoints through testing dashboard, fix
7. **H8:** RapidAPI listing (copy below), pricing tiers, freemium limits
8. **H9:** dev.to post: "I bundled 9 manufacturing calculators into one API in a day"
9. **H10:** buffer / v1 polish

## Pricing
- Free: 100 req/mo, STL ≤ 5 MB
- Pro $19/mo: 5k req, STL ≤ 50 MB
- Business $79/mo: 50k req, batch endpoints, priority
- STL/G-code endpoints cost more credits (3x) than table lookups.

## RapidAPI listing copy (draft)
**Name:** Manufacturing Toolbox — 3D Print Quotes, CNC Estimates & Machinist Calculators
**Tagline:** STL → instant quote. G-code → time & cost. Feeds, speeds, fits, threads, tolerance stackups, molding & PCB estimates. One key, eleven tools.
**Target users:** print-shop SaaS, maker marketplaces, CNC quoting tools, engineering calculators, Shopify 3DP stores.

## Deferred to separate APIs (still on roadmap)
Filament Price Tracker (scraper), Machine Specs DB (curation), 3D Model Search (scraping), DFM Checker (AI). Days 5–8.

## Known v1 limitations (state honestly in docs)
- Print-time estimate is heuristic (±20%) unless G-code provided — G-code path is accurate.
- CNC/molding/PCB estimates are indicative ranges, not quotes.
- Wall-thickness check is sampling-based, not full SDF.
