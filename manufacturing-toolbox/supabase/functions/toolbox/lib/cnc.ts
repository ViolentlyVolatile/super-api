// CNC: cost estimation, feeds & speeds, ISO 286 limits & fits, thread specs.

// ---------------------------------------------------------------- materials
interface CncMat {
  sfm_hss: number;
  sfm_carbide: number;
  mrr_cm3_min: number; // practical carbide roughing MRR on a VMC
  chip_factor: number; // chip-load multiplier vs aluminum
  price_per_kg: number;
  density: number;
}

const CNC_MATERIALS: Record<string, CncMat> = {
  aluminum: { sfm_hss: 300, sfm_carbide: 1000, mrr_cm3_min: 16, chip_factor: 1.0, price_per_kg: 5, density: 2.70 },
  mild_steel: { sfm_hss: 100, sfm_carbide: 400, mrr_cm3_min: 6, chip_factor: 0.7, price_per_kg: 2, density: 7.85 },
  alloy_steel: { sfm_hss: 75, sfm_carbide: 300, mrr_cm3_min: 4.5, chip_factor: 0.6, price_per_kg: 3, density: 7.85 },
  stainless: { sfm_hss: 50, sfm_carbide: 220, mrr_cm3_min: 3, chip_factor: 0.5, price_per_kg: 6, density: 8.0 },
  tool_steel: { sfm_hss: 40, sfm_carbide: 180, mrr_cm3_min: 2.5, chip_factor: 0.5, price_per_kg: 8, density: 7.8 },
  cast_iron: { sfm_hss: 80, sfm_carbide: 300, mrr_cm3_min: 6, chip_factor: 0.65, price_per_kg: 2, density: 7.2 },
  titanium: { sfm_hss: 30, sfm_carbide: 150, mrr_cm3_min: 1.5, chip_factor: 0.4, price_per_kg: 35, density: 4.43 },
  brass: { sfm_hss: 200, sfm_carbide: 600, mrr_cm3_min: 13, chip_factor: 1.0, price_per_kg: 8, density: 8.5 },
  copper: { sfm_hss: 100, sfm_carbide: 400, mrr_cm3_min: 8, chip_factor: 0.8, price_per_kg: 10, density: 8.96 },
  plastic: { sfm_hss: 400, sfm_carbide: 1000, mrr_cm3_min: 20, chip_factor: 1.3, price_per_kg: 6, density: 1.2 },
};

export function cncMaterialNames(): string[] {
  return Object.keys(CNC_MATERIALS);
}

// ------------------------------------------------------------- cost estimate
export interface CncEstimateInput {
  material: string;
  stock_mm: { x: number; y: number; z: number };
  removal_pct?: number; // % of stock machined away, default 40
  tolerance?: "standard" | "precision" | "high"; // ±0.125 / ±0.05 / ±0.01 mm
  finish?: "as_machined" | "bead_blast" | "anodize" | "powder_coat" | "polish";
  quantity?: number;
  machine_rate_per_hr?: number; // default 75
  setup_hours?: number; // default 1.5
  programming_hours?: number; // default 1.0
  margin_pct?: number; // default 0 (report cost, not price)
}

const TOL_MULT = { standard: 1.0, precision: 1.3, high: 1.75 } as const;
const FINISH_COST = { as_machined: 0, bead_blast: 6, anodize: 14, powder_coat: 12, polish: 25 } as const;

