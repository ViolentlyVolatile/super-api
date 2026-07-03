## Eleven manufacturing calculators behind one key

3D printing, CNC, injection molding, PCB, and a materials database — the math a shop, maker, or MES app needs, as clean JSON. Pure compute, stateless, and every rate is caller-configurable so the numbers match *your* shop.

## What you get

| Endpoint | What it does |
|---|---|
| `POST /v1/3dp/quote` | STL → volume, mass, print time, cost, and suggested price |
| `POST /v1/3dp/analyze` | STL → watertight / manifold / shells / wall thickness + printability score |
| `POST /v1/gcode/analyze` | G-code → print time, filament, cost, layers, feature-time split |
| `POST /v1/cnc/estimate` | Material + stock + removal → cost breakdown and a batch-quantity curve |
| `POST /v1/cnc/feeds-speeds` | Material + tool → RPM, feed, depth of cut |
| `GET /v1/cnc/fits/{size}/{fit}` | ISO 286 hole/shaft limits, clearance, fit type (e.g. `25/H7g6`) |
| `GET /v1/cnc/threads/{spec}` | Tap drill, diameters, torque — metric (`M8x1.25`) or unified (`1/4-20`) |
| `POST /v1/tolerance/stackup` | Worst-case and RSS stackups with per-dimension variance share |
| `POST /v1/molding/estimate` | Tooling + per-part cost at quantity breaks |
| `POST /v1/pcb/estimate` | Fab + assembly cost and lead time |
| `GET /v1/materials/search` · `/{id}` | 60+ alloys, steels, and plastics with mechanical properties |

## Quickstart

**1. Subscribe** (Basic is free — 100 calls/month) to get your `X-RapidAPI-Key`.

**2. Get a machinist fit in one GET** — a 25 mm H7/g6 clearance fit:

```bash
curl 'https://manufacturing-toolbox.p.rapidapi.com/v1/cnc/fits/25/H7g6' \
  -H 'X-RapidAPI-Key: YOUR_KEY' \
  -H 'X-RapidAPI-Host: manufacturing-toolbox.p.rapidapi.com'
```

**3. Get back hole/shaft limits and the fit type:**

```json
{
  "nominal_mm": 25,
  "fit": "H7/g6",
  "hole":  { "upper_um": 21, "lower_um": 0,   "max_mm": 25.021, "min_mm": 25.0 },
  "shaft": { "upper_um": -7, "lower_um": -20, "max_mm": 24.993, "min_mm": 24.98 },
  "fit_type": "clearance",
  "clearance_um": { "min": 7, "max": 41 }
}
```

## Sending files

STL and G-code endpoints accept the file three ways: `stl_base64` / `gcode_base64`, a `stl_url` / `gcode_url` to fetch, or the raw file as the request body. Max 30 MB. Fetched URLs must be public — private, loopback, and link-local hosts are rejected.

## Notes

Estimates are engineering approximations for quoting and screening (±20% on 3D-print heuristics; ISO 286 fits computed from the standard's formulas, typically within ±1 µm of table values for common letters) — not certified quotes or material certifications. All cost inputs (rates, prices, margins) are overridable per request.
