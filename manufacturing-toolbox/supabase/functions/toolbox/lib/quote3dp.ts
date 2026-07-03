// FDM print quote from STL metrics. Heuristic (±20%) — the /gcode/analyze
// endpoint is the accurate path when G-code is available.

import type { StlMetrics } from "./stl.ts";
import { readable } from "./gcode.ts";

export interface QuoteParams {
  material?: string; // pla | petg | abs | asa | tpu | nylon | pc
  price_per_kg?: number;
  infill_pct?: number; // 0-100, default 20
  layer_height_mm?: number; // default 0.2
  print_speed_mm_s?: number; // default 60
  wall_thickness_mm?: number; // default 1.2 (walls + skins combined shell)
  energy_price_per_kwh?: number; // default 0.15
  printer_watts?: number; // default 150
  machine_rate_per_hr?: number; // default 2 (depreciation+maintenance)
  margin_pct?: number; // default 30
  quantity?: number; // default 1
}

const MATERIALS: Record<string, { density: number; price: number }> = {
  pla: { density: 1.24, price: 20 },
  petg: { density: 1.27, price: 22 },
  abs: { density: 1.05, price: 22 },
  asa: { density: 1.07, price: 28 },
  tpu: { density: 1.21, price: 35 },
  nylon: { density: 1.14, price: 40 },
  pc: { density: 1.20, price: 45 },
};

export function quote3dp(metrics: StlMetrics, params: QuoteParams = {}) {
  const matName = (params.material ?? "pla").toLowerCase();
  const mat = MATERIALS[matName];
  if (!mat) {
    throw new Error(
      `Unknown material '${matName}'. Supported: ${Object.keys(MATERIALS).join(", ")}.`,
    );
  }
  const pricePerKg = params.price_per_kg ?? mat.price;
  const infill = clamp(params.infill_pct ?? 20, 0, 100) / 100;
  const layerH = clamp(params.layer_height_mm ?? 0.2, 0.05, 0.6);
  const speed = clamp(params.print_speed_mm_s ?? 60, 10, 500);
  const wall = clamp(params.wall_thickness_mm ?? 1.2, 0.4, 5);
  const kwhPrice = params.energy_price_per_kwh ?? 0.15;
  const watts = params.printer_watts ?? 150;
  const machineRate = params.machine_rate_per_hr ?? 2;
  const margin = clamp(params.margin_pct ?? 30, 0, 500) / 100;
  const qty = Math.max(1, Math.round(params.quantity ?? 1));

  // Material volume: shell (surface area × wall) + infill of the interior.
  const shellVol = Math.min(metrics.volume_mm3, metrics.surface_area_mm2 * wall);
  const interior = Math.max(0, metrics.volume_mm3 - shellVol);
  const materialMm3 = shellVol + interior * infill;
  const materialCm3 = materialMm3 / 1000;
  const massG = materialCm3 * mat.density;

  // Time: volumetric deposition (layer h × 0.45 mm line × speed) at 70%
  // utilization (travel, accel, z-hops), plus fixed startup/heatup.
  const depositionMm3S = layerH * 0.45 * speed * 0.7;
  const timeS = materialMm3 / depositionMm3S + 300;
  const hours = timeS / 3600;

  const materialCost = (massG / 1000) * pricePerKg;
  const energyCost = (watts / 1000) * hours * kwhPrice;
  const machineCost = hours * machineRate;
  const unitCost = materialCost + energyCost + machineCost;
  const suggested = unitCost * (1 + margin);

  return {
    model: {
      volume_cm3: metrics.volume_cm3,
      surface_area_cm2: metrics.surface_area_cm2,
      bbox_mm: metrics.bbox_mm,
      triangle_count: metrics.triangle_count,
    },
    material: {
      name: matName,
      density_g_cm3: mat.density,
      volume_cm3: r2(materialCm3),
      mass_g: r2(massG),
    },
    print_time_s: Math.round(timeS),
    print_time_readable: readable(timeS),
    cost_per_unit: {
      material: r2(materialCost),
      energy: r2(energyCost),
      machine: r2(machineCost),
      total: r2(unitCost),
      currency: "USD",
    },
    suggested_price_per_unit: r2(suggested),
    quantity: qty,
    total_suggested_price: r2(suggested * qty),
    assumptions: {
      infill_pct: infill * 100,
      layer_height_mm: layerH,
      print_speed_mm_s: speed,
      wall_thickness_mm: wall,
      price_per_kg: pricePerKg,
      printer_watts: watts,
      energy_price_per_kwh: kwhPrice,
      machine_rate_per_hr: machineRate,
      margin_pct: margin * 100,
    },
    notes: [
      "Heuristic estimate (±20%). POST the sliced G-code to /v1/gcode/analyze for accurate time and cost.",
      "All parameters caller-configurable; defaults shown in `assumptions`.",
    ],
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