export function cncEstimate(inp: CncEstimateInput) {
  const mat = CNC_MATERIALS[(inp.material ?? "").toLowerCase()];
  if (!mat) {
    throw new Error(
      `Unknown material '${inp.material}'. Supported: ${Object.keys(CNC_MATERIALS).join(", ")}.`,
    );
  }
  const { x, y, z } = inp.stock_mm ?? {};
  if (!(x > 0 && y > 0 && z > 0)) throw new Error("stock_mm must have positive x, y, z (mm).");
  const removal = clamp(inp.removal_pct ?? 40, 1, 98) / 100;
  const tol = inp.tolerance ?? "standard";
  const finish = inp.finish ?? "as_machined";
  if (!(tol in TOL_MULT)) throw new Error(`tolerance must be one of ${Object.keys(TOL_MULT).join(", ")}`);
  if (!(finish in FINISH_COST)) throw new Error(`finish must be one of ${Object.keys(FINISH_COST).join(", ")}`);
  const qty = Math.max(1, Math.round(inp.quantity ?? 1));
  const rate = inp.machine_rate_per_hr ?? 75;
  const setupH = inp.setup_hours ?? 1.5;
  const progH = inp.programming_hours ?? 1.0;
  const margin = clamp(inp.margin_pct ?? 0, 0, 500) / 100;

  const stockCm3 = (x * y * z) / 1000;
  const removedCm3 = stockCm3 * removal;
  // Roughing at material MRR + finishing overhead (35%), tolerance multiplier.
  const machiningMin = (removedCm3 / mat.mrr_cm3_min) * 1.35 * TOL_MULT[tol] + 4; // +4 min load/unload/toolchange
  const stockCost = (stockCm3 * mat.density / 1000) * mat.price_per_kg * 1.15; // 15% stock buy waste

  const perPartMachining = (machiningMin / 60) * rate;
  const fixed = (setupH + progH) * rate;

  const unit = (q: number) => {
    const c = perPartMachining * efficiency(q) + stockCost + FINISH_COST[finish] + fixed / q;
    return c * (1 + margin);
  };

  const curve = [1, 10, 100, 1000].map((q) => ({
    quantity: q,
    per_part: r2(unit(q)),
    total: r2(unit(q) * q),
  }));

  return {
    material: inp.material.toLowerCase(),
    stock_cm3: r2(stockCm3),
    removed_cm3: r2(removedCm3),
    stock_cost_per_part: r2(stockCost),
    machining_min_per_part: r2(machiningMin),
    quantity: qty,
    per_part_cost: r2(unit(qty)),
    per_part_range: { low: r2(unit(qty) * 0.8), high: r2(unit(qty) * 1.3) },
    total_cost: r2(unit(qty) * qty),
    batch_curve: curve,
    currency: "USD",
    assumptions: {
      removal_pct: removal * 100,
      tolerance: tol,
      finish,
      machine_rate_per_hr: rate,
      setup_hours: setupH,
      programming_hours: progH,
      margin_pct: margin * 100,
      mrr_cm3_min: mat.mrr_cm3_min,
    },
    notes: [
      "Indicative 3-axis VMC estimate, not a quote. Range reflects geometry complexity unseen by this model.",
      "Per-part machining time drops slightly with quantity (operator learning + optimized fixturing).",
    ],
  };
}

function efficiency(q: number): number {
  return q >= 1000 ? 0.8 : q >= 100 ? 0.85 : q >= 10 ? 0.92 : 1.0;
}

// ------------------------------------------------------------ feeds & speeds
export interface FeedsInput {
  material: string;
  tool: "hss" | "carbide";
  tool_diameter_mm: number;
  flutes?: number; // default 3
  operation?: "slot" | "profile" | "face" | "drill";
}

