// Tolerance stackup: worst-case and RSS (root sum of squares).

export interface StackDim {
  name?: string;
  nominal: number;
  tolerance?: number; // symmetric ±
  plus?: number; // or asymmetric
  minus?: number; // positive number, e.g. 0.1 means -0.1
  direction?: 1 | -1; // default +1 (adds to the chain)
}

export function stackup(dims: StackDim[]) {
  if (!Array.isArray(dims) || dims.length < 2) {
    throw new Error("Provide an array of at least 2 dimensions.");
  }
  if (dims.length > 200) throw new Error("Max 200 dimensions.");

  let nominal = 0, wcPlus = 0, wcMinus = 0, sumSq = 0;
  const contributors: { name: string; direction: number; nominal: number; tol_effective: number; variance_share_pct: number }[] = [];

  const rows = dims.map((d, i) => {
    if (typeof d.nominal !== "number") throw new Error(`Dimension ${i}: 'nominal' (number) required.`);
    const dir = d.direction === -1 ? -1 : 1;
    let plus: number, minus: number;
    if (typeof d.tolerance === "number") {
      plus = Math.abs(d.tolerance);
      minus = Math.abs(d.tolerance);
    } else if (typeof d.plus === "number" || typeof d.minus === "number") {
      plus = Math.abs(d.plus ?? 0);
      minus = Math.abs(d.minus ?? 0);
    } else {
      throw new Error(`Dimension ${i}: provide 'tolerance' (±) or 'plus'/'minus'.`);
    }
    return { name: d.name ?? `dim_${i + 1}`, nominal: d.nominal, dir, plus, minus };
  });

  for (const r of rows) {
    nominal += r.dir * r.nominal;
    // Worst case: direction flips which side of the tolerance hurts.
    wcPlus += r.dir === 1 ? r.plus : r.minus;
    wcMinus += r.dir === 1 ? r.minus : r.plus;
    const halfWidth = (r.plus + r.minus) / 2;
    sumSq += halfWidth * halfWidth;
  }
  const rss = Math.sqrt(sumSq);

  for (const r of rows) {
    const halfWidth = (r.plus + r.minus) / 2;
    contributors.push({
      name: r.name,
      direction: r.dir,
      nominal: r.nominal,
      tol_effective: r6(halfWidth),
      variance_share_pct: r2(sumSq > 0 ? (halfWidth * halfWidth / sumSq) * 100 : 0),
    });
  }
  contributors.sort((a, b) => b.variance_share_pct - a.variance_share_pct);

  return {
    dimensions: rows.length,
    nominal: r6(nominal),
    worst_case: {
      min: r6(nominal - wcMinus),
      max: r6(nominal + wcPlus),
      total_variation: r6(wcPlus + wcMinus),
    },
    rss: {
      // RSS assumes each tol is ±3σ; result quoted at the same confidence.
      min: r6(nominal - rss),
      max: r6(nominal + rss),
      plus_minus: r6(rss),
    },
    contributors,
    recommendation: contributors[0]?.variance_share_pct > 50
      ? `'${contributors[0].name}' drives ${contributors[0].variance_share_pct}% of variance — tighten it first.`
      : "Variance is distributed; tightening any single tolerance has limited effect.",
    notes: [
      "RSS treats each tolerance as a ±3σ normal distribution; result is the statistical (≈99.7%) expectation.",
      "Use direction:-1 for dimensions that subtract from the loop (gaps, opposing faces).",
    ],
  };
}

function r6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
