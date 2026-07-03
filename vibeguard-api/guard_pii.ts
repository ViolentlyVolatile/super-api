// PII + secret detection and redaction for text going into or out of LLMs.

interface Finding {
  type: string;
  value: string;
  start: number;
  end: number;
}

interface Detector {
  type: string;
  pattern: RegExp;
  validate?: (match: string) => boolean;
}

const DETECTORS: Detector[] = [
  { type: "email", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { type: "credit_card", pattern: /\b(?:\d[ -]?){13,19}\b/g, validate: (m) => luhn(m.replace(/[ -]/g, "")) },
  { type: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "phone",
    pattern: /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/g,
    validate: (m) => {
      const digits = m.replace(/\D/g, "");
      return digits.length >= 10 && digits.length <= 15 && !/^\d{4}[\s.-]?\d{4}$/.test(m.trim());
    } },
  { type: "ipv4", pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})\b/g },
  { type: "ipv6", pattern: /\b(?:[A-Fa-f0-9]{1,4}:){4,7}[A-Fa-f0-9]{1,4}\b/g },
  { type: "iban", pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
  // Secrets / API keys
  { type: "openai_key", pattern: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}\b/g },
  { type: "github_token", pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { type: "aws_access_key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { type: "google_api_key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { type: "slack_token", pattern: /\bxox[bpars]-[A-Za-z0-9-]{10,}\b/g },
  { type: "stripe_key", pattern: /\b[sr]k_(?:live|test)_[A-Za-z0-9]{20,}\b/g },
  { type: "jwt", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { type: "supabase_key", pattern: /\bsb[ps]_[A-Za-z0-9_-]{20,}\b/g },
];

function luhn(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function guardPii(body: Record<string, unknown>) {
  const text = typeof body.text === "string" ? body.text : null;
  if (!text) return { error: "Missing 'text' (string) in body." };
  if (text.length > 500_000) return { error: "Text too large (max 500 KB)." };

  const redact = body.redact !== false; // default true
  const wanted = Array.isArray(body.types) ? new Set(body.types as string[]) : null;

  const findings: Finding[] = [];
  for (const det of DETECTORS) {
    if (wanted && !wanted.has(det.type)) continue;
    det.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = det.pattern.exec(text)) !== null) {
      const value = m[0];
      if (det.validate && !det.validate(value)) continue;
      findings.push({ type: det.type, value, start: m.index, end: m.index + value.length });
      if (findings.length >= 1000) break;
    }
  }

  // Drop findings fully contained inside another finding (e.g. digits of a card inside a phone match)
  findings.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Finding[] = [];
  for (const f of findings) {
    const last = kept[kept.length - 1];
    if (last && f.start >= last.start && f.end <= last.end) continue;
    kept.push(f);
  }

  let redacted: string | null = null;
  if (redact) {
    const counters = new Map<string, number>();
    let out = "", cursor = 0;
    for (const f of kept) {
      if (f.start < cursor) continue;
      const n = (counters.get(f.type) ?? 0) + 1;
      counters.set(f.type, n);
      out += text.slice(cursor, f.start) + `[${f.type.toUpperCase()}_${n}]`;
      cursor = f.end;
    }
    redacted = out + text.slice(cursor);
  }

  const counts: Record<string, number> = {};
  for (const f of kept) counts[f.type] = (counts[f.type] ?? 0) + 1;

  return {
    clean: kept.length === 0,
    findings_count: kept.length,
    counts,
    findings: kept,
    redacted_text: redacted,
    supported_types: DETECTORS.map((d) => d.type),
  };
}