export function feedsSpeeds(inp: FeedsInput) {
  const mat = CNC_MATERIALS[(inp.material ?? "").toLowerCase()];
  if (!mat) {
    throw new Error(
      `Unknown material '${inp.material}'. Supported: ${Object.keys(CNC_MATERIALS).join(", ")}.`,
    );
  }
  const tool = (inp.tool ?? "carbide").toLowerCase();
  if (tool !== "hss" && tool !== "carbide") throw new Error("tool must be 'hss' or 'carbide'.");
  const d = inp.tool_diameter_mm;
  if (!(d > 0 && d <= 100)) throw new Error("tool_diameter_mm must be 0-100.");
  const flutes = Math.max(1, Math.round(inp.flutes ?? 3));
  const op = inp.operation ?? "profile";

  const sfm = tool === "hss" ? mat.sfm_hss : mat.sfm_carbide;
  const surfaceMPerMin = sfm * 0.3048;
  const rpm = Math.round((surfaceMPerMin * 1000) / (Math.PI * d));

  // Chip load per tooth (mm), interpolated on diameter, scaled by material.
  const baseChip = chipLoad(d) * mat.chip_factor * (op === "drill" ? 0.6 : 1);
  const feedMmMin = Math.round(rpm * baseChip * (op === "drill" ? 1 : flutes));

  const doc = op === "slot"
    ? { axial: [0.25 * d, 0.5 * d], radial: [d, d] }
    : op === "face"
    ? { axial: [0.5, 2], radial: [0.6 * d, 0.75 * d] }
    : op === "drill"
    ? { axial: [d * 3, d * 5], radial: [d, d] } // hole depth guidance
    : { axial: [0.5 * d, 1.5 * d], radial: [0.1 * d, 0.3 * d] }; // profile/adaptive

  return {
    material: inp.material.toLowerCase(),
    tool,
    tool_diameter_mm: d,
    flutes,
    operation: op,
    surface_speed: { sfm, m_min: r2(surfaceMPerMin) },
    rpm,
    chip_load_mm_per_tooth: r2(baseChip * 1000) / 1000,
    feed_mm_min: feedMmMin,
    feed_range_mm_min: { low: Math.round(feedMmMin * 0.7), high: Math.round(feedMmMin * 1.2) },
    depth_of_cut_mm: { axial: doc.axial.map(r2), radial: doc.radial.map(r2) },
    notes: [
      "Starting values for rigid setups with flood/air coolant. Reduce 30% for long-stick tools or thin walls.",
      "RPM capped by your spindle — if rpm exceeds max, run max RPM and scale feed proportionally.",
    ],
  };
}

function chipLoad(d: number): number {
  // (diameter mm, chip load mm/tooth) anchor points for aluminum, carbide.
  const pts: [number, number][] = [[1, 0.005], [3, 0.012], [6, 0.025], [10, 0.04], [12, 0.05], [16, 0.06], [20, 0.08], [25, 0.1]];
  if (d <= pts[0][0]) return pts[0][1];
  if (d >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    if (d <= pts[i][0]) {
      const [d0, c0] = pts[i - 1], [d1, c1] = pts[i];
      return c0 + (c1 - c0) * (d - d0) / (d1 - d0);
    }
  }
  return 0.05;
}

// ------------------------------------------------------- ISO 286 fits/limits
// Computed from the ISO 286-1 formulas (standard tolerance factor i and
// fundamental deviation formulas), which is how the published tables are
// derived. Values in µm.

const DIAMETER_RANGES: [number, number][] = [
  [0, 3], [3, 6], [6, 10], [10, 18], [18, 30], [30, 50], [50, 80],
  [80, 120], [120, 180], [180, 250], [250, 315], [315, 400], [400, 500],
];

function geoMeanD(size: number): number {
  for (const [lo, hi] of DIAMETER_RANGES) {
    if (size > lo && size <= hi) return Math.sqrt(Math.max(lo, 1) * hi);
  }
  throw new Error("Size must be >0 and ≤500 mm.");
}

function itGrade(size: number, grade: number): number {
  const D = geoMeanD(size);
  const i = 0.45 * Math.cbrt(D) + 0.001 * D; // µm
  const mult: Record<number, number> = {
    5: 7, 6: 10, 7: 16, 8: 25, 9: 40, 10: 64, 11: 100, 12: 160, 13: 250,
  };
  if (!(grade in mult)) throw new Error(`IT grade ${grade} not supported (5-13).`);
  return Math.round(mult[grade] * i);
}

