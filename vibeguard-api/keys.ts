// Key management, verification, rate limiting, metering — backed by Postgres.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { json } from "./index.ts";

const MAX_KEYS_PER_TENANT = 200;

let _db: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!_db) {
    _db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
  }
  return _db;
}

const tenantCache = new Map<string, string>();

async function tenantId(externalId: string): Promise<string> {
  const cached = tenantCache.get(externalId);
  if (cached) return cached;
  const { data, error } = await db()
    .from("tenants")
    .upsert({ external_id: externalId }, { onConflict: "external_id" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`tenant resolution failed: ${error?.message}`);
  tenantCache.set(externalId, data.id);
  return data.id;
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return "vg_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleKeys(
  method: string,
  path: string,
  body: Record<string, unknown>,
  tenant: string,
): Promise<Response> {
  const tid = await tenantId(tenant);

  if (method === "POST" && path === "/keys") {
    const { count } = await db().from("api_keys").select("id", { count: "exact", head: true }).eq("tenant_id", tid);
    if ((count ?? 0) >= MAX_KEYS_PER_TENANT) {
      return json({ error: `Key limit reached (${MAX_KEYS_PER_TENANT} per account).` }, 400);
    }
    const rateLimit = clampInt(body.rate_limit_per_min, 1, 100000, 60);
    const quota = body.monthly_quota == null ? null : clampInt(body.monthly_quota, 1, 1_000_000_000, 10000);
    const name = typeof body.name === "string" ? body.name.slice(0, 120) : null;
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

    const raw = randomKey();
    const { data, error } = await db()
      .from("api_keys")
      .insert({
        tenant_id: tid,
        name,
        key_hash: await sha256hex(raw),
        key_prefix: raw.slice(0, 10),
        rate_limit_per_min: rateLimit,
        monthly_quota: quota,
        metadata,
      })
      .select("id, created_at")
      .single();
    if (error || !data) {
      console.error("vibeguard_create_key_error", error);
      return json({ error: "Could not create key." }, 500);
    }

    return json({
      key: raw,
      key_id: data.id,
      name,
      rate_limit_per_min: rateLimit,
      monthly_quota: quota,
      created_at: data.created_at,
      warning: "Store this key now — it is shown only once and cannot be retrieved later.",
    }, 201);
  }

  if (method === "GET" && path === "/keys") {
    const { data, error } = await db()
      .from("api_keys")
      .select("id, name, key_prefix, rate_limit_per_min, monthly_quota, revoked, created_at, total_requests, last_used_at")
      .eq("tenant_id", tid)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("vibeguard_list_keys_error", error);
      return json({ error: "Could not list keys." }, 500);
    }
    return json({ keys: data, count: data?.length ?? 0 });
  }

  if (method === "DELETE" && path.startsWith("/keys/")) {
    const keyId = path.slice("/keys/".length);
    if (!/^[0-9a-f-]{36}$/i.test(keyId)) return json({ error: "Invalid key_id (expected UUID)." }, 400);
    const { data, error } = await db()
      .from("api_keys")
      .update({ revoked: true })
      .eq("id", keyId)
      .eq("tenant_id", tid)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("vibeguard_revoke_key_error", error);
      return json({ error: "Could not revoke key." }, 500);
    }
    if (!data) return json({ error: "Key not found." }, 404);
    return json({ revoked: true, key_id: keyId });
  }

  return json({ error: `No route: ${method} ${path}` }, 404);
}

export async function handleVerify(body: Record<string, unknown>, tenant: string): Promise<Response> {
  const key = typeof body.key === "string" ? body.key : null;
  if (!key) return json({ error: "Missing 'key' (string) in body." }, 400);
  const cost = clampInt(body.cost, 1, 1000, 1);

  const tid = await tenantId(tenant);
  const hash = await sha256hex(key);

  // F7: confirm the key belongs to THIS tenant BEFORE metering it, so a caller
  // cannot burn another tenant's rate-limit/quota by verifying a key they don't own.
  const { data: owner, error: ownerErr } = await db()
    .from("api_keys").select("tenant_id").eq("key_hash", hash).maybeSingle();
  if (ownerErr) {
    console.error("vibeguard_verify_owner_lookup_error", ownerErr);
    return json({ error: "Could not verify key." }, 500);
  }
  if (!owner || owner.tenant_id !== tid) {
    return json({ valid: false, reason: "key_not_found" }, 404);
  }

  const { data, error } = await db().rpc("verify_key", { p_hash: hash, p_cost: cost });
  if (error) {
    console.error("vibeguard_verify_key_error", error);
    return json({ error: "Could not verify key." }, 500);
  }

  const status = data?.valid ? 200 : data?.reason === "rate_limited" ? 429 : data?.reason === "key_not_found" ? 404 : 403;
  return json(data, status);
}

export async function handleUsage(tenant: string): Promise<Response> {
  const tid = await tenantId(tenant);
  const month = new Date().toISOString().slice(0, 7) + "-01";
  const { data: keys, error } = await db()
    .from("api_keys")
    .select("id, name, key_prefix, revoked, total_requests, last_used_at, monthly_quota, rate_limit_per_min")
    .eq("tenant_id", tid);
  if (error) {
    console.error("vibeguard_usage_error", error);
    return json({ error: "Could not load usage." }, 500);
  }

  const ids = (keys ?? []).map((k) => k.id);
  const monthMap = new Map<string, number>();
  if (ids.length) {
    const { data: usage } = await db()
      .from("monthly_usage")
      .select("key_id, count")
      .eq("month", month)
      .in("key_id", ids);
    for (const u of usage ?? []) monthMap.set(u.key_id, Number(u.count));
  }

  const report = (keys ?? []).map((k) => ({
    key_id: k.id,
    name: k.name,
    key_prefix: k.key_prefix,
    revoked: k.revoked,
    rate_limit_per_min: k.rate_limit_per_min,
    monthly_quota: k.monthly_quota,
    used_this_month: monthMap.get(k.id) ?? 0,
    remaining_this_month: k.monthly_quota == null ? null : Math.max(0, Number(k.monthly_quota) - (monthMap.get(k.id) ?? 0)),
    total_requests_all_time: Number(k.total_requests),
    last_used_at: k.last_used_at,
  }));

  return json({
    month: month.slice(0, 7),
    keys: report,
    totals: {
      keys: report.length,
      active_keys: report.filter((k) => !k.revoked).length,
      requests_this_month: report.reduce((s, k) => s + k.used_this_month, 0),
    },
  });
}

function clampInt(v: unknown, min: number, max: number, dflt: number): number {
  const n = typeof v === "number" ? Math.floor(v) : typeof v === "string" ? parseInt(v, 10) : NaN;
  if (Number.isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
