// Extract, repair, and schema-validate JSON from raw LLM output.

interface GuardJsonResult {
  ok: boolean;
  json: unknown;
  repairs: string[];
  schema_valid: boolean | null;
  schema_errors: string[];
  error?: string;
}

export function guardJson(body: Record<string, unknown>): GuardJsonResult {
  const text = typeof body.text === "string" ? body.text : null;
  if (!text) {
    return { ok: false, json: null, repairs: [], schema_valid: null, schema_errors: [], error: "Missing 'text' (string) in body." };
  }
  if (text.length > 500_000) {
    return { ok: false, json: null, repairs: [], schema_valid: null, schema_errors: [], error: "Text too large (max 500 KB)." };
  }

  const repairs: string[] = [];
  let candidate = extract(text, repairs);
  if (candidate == null) {
    return { ok: false, json: null, repairs, schema_valid: null, schema_errors: [], error: "No JSON object or array found in text." };
  }

  let parsed: unknown;
  let success = false;

  const transforms: Array<[string, (s: string) => string]> = [
    ["removed_js_comments", stripComments],
    ["normalized_smart_quotes", (s) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")],
    ["replaced_python_literals", (s) =>
      s.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null")
        .replace(/\bNaN\b/g, "null").replace(/\b-?Infinity\b/g, "null")],
    ["removed_trailing_commas", (s) => s.replace(/,\s*([}\]])/g, "$1")],
    ["quoted_unquoted_keys", (s) => s.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')],
    ["converted_single_quotes", singleToDoubleQuotes],
    ["balanced_brackets", balanceBrackets],
  ];

  try {
    parsed = JSON.parse(candidate);
    success = true;
  } catch { /* try repairs */ }

  if (!success) {
    for (const [name, fn] of transforms) {
      const next = fn(candidate);
      if (next !== candidate) {
        candidate = next;
        repairs.push(name);
        try {
          parsed = JSON.parse(candidate);
          success = true;
          break;
        } catch { /* keep going */ }
      }
    }
  }

  if (!success) {
    return { ok: false, json: null, repairs, schema_valid: null, schema_errors: [], error: "Could not repair into valid JSON." };
  }

  let schemaValid: boolean | null = null;
  const schemaErrors: string[] = [];
  if (body.schema && typeof body.schema === "object") {
    validate(parsed, body.schema as Schema, "$", schemaErrors);
    schemaValid = schemaErrors.length === 0;
  }

  return { ok: true, json: parsed, repairs, schema_valid: schemaValid, schema_errors: schemaErrors };
}

function extract(text: string, repairs: string[]): string | null {
  // 1. fenced ```json blocks
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && /[{[]/.test(fence[1])) {
    repairs.push("extracted_from_code_fence");
    return sliceToJson(fence[1]) ?? fence[1].trim();
  }
  // 2. first balanced {...} or [...]
  const sliced = sliceToJson(text);
  if (sliced) {
    if (sliced.length !== text.trim().length) repairs.push("extracted_from_surrounding_text");
    return sliced;
  }
  // 3. opening brace with no closer (truncated output)
  const start = text.search(/[{[]/);
  if (start >= 0) {
    repairs.push("extracted_truncated_json");
    return text.slice(start).trim();
  }
  return null;
}

function sliceToJson(text: string): string | null {
  const start = text.search(/[{[]/);
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function stripComments(s: string): string {
  let out = "", inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === "/" && n === "/") { while (i < s.length && s[i] !== "\n") i++; out += "\n"; continue; }
    if (c === "/" && n === "*") { i += 2; while (i < s.length - 1 && !(s[i] === "*" && s[i + 1] === "/")) i++; i++; continue; }
    out += c;
  }
  return out;
}

function singleToDoubleQuotes(s: string): string {
  let out = "", inDouble = false, inSingle = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === "\\") { out += c; esc = true; continue; }
    if (c === '"' && !inSingle) { inDouble = !inDouble; out += c; continue; }
    if (c === "'" && !inDouble) {
      inSingle = !inSingle;
      out += '"';
      continue;
    }
    if (c === '"' && inSingle) { out += '\\"'; continue; }
    out += c;
  }
  return out;
}

function balanceBrackets(s: string): string {
  const stack: string[] = [];
  let inStr = false, esc = false;
  for (const c of s) {
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") stack.pop();
  }
  let out = s.trimEnd();
  // close an unterminated string
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  // close in reverse nesting order (innermost first)
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
}

// ---- Minimal JSON Schema validation (the subset LLM apps actually use) ----
interface Schema {
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  additionalProperties?: boolean;
  nullable?: boolean;
}

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

function validate(value: unknown, schema: Schema, path: string, errors: string[]): void {
  if (value === null && schema.nullable) return;
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    const matches = types.some((t) => t === actual || (t === "number" && actual === "integer"));
    if (!matches) {
      errors.push(`${path}: expected type ${types.join("|")}, got ${actual}`);
      return;
    }
  }
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push(`${path}: value not in enum [${schema.enum.map((e) => JSON.stringify(e)).join(", ")}]`);
  }
  if (typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength) errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    if (schema.maxLength != null && value.length > schema.maxLength) errors.push(`${path}: longer than maxLength ${schema.maxLength}`);
    if (schema.pattern) {
      try { if (!new RegExp(schema.pattern).test(value)) errors.push(`${path}: does not match pattern ${schema.pattern}`); }
      catch { errors.push(`${path}: invalid pattern in schema`); }
    }
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${path}: below minimum ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${path}: above maximum ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) errors.push(`${path}: fewer than minItems ${schema.minItems}`);
    if (schema.maxItems != null && value.length > schema.maxItems) errors.push(`${path}: more than maxItems ${schema.maxItems}`);
    if (schema.items) value.forEach((v, i) => validate(v, schema.items!, `${path}[${i}]`, errors));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const r of schema.required ?? []) {
      if (!(r in obj)) errors.push(`${path}: missing required property "${r}"`);
    }
    if (schema.properties) {
      for (const [k, sub] of Object.entries(schema.properties)) {
        if (k in obj) validate(obj[k], sub, `${path}.${k}`, errors);
      }
      if (schema.additionalProperties === false) {
        for (const k of Object.keys(obj)) {
          if (!(k in schema.properties)) errors.push(`${path}: unexpected property "${k}"`);
        }
      }
    }
  }
}
