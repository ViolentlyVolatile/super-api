// Email validation: syntax, DNS (MX via DNS-over-HTTPS), disposable,
// free-provider, role-address, typo suggestion, quality score.

import {
  DISPOSABLE_FALLBACK,
  DISPOSABLE_LIST_URL,
  FREE_PROVIDERS,
  POPULAR_DOMAINS,
  ROLE_LOCALS,
} from "./data.ts";

// ---------- disposable-domain list (runtime-fetched, cached in memory) ----

let disposableSet: Set<string> = DISPOSABLE_FALLBACK;
let disposableFetchedAt = 0;
const DISPOSABLE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
let disposableFetchInFlight: Promise<void> | null = null;

async function refreshDisposable(): Promise<void> {
  try {
    const res = await fetch(DISPOSABLE_LIST_URL, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return;
    const text = await res.text();
    const domains = text
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l && !l.startsWith("#"));
    if (domains.length > 500) {
      disposableSet = new Set([...domains, ...DISPOSABLE_FALLBACK]);
      disposableFetchedAt = Date.now();
    }
  } catch {
    // keep fallback
  } finally {
    disposableFetchInFlight = null;
  }
}

function ensureDisposableFresh(): Promise<void> | null {
  if (Date.now() - disposableFetchedAt > DISPOSABLE_TTL_MS && !disposableFetchInFlight) {
    disposableFetchInFlight = refreshDisposable();
    return disposableFetchInFlight;
  }
  return disposableFetchInFlight;
}

// ---------- DNS via DNS-over-HTTPS (Cloudflare primary, Google fallback) --

interface DnsAnswer {
  data?: string;
  type?: number;
}

async function dohQuery(name: string, type: "MX" | "A"): Promise<DnsAnswer[] | null> {
  const urls = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
    `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (typeof json.Status !== "number") continue;
      if (json.Status === 3) return []; // NXDOMAIN
      if (json.Status !== 0) continue;
      return (json.Answer ?? []) as DnsAnswer[];
    } catch {
      // try next resolver
    }
  }
  return null; // all resolvers failed
}

export interface MxResult {
  mx_found: boolean | null; // null = DNS lookup failed
  mx_records: string[];
  a_found: boolean | null;
}

const mxCache = new Map<string, { at: number; result: MxResult }>();
const MX_CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const MX_CACHE_MAX = 5000;

export async function lookupDomain(domain: string): Promise<MxResult> {
  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.at < MX_CACHE_TTL_MS) return cached.result;

  const mxAnswers = await dohQuery(domain, "MX");
  let result: MxResult;
  if (mxAnswers === null) {
    result = { mx_found: null, mx_records: [], a_found: null };
  } else {
    const mxTypeOnly = mxAnswers.filter((a) => a.type === 15 && a.data);
    const records = mxTypeOnly
      .map((a) => (a.data ?? "").replace(/^\d+\s+/, "").replace(/\.$/, ""))
      .filter((r) => r && r !== ".")
      .slice(0, 5);
    if (records.length > 0) {
      result = { mx_found: true, mx_records: records, a_found: null };
    } else {
      // No MX — check A record (some domains accept mail on A).
      const aAnswers = await dohQuery(domain, "A");
      result = {
        mx_found: false,
        mx_records: [],
        a_found: aAnswers === null ? null : aAnswers.some((a) => a.type === 1),
      };
    }
  }
  if (mxCache.size >= MX_CACHE_MAX) mxCache.clear();
  mxCache.set(domain, { at: Date.now(), result });
  return result;
}

// ---------- syntax + helpers ---------------------------------------------

const LOCAL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

export interface SyntaxResult {
  valid: boolean;
  local: string;
  domain: string; // ascii/punycoded, lowercased
  reason?: string;
}

export function checkSyntax(email: string): SyntaxResult {
  const bad = (reason: string): SyntaxResult => ({ valid: false, local: "", domain: "", reason });
  if (typeof email !== "string") return bad("not_a_string");
  const trimmed = email.trim();
  if (trimmed.length === 0) return bad("empty");
  if (trimmed.length > 254) return bad("too_long");
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return bad("missing_local_or_domain");
  const local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1).toLowerCase();
  if (local.length > 64) return bad("local_part_too_long");
  if (!LOCAL_RE.test(local)) return bad("invalid_characters_in_local_part");
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
    return bad("invalid_dots_in_local_part");
  }
  // Punycode any unicode domain via URL parsing.
  try {
    domain = new URL(`http://${domain}`).hostname;
  } catch {
    return bad("invalid_domain");
  }
  if (domain.length > 253 || !domain.includes(".")) return bad("invalid_domain");
  const labels = domain.split(".");
  if (labels.some((l) => !DOMAIN_LABEL_RE.test(l))) return bad("invalid_domain");
  const tld = labels[labels.length - 1];
  if (tld.length < 2 || /^\d+$/.test(tld)) return bad("invalid_tld");
  return { valid: true, local, domain };
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(
        dp[i] + 1,
        dp[i - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = tmp;
    }
  }
  return dp[a.length];
}

