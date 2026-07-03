// Heuristic prompt-injection detection for LLM-app inputs.

interface Rule {
  category: string;
  weight: number;
  pattern: RegExp;
  label: string;
}

const RULES: Rule[] = [
  // Instruction override
  { category: "instruction_override", weight: 35, label: "ignore previous instructions",
    pattern: /\b(ignore|disregard|forget|discard|override)\b.{0,30}\b(previous|prior|above|earlier|all|any|original|system)\b.{0,20}\b(instruction|prompt|rule|direction|guideline|context)/is },
  { category: "instruction_override", weight: 25, label: "new instructions marker",
    pattern: /\b(new|updated|real|actual|true)\s+(instructions?|system\s*prompt|rules?)\s*[:\-]/i },
  { category: "instruction_override", weight: 20, label: "stop being / no longer an AI",
    pattern: /\byou\s+are\s+(now|no\s+longer)\b/i },

  // System prompt extraction
  { category: "prompt_extraction", weight: 30, label: "reveal system prompt",
    pattern: /\b(reveal|show|print|repeat|output|display|tell\s+me|paste|echo)\b.{0,40}\b(system\s*prompt|initial\s+instructions?|your\s+(instructions?|prompt|rules|guidelines)|hidden\s+(prompt|instructions?))/is },
  { category: "prompt_extraction", weight: 20, label: "verbatim start-of-conversation request",
    pattern: /\b(repeat|print|output)\b.{0,30}\b(everything|all\s+text|words?)\b.{0,30}\b(above|before|beginning|start)/is },

  // Jailbreak personas
  { category: "jailbreak_persona", weight: 30, label: "DAN / do-anything-now",
    pattern: /\b(DAN\s*mode|do\s+anything\s+now)\b/i },
  { category: "jailbreak_persona", weight: 20, label: "developer/god mode",
    pattern: /\b(developer|god|sudo|admin|root)\s+mode\b/i },
  { category: "jailbreak_persona", weight: 25, label: "unrestricted persona roleplay",
    pattern: /\b(pretend|act|roleplay|imagine)\b.{0,50}\b(unrestricted|uncensored|unfiltered|no\s+(rules|restrictions|limits|filters|guidelines)|evil|jailbro?ken)/is },
  { category: "jailbreak_persona", weight: 15, label: "without restrictions/filters",
    pattern: /\bwithout\s+(any\s+)?(restrictions?|filters?|limitations?|censorship|safety)/i },

  // Instruction smuggling / delimiter injection
  { category: "delimiter_injection", weight: 30, label: "chat-template tokens",
    pattern: /<\|?(im_start|im_end|system|endoftext|assistant)\|?>/i },
  { category: "delimiter_injection", weight: 20, label: "[system] style tag",
    pattern: /\[\s*(system|assistant)\s*\]|^###\s*(system|instruction)/im },
  { category: "delimiter_injection", weight: 15, label: "fake conversation turns",
    pattern: /\b(assistant|system)\s*:\s*.{0,80}\b(user|human)\s*:/is },

  // Data exfiltration
  { category: "exfiltration", weight: 25, label: "asking for secrets/credentials",
    pattern: /\b(api[\s_-]?keys?|passwords?|secrets?|credentials?|tokens?|env(ironment)?\s+variables?)\b.{0,40}\b(reveal|show|tell|print|send|share|list|leak)|\b(reveal|show|tell|print|send|share|list|leak)\b.{0,40}\b(api[\s_-]?keys?|passwords?|secrets?|credentials?|tokens?)/is },
  { category: "exfiltration", weight: 20, label: "send data to external URL",
    pattern: /\b(send|post|forward|upload|exfiltrate)\b.{0,50}\b(to|at)\s+https?:\/\//is },

  // Obfuscation
  { category: "obfuscation", weight: 15, label: "long base64 blob",
    pattern: /[A-Za-z0-9+/]{120,}={0,2}/ },
  { category: "obfuscation", weight: 20, label: "zero-width/invisible unicode",
    pattern: /[​‌‍⁠﻿]/u },
  { category: "obfuscation", weight: 10, label: "unicode tag characters",
    pattern: /[\u{E0020}-\u{E007E}]/u },

  // Social engineering of the model
  { category: "coercion", weight: 10, label: "threats/urgency toward the model",
    pattern: /\b(or\s+(else|i\s+will)|you\s+must\s+comply|this\s+is\s+(a\s+)?(direct\s+)?order|lives?\s+(are|is)\s+at\s+stake)\b/i },
  { category: "coercion", weight: 10, label: "claiming special authority",
    pattern: /\b(i\s+am\s+(your|the)\s+(developer|creator|admin(istrator)?|owner|ceo)|as\s+your\s+(developer|creator|admin))\b/i },
];

export function guardPrompt(body: Record<string, unknown>) {
  const text = typeof body.text === "string" ? body.text : null;
  if (!text) return { error: "Missing 'text' (string) in body." };
  if (text.length > 200_000) return { error: "Text too large (max 200 KB)." };

  const matches: Array<{ category: string; label: string; weight: number; excerpt: string }> = [];
  let score = 0;
  const seenCategories = new Map<string, number>();

  for (const rule of RULES) {
    const m = text.match(rule.pattern);
    if (m) {
      // diminishing returns within a category
      const prior = seenCategories.get(rule.category) ?? 0;
      const effective = prior === 0 ? rule.weight : Math.round(rule.weight * 0.4);
      seenCategories.set(rule.category, prior + 1);
      score += effective;
      matches.push({
        category: rule.category,
        label: rule.label,
        weight: effective,
        excerpt: excerpt(text, m.index ?? 0, m[0].length),
      });
    }
  }

  score = Math.min(100, score);
  const verdict = score >= 50 ? "likely_injection" : score >= 20 ? "suspicious" : "clean";

  return {
    verdict,
    score,
    safe: verdict === "clean",
    matches,
    categories: [...seenCategories.keys()],
    recommendation:
      verdict === "likely_injection"
        ? "Block this input or strip the matched segments before passing to your LLM."
        : verdict === "suspicious"
        ? "Review flagged segments; consider wrapping user input in delimiters and reasserting your system prompt."
        : "No known injection patterns detected.",
  };
}

function excerpt(text: string, index: number, len: number): string {
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + len + 20);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ") + (end < text.length ? "…" : "");
}