/** Fundamental deviation for shafts, µm. Returns es for a..h, ei for j..zc. */
function shaftFundamental(letter: string, size: number, grade: number): { es?: number; ei?: number } {
  const D = geoMeanD(size);
  switch (letter) {
    case "c": return { es: -Math.round(D <= 40 ? 52 * Math.pow(D, 0.2) : 95 + 0.8 * D) };
    case "d": return { es: -Math.round(16 * Math.pow(D, 0.44)) };
    case "e": return { es: -Math.round(11 * Math.pow(D, 0.41)) };
    case "f": return { es: -Math.round(5.5 * Math.pow(D, 0.41)) };
    case "g": return { es: -Math.round(2.5 * Math.pow(D, 0.34)) };
    case "h": return { es: 0 };
    case "js": return {}; // symmetric, handled by caller
    case "k": return { ei: grade >= 4 && grade <= 7 ? Math.round(0.6 * Math.cbrt(D)) : 0 };
    case "m": return { ei: Math.round(itGrade(size, 7) - itGrade(size, 6)) };
    case "n": return { ei: Math.round(5 * Math.pow(D, 0.34)) };
    case "p": return { ei: itGrade(size, 7) + (D <= 3 ? 0 : Math.round(0.04 * D)) };
    case "s": return { ei: D <= 50 ? itGrade(size, 8) + 2 : Math.round(itGrade(size, 7) + 0.4 * D) };
    default: throw new Error(`Deviation letter '${letter}' not supported. Use c d e f g h js k m n p s.`);
  }
}

interface Limits { upper_um: number; lower_um: number; }

export function limitsFor(size: number, letter: string, grade: number, isHole: boolean): Limits {
  const it = itGrade(size, grade);
  const lower = letter.toLowerCase();
  if (lower === "js") {
    const half = it / 2;
    return { upper_um: Math.round(half), lower_um: -Math.round(half) };
  }
  if (isHole) {
    // Hole deviations mirror the shaft rule (general rule): EI(hole X) = -es(shaft x), ES = EI + IT.
    // Valid for C..H and JS without delta correction; K/M/N/P holes at grade ≤8
    // need a delta correction we intentionally don't apply — v1 supports C..H, JS holes.
    if (!"cdefgh".includes(lower)) {
      throw new Error(
        `Hole deviation '${letter.toUpperCase()}' not supported in v1. Supported holes: C D E F G H JS (hole-basis fits).`,
      );
    }
    const f = shaftFundamental(lower, size, grade);
    const EI = -(f.es ?? 0);
    return { upper_um: EI + it, lower_um: EI };
  }
  const f = shaftFundamental(lower, size, grade);
  if (f.es !== undefined) return { upper_um: f.es, lower_um: f.es - it };
  const ei = f.ei ?? 0;
  return { upper_um: ei + it, lower_um: ei };
}

export function isoFit(sizeStr: string, fitStr: string) {
  const size = parseFloat(sizeStr);
  if (!(size > 0 && size <= 500)) throw new Error("Size must be 0-500 mm, e.g. /v1/cnc/fits/25/H7g6");
  const m = fitStr.match(/^([A-Z]{1,2})(\d{1,2})([a-z]{1,2})(\d{1,2})$/);
  if (!m) throw new Error("Fit must look like H7g6 (hole letter+grade, shaft letter+grade).");
  const [, holeLetter, holeGradeS, shaftLetter, shaftGradeS] = m;
  const holeGrade = parseInt(holeGradeS, 10);
  const shaftGrade = parseInt(shaftGradeS, 10);

  const hole = limitsFor(size, holeLetter, holeGrade, true);
  const shaft = limitsFor(size, shaftLetter, shaftGrade, false);

  const um = (v: number) => Math.round((size + v / 1000) * 10000) / 10000;
  const clearanceMin = hole.lower_um - shaft.upper_um; // µm
  const clearanceMax = hole.upper_um - shaft.lower_um;
  const type = clearanceMin >= 0
    ? "clearance"
    : clearanceMax <= 0
    ? "interference"
    : "transition";

  return {
    nominal_mm: size,
    fit: `${holeLetter}${holeGrade}/${shaftLetter}${shaftGrade}`,
    hole: {
      designation: `${holeLetter}${holeGrade}`,
      upper_um: hole.upper_um,
      lower_um: hole.lower_um,
      max_mm: um(hole.upper_um),
      min_mm: um(hole.lower_um),
    },
    shaft: {
      designation: `${shaftLetter}${shaftGrade}`,
      upper_um: shaft.upper_um,
      lower_um: shaft.lower_um,
      max_mm: um(shaft.upper_um),
      min_mm: um(shaft.lower_um),
    },
    fit_type: type,
    clearance_um: { min: clearanceMin, max: clearanceMax },
    notes: [
      "Computed per ISO 286-1 formulas (the basis of the published tables); typically within ±1 µm of handbook tables for d-p letters. C/c uses the coarse main-range formula and can differ ~10 µm from sub-range tables.",
      "v1 supports hole letters C-H/JS and shaft letters c-p,s — covers standard hole-basis fits (H7/g6, H7/k6, H8/f7, H11/c11...).",
    ],
  };
}

