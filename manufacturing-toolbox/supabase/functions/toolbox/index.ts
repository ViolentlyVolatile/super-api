// Manufacturing Toolbox API — 11 manufacturing calculators in one API.
// 3D-print quoting, STL analysis, G-code analysis, CNC estimating,
// feeds & speeds, ISO 286 fits, thread specs, tolerance stackups,
// injection-molding & PCB estimates, materials database.
//
// Hosted as a Supabase Edge Function. Stateless: nothing stored or logged.
// Auth: X-API-Key header (or x-rapidapi-proxy-secret from the RapidAPI
// gateway). Keys read from env first, constants as fallback.

import { computeMetrics, parseSTL } from "./lib/stl.ts";
import { analyzeMesh } from "./lib/mesh_checks.ts";
import { analyzeGcode } from "./lib/gcode.ts";
import { quote3dp } from "./lib/quote3dp.ts";
import { cncEstimate, cncMaterialNames, feedsSpeeds, isoFit, threadSpec } from "./lib/cnc.ts";
import { stackup } from "./lib/stackup.ts";
import { moldingEstimate } from "./lib/molding.ts";
import { pcbEstimate } from "./lib/pcb.ts";
import { getMaterial, materialCategories, searchMaterials } from "./lib/materials.ts";

const VERSION = "1.0.0";
const FN_NAME = "manufacturing-toolbox";

// Env-first; the deployed copy carries real fallback values (not committed).
const MASTER_API_KEY = Deno.env.get("MT_MASTER_API_KEY") ?? "CHANGE_ME_MASTER_KEY";
const RAPIDAPI_PROXY_SECRET = Deno.env.get("MT_RAPIDAPI_PROXY_SECRET") ?? "";

const MAX_FILE_BYTES = 30 * 1024 * 1024; // 30 MB decoded
const FETCH_TIMEOUT_MS = 15000;

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-rapidapi-proxy-secret, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "X-Powered-By": "NexMath Manufacturing Toolbox",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
function err(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

function authorized(req: Request): boolean {
  const key = req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(req.url).searchParams.get("api_key") ?? "";
  if (MASTER_API_KEY && MASTER_API_KEY !== "CHANGE_ME_MASTER_KEY" && key === MASTER_API_KEY) {
    return true;
  }
  const proxySecret = req.headers.get("x-rapidapi-proxy-secret") ?? "";
  if (RAPIDAPI_PROXY_SECRET && proxySecret === RAPIDAPI_PROXY_SECRET) return true;
  // F1: fail closed. No implicit "bootstrap" allow — if no credential is
  // configured, every request is rejected rather than silently opened.
  return false;
}

// --- F2: SSRF guard for user-supplied fetch URLs ---------------------------
// Reject URLs whose host is a private/loopback/link-local address (or an
// obvious internal name) BEFORE making any outbound request, so stl_url /
// gcode_url cannot be used to reach internal services or cloud metadata.
function ipv4ToInt(ip: string): number | null {
  const p = ip.split(".");
  if (p.length !== 4) return null;
  let n = 0;
  for (const part of p) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const o = Number(part);
    if (o > 255) return null;
    n = (n << 8) | o;
  }
  return n >>> 0;
}
function isBlockedIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  const inRange = (base: string, bits: number) =>
    (n >>> (32 - bits)) === (ipv4ToInt(base)! >>> (32 - bits));
  return (
    inRange("10.0.0.0", 8) || inRange("172.16.0.0", 12) || inRange("192.168.0.0", 16) ||
    inRange("127.0.0.0", 8) || inRange("169.254.0.0", 16) || inRange("100.64.0.0", 10) ||
    inRange("0.0.0.0", 8) || inRange("192.0.0.0", 24) || inRange("198.18.0.0", 15) ||
    inRange("192.0.2.0", 24) || inRange("240.0.0.0", 4) || n === 0xffffffff
  );
}
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") ||
      h.endsWith(".internal") || h === "metadata.google.internal") return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return isBlockedIpv4(h);
  // IPv6 loopback / link-local / unique-local / v4-mapped
  if (h === "::1" || h === "::" ) return true;
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  const mapped = h.match(/::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mapped) return isBlockedIpv4(mapped[1]);
  return false;
}

function subPath(req: Request): string {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segments.lastIndexOf(FN_NAME);
  const rest = idx >= 0 ? segments.slice(idx + 1) : segments;
  return "/" + rest.join("/");
}

