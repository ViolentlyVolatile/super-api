// G-code analysis: print time, filament usage, cost, layers, feature split.
// Supports PrusaSlicer, Cura, Bambu Studio, OrcaSlicer output (and generic
// RepRap-flavor G-code).

export interface GcodeParams {
  filament_diameter_mm?: number; // default 1.75
  filament_density_g_cm3?: number; // default 1.24 (PLA)
  filament_price_per_kg?: number; // default 20 USD
  printer_watts?: number; // default 150
  energy_price_per_kwh?: number; // default 0.15
  machine_rate_per_hr?: number; // default 0 (hobby)
}

export interface GcodeReport {
  time_s: number;
  time_readable: string;
  time_source: "slicer_comment" | "computed";
  computed_time_s: number;
  slicer_time_s: number | null;
  slicer: string | null;
  layer_count: number;
  filament_mm: number;
  filament_cm3: number;
  filament_g: number;
  cost: {
    material: number;
    energy: number;
    machine: number;
    total: number;
    currency: "USD";
  };
  feature_time_split: Record<string, number>;
  assumptions: Record<string, number>;
  notes: string[];
}

const DEFAULTS = {
  filament_diameter_mm: 1.75,
  filament_density_g_cm3: 1.24,
  filament_price_per_kg: 20,
  printer_watts: 150,
  energy_price_per_kwh: 0.15,
  machine_rate_per_hr: 0,
};

function parseDuration(s: string): number | null {
  // "2d 3h 4m 5s" / "1h 2m" / "45m 30s"
  let total = 0, found = false;
  const re = /(\d+)\s*([dhms])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    found = true;
    const v = parseInt(m[1], 10);
    total += m[2] === "d" ? v * 86400 : m[2] === "h" ? v * 3600 : m[2] === "m" ? v * 60 : v;
  }
  return found ? total : null;
}

