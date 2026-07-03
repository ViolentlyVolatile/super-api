# Manufacturing Toolbox API

**3D Print Quotes, CNC Estimates & Machinist Calculators — one key, eleven tools.**

STL → instant quote. G-code → time & cost. Feeds, speeds, ISO fits, threads,
tolerance stackups, molding & PCB estimates, and a materials database.
Pure compute, stateless — nothing you send is stored.

Live listing: https://rapidapi.com/karan-WuSc97Oof/api/manufacturing-toolbox
(API #4 in the "60 APIs in 60 Days" series.)

## Endpoints

| Group | Endpoint | What it does |
|---|---|---|
| 3DP | `POST /v1/3dp/quote` | STL → volume, mass, print time, cost breakdown, suggested price |
| 3DP | `POST /v1/3dp/analyze` | STL → watertight?, non-manifold edges, shells, thin walls, printability score |
| 3DP | `POST /v1/gcode/analyze` | G-code → accurate time, filament mm/g, cost, layers, feature time split |
| CNC | `POST /v1/cnc/estimate` | Stock + removal + tolerance + finish → per-part cost & batch curve |
| CNC | `POST /v1/cnc/feeds-speeds` | Material + tool → RPM, feed, chip load, depth-of-cut ranges |
| CNC | `GET /v1/cnc/fits/{size}/{fit}` | ISO 286 limits — `/25/H7g6` → hole/shaft limits, clearance, fit type |
| CNC | `GET /v1/cnc/threads/{spec}` | `M8x1.25` or `1%2F4-20` → tap drill, diameters, stress area, torque |
| Tol | `POST /v1/tolerance/stackup` | Dimension chain → worst-case, RSS, contributor ranking |
| Mold | `POST /v1/molding/estimate` | Part volume + cavities + complexity → tooling + per-part @ qty breaks |
| PCB | `POST /v1/pcb/estimate` | Board + layers + qty + assembly → fab/assembly cost, leadtime class |
| Mat | `GET /v1/materials/{id}`, `/v1/materials/search` | 60+ alloys, steels, plastics: density, strength, machinability |

Full request/response examples: `docs/openapi.json`.

## Design decisions

- **Caller-configurable economics.** Every rate ($/kg, $/kWh, machine $/hr,
  margin %) can be overridden per request; defaults are returned in
  `assumptions` so integrators can display them.
- **File input three ways:** `*_base64`, `*_url`, or raw request body.
  STL parsing supports binary and ASCII; G-code parsing recognizes
  PrusaSlicer, Cura, Bambu Studio and OrcaSlicer conventions.
- **Honest accuracy labels.** STL quote is heuristic (±20%); the G-code path
  uses the slicer's own embedded estimate when present. CNC/molding/PCB are
  indicative ranges, not quotes. ISO fits are computed from the ISO 286-1
  formulas (±1 µm of handbook tables for d–p letters).

## Auth

`X-API-Key` header (or `Bearer`, or `?api_key=`). Through RapidAPI the gateway
adds `x-rapidapi-proxy-secret` automatically. Secrets live in env vars /
deployed copy only — this repo keeps `CHANGE_ME` placeholders.

## Hosting

Supabase Edge Function `manufacturing-toolbox` (Deno, zero dependencies),
co-hosted in the contact-validation project (free-tier project cap; functions
are independent). Deploy via Supabase MCP `deploy_edge_function` — resend ALL
files (index.ts, lib/*, deno.json) + `import_map_path=deno.json` each deploy.

## Known v1 limitations

- STL print-time is heuristic unless G-code is provided (G-code path is accurate).
- CNC/molding/PCB estimates are indicative ranges, not quotes.
- Wall-thickness check is a 2V/A heuristic, not a full SDF analysis.
- ISO fits: hole letters C–H/JS, shaft letters c–p,s (covers hole-basis fits).
- Deferred to separate APIs: filament price tracker, machine specs DB, 3D model
  search, DFM checker (days 5–8 of the roadmap).