// -------------------------------------------------------------------- threads
interface MetricThread { d: number; p: number; series: "coarse" | "fine"; }

const METRIC: Record<string, MetricThread> = {};
for (
  const [d, p] of [[1.6, 0.35], [2, 0.4], [2.5, 0.45], [3, 0.5], [4, 0.7], [5, 0.8], [6, 1], [8, 1.25], [10, 1.5], [12, 1.75], [14, 2], [16, 2], [20, 2.5], [24, 3], [30, 3.5], [36, 4], [42, 4.5], [48, 5], [56, 5.5], [64, 6]]
) METRIC[`m${d}x${p}`] = { d, p, series: "coarse" };
for (
  const [d, p] of [[8, 1], [10, 1.25], [10, 1], [12, 1.5], [12, 1.25], [14, 1.5], [16, 1.5], [20, 1.5], [24, 2], [30, 2]]
) METRIC[`m${d}x${p}`] = { d, p, series: "fine" };

const UNIFIED: Record<string, { major_in: number; tpi: number; series: string; tap_drill: string }> = {
  "#4-40": { major_in: 0.112, tpi: 40, series: "UNC", tap_drill: "#43" },
  "#6-32": { major_in: 0.138, tpi: 32, series: "UNC", tap_drill: "#36" },
  "#8-32": { major_in: 0.164, tpi: 32, series: "UNC", tap_drill: "#29" },
  "#10-24": { major_in: 0.190, tpi: 24, series: "UNC", tap_drill: "#25" },
  "#10-32": { major_in: 0.190, tpi: 32, series: "UNF", tap_drill: "#21" },
  "1/4-20": { major_in: 0.250, tpi: 20, series: "UNC", tap_drill: "#7" },
  "1/4-28": { major_in: 0.250, tpi: 28, series: "UNF", tap_drill: "#3" },
  "5/16-18": { major_in: 0.3125, tpi: 18, series: "UNC", tap_drill: "F" },
  "5/16-24": { major_in: 0.3125, tpi: 24, series: "UNF", tap_drill: "I" },
  "3/8-16": { major_in: 0.375, tpi: 16, series: "UNC", tap_drill: "5/16" },
  "3/8-24": { major_in: 0.375, tpi: 24, series: "UNF", tap_drill: "Q" },
  "7/16-14": { major_in: 0.4375, tpi: 14, series: "UNC", tap_drill: "U" },
  "1/2-13": { major_in: 0.500, tpi: 13, series: "UNC", tap_drill: "27/64" },
  "1/2-20": { major_in: 0.500, tpi: 20, series: "UNF", tap_drill: "29/64" },
  "5/8-11": { major_in: 0.625, tpi: 11, series: "UNC", tap_drill: "17/32" },
  "3/4-10": { major_in: 0.750, tpi: 10, series: "UNC", tap_drill: "21/32" },
  "1-8": { major_in: 1.000, tpi: 8, series: "UNC", tap_drill: "7/8" },
};

const PROOF_MPA: Record<string, number> = { "8.8": 580, "10.9": 830, "12.9": 970 };