export function suggestDomain(domain: string): string | null {
  if (FREE_PROVIDERS.has(domain)) return null;
  let best: string | null = null;
  let bestDist = 3;
  for (const pop of POPULAR_DOMAINS) {
    const d = levenshtein(domain, pop);
    if (d > 0 && d < bestDist) {
      bestDist = d;
      best = pop;
    }
  }
  return best;
}

// ---------- main validator ------------------------------------------------

export interface EmailValidation {
  email: string;
  valid: boolean;
  score: number;
  deliverable: "yes" | "risky" | "no" | "unknown";
  reason: string | null;
  syntax: { valid: boolean; local_part: string; domain: string };
  domain: {
    mx_found: boolean | null;
    mx_records: string[];
    disposable: boolean;
    free_provider: boolean;
  };
  flags: { role_address: boolean; disposable: boolean; free_provider: boolean };
  did_you_mean: string | null;
}

export async function validateEmail(email: string): Promise<EmailValidation> {
  ensureDisposableFresh(); // fire-and-forget refresh
  const syn = checkSyntax(email);
  const base: EmailValidation = {
    email: typeof email === "string" ? email.trim() : String(email),
    valid: false,
    score: 0,
    deliverable: "no",
    reason: syn.reason ?? null,
    syntax: { valid: syn.valid, local_part: syn.local, domain: syn.domain },
    domain: { mx_found: null, mx_records: [], disposable: false, free_provider: false },
    flags: { role_address: false, disposable: false, free_provider: false },
    did_you_mean: null,
  };
  if (!syn.valid) return base;

  const disposable = disposableSet.has(syn.domain);
  const freeProvider = FREE_PROVIDERS.has(syn.domain);
  const role = ROLE_LOCALS.has(syn.local.toLowerCase());
  const suggestion = suggestDomain(syn.domain);
  const dns = await lookupDomain(syn.domain);

  let score = 100;
  let deliverable: EmailValidation["deliverable"] = "yes";
  let reason: string | null = null;

  if (dns.mx_found === false) {
    if (dns.a_found) {
      score = 40;
      deliverable = "risky";
      reason = "no_mx_but_a_record";
    } else if (dns.a_found === false) {
      score = 5;
      deliverable = "no";
      reason = "domain_has_no_mail_server";
    } else {
      score = 25;
      deliverable = "unknown";
      reason = "dns_lookup_failed";
    }
  } else if (dns.mx_found === null) {
    score = 60;
    deliverable = "unknown";
    reason = "dns_lookup_failed";
  }

  if (disposable) {
    score = Math.min(score, 10);
    deliverable = dns.mx_found ? "risky" : deliverable;
    reason = reason ?? "disposable_domain";
  }
  if (suggestion) {
    score = Math.max(0, score - 30);
    if (deliverable === "yes") deliverable = "risky";
    reason = reason ?? "possible_domain_typo";
  }
  if (role) score = Math.max(0, score - 10);

  return {
    ...base,
    valid: true,
    score,
    deliverable,
    reason,
    domain: {
      mx_found: dns.mx_found,
      mx_records: dns.mx_records,
      disposable,
      free_provider: freeProvider,
    },
    flags: { role_address: role, disposable, free_provider: freeProvider },
    did_you_mean: suggestion ? `${syn.local}@${suggestion}` : null,
  };
}
