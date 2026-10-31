#!/usr/bin/env python3
"""
يولّد أيقونات PWA من نفس أشكال LogoMark الموجودة في src/components/floral.tsx
حتى تبقى أيقونة التطبيق مطابقة لهوية الموقع.

التشغيل:  python3 scripts/generate-icons.py
"""

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"

BLUSH = (249, 239, 242, 255)    # #F9EFF2
POWDER = (240, 220, 227, 255)   # #F0DCE3
DUSTY = (221, 184, 197, 255)    # #DDB8C5
DEEP = (153, 92, 116, 255)      # #995C74

SS = 4  # supersample factor


def bezier(p0, p1, p2, p3, steps=64):
    """Flatten a cubic Bézier into a point list."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = (u**3 * p0[0] + 3 * u * u * t * p1[0]
             + 3 * u * t * t * p2[0] + t**3 * p3[0])
        y = (u**3 * p0[1] + 3 * u * u * t * p1[1]
             + 3 * u * t * t * p2[1] + t**3 * p3[1])
        pts.append((x, y))
    return pts


def leaf_outline():
    """The LogoMark leaf path, in the 48×48 viewBox."""
    return (
        bezier((24, 10), (18, 14), (15, 18), (15, 24))
        + bezier((15, 24), (15, 30), (18, 34), (24, 38))
        + bezier((24, 38), (30, 34), (33, 30), (33, 24))
        + bezier((33, 24), (33, 18), (30, 14), (24, 10))
    )


def leaf_veins():
    """The two small inner highlight shapes."""
    left = (bezier((24, 18), (24, 22), (21, 23), (18, 23))
            + bezier((18, 23), (18, 20), (21, 18), (24, 18)))
    right = (bezier((24, 18), (24, 22), (27, 23), (30, 23))
             + bezier((30, 23), (30, 20), (27, 18), (24, 18)))
    return left, right


def draw_logo_mark(img, box):
    """Draw the LogoMark (48×48 viewBox) into the square `box` (x0, y0, x1, y1)."""
    x0, y0, x1, y1 = box
    s = (x1 - x0) / 48.0

    def t(pt):
        return (x0 + pt[0] * s, y0 + pt[1] * s)

    d = ImageDraw.Draw(img)

    # outer circle  r=22 at (24,24)
    cx, cy = t((24, 24))
    r = 22 * s
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=POWDER)

    # leaf
    d.polygon([t(p) for p in leaf_outline()], fill=DUSTY)

    # veins — drawn on their own layer at 55% opacity, exactly like the SVG
    vein = Image.new("RGBA", img.size, (0, 0, 0, 0))
    vd = ImageDraw.Draw(vein)
    left, right = leaf_veins()
    vd.polygon([t(p) for p in left], fill=DEEP)
    vd.polygon([t(p) for p in right], fill=DEEP)
    r_, g_, b_, a_ = vein.split()
    a_ = a_.point(lambda v: int(v * 0.55))
    img.alpha_composite(Image.merge("RGBA", (r_, g_, b_, a_)))

    # base dot
    dcx, dcy = t((24, 30))
    dr = 2.5 * s
    d.ellipse([dcx - dr, dcy - dr, dcx + dr, dcy + dr], fill=DEEP)


def make_icon(size, path, *, rounded=True, bg=BLUSH, logo_scale=0.82,
              radius_ratio=0.22):
    """Render one icon: background + centred LogoMark, supersampled then downscaled."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(big * radius_ratio) if rounded else 0
    d.rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=bg)

    pad = big * (1 - logo_scale) / 2
    draw_logo_mark(img, (pad, pad, big - pad, big - pad))

    img = img.resize((size, size), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print(f"  ✓ {path.relative_to(OUT.parent.parent)}  ({size}×{size})")


def main():
    print("توليد أيقونات PWA…")
    # "any" — shown as-is; rounded blush tile with the powder logo disc
    make_icon(192, OUT / "icon-192.png")
    make_icon(512, OUT / "icon-512.png")

    # "maskable" — the OS may crop to a circle/squircle, so keep the mark
    # well inside the safe zone (~80% of the canvas) and fill the whole square.
    make_icon(512, OUT / "icon-maskable-512.png", rounded=False,
              logo_scale=0.52)

    # iOS home-screen icon (not masked by Android-style adaptive shapes)
    make_icon(180, OUT / "apple-touch-icon.png", rounded=False,
              logo_scale=0.80)

    # small favicon
    make_icon(32, OUT / "favicon-32.png", rounded=True, logo_scale=0.86,
              radius_ratio=0.25)


if __name__ == "__main__":
    main()
