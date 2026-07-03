// VibeGuard API — backend plumbing for vibe-coded apps.
// API keys + rate limiting + usage metering, plus LLM output guards
// (JSON repair/validation, prompt-injection detection, PII redaction).
import { handleKeys, handleVerify, handleUsage } from "./keys.ts";
import { guardJson } from "./guard_json.ts";
import { guardPrompt } from "./guard_prompt.ts";
import { guardPii } from "./guard_pii.ts";

const MASTER_KEY = Deno.env.get("MASTER_KEY") ?? "CHANGE_ME";
const PROXY_SECRET = Deno.env.get("RAPIDAPI_PROXY_SECRET") ?? "CHANGE_ME";

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type, x-rapidapi-key, x-rapidapi-host",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: JSON_HEADERS });
}

function authenticate(req: Request, url: URL): { tenant: string } | null {
  // RapidAPI gateway: proxy secret + subscriber identity
  const proxySecret = req.headers.get("x-rapidapi-proxy-secret");
  if (proxySecret && PROXY_SECRET !== "CHANGE_ME" && proxySecret === PROXY_SECRET) {
    const user = req.headers.get("x-rapidapi-user") || "rapidapi-unknown";
    return { tenant: `ra_${user}` };
  }
  // Direct: master key
  const auth = req.headers.get("authorization") ?? "";
  const key =
    req.headers.get("x-api-key") ??
    (auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null) ??
    url.searchParams.get("api_key");
  if (key && MASTER_KEY !== "CHANGE_ME" && key === MASTER_KEY) return { tenant: "master" };
  return null;
}

const INFO = {
  name: "VibeGuard API",
  tagline: "The backend plumbing your AI code generator never writes for you.",
  version: "1.0.0",
  endpoints: {
    "GET /health": "liveness check (open)",
    "POST /keys": "create an API key for YOUR app's users { name?, rate_limit_per_min?, monthly_quota?, metadata? }",
    "GET /keys": "list your keys",
    "DELETE /keys/{key_id}": "revoke a key",
    "POST /verify": "verify a key + enforce rate limit + meter usage in ONE call { key, cost? }",
    "GET /usage": "usage report for all your keys",
    "POST /guard/json": "extract + repair + schema-validate JSON from raw LLM output { text, schema? }",
    "POST /guard/prompt": "prompt-injection detection { text }",
    "POST /guard/pii": "PII detection + redaction { text, redact? }",
  },
  auth: "X-API-Key header (or subscribe on RapidAPI)",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });

  const url = new URL(req.url);
  // Path after the function name, e.g. /vibeguard/keys -> /keys
  const path = url.pathname.replace(/^\/vibeguard/, "") || "/";

  if (req.method === "GET" || req.method === "HEAD") {
    if (path === "/health") return json({ status: "ok", time: new Date().toISOString() });
    if (path === "/") return json(INFO);
  }

  const authn = authenticate(req, url);
  if (!authn) {
    return json({ error: "Unauthorized. Pass your API key in the X-API-Key header, or subscribe via RapidAPI." }, 401);
  }

  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400);
    }
  }

  try {
    // ---- Guard module (stateless) ----
    if (req.method === "POST" && path === "/guard/json") return json(guardJson(body));
    if (req.method === "POST" && path === "/guard/prompt") return json(guardPrompt(body));
    if (req.method === "POST" && path === "/guard/pii") return json(guardPii(body));

    // ---- Keys module ----
    if (path === "/keys" || path.startsWith("/keys/")) {
      return await handleKeys(req.method, path, body, authn.tenant);
    }
    if (req.method === "POST" && path === "/verify") {
      return await handleVerify(body, authn.tenant);
    }
    if (req.method === "GET" && path === "/usage") {
      return await handleUsage(authn.tenant);
    }

    return json({ error: `No route: ${req.method} ${path}. GET / for docs.` }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "Internal error", detail: String(err) }, 500);
  }
});
