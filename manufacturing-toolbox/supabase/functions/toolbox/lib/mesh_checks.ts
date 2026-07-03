// Mesh integrity checks for printability: manifold edges, degenerate
// triangles, shell count, thin-wall heuristic, printability score.

import type { StlMesh, StlMetrics } from "./stl.ts";
import { round3 } from "./stl.ts";

export interface MeshReport {
  watertight: boolean;
  non_manifold_edges: number;
  boundary_edges: number;
  degenerate_triangles: number;
  shells: number;
  mean_wall_thickness_mm: number;
  thin_wall_warning: boolean;
  printability_score: number;
  issues: string[];
  notes: string[];
}

const Q = 10000; // vertex quantization: 0.1 µm

function vKey(x: number, y: number, z: number): string {
  return `${Math.round(x * Q)},${Math.round(y * Q)},${Math.round(z * Q)}`;
}

export function analyzeMesh(mesh: StlMesh, metrics: StlMetrics): MeshReport {
  const t = mesh.tris;
  const vertexIds = new Map<string, number>();
  const triVerts = new Int32Array(mesh.triCount * 3);
  let degenerate = 0;

  const vid = (x: number, y: number, z: number): number => {
    const k = vKey(x, y, z);
    let id = vertexIds.get(k);
    if (id === undefined) {
      id = vertexIds.size;
      vertexIds.set(k, id);
    }
    return id;
  };

  for (let i = 0; i < mesh.triCount; i++) {
    const o = i * 9;
    const a = vid(t[o], t[o + 1], t[o + 2]);
    const b = vid(t[o + 3], t[o + 4], t[o + 5]);
    const c = vid(t[o + 6], t[o + 7], t[o + 8]);
    triVerts[i * 3] = a; triVerts[i * 3 + 1] = b; triVerts[i * 3 + 2] = c;
    if (a === b || b === c || a === c) degenerate++;
    else {
      // Zero-area check on distinct vertices.
      const ux = t[o + 3] - t[o], uy = t[o + 4] - t[o + 1], uz = t[o + 5] - t[o + 2];
      const vx = t[o + 6] - t[o], vy = t[o + 7] - t[o + 1], vz = t[o + 8] - t[o + 2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * nx + ny * ny + nz * nz < 1e-16) degenerate++;
    }
  }

  // Edge usage counts.
  const edgeCount = new Map<number, number>();
  const V = vertexIds.size;
  const eKey = (a: number, b: number): number =>
    a < b ? a * V + b : b * V + a;
  for (let i = 0; i < mesh.triCount; i++) {
    const a = triVerts[i * 3], b = triVerts[i * 3 + 1], c = triVerts[i * 3 + 2];
    if (a === b || b === c || a === c) continue;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const k = eKey(p, q);
      edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
    }
  }
  let boundary = 0, nonManifold = 0;
  for (const n of edgeCount.values()) {
    if (n === 1) boundary++;
    else if (n > 2) nonManifold++;
  }

  // Shell count: union-find over vertices connected by triangles.
  const parent = new Int32Array(V);
  for (let i = 0; i < V; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < mesh.triCount; i++) {
    union(triVerts[i * 3], triVerts[i * 3 + 1]);
    union(triVerts[i * 3 + 1], triVerts[i * 3 + 2]);
  }
  const roots = new Set<number>();
  for (let i = 0; i < V; i++) roots.add(find(i));
  const shells = roots.size;

  const watertight = boundary === 0 && nonManifold === 0 && mesh.triCount > 3;

  // Thin-wall heuristic: mean thickness of a shell ≈ 2 * V / A.
  const meanWall = metrics.surface_area_mm2 > 0
    ? (2 * metrics.volume_mm3) / metrics.surface_area_mm2
    : 0;
  const thinWall = meanWall > 0 && meanWall < 0.8;

  let score = 100;
  const issues: string[] = [];
  if (!watertight) {
    score -= 40;
    issues.push(
      `Mesh is not watertight (${boundary} boundary edges, ${nonManifold} non-manifold edges). Repair before slicing.`,
    );
  }
  if (nonManifold > 0 && watertight === false) {
    score -= Math.min(15, nonManifold);
  }
  if (degenerate > 0) {
    score -= Math.min(10, degenerate);
    issues.push(`${degenerate} degenerate (zero-area) triangles.`);
  }
  if (thinWall) {
    score -= 15;
    issues.push(
      `Mean wall thickness ≈ ${round3(meanWall)} mm — below the 0.8 mm FDM guideline.`,
    );
  }
  if (shells > 1) {
    issues.push(`${shells} separate shells — verify this is intentional.`);
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    watertight,
    non_manifold_edges: nonManifold,
    boundary_edges: boundary,
    degenerate_triangles: degenerate,
    shells,
    mean_wall_thickness_mm: round3(meanWall),
    thin_wall_warning: thinWall,
    printability_score: score,
    issues,
    notes: [
      "Wall-thickness figure is a volume/area heuristic (2V/A), not a full SDF analysis.",
      "Score: 100 minus penalties for open edges, degenerate faces and thin walls.",
    ],
  };
}
