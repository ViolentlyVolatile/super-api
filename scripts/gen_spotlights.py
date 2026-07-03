"""Generate branded 1200x628 spotlight cards for the Super_API listings.

One cohesive template, per-API accent colour. Outputs PNGs into each API's
docs/spotlights/ folder. Run: python scripts/gen_spotlights.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 1200, 628
BG = (11, 18, 32)          # deep navy
BG2 = (17, 27, 46)
INK = (233, 238, 247)
MUTED = (150, 163, 187)
CHIP_BG = (28, 40, 66)

FONT = "C:/Windows/Fonts/arialbd.ttf"
FONT_R = "C:/Windows/Fonts/arial.ttf"


def f(size, bold=True):
    return ImageFont.truetype(FONT if bold else FONT_R, size)


def rounded(draw, xy, r, fill):
    draw.rounded_rectangle(xy, radius=r, fill=fill)


def text_w(draw, s, font):
    return draw.textlength(s, font=font)


def card(path, accent, kicker, title, tagline, chips, wordmark="NexMath API"):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # subtle top-to-bottom panel + corner glow
    for y in range(H):
        t = y / H
        col = tuple(int(BG[i] + (BG2[i] - BG[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=col)
    # accent bar (left)
    d.rectangle([0, 0, 14, H], fill=accent)
    # accent dot motif top-right
    for i, rad in enumerate((160, 110, 60)):
        a = tuple(int(accent[j] + (BG2[j] - accent[j]) * (0.75 - i * 0.12)) for j in range(3))
        d.ellipse([W - 70 - rad, -rad + 40, W - 70 + rad, rad + 40], outline=a, width=3)
    PAD = 80
    # kicker
    d.text((PAD, 92), kicker.upper(), font=f(28), fill=accent)
    # title (wrap to <= ~2 lines)
    tf = f(74)
    words, lines, cur = title.split(), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if text_w(d, test, tf) > W - PAD * 2 - 40 and cur:
            lines.append(cur)
            cur = w
        else:
            cur = test
    lines.append(cur)
    y = 150
    for ln in lines[:2]:
        d.text((PAD, y), ln, font=tf, fill=INK)
        y += 84
    # tagline
    y += 6
    tgf = f(34, bold=False)
    words, cur = tagline.split(), ""
    for w in words:
        test = (cur + " " + w).strip()
        if text_w(d, test, tgf) > W - PAD * 2 and cur:
            d.text((PAD, y), cur, font=tgf, fill=MUTED)
            y += 46
            cur = w
        else:
            cur = test
    d.text((PAD, y), cur, font=tgf, fill=MUTED)
    # endpoint chips row (bottom)
    cx, cy = PAD, H - 150
    cf = f(26)
    for c in chips:
        tw = text_w(d, c, cf)
        rounded(d, [cx, cy, cx + tw + 44, cy + 52], 26, CHIP_BG)
        d.ellipse([cx + 18, cy + 21, cx + 28, cy + 31], fill=accent)
        d.text((cx + 36, cy + 12), c, font=cf, fill=INK)
        cx += tw + 44 + 16
        if cx > W - 220:
            break
    # wordmark bottom-right
    wf = f(30)
    d.text((W - PAD - text_w(d, wordmark, wf), H - 74), wordmark, font=wf, fill=(120, 134, 160))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print("wrote", path)


# accent colours per API
TEAL = (34, 197, 176)
VIOLET = (149, 118, 255)
AMBER = (245, 158, 66)

CARDS = {
    "contact-validation-api": (TEAL, [
        ("Email intelligence", "Email Validation",
         "Syntax, live MX lookup, disposable & role detection, typo autocorrect, and a 0–100 deliverability score.",
         ["/email", "mx + disposable", "0–100 score"]),
        ("240+ regions", "Phone Validation",
         "Parse and validate numbers worldwide — E.164 formatting, region, and line type (mobile / fixed / VOIP).",
         ["/phone", "E.164", "line type"]),
        ("Built for scale", "Batch & Fast Mode",
         "Check up to 100 contacts in one call, or use mx=false for a network-free, sub-second syntax screen.",
         ["/batch ×100", "mx=false", "stateless"]),
    ]),
    "vibeguard-api": (VIOLET, [
        ("Backend plumbing", "API Keys & Rate Limits",
         "Issue keys for your app's users, then verify + rate-limit + meter usage in a single call.",
         ["/keys", "/verify", "usage metering"]),
        ("Ship valid JSON", "LLM JSON Repair",
         "Extract, repair, and schema-validate messy LLM output — fixes trailing commas, quotes, truncation.",
         ["/guard/json", "repair", "schema check"]),
        ("Safety layer", "Prompt-Injection & PII Guard",
         "Score prompt-injection attempts and detect + redact PII and leaked secrets before they hit your model.",
         ["/guard/prompt", "/guard/pii", "redaction"]),
    ]),
    "manufacturing-toolbox": (AMBER, [
        ("Additive", "3D Print & G-code",
         "STL → instant price quote, mesh printability analysis, and G-code time / filament / cost breakdowns.",
         ["/3dp/quote", "/3dp/analyze", "/gcode/analyze"]),
        ("Subtractive", "CNC & Machinist Calcs",
         "CNC cost estimates, feeds & speeds, ISO 286 fits, and thread specs — metric and unified.",
         ["/cnc/estimate", "feeds-speeds", "fits + threads"]),
        ("More tools", "Molding, PCB & Materials",
         "Injection-molding and PCB cost estimates plus a 60+ entry engineering materials database.",
         ["/molding", "/pcb", "materials DB"]),
    ]),
}

SLUGS = {
    "contact-validation-api": ["email", "phone", "batch"],
    "vibeguard-api": ["keys", "json", "guard"],
    "manufacturing-toolbox": ["print", "cnc", "materials"],
}

for api, (accent, cards) in CARDS.items():
    for (kicker, title, tagline, chips), slug in zip(cards, SLUGS[api]):
        out = os.path.join(ROOT, api, "docs", "spotlights", f"spotlight_{slug}.png")
        card(out, accent, kicker, title, tagline, chips)
print("done")