const INFO = {
  name: "Manufacturing Toolbox API",
  by: "NexMath",
  version: VERSION,
  description:
    "Eleven manufacturing tools behind one key: 3D-print quotes from STL, mesh printability analysis, G-code time/cost, CNC cost estimates, feeds & speeds, ISO 286 fits, thread specs, tolerance stackups, injection-molding and PCB estimates, and a materials database. Pure compute, stateless, caller-configurable rates.",
  endpoints: {
    "POST /v1/3dp/quote": "STL (stl_base64 | stl_url | raw octet-stream) + optional params -> volume, mass, time, cost, price",
    "POST /v1/3dp/analyze": "STL -> watertight, manifold, shells, walls, printability score",
    "POST /v1/gcode/analyze": "G-code (gcode | gcode_base64 | gcode_url | raw text) + optional params -> time, filament, cost, layers, feature split",
    "POST /v1/cnc/estimate": "material, stock_mm{x,y,z}, removal_pct, tolerance, finish, quantity -> cost breakdown + batch curve",
    "POST /v1/cnc/feeds-speeds": "material, tool, tool_diameter_mm, flutes, operation -> RPM, feed, DOC",
    "GET /v1/cnc/fits/{size}/{fit}": "e.g. /v1/cnc/fits/25/H7g6 -> hole/shaft limits, clearance, fit type",
    "GET /v1/cnc/threads/{spec}": "e.g. M8x1.25 or 1%2F4-20 -> tap drill, diameters, torque",
    "POST /v1/tolerance/stackup": "{dimensions:[{nominal,tolerance,direction}]} -> worst-case, RSS, contributors",
    "POST /v1/molding/estimate": "part_volume_cm3, material, cavities, complexity, quantity -> tooling + per-part @ breaks",
    "POST /v1/pcb/estimate": "width_mm, height_mm, layers, quantity, finish, assembly -> fab + assembly cost, leadtime",
    "GET /v1/materials/{id} & /v1/materials/search?q=": "materials database (60+ alloys, steels, plastics)",
    "GET /health": "health check",
  },
  docs: "https://rapidapi.com/karan-WuSc97Oof/api/manufacturing-toolbox",
};

// ------------------------------------------------------------- input helpers

interface FilePayload {
  bytes: Uint8Array;
  params: Record<string, unknown>;
}

async function readBodyBytes(req: Request, jsonKeys: [string, string]): Promise<FilePayload> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
    }
    const [b64Key, urlKey] = jsonKeys;
    const params = extractParams(body);
    const b64 = body[b64Key];
    if (typeof b64 === "string" && b64.length > 0) {
      if (b64.length > MAX_FILE_BYTES * 1.4) {
        throw new HttpError(413, "file_too_large", `Max decoded file size is ${MAX_FILE_BYTES / 1048576} MB.`);
      }
      try {
        const clean = b64.replace(/^data:[^,]*,/, "");
        const bin = atob(clean);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return { bytes: out, params };
      } catch {
        throw new HttpError(400, "invalid_base64", `'${b64Key}' is not valid base64.`);
      }
    }
    const url = body[urlKey];
    if (typeof url === "string" && url.length > 0) {
      return { bytes: await fetchBytes(url), params };
    }
    throw new HttpError(400, "missing_file", `Provide '${b64Key}' or '${urlKey}' in the JSON body, or send the raw file as the request body.`);
  }
  // Raw body.
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.length === 0) throw new HttpError(400, "missing_file", "Empty request body.");
  if (buf.length > MAX_FILE_BYTES) {
    throw new HttpError(413, "file_too_large", `Max file size is ${MAX_FILE_BYTES / 1048576} MB.`);
  }
  return { bytes: buf, params: {} };
}

/** Non-file keys in the JSON body are treated as calculator parameters. */
function extractParams(body: Record<string, unknown>): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === "params" || k.startsWith("stl_") || k.startsWith("gcode_") || k === "gcode") continue;
    p[k] = v;
  }
  return typeof body.params === "object" && body.params !== null
    ? { ...(body.params as Record<string, unknown>), ...p }
    : p;
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new HttpError(400, "invalid_url", "Malformed URL.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new HttpError(400, "invalid_url", "URL must be http(s).");
  }
  // F2: block private/loopback/link-local/internal targets before any request.
  if (isBlockedHost(u.hostname)) {
    throw new HttpError(400, "url_not_allowed", "URL host is not permitted (private, loopback, or link-local address).");
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    // redirect: "manual" so a public URL can't 30x-bounce us into an internal host.
    const res = await fetch(u, { signal: ctrl.signal, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      throw new HttpError(400, "url_not_allowed", "Redirects are not followed for fetched URLs.");
    }
    if (!res.ok) throw new HttpError(422, "fetch_failed", `Fetching the file returned HTTP ${res.status}.`);
    const len = parseInt(res.headers.get("content-length") ?? "0", 10);
    if (len > MAX_FILE_BYTES) throw new HttpError(413, "file_too_large", `Remote file exceeds ${MAX_FILE_BYTES / 1048576} MB.`);
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length > MAX_FILE_BYTES) throw new HttpError(413, "file_too_large", `Remote file exceeds ${MAX_FILE_BYTES / 1048576} MB.`);
    return buf;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(422, "fetch_failed", "Could not fetch the file from the supplied URL.");
  } finally {
    clearTimeout(t);
  }
}

