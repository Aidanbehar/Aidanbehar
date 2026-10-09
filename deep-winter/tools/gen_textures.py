#!/usr/bin/env python3
"""Generates Deep Winter's item textures and mod icon (pixel art, reproducible).

Run from the project root:  python3 tools/gen_textures.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TEX = ROOT / "src/main/resources/assets/deepwinter/textures/item"
ICON = ROOT / "src/main/resources/assets/deepwinter/icon.png"


def canvas():
    return Image.new("RGBA", (16, 16), (0, 0, 0, 0))


def put(img, pts, colour):
    for x, y in pts:
        img.putpixel((x, y), colour)


def thermometer():
    img = canvas()
    outline = (40, 44, 52, 255)
    glass = (214, 232, 240, 255)
    glass_hi = (250, 252, 255, 255)
    red = (205, 38, 38, 255)
    red_hi = (240, 90, 80, 255)
    copper = (192, 108, 70, 255)
    copper_dk = (140, 70, 46, 255)
    # Diagonal tube from the bulb (bottom-left) to the cap (top-right).
    for i in range(10):
        cx, cy = 4 + i, 11 - i
        put(img, [(cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)], outline)
    for i in range(10):
        cx, cy = 4 + i, 11 - i
        put(img, [(cx, cy)], glass)
    for i in range(1, 9, 2):
        put(img, [(4 + i, 11 - i - 1)], glass_hi)
    # Mercury up the lower half.
    for i in range(6):
        put(img, [(4 + i, 11 - i)], red)
    # Bulb.
    bulb = [(2, 11), (3, 11), (4, 11), (2, 12), (3, 12), (4, 12), (5, 12), (3, 13), (4, 13), (2, 13), (3, 10), (4, 10)]
    ring = [(1, 11), (1, 12), (1, 13), (2, 14), (3, 14), (4, 14), (5, 13), (6, 12), (5, 11), (2, 10), (3, 9), (5, 10)]
    put(img, ring, outline)
    put(img, bulb, red)
    put(img, [(2, 11), (3, 10)], red_hi)
    # Copper cap and scale marks.
    put(img, [(13, 2), (14, 2), (13, 1), (14, 3), (12, 2)], copper)
    put(img, [(14, 1), (15, 2), (13, 3)], copper_dk)
    put(img, [(8, 9), (10, 7), (12, 5)], outline)
    img.save(TEX / "thermometer.png")


def snow_shovel():
    img = canvas()
    wood = (137, 103, 56, 255)
    wood_dk = (93, 68, 34, 255)
    iron = (206, 210, 214, 255)
    iron_dk = (120, 126, 132, 255)
    iron_hi = (244, 246, 248, 255)
    snow = (250, 252, 255, 255)
    snow_sh = (214, 226, 238, 255)
    # Handle: diagonal from bottom-left to the blade, with a D-grip.
    for i in range(8):
        put(img, [(2 + i, 13 - i)], wood)
        put(img, [(3 + i, 13 - i)], wood_dk)
    put(img, [(0, 14), (1, 15), (2, 15), (0, 13), (1, 12), (2, 14)], wood_dk)
    put(img, [(1, 14)], (0, 0, 0, 0))
    # Wide scoop blade at top-right.
    blade = []
    for y in range(1, 9):
        for x in range(8, 16):
            if (x - 8) + (8 - y) <= 10 and x + y >= 11:
                blade.append((x, y))
    put(img, blade, iron)
    edge = [(x, y) for (x, y) in blade if (x + 1, y) not in blade or (x, y - 1) not in blade]
    put(img, edge, iron_dk)
    put(img, [(10, 4), (11, 3), (12, 2)], iron_hi)
    # A heap of snow on the blade.
    put(img, [(11, 5), (12, 4), (13, 3), (12, 5), (13, 4), (14, 3), (13, 5), (14, 4)], snow)
    put(img, [(12, 6), (13, 6), (14, 5)], snow_sh)
    img.save(TEX / "snow_shovel.png")


def icon():
    size = 32
    img = Image.new("RGBA", (size, size), (28, 46, 74, 255))
    flake = (236, 244, 255, 255)
    c = size // 2
    for i in range(-11, 12):
        for (x, y) in [(c + i, c), (c, c + i), (c + i, c + i), (c + i, c - i)]:
            img.putpixel((x, y), flake)
    for arm in [(1, 0), (0, 1), (-1, 0), (0, -1)]:
        for k in (6, 9):
            bx, by = c + arm[0] * k, c + arm[1] * k
            for d in (1, 2):
                if arm[0]:
                    img.putpixel((bx - arm[0] * d, by - d), flake)
                    img.putpixel((bx - arm[0] * d, by + d), flake)
                else:
                    img.putpixel((bx - d, by - arm[1] * d), flake)
                    img.putpixel((bx + d, by - arm[1] * d), flake)
    for x in range(size):
        for y in range(size - 6, size):
            img.putpixel((x, y), (248, 251, 255, 255))
    img.resize((128, 128), Image.NEAREST).save(ICON)


if __name__ == "__main__":
    TEX.mkdir(parents=True, exist_ok=True)
    thermometer()
    snow_shovel()
    icon()
    print("textures written to", TEX)
