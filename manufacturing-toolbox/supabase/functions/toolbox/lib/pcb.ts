// PCB fabrication + assembly parametric estimate.

export interface PcbInput {
  width_mm: number;
  height_mm: number;
  layers?: 1 | 2 | 4 | 6 | 8 | 10; // default 2
  quantity?: number; // default 10
  finish?: "hasl" | "enig"; // default hasl
  copper_oz?: 1 | 2; // default 1
  assembly?: {
    smd_components?: number;
    tht_components?: number;
    unique_parts?: number; // BOM lines, drives setup
    sides?: 1 | 2;
  };
}

const LAYER_MULT: Record<number, number> = { 1: 0.9, 2: 1.0, 4: 2.1, 6: 3.4, 8: 5.0, 10: 6.8 };

export function pcbEstimate(inp: PcbInput) {
  const w = inp.width_mm, h = inp.height_mm;
  if (!(w > 0 && w <= 600 && h > 0 && h <= 600)) throw new Error("width_mm/height_mm must be 0-600.");
  const layers = inp.layers ?? 2;
  if (!(layers in LAYER_MULT)) throw new Error(`layers must be one of ${Object.keys(LAYER_MULT).join(", ")}.`);
  const qty = Math.max(1, Math.round(inp.quantity ?? 10));
  const finish = (inp.finish ?? "hasl").toLowerCase();
  if (finish !== "hasl" && finish !== "enig") throw new Error("finish must be 'hasl' or 'enig'.");
  const copper = inp.copper_oz ?? 1;

  const areaDm2 = (w * h) / 10000;
  const lm = LAYER_MULT[layers];

  // Fab: setup + per-board area cost with quantity discount.
  const fabSetup = 45 + 18 * lm + (finish === "enig" ? 25 : 0);
  const qtyDiscount = Math.pow(qty, -0.18); // per-board cost falls with volume
  let perBoardFab = (1.4 + 3.1 * areaDm2 * lm) * qtyDiscount * (finish === "enig" ? 1.18 : 1) *
    (copper === 2 ? 1.15 : 1);
  perBoardFab = Math.max(perBoardFab, 0.12); // floor

  const fabTotal = fabSetup + perBoardFab * qty;

  // Assembly (optional).
  let assembly: Record<string, unknown> | null = null;
  let asmTotal = 0;
  if (inp.assembly && ((inp.assembly.smd_components ?? 0) + (inp.assembly.tht_components ?? 0)) > 0) {
    const smd = Math.max(0, Math.round(inp.assembly.smd_components ?? 0));
    const tht = Math.max(0, Math.round(inp.assembly.tht_components ?? 0));
    const unique = Math.max(1, Math.round(inp.assembly.unique_parts ?? Math.ceil((smd + tht) / 4)));
    const sides = inp.assembly.sides === 2 ? 2 : 1;
    const asmSetup = 60 + 3.5 * unique + (sides === 2 ? 40 : 0) + 30; // incl. stencil
    const perBoardAsm = (smd * 0.035 + tht * 0.16) * Math.pow(qty, -0.12) * sides ** 0.1;
    asmTotal = asmSetup + perBoardAsm * qty;
    assembly = {
      smd_components: smd,
      tht_components: tht,
      unique_parts: unique,
      sides,
      setup_cost: r2(asmSetup),
      per_board: r2(perBoardAsm),
      total: r2(asmTotal),
      note: "Excludes component (BOM) cost — labor/machine only.",
    };
  }

  const total = fabTotal + asmTotal;
  const leadtime = qty > 500 || layers > 4
    ? { class: "extended", days: "12-18" }
    : qty > 50 || layers > 2
    ? { class: "standard", days: "7-12" }
    : { class: "quick_turn", days: "3-7" };

  return {
    board: { width_mm: w, height_mm: h, area_cm2: r2(w * h / 100), layers, finish, copper_oz: copper },
    quantity: qty,
    fabrication: {
      setup_cost: r2(fabSetup),
      per_board: r2(perBoardFab),
      total: r2(fabTotal),
    },
    assembly,
    total_cost: r2(total),
    total_range: { low: r2(total * 0.7), high: r2(total * 1.4) },
    per_board_all_in: r2(total / qty),
    leadtime,
    currency: "USD",
    notes: [
      "Budgetary estimate calibrated to offshore prototype/low-volume pricing; US/EU fabs typically 2-4x.",
      "Component (BOM) cost not included in assembly figures.",
    ],
  };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