export function readable(sec: number): string {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function analyzeGcode(text: string, params: GcodeParams = {}): GcodeReport {
  const p = { ...DEFAULTS, ...stripUndef(params) };

  let x = 0, y = 0, z = 0, e = 0;
  let feed = 1500; // mm/min fallback
  let absoluteE = true;
  let extruded = 0; // mm of filament pushed
  let computedTime = 0;
  let slicerTime: number | null = null;
  let slicer: string | null = null;
  const zLayers = new Set<number>();
  let layerCommentCount = 0;
  let layerCountComment: number | null = null;
  let currentFeature = "other";
  const featureTime: Record<string, number> = {};

  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.length === 0) continue;

    if (line.startsWith(";")) {
      const c = line.slice(1).trim();
      // Slicer identification
      if (slicer === null) {
        const low = c.toLowerCase();
        if (low.includes("prusaslicer")) slicer = "PrusaSlicer";
        else if (low.includes("cura")) slicer = "Cura";
        else if (low.includes("bambu")) slicer = "BambuStudio";
        else if (low.includes("orcaslicer")) slicer = "OrcaSlicer";
        else if (low.includes("slic3r")) slicer = "Slic3r";
      }
      // Time comments
      if (c.startsWith("TIME:")) {
        const v = parseInt(c.slice(5).trim(), 10);
        if (!isNaN(v)) slicerTime = v;
      } else if (/estimated printing time/i.test(c)) {
        const d = parseDuration(c.split("=").pop() ?? "");
        if (d !== null) slicerTime = d;
      } else if (/total estimated time:/i.test(c)) {
        const d = parseDuration(c.split(":").slice(1).join(":"));
        if (d !== null) slicerTime = d;
      }
      // Layers
      if (/^LAYER_COUNT:/i.test(c)) {
        const v = parseInt(c.split(":")[1], 10);
        if (!isNaN(v)) layerCountComment = v;
      } else if (/^LAYER:/i.test(c)) layerCommentCount++;
      else if (/^LAYER_CHANGE$/i.test(c)) layerCommentCount++;
      // Feature type
      if (/^TYPE:/i.test(c)) {
        currentFeature = normalizeFeature(c.split(":").slice(1).join(":"));
      } else if (/^FEATURE:/i.test(c)) {
        currentFeature = normalizeFeature(c.split(":").slice(1).join(":"));
      }
      continue;
    }

    // Strip inline comment
    const ci = line.indexOf(";");
    const code = (ci >= 0 ? line.slice(0, ci) : line).trim();
    if (code.length === 0) continue;
    const parts = code.split(/\s+/);
    const cmd = parts[0].toUpperCase();

    if (cmd === "M82") { absoluteE = true; continue; }
    if (cmd === "M83") { absoluteE = false; continue; }
    if (cmd === "G90") { /* absolute XYZ (default) */ continue; }
    if (cmd === "G92") {
      for (const w of parts.slice(1)) {
        if (w[0].toUpperCase() === "E") e = parseFloat(w.slice(1)) || 0;
      }
      continue;
    }
    if (cmd === "G0" || cmd === "G1") {
      let nx = x, ny = y, nz = z, ne: number | null = null, nf = feed;
      for (const w of parts.slice(1)) {
        const axis = w[0].toUpperCase();
        const val = parseFloat(w.slice(1));
        if (isNaN(val)) continue;
        if (axis === "X") nx = val;
        else if (axis === "Y") ny = val;
        else if (axis === "Z") nz = val;
        else if (axis === "E") ne = val;
        else if (axis === "F") nf = val;
      }
      feed = nf;
      const dist = Math.sqrt((nx - x) ** 2 + (ny - y) ** 2 + (nz - z) ** 2);
      let dE = 0;
      if (ne !== null) {
        dE = absoluteE ? ne - e : ne;
        e = absoluteE ? ne : e + ne;
        if (dE > 0) extruded += dE;
      }
      const moveLen = dist > 0 ? dist : Math.abs(dE);
      if (moveLen > 0 && feed > 0) {
        const dt = (moveLen / feed) * 60;
        computedTime += dt;
        const f = dE > 0 && dist > 0 ? currentFeature : (dist > 0 ? "travel" : "retract");
        featureTime[f] = (featureTime[f] ?? 0) + dt;
      }
      if (dE > 0 && dist > 0) zLayers.add(Math.round(nz * 100));
      x = nx; y = ny; z = nz;
      continue;
    }
    if (cmd === "G4") { // dwell
      for (const w of parts.slice(1)) {
        const a = w[0].toUpperCase();
        const v = parseFloat(w.slice(1));
        if (a === "S" && !isNaN(v)) computedTime += v;
        if (a === "P" && !isNaN(v)) computedTime += v / 1000;
      }
    }
  }

  // Naive kinematics ignores acceleration; apply a modest correction.
  const correctedComputed = computedTime * 1.12;
  const timeS = slicerTime ?? correctedComputed;

  const layerCount = layerCountComment ?? (layerCommentCount > 0 ? layerCommentCount : zLayers.size);

  const r = p.filament_diameter_mm / 2;
  const filamentMm3 = Math.PI * r * r * extruded;
  const filamentCm3 = filamentMm3 / 1000;
  const filamentG = filamentCm3 * p.filament_density_g_cm3;

  const material = (filamentG / 1000) * p.filament_price_per_kg;
  const hours = timeS / 3600;
  const energy = (p.printer_watts / 1000) * hours * p.energy_price_per_kwh;
  const machine = hours * p.machine_rate_per_hr;

  const split: Record<string, number> = {};
  for (const [k, v] of Object.entries(featureTime)) split[k] = Math.round(v * 1.12);

  return {
    time_s: Math.round(timeS),
    time_readable: readable(timeS),
    time_source: slicerTime !== null ? "slicer_comment" : "computed",
    computed_time_s: Math.round(correctedComputed),
    slicer_time_s: slicerTime,
    slicer,
    layer_count: layerCount,
    filament_mm: Math.round(extruded),
    filament_cm3: Math.round(filamentCm3 * 100) / 100,
    filament_g: Math.round(filamentG * 100) / 100,
    cost: {
      material: usd(material),
      energy: usd(energy),
      machine: usd(machine),
      total: usd(material + energy + machine),
      currency: "USD",
    },
    feature_time_split: split,
    assumptions: {
      filament_diameter_mm: p.filament_diameter_mm,
      filament_density_g_cm3: p.filament_density_g_cm3,
      filament_price_per_kg: p.filament_price_per_kg,
      printer_watts: p.printer_watts,
      energy_price_per_kwh: p.energy_price_per_kwh,
      machine_rate_per_hr: p.machine_rate_per_hr,
    },
    notes: [
      slicerTime !== null
        ? "Time taken from slicer's own estimate embedded in the file (most accurate)."
        : "Time computed from moves with a flat 12% acceleration correction (±15%).",
      "All cost parameters are caller-configurable; defaults shown in `assumptions`.",
    ],
  };
}

function normalizeFeature(s: string): string {
  const f = s.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (f.includes("wall") || f.includes("perimeter")) return "walls";
  if (f.includes("infill") || f.includes("fill")) return "infill";
  if (f.includes("support")) return "support";
  if (f.includes("skirt") || f.includes("brim")) return "skirt_brim";
  if (f.includes("skin") || f.includes("top") || f.includes("bottom") || f.includes("solid")) return "top_bottom";
  if (f.includes("bridge")) return "bridge";
  return "other";
}

function usd(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function stripUndef<T extends Record<string, unknown>>(o: T): Partial<T> {
  const r: Partial<T> = {};
  for (const k in o) if (o[k] !== undefined && o[k] !== null) r[k] = o[k];
  return r;
}