async function readGcodeText(req: Request): Promise<{ text: string; params: Record<string, unknown> }> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
    }
    const params = extractParams(body);
    if (typeof body.gcode === "string" && body.gcode.length > 0) {
      return { text: body.gcode, params };
    }
    if (typeof body.gcode_base64 === "string" && body.gcode_base64.length > 0) {
      try {
        return { text: atob((body.gcode_base64 as string).replace(/^data:[^,]*,/, "")), params };
      } catch {
        throw new HttpError(400, "invalid_base64", "'gcode_base64' is not valid base64.");
      }
    }
    if (typeof body.gcode_url === "string" && body.gcode_url.length > 0) {
      const bytes = await fetchBytes(body.gcode_url as string);
      return { text: new TextDecoder().decode(bytes), params };
    }
    throw new HttpError(400, "missing_file", "Provide 'gcode', 'gcode_base64' or 'gcode_url', or send the raw file as text/plain.");
  }
  const text = await req.text();
  if (text.length === 0) throw new HttpError(400, "missing_file", "Empty request body.");
  if (text.length > MAX_FILE_BYTES) throw new HttpError(413, "file_too_large", `Max file size is ${MAX_FILE_BYTES / 1048576} MB.`);
  return { text, params: {} };
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// -------------------------------------------------------------------- server

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });

  const path = subPath(req);
  const url = new URL(req.url);

  if (path === "/health") return json({ status: "ok", version: VERSION });
  if (path === "/" || path === "") return json(INFO);

  if (!authorized(req)) {
    return err(401, "unauthorized", "Missing or invalid API key. Pass X-API-Key header.");
  }

  try {
    // ---- 3D printing
    if (path === "/v1/3dp/quote" && req.method === "POST") {
      const { bytes, params } = await readBodyBytes(req, ["stl_base64", "stl_url"]);
      const mesh = parseSTL(bytes);
      const metrics = computeMetrics(mesh);
      return json(quote3dp(metrics, params));
    }
    if (path === "/v1/3dp/analyze" && req.method === "POST") {
      const { bytes } = await readBodyBytes(req, ["stl_base64", "stl_url"]);
      const mesh = parseSTL(bytes);
      const metrics = computeMetrics(mesh);
      return json({ ...metrics, mesh: analyzeMesh(mesh, metrics) });
    }
    if (path === "/v1/gcode/analyze" && req.method === "POST") {
      const { text, params } = await readGcodeText(req);
      return json(analyzeGcode(text, params));
    }

    // ---- CNC
    if (path === "/v1/cnc/estimate" && req.method === "POST") {
      return json(cncEstimate(await readJson(req) as never));
    }
    if (path === "/v1/cnc/feeds-speeds" && req.method === "POST") {
      return json(feedsSpeeds(await readJson(req) as never));
    }
    {
      const m = path.match(/^\/v1\/cnc\/fits\/([^/]+)\/([^/]+)$/);
      if (m && req.method === "GET") return json(isoFit(m[1], m[2]));
    }
    {
      const m = path.match(/^\/v1\/cnc\/threads\/([^/]+)$/);
      if (m && req.method === "GET") return json(threadSpec(m[1]));
    }
    if (path === "/v1/cnc/materials" && req.method === "GET") {
      return json({ materials: cncMaterialNames() });
    }

    // ---- Tolerance
    if (path === "/v1/tolerance/stackup" && req.method === "POST") {
      const body = await readJson(req);
      const dims = Array.isArray(body) ? body : (body.dimensions ?? body.dims);
      if (!Array.isArray(dims)) {
        return err(400, "missing_parameter", "Body must be {\"dimensions\": [...]} or a bare array of dimensions.");
      }
      return json(stackup(dims as never));
    }

    // ---- Molding / PCB
    if (path === "/v1/molding/estimate" && req.method === "POST") {
      return json(moldingEstimate(await readJson(req) as never));
    }
    if (path === "/v1/pcb/estimate" && req.method === "POST") {
      return json(pcbEstimate(await readJson(req) as never));
    }

    // ---- Materials
    if (path === "/v1/materials/search" && req.method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      const category = url.searchParams.get("category") ?? undefined;
      const limit = parseInt(url.searchParams.get("limit") ?? "25", 10);
      const results = searchMaterials(q, category, isNaN(limit) ? 25 : limit);
      return json({ count: results.length, categories: materialCategories(), results });
    }
    {
      const m = path.match(/^\/v1\/materials\/([^/]+)$/);
      if (m && req.method === "GET") {
        const mat = getMaterial(decodeURIComponent(m[1]));
        if (!mat) {
          return err(404, "material_not_found", `No material '${m[1]}'. Try GET /v1/materials/search?q=...`);
        }
        return json(mat);
      }
    }

    return err(404, "not_found", `No route ${req.method} ${path}. See GET / for the endpoint list.`);
  } catch (e) {
    if (e instanceof HttpError) return err(e.status, e.code, e.message);
    // F6: log internals server-side; return a generic message to the caller.
    console.error("manufacturing_toolbox_error", e);
    return err(422, "processing_error", "Could not process the request.");
  }
});
