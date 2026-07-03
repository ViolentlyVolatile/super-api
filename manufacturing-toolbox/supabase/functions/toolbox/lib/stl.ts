// STL parsing (binary + ASCII) and geometry metrics.
// Units assumed mm (STL is unitless; mm is the 3D-printing convention).

export interface StlMesh {
  format: "binary" | "ascii";
  triCount: number;
  /** Flat array: 9 floats per triangle (v0x v0y v0z v1x ... v2z). */
  tris: Float64Array;
}

export interface StlMetrics {
  triangle_count: number;
  format: "binary" | "ascii";
  volume_mm3: number;
  volume_cm3: number;
  surface_area_mm2: number;
  surface_area_cm2: number;
  bbox_mm: { x: number; y: number; z: number };
  bbox_min: { x: number; y: number; z: number };
  bbox_max: { x: number; y: number; z: number };
}

const MAX_TRIS = 4_000_000;

export function parseSTL(bytes: Uint8Array): StlMesh {
  if (bytes.length < 15) throw new Error("File too small to be an STL.");
  // Binary check: 80-byte header + uint32 count + 50 bytes/tri == file size.
  if (bytes.length >= 84) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = dv.getUint32(80, true);
    if (n > 0 && n <= MAX_TRIS && 84 + n * 50 === bytes.length) {
      return parseBinary(dv, n);
    }
  }
  // ASCII check.
  const head = new TextDecoder().decode(bytes.subarray(0, 512)).toLowerCase();
  if (head.trimStart().startsWith("solid") && head.includes("facet")) {
    return parseAscii(new TextDecoder().decode(bytes));
  }
  // Last resort: binary with a lying size (some exporters append bytes).
  if (bytes.length >= 84) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = dv.getUint32(80, true);
    if (n > 0 && n <= MAX_TRIS && 84 + n * 50 <= bytes.length) {
      return parseBinary(dv, n);
    }
  }
  throw new Error("Not a recognizable binary or ASCII STL file.");
}

function parseBinary(dv: DataView, n: number): StlMesh {
  const tris = new Float64Array(n * 9);
  let off = 84;
  for (let i = 0; i < n; i++) {
    off += 12; // skip normal
    for (let j = 0; j < 9; j++) {
      tris[i * 9 + j] = dv.getFloat32(off, true);
      off += 4;
    }
    off += 2; // attribute byte count
  }
  return { format: "binary", triCount: n, tris };
}

function parseAscii(text: string): StlMesh {
  const re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g;
  const coords: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    coords.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    if (coords.length / 9 > MAX_TRIS) throw new Error("Too many triangles.");
  }
  if (coords.length === 0 || coords.length % 9 !== 0) {
    throw new Error("Malformed ASCII STL (vertex count not a multiple of 3).");
  }
  return {
    format: "ascii",
    triCount: coords.length / 9,
    tris: Float64Array.from(coords),
  };
}

export function computeMetrics(mesh: StlMesh): StlMetrics {
  const t = mesh.tris;
  let vol = 0, area = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < mesh.triCount; i++) {
    const o = i * 9;
    const ax = t[o], ay = t[o + 1], az = t[o + 2];
    const bx = t[o + 3], by = t[o + 4], bz = t[o + 5];
    const cx = t[o + 6], cy = t[o + 7], cz = t[o + 8];
    // Signed tetrahedron volume relative to origin.
    vol += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) +
      az * (bx * cy - by * cx)) / 6;
    // Triangle area.
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    area += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
    minX = Math.min(minX, ax, bx, cx); maxX = Math.max(maxX, ax, bx, cx);
    minY = Math.min(minY, ay, by, cy); maxY = Math.max(maxY, ay, by, cy);
    minZ = Math.min(minZ, az, bz, cz); maxZ = Math.max(maxZ, az, bz, cz);
  }
  const volume_mm3 = Math.abs(vol);
  return {
    triangle_count: mesh.triCount,
    format: mesh.format,
    volume_mm3: round3(volume_mm3),
    volume_cm3: round3(volume_mm3 / 1000),
    surface_area_mm2: round3(area),
    surface_area_cm2: round3(area / 100),
    bbox_mm: {
      x: round3(maxX - minX),
      y: round3(maxY - minY),
      z: round3(maxZ - minZ),
    },
    bbox_min: { x: round3(minX), y: round3(minY), z: round3(minZ) },
    bbox_max: { x: round3(maxX), y: round3(maxY), z: round3(maxZ) },
  };
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
