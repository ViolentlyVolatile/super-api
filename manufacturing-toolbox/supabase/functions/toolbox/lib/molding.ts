// Injection molding: tooling cost + per-part cost at quantity breaks.

export interface MoldingInput {
  part_volume_cm3: number;
  material?: string; // pp | abs | pc | nylon | pom | tpu | pe | ps | pmma
  cavities?: number; // default 1
  complexity?: 1 | 2 | 3 | 4 | 5; // 1 simple open/shut … 5 lifters+slides+tight tol
  quantity?: number;
  machine_rate_per_hr?: number; // default 45
  material_price_per_kg?: number; // overrides table
  tooling_region?: "asia" | "us_eu"; // default asia
}

const RESINS: Record<string, { density: number; price: number }> = {
  pp: { density: 0.905, price: 1.8 },
  pe: { density: 0.95, price: 1.6 },
  ps: { density: 1.05, price: 1.9 },
  abs: { density: 1.05, price: 2.3 },
  pmma: { density: 1.18, price: 2.8 },
  pom: { density: 1.41, price: 3.2 },
  pc: { density: 1.20, price: 3.5 },
  nylon: { density: 1.14, price: 3.8 },
  tpu: { density: 1.21, price: 4.5 },
};

export function moldingEstimate(inp: MoldingInput) {
  const vol = inp.part_volume_cm3;
  if (!(vol > 0 && vol <= 10000)) throw new Error("part_volume_cm3 must be 0-10000.");
  const matName = (inp.material ?? "abs").toLowerCase();
  const resin = RESINS[matName];
  if (!resin) throw new Error(`Unknown material '${matName}'. Supported: ${Object.keys(RESINS).join(", ")}.`);
  const cavities = Math.max(1, Math.min(64, Math.round(inp.cavities ?? 1)));
  const complexity = Math.max(1, Math.min(5, Math.round(inp.complexity ?? 2))) as 1 | 2 | 3 | 4 | 5;
  const qty = Math.max(1, Math.round(inp.quantity ?? 10000));
  const rate = inp.machine_rate_per_hr ?? 45;
  const resinPrice = inp.material_price_per_kg ?? resin.price;
  const region = inp.tooling_region ?? "asia";
  const regionMult = region === "us_eu" ? 2.2 : 1.0;

  // Tooling: base + complexity + size, scaled by cavitation (sub-linear).
  const sizeFactor = 180 * Math.pow(vol, 0.5);
  const singleCavityTool = (3500 + 1600 * complexity + sizeFactor) * regionMult;
  const tooling = singleCavityTool * (0.55 + 0.45 * cavities);

  // Cycle time: injection+pack+eject baseline, cooling grows with section size.
  const cycleS = 8 + 2.2 * complexity + 4.5 * Math.pow(vol, 1 / 3);
  const shotsPerHr = 3600 / cycleS;
  const partsPerHr = shotsPerHr * cavities;

  const massG = vol * resin.density;
  const materialPerPart = (massG / 1000) * resinPrice * 1.06; // runner/sprue waste
  const machinePerPart = rate / partsPerHr;
  const perPartProcess = (materialPerPart + machinePerPart) * 1.15; // QC/handling overhead

  const breaks = [1000, 10000, 100000, 1000000].map((q) => ({
    quantity: q,
    tooling_amortized: r4(tooling / q),
    per_part_total: r4(perPartProcess + tooling / q),
  }));

  return {
    material: matName,
    part_mass_g: r2(massG),
    cavities,
    complexity,
    tooling_cost: Math.round(tooling),
    tooling_cost_range: { low: Math.round(tooling * 0.75), high: Math.round(tooling * 1.4) },
    cycle_time_s: r2(cycleS),
    parts_per_hour: Math.round(partsPerHr),
    per_part_process_cost: r4(perPartProcess),
    quantity: qty,
    per_part_at_quantity: r4(perPartProcess + tooling / qty),
    quantity_breaks: breaks,
    currency: "USD",
    assumptions: {
      machine_rate_per_hr: rate,
      material_price_per_kg: resinPrice,
      tooling_region: region,
      runner_waste_pct: 6,
      overhead_pct: 15,
    },
    notes: [
      "Indicative budgetary estimate — tooling varies ±40% with steel choice, texture, and shop.",
      "Complexity: 1 open/shut, 2 few features, 3 moderate w/ inserts, 4 slides, 5 lifters+slides+tight tolerances.",
    ],
  };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
