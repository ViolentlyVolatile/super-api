"""Generate 500x500 branded logos for VibeGuard and Manufacturing Toolbox.

Matches the spotlight-card look: deep-navy rounded square, per-product accent,
a bold geometric glyph. Outputs logo.png into each API's docs/ folder.
"""
import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 500
BG = (11, 18, 32)
BG2 = (20, 30, 52)


def base(accent):
    img = Image.new("RGB", (S, S), BG)
    d = ImageDraw.Draw(img)
    # vertical gradient
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(BG[i] + (BG2[i] - BG[i]) * t) for i in range(3)))
    # rounded-square mask so corners are soft
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=96, fill=255)
    # accent glow ring, top-right
    d.ellipse([S - 150, -90, S + 120, 180], outline=accent, width=6)
    return img, d, mask


def finish(img, mask, path):
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    out.save(path)
    print("wrote", path)


def vibeguard():
    accent = (149, 118, 255)  # violet
    img, d, mask = base(accent)
    # shield
    cx, cy = 250, 250
    w, h = 190, 230
    top = cy - h // 2
    pts = [
        (cx - w // 2, top + 20), (cx, top), (cx + w // 2, top + 20),
        (cx + w // 2, top + h * 0.45), (cx, top + h), (cx - w // 2, top + h * 0.45),
    ]
    d.polygon(pts, fill=(28, 24, 54), outline=accent)
    # thick outline
    for wdt in range(10):
        d.line(pts + [pts[0]], fill=accent, width=10 - wdt, joint="curve")
    d.polygon(pts, outline=accent)
    # brackets </>  inside the shield
    d.line([(cx - 46, cy - 34), (cx - 78, cy), (cx - 46, cy + 34)], fill=(233, 238, 247), width=14, joint="curve")
    d.line([(cx + 46, cy - 34), (cx + 78, cy), (cx + 46, cy + 34)], fill=(233, 238, 247), width=14, joint="curve")
    d.line([(cx + 16, cy - 44), (cx - 16, cy + 44)], fill=accent, width=13)
    finish(img, mask, os.path.join(ROOT, "vibeguard-api", "docs", "logo.png"))


def gear(d, cx, cy, r_out, r_in, teeth, color, width):
    # draw a cog outline
    pts_out, pts_in = [], []
    for i in range(teeth * 2):
        ang = math.pi * i / teeth
        r = r_out if i % 2 == 0 else r_out - 26
        pts_out.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    d.polygon(pts_out, outline=color)
    for wdt in range(width):
        d.line(pts_out + [pts_out[0]], fill=color, width=width - wdt, joint="curve")
    d.ellipse([cx - r_in, cy - r_in, cx + r_in, cy + r_in], outline=color, width=width)


def manufacturing():
    accent = (245, 158, 66)  # amber
    img, d, mask = base(accent)
    cx, cy = 250, 250
    gear(d, cx, cy, 150, 60, 9, accent, 16)
    # inner hex nut hole
    hexpts = [(cx + 58 * math.cos(math.pi / 6 + math.pi * i / 3),
               cy + 58 * math.sin(math.pi / 6 + math.pi * i / 3)) for i in range(6)]
    d.polygon(hexpts, fill=(30, 22, 10), outline=accent)
    for wdt in range(8):
        d.line(hexpts + [hexpts[0]], fill=accent, width=8 - wdt, joint="curve")
    finish(img, mask, os.path.join(ROOT, "manufacturing-toolbox", "docs", "logo.png"))


vibeguard()
manufacturing()
print("done")