export function threadSpec(specRaw: string) {
  const spec = decodeURIComponent(specRaw).trim().toLowerCase().replace(/\s+/g, "");

  // Metric: M8, M8x1.25
  const mm = spec.match(/^m(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?$/);
  if (mm) {
    const d = parseFloat(mm[1]);
    let p = mm[2] ? parseFloat(mm[2]) : NaN;
    if (isNaN(p)) {
      const coarse = Object.values(METRIC).find((t) => t.d === d && t.series === "coarse");
      if (!coarse) throw new Error(`No coarse pitch on record for M${d}. Specify pitch, e.g. M${d}x1.5`);
      p = coarse.p;
    }
    const known = METRIC[`m${d}x${p}`];
    const H = 0.866025 * p;
    const minorExt = d - 1.226869 * p; // external minor (d3)
    const minorInt = d - 1.082532 * p; // internal minor (D1)
    const pitchDia = d - 0.649519 * p;
    const stressAreaMm2 = (Math.PI / 4) * Math.pow(d - 0.9382 * p, 2);
    const torques: Record<string, number> = {};
    for (const [cls, proof] of Object.entries(PROOF_MPA)) {
      const preload = 0.75 * proof * stressAreaMm2; // N
      torques[cls] = r2((0.2 * preload * d) / 1000); // N·m, K=0.2 dry
    }
    return {
      spec: `M${d}x${p}`,
      standard: "ISO 68-1 / ISO 261",
      series: known?.series ?? "non-standard pitch",
      major_diameter_mm: d,
      pitch_mm: p,
      pitch_diameter_mm: r3(pitchDia),
      minor_diameter_external_mm: r3(minorExt),
      minor_diameter_internal_mm: r3(minorInt),
      thread_height_mm: r3(H),
      tap_drill_mm: r2(d - p),
      clearance_hole_mm: { close: r2(d + 0.2 + d * 0.02), normal: r2(d * 1.1) },
      tensile_stress_area_mm2: r2(stressAreaMm2),
      tightening_torque_nm_dry_k02: torques,
      notes: [
        "Tap drill = D - P (≈77% engagement). Torques assume K=0.2 (dry, unplated) and 75% proof preload — verify for critical joints.",
      ],
    };
  }

  // Unified: 1/4-20, #10-32, 0.25-20
  const key = spec.replace(/^no\.?/, "#");
  const uni = UNIFIED[key] ?? UNIFIED[`#${key}`];
  if (uni) {
    const dIn = uni.major_in;
    const dMm = dIn * 25.4;
    const pIn = 1 / uni.tpi;
    const pMm = pIn * 25.4;
    const pitchDiaIn = dIn - 0.649519 * pIn;
    const minorIn = dIn - 1.082532 * pIn;
    const stressAreaIn2 = (Math.PI / 4) * Math.pow(dIn - 0.9743 / uni.tpi, 2);
    return {
      spec: key,
      standard: "ASME B1.1",
      series: uni.series,
      threads_per_inch: uni.tpi,
      major_diameter: { in: dIn, mm: r3(dMm) },
      pitch: { in: r4(pIn), mm: r3(pMm) },
      pitch_diameter: { in: r4(pitchDiaIn), mm: r3(pitchDiaIn * 25.4) },
      minor_diameter: { in: r4(minorIn), mm: r3(minorIn * 25.4) },
      tap_drill: uni.tap_drill,
      tap_drill_mm_approx: r2(dMm - pMm),
      tensile_stress_area: { in2: r4(stressAreaIn2), mm2: r2(stressAreaIn2 * 645.16) },
      notes: ["Tap drill from standard chart (~75% engagement)."],
    };
  }

  throw new Error(
    `Unrecognized thread '${specRaw}'. Use metric (M8, M8x1.25) or unified (1/4-20, #10-32, 3/8-16). Supported unified: ${Object.keys(UNIFIED).join(", ")}`,
  );
}

// ---------------------------------------------------------------- utilities
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
function r3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
