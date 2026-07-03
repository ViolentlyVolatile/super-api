// Contact Validation API — email + phone validation in one cheap, fast API.
// Hosted as a Supabase Edge Function. Stateless: nothing is stored or logged.
//
// Routes (relative to the function root):
//   GET  /                    -> API info (open)
//   GET  /health              -> health check (open)
//   GET  /email?email=...     -> validate one email
//   GET  /phone?phone=...&country=US -> validate one phone
//   POST /batch               -> { emails: [], phones: [], default_country }
//
// Auth: X-API-Key header (or X-RapidAPI-Proxy-Secret from the RapidAPI
// gateway). Keys are read from env first, constants as fallback.

import { validateEmail } from "./email.ts";
import { validatePhone } from "./phone.ts";

const VERSION = "1.0.0";

// Env-first; the deployed copy carries real fallback values (not committed).
const MASTER_API_KEY = Deno.env.get("CV_MASTER_API_KEY") ?? "CHANGE_ME_MASTER_KEY";
const RAPIDAPI_PROXY_SECRET = Deno.env.get("CV_RAPIDAPI_PROXY_SECRET") ?? "";

const BATCH_LIMIT = 100;

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-api-key, x-rapidapi-proxy-secret, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "X-Powered-By": "NexMath Contact Validation API",
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

const INFO = {
  name: "Contact Validation API",
  by: "NexMath",
  version: VERSION,
  description:
    "Validate emails (syntax, MX, disposable, role, typo suggestions, 0-100 score) and phone numbers (240+ regions, E.164, line type) in one API. Stateless — nothing stored.",
  endpoints: {
    "GET /email": "params: email (required)",
    "GET /phone": "params: phone (required), country (optional ISO-2 hint)",
    "POST /batch":
      `JSON body: { emails: string[], phones: string[] | {phone,country}[], default_country?: string } — max ${BATCH_LIMIT} items total`,
    "GET /health": "health check",
  },
};

function subPath(req: Request): string {
  // Path after the function name, regardless of invocation style:
  // /functions/v1/contact-validation/email  or  /contact-validation/email
  const segments = new URL(req.url).pathname.split("/").filter(Boolean);
  const idx = segments.lastIndexOf("contact-validation");
  const rest = idx >= 0 ? segments.slice(idx + 1) : segments;
  return "/" + rest.join("/");
}

interface BatchPhoneItem {
  phone: string;
  country?: string;
}

async function handleBatch(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return err(400, "invalid_json", "Request body must be valid JSON.");
  }
  const emails = Array.isArray(body.emails) ? body.emails : [];
  const phonesRaw = Array.isArray(body.phones) ? body.phones : [];
  const defaultCountry = typeof body.default_country === "string"
    ? body.default_country
    : undefined;

  if (emails.length + phonesRaw.length === 0) {
    return err(400, "empty_batch", "Provide 'emails' and/or 'phones' arrays.");
  }
  if (emails.length + phonesRaw.length > BATCH_LIMIT) {
    return err(
      400,
      "batch_too_large",
      `Max ${BATCH_LIMIT} items per request (got ${emails.length + phonesRaw.length}).`,
    );
  }

  const emailResults = await Promise.all(
    emails.map((e) => validateEmail(String(e))),
  );
  const phoneResults = phonesRaw.map((p) => {
    if (p && typeof p === "object" && "phone" in (p as Record<string, unknown>)) {
      const item = p as unknown as BatchPhoneItem;
      return validatePhone(String(item.phone), item.country ?? defaultCountry);
    }
    return validatePhone(String(p), defaultCountry);
  });

  return json({
    counts: {
      emails: emailResults.length,
      phones: phoneResults.length,
      emails_deliverable: emailResults.filter((r) => r.deliverable === "yes").length,
      phones_valid: phoneResults.filter((r) => r.valid).length,
    },
    emails: emailResults,
    phones: phoneResults,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: JSON_HEADERS });

  const path = subPath(req);
  const url = new URL(req.url);

  // Open routes
  if (path === "/health") return json({ status: "ok", version: VERSION });
  if (path === "/" || path === "") return json(INFO);

  if (!authorized(req)) {
    return err(401, "unauthorized", "Missing or invalid API key. Pass X-API-Key header.");
  }

  try {
    if (path === "/email" && (req.method === "GET" || req.method === "POST")) {
      let email = url.searchParams.get("email") ?? "";
      if (!email && req.method === "POST") {
        try {
          const body = await req.json();
          email = typeof body.email === "string" ? body.email : "";
        } catch { /* fall through */ }
      }
      if (!email) return err(400, "missing_parameter", "Query param 'email' is required.");
      return json(await validateEmail(email));
    }

    if (path === "/phone" && (req.method === "GET" || req.method === "POST")) {
      let phone = url.searchParams.get("phone") ?? "";
      let country = url.searchParams.get("country") ?? undefined;
      if (!phone && req.method === "POST") {
        try {
          const body = await req.json();
          phone = typeof body.phone === "string" ? body.phone : "";
          if (typeof body.country === "string") country = body.country;
        } catch { /* fall through */ }
      }
      if (!phone) return err(400, "missing_parameter", "Query param 'phone' is required.");
      return json(validatePhone(phone, country));
    }

    if (path === "/batch" && req.method === "POST") {
      return await handleBatch(req);
    }

    return err(404, "not_found", `No route ${req.method} ${path}. See GET / for docs.`);
  } catch (e) {
    // F6: log internals server-side; return a generic message to the caller.
    console.error("contact_validation_error", e);
    return err(500, "internal_error", "Unexpected error.");
  }
});
