#!/usr/bin/env python3
"""Draw the PNG home-screen icons after icon.svg (Pillow): app/.venv/bin/python app/make_icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
FONT = HERE.parent / "upstream/assets/fonts/BarlowSemiCondensed-Bold.ttf"
BG, SCREEN, ACCENT, KEY = "#1c1c1d", "#08090a", "#f08a2b", "#eeeeec"


def draw(size, rounded, scale=1.0):
    """icon.svg's 192-unit design; scale < 1 keeps it inside a maskable icon's safe zone."""
    big = size * 4
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = big / 192
    d.rounded_rectangle((0, 0, big - 1, big - 1), radius=36 * u if rounded else 0, fill=BG)
    k = u * scale
    o = big * (1 - scale) / 2
    box = lambda x, y, w, h: (o + x * k, o + y * k, o + (x + w) * k, o + (y + h) * k)
    d.rounded_rectangle(box(24, 26, 144, 94), radius=8 * k, fill=SCREEN)
    d.text((o + 96 * k, o + 87 * k), "X0X", font=ImageFont.truetype(str(FONT), round(42 * k)), fill=ACCENT, anchor="ms")
    for x in (25, 54, 83, 112, 141):
        d.rounded_rectangle(box(x, 135, 24, 30), radius=3 * k, fill=KEY)
    return img.resize((size, size), Image.LANCZOS)


draw(180, False).convert("RGB").save(HERE / "apple-touch-icon.png")   # iOS rounds the corners itself
draw(192, True).save(HERE / "icon-192.png")
draw(512, True).save(HERE / "icon-512.png")
draw(512, False, 0.78).convert("RGB").save(HERE / "icon-maskable-512.png")
print("Icons written to " + str(HERE))
