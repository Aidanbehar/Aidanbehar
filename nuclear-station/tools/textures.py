"""Procedural textures for the Meridian Point Nuclear Station mod.

Every texture is generated deterministically from a seed so the output is reproducible.
Vanilla textures (from a local Minecraft asset extraction) are used only as base stone /
deepslate / sand for ores and as shape masks for some material items; everything else is
drawn from scratch.
"""
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw

VANILLA = os.environ.get("MC_ASSETS", "/opt/mcdata/assets/minecraft/textures")


def rng(seed):
    return np.random.default_rng(abs(hash_str(seed)) % (2 ** 32))


def hash_str(s):
    h = 2166136261
    for c in s.encode():
        h = ((h ^ c) * 16777619) & 0xFFFFFFFF
    return h


def vanilla(path):
    im = Image.open(os.path.join(VANILLA, path + ".png")).convert("RGBA")
    return np.array(im).astype(np.float32)


def to_img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")


def solid(rgb, size=16, alpha=255):
    a = np.zeros((size, size, 4), np.float32)
    a[..., 0], a[..., 1], a[..., 2] = rgb
    a[..., 3] = alpha
    return a


def noise(a, seed, amount, mono=True):
    r = rng(seed)
    h, w = a.shape[:2]
    if mono:
        n = r.normal(0, amount, (h, w, 1))
        a[..., :3] += n
    else:
        a[..., :3] += r.normal(0, amount, (h, w, 3))
    return a


def blotch(a, seed, rgb, count, radius=1.2, strength=0.6):
    """Soft spots (aggregate, rust, mineral grains)."""
    r = rng(seed)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    for _ in range(count):
        cx, cy = r.uniform(0, w), r.uniform(0, h)
        rad = radius * r.uniform(0.6, 1.4)
        d = np.minimum(np.abs(xx - cx), w - np.abs(xx - cx)) ** 2 + np.minimum(np.abs(yy - cy), h - np.abs(yy - cy)) ** 2
        m = np.clip(1 - np.sqrt(d) / rad, 0, 1)[..., None] * strength
        a[..., :3] = a[..., :3] * (1 - m) + np.array(rgb, np.float32) * m
    return a


def rect(a, x0, y0, x1, y1, rgb, alpha=None):
    a[y0:y1 + 1, x0:x1 + 1, :3] = rgb
    if alpha is not None:
        a[y0:y1 + 1, x0:x1 + 1, 3] = alpha
    return a


def shade(a, x0, y0, x1, y1, f):
    a[y0:y1 + 1, x0:x1 + 1, :3] *= f
    return a


def border(a, rgb, inset=0):
    s = a.shape[0]
    a[inset, inset:s - inset, :3] = rgb
    a[s - 1 - inset, inset:s - inset, :3] = rgb
    a[inset:s - inset, inset, :3] = rgb
    a[inset:s - inset, s - 1 - inset, :3] = rgb
    return a


def bevel(a, light=1.18, dark=0.78):
    s = a.shape[0]
    a[0, :, :3] *= light
    a[:, 0, :3] *= light
    a[s - 1, :, :3] *= dark
    a[:, s - 1, :3] *= dark
    return a


def rivets(a, positions, rgb=(200, 200, 205)):
    for x, y in positions:
        a[y, x, :3] = rgb
        if y + 1 < a.shape[0]:
            a[y + 1, x, :3] = np.array(rgb) * 0.6
    return a


# ---------------------------------------------------------------- structural

def concrete(base, seed, ties=True, joints=True):
    a = solid(base)
    noise(a, seed, 5)
    blotch(a, seed + "agg", [c * 0.86 for c in base], 10, 0.9, 0.5)
    blotch(a, seed + "agg2", [min(255, c * 1.1) for c in base], 8, 0.8, 0.4)
    if joints:
        a[15, :, :3] *= 0.82
        a[:, 15, :3] *= 0.86
    if ties:
        for x, y in ((3, 3), (11, 11)):
            a[y, x, :3] *= 0.55
    return a


def metal_plate(base, seed, rivet=True, scratches=6):
    a = solid(base)
    noise(a, seed, 3)
    r = random.Random(seed)
    for _ in range(scratches):
        x, y = r.randrange(16), r.randrange(16)
        ln = r.randrange(2, 5)
        for i in range(ln):
            if x + i < 16:
                a[y, x + i, :3] *= 1.12
    bevel(a)
    if rivet:
        rivets(a, [(1, 1), (14, 1), (1, 13), (14, 13)], tuple(min(255, c * 1.35) for c in base))
    return a


def cladding(base, seed):
    a = solid(base)
    noise(a, seed, 2)
    for x in range(0, 16, 4):
        a[:, x, :3] *= 0.72
        a[:, x + 1, :3] *= 1.12
    a[15, :, :3] *= 0.85
    return a


def tile(base, seed, grout=(150, 150, 150), size=4):
    a = solid(base)
    noise(a, seed, 3)
    for i in range(0, 16, size):
        a[i, :, :3] = grout
        a[:, i, :3] = grout
    return a


def stripes(seed):
    a = solid((230, 180, 30))
    for y in range(16):
        for x in range(16):
            if ((x + y) // 4) % 2 == 0:
                a[y, x, :3] = (30, 30, 32)
    noise(a, seed, 5)
    blotch(a, seed + "w", (120, 110, 90), 4, 1.0, 0.35)
    return a


def grating(seed):
    a = solid((95, 98, 102), alpha=0)
    for i in range(0, 16, 4):
        a[i, :, :] = (110, 112, 116, 255)
        a[i + 1, :, :] = (80, 82, 86, 255)
        a[:, i, :] = (118, 120, 124, 255)
    noise(a, seed, 4)
    return a


def glass(tint, alpha, seed, frame=(60, 64, 68)):
    a = solid(tint, alpha=alpha)
    border(a, frame)
    a[0, :, 3] = a[15, :, 3] = a[:, 0, 3] = a[:, 15, 3] = 255
    for i in range(3, 8):
        a[i, i + 2, :3] = (255, 255, 255)
        a[i, i + 2, 3] = alpha + 60
    return a


def girder(seed):
    a = solid((215, 170, 25))
    noise(a, seed, 4)
    rect(a, 0, 0, 15, 2, (180, 140, 20))
    rect(a, 0, 13, 15, 15, (180, 140, 20))
    for x in range(1, 16, 5):
        for y in range(3, 13):
            if (y - 3) == (x % 10) or (12 - y) == (x % 10):
                a[y, x, :3] = (170, 130, 15)
    rivets(a, [(2, 1), (7, 1), (12, 1), (2, 14), (7, 14), (12, 14)], (240, 200, 60))
    return a


def acoustic(seed):
    a = solid((228, 226, 220))
    noise(a, seed, 3)
    r = rng(seed)
    for _ in range(26):
        x, y = r.integers(0, 16, 2)
        a[y, x, :3] *= 0.86
    a[15, :, :3] = (170, 170, 170)
    a[:, 15, :3] = (170, 170, 170)
    return a


def carpet(seed, base=(48, 64, 112)):
    a = solid(base)
    noise(a, seed, 6, mono=False)
    for y in range(0, 16, 2):
        for x in range((y // 2) % 2, 16, 2):
            a[y, x, :3] *= 0.92
    return a


def duct(seed):
    a = solid((168, 172, 176))
    noise(a, seed, 2)
    for y in (0, 7, 8, 15):
        a[y, :, :3] *= 0.75 if y in (0, 8) else 1.15
    for x in (0, 15):
        a[:, x, :3] *= 0.8
    rivets(a, [(2, 2), (13, 2), (2, 10), (13, 10)], (200, 202, 206))
    return a


def damaged(seed):
    a = concrete((140, 140, 136), seed, ties=False)
    r = random.Random(seed)
    x, y = 3, 0
    for _ in range(20):
        a[y, x, :3] = (60, 60, 58)
        y = min(15, y + 1)
        x = max(0, min(15, x + r.choice((-1, 0, 1))))
    blotch(a, seed + "r", (110, 70, 40), 3, 1.2, 0.5)
    rect(a, 9, 9, 11, 10, (70, 50, 40))
    return a


# ---------------------------------------------------------------- machinery

def machine_side(base, seed, panel=True):
    a = metal_plate(base, seed, rivet=True, scratches=3)
    if panel:
        border(a, [c * 0.7 for c in base], 2)
        a[7, 3:13, :3] *= 0.85
    return a


def vessel(seed):
    a = solid((120, 124, 130))
    noise(a, seed, 4)
    for y in (4, 11):
        a[y, :, :3] = (90, 92, 96)
    for x in range(0, 16, 3):
        a[4, x, :3] = (160, 162, 168)
        a[11, x, :3] = (160, 162, 168)
    return a


def vessel_head(seed):
    a = solid((112, 116, 122))
    noise(a, seed, 4)
    for x, y in ((3, 3), (8, 3), (12, 3), (3, 8), (8, 8), (12, 8), (3, 12), (8, 12), (12, 12)):
        rect(a, x - 1, y - 1, x, y, (70, 72, 76))
    return a


def crdm(seed):
    a = solid((150, 150, 155))
    noise(a, seed, 3)
    for x in range(0, 16, 4):
        rect(a, x + 1, 0, x + 2, 15, (110, 112, 118))
        a[:, x + 1, :3] *= 1.1
    for y in (3, 9):
        a[y, :, :3] = (70, 72, 78)
    return a


def white_shell(seed):
    a = solid((222, 222, 218))
    noise(a, seed, 3)
    for y in (3, 12):
        a[y, :, :3] = (180, 180, 176)
    rivets(a, [(x, 3) for x in range(1, 16, 3)], (160, 160, 160))
    return a


def turbine(seed):
    a = solid((70, 120, 90))
    noise(a, seed, 4)
    bevel(a)
    a[5, :, :3] = (50, 90, 66)
    a[10, :, :3] = (50, 90, 66)
    rivets(a, [(x, 5) for x in range(1, 16, 3)], (110, 160, 130))
    rivets(a, [(x, 10) for x in range(1, 16, 3)], (110, 160, 130))
    return a


def generator(seed):
    a = solid((40, 70, 140))
    noise(a, seed, 4)
    bevel(a)
    for y in range(2, 15, 3):
        a[y, 2:14, :3] = (30, 52, 110)
    return a


def transformer(seed):
    a = solid((96, 104, 100))
    noise(a, seed, 3)
    bevel(a)
    rect(a, 4, 4, 11, 9, (210, 210, 210))
    rect(a, 5, 5, 10, 5, (30, 30, 30))
    rect(a, 5, 7, 8, 7, (30, 30, 30))
    hv = sign_bolt_small()
    for (x, y) in hv:
        a[y + 10, x + 6, :3] = (230, 190, 20)
    return a


def sign_bolt_small():
    return [(2, 0), (1, 1), (2, 1), (0, 2), (1, 2), (2, 2), (3, 2), (2, 3), (1, 4)]


def radiator(seed):
    a = solid((96, 104, 100), alpha=255)
    for x in range(16):
        if x % 3 == 0:
            a[:, x, :3] = (60, 64, 62)
        else:
            a[:, x, :3] = (110, 118, 114)
    noise(a, seed, 3)
    a[0, :, :3] = a[15, :, :3] = (80, 86, 84)
    return a


def tank(seed):
    a = solid((228, 228, 224))
    noise(a, seed, 3)
    for y in (0, 15):
        a[y, :, :3] = (180, 180, 176)
    r = random.Random(seed)
    for _ in range(3):
        x = r.randrange(16)
        y = r.randrange(4, 12)
        a[y:y + 3, x, :3] *= 0.9
    return a


def diesel(seed):
    a = solid((170, 40, 36))
    noise(a, seed, 5)
    bevel(a)
    rect(a, 2, 3, 13, 5, (60, 60, 64))
    for x in range(3, 13, 3):
        rect(a, x, 7, x + 1, 12, (50, 50, 54))
    rivets(a, [(1, 1), (14, 1), (1, 14), (14, 14)], (220, 90, 80))
    return a


def battery(seed):
    a = solid((60, 62, 66))
    for row in (1, 9):
        for x in range(1, 16, 5):
            rect(a, x, row, x + 3, row + 5, (30, 30, 34))
            rect(a, x, row, x + 3, row, (90, 90, 96))
            a[row - 1 if row > 0 else 0, x + 1, :3] = (200, 40, 40)
            a[row - 1 if row > 0 else 0, x + 2, :3] = (40, 40, 40)
    noise(a, seed, 3)
    return a


def heat_exchanger(seed):
    a = solid((150, 155, 160))
    noise(a, seed, 3)
    for y in range(1, 16, 3):
        for x in range(1, 16, 3):
            a[y, x, :3] = (80, 84, 88)
    bevel(a)
    return a


def motor(seed):
    a = solid((50, 80, 150))
    noise(a, seed, 4)
    for y in range(1, 16, 2):
        a[y, :, :3] *= 0.8
    rect(a, 5, 5, 10, 10, (190, 190, 195))
    rect(a, 6, 6, 9, 7, (30, 30, 30))
    return a


def front_face(base, seed, kind):
    """Front faces of facing machinery."""
    a = machine_side(base, seed, panel=False)
    if kind == "pump":
        rect(a, 3, 3, 12, 12, [c * 0.7 for c in base])
        rect(a, 6, 6, 9, 9, (200, 200, 205))
        rect(a, 7, 7, 8, 8, (60, 60, 60))
    elif kind == "rcp":
        rect(a, 2, 2, 13, 13, (100, 104, 110))
        for y in range(3, 13, 2):
            a[y, 3:13, :3] = (70, 72, 78)
        rect(a, 5, 12, 10, 14, (230, 190, 30))
    elif kind == "instrument":
        rect(a, 1, 1, 14, 14, (30, 34, 38))
        for y in (2, 6, 10):
            rect(a, 2, y, 13, y + 2, (60, 64, 70))
            a[y + 1, 3, :3] = (60, 220, 90)
            a[y + 1, 5, :3] = (220, 200, 40)
            rect(a, 8, y + 1, 12, y + 1, (100, 200, 255))
    elif kind == "switchgear":
        rect(a, 2, 1, 13, 14, (175, 178, 180))
        rect(a, 4, 3, 7, 5, (30, 30, 30))
        a[4, 5, :3] = (220, 40, 40)
        a[4, 9, :3] = (60, 220, 90)
        rect(a, 4, 8, 11, 8, (90, 90, 90))
        rect(a, 10, 10, 11, 12, (60, 60, 60))
    elif kind == "fan":
        rect(a, 1, 1, 14, 14, (40, 42, 46))
        cx = cy = 7.5
        for y in range(16):
            for x in range(16):
                d = math.hypot(x - cx, y - cy)
                ang = math.atan2(y - cy, x - cx)
                if 2 < d < 6.5 and (math.sin(ang * 4 + d * 0.5) > 0.2):
                    a[y, x, :3] = (150, 152, 158)
        rect(a, 7, 7, 8, 8, (90, 90, 90))
    elif kind == "server":
        rect(a, 1, 0, 14, 15, (22, 22, 26))
        for y in range(1, 16, 3):
            rect(a, 2, y, 13, y + 1, (40, 40, 46))
            a[y, 3, :3] = (60, 220, 90)
            a[y, 5, :3] = (60, 160, 255) if y % 2 else (60, 220, 90)
    elif kind == "locker":
        rect(a, 1, 0, 14, 15, (170, 174, 178))
        a[:, 7, :3] = (110, 114, 118)
        a[:, 8, :3] = (110, 114, 118)
        for x in (3, 11):
            for y in (2, 4):
                rect(a, x - 1, y, x + 1, y, (90, 94, 98))
        a[8, 6, :3] = (60, 60, 60)
        a[8, 9, :3] = (60, 60, 60)
    elif kind == "local_station":
        rect(a, 2, 2, 13, 13, (40, 44, 50))
        rect(a, 3, 3, 12, 6, (20, 60, 40))
        rect(a, 4, 4, 9, 4, (90, 230, 140))
        a[9, 4, :3] = (60, 220, 90)
        a[9, 7, :3] = (220, 40, 40)
        rect(a, 10, 9, 11, 11, (230, 190, 30))
    elif kind == "decon":
        rect(a, 2, 1, 13, 14, (210, 214, 220))
        rect(a, 5, 2, 10, 4, (80, 84, 90))
        for x in range(5, 11, 2):
            for y in range(6, 13, 2):
                a[y, x, :3] = (120, 180, 230)
        rect(a, 12, 7, 13, 9, (230, 190, 30))
    elif kind == "console":
        rect(a, 1, 1, 14, 9, (20, 24, 30))
        rect(a, 2, 2, 7, 5, (30, 90, 60))
        rect(a, 8, 2, 13, 5, (30, 60, 100))
        a[3, 3:7, :3] = (90, 230, 140)
        a[4, 9:13, :3] = (120, 190, 255)
        rect(a, 2, 7, 13, 8, (40, 44, 50))
        for x in range(2, 14, 2):
            a[11, x, :3] = (60, 220, 90) if x % 4 else (220, 40, 40)
            a[13, x, :3] = (200, 200, 205)
    elif kind == "exp_console":
        rect(a, 1, 1, 14, 9, (16, 10, 24))
        for x in range(2, 14):
            y = 5 + int(2.5 * math.sin(x * 0.9))
            a[y, x, :3] = (190, 120, 255)
        rect(a, 2, 11, 13, 13, (30, 26, 40))
        a[12, 3, :3] = (140, 140, 140)
        a[12, 6, :3] = (140, 140, 140)
    elif kind == "emitter":
        rect(a, 2, 2, 13, 13, (30, 40, 48))
        for y in range(16):
            for x in range(16):
                d = math.hypot(x - 7.5, y - 7.5)
                if d < 4.5:
                    t = 1 - d / 4.5
                    a[y, x, :3] = (40 + 140 * t, 120 + 135 * t, 140 + 115 * t)
    return a


def control_panel(status, seed):
    a = solid((70, 84, 90))
    noise(a, seed, 2)
    border(a, (50, 60, 66))
    lights = {"off": None, "normal": (60, 220, 90), "caution": (240, 190, 30), "alarm": (240, 50, 40)}[status]
    for y in (2, 6):
        for x in range(2, 14, 3):
            rect(a, x, y, x + 1, y + 1, (30, 34, 36))
            if lights is not None:
                on = (x + y) % 2 == 0 or status == "normal"
                if on:
                    rect(a, x, y, x + 1, y + 1, lights if status != "alarm" or x % 2 == 0 else (60, 220, 90))
    # meters
    for x in (2, 9):
        rect(a, x, 10, x + 4, 13, (225, 225, 215))
        a[13, x:x + 5, :3] = (40, 40, 40)
        nx = x + (3 if status != "off" else 1)
        a[11, nx, :3] = (200, 30, 30)
        a[12, nx - 1, :3] = (200, 30, 30)
    return a


def annunciator(status, seed):
    a = solid((40, 42, 46))
    colours = [(230, 230, 220), (240, 190, 30), (240, 60, 40), (230, 230, 220)]
    r = random.Random(seed)
    for row in range(4):
        for col in range(4):
            x, y = 1 + col * 4 - (1 if col else 0), 1 + row * 4 - (1 if row else 0)
            x0, y0 = col * 4, row * 4
            lit = False
            c = (70, 72, 76)
            if status == "normal":
                lit = r.random() < 0.08
                c = (220, 220, 210)
            elif status == "caution":
                lit = r.random() < 0.35
                c = (240, 190, 30)
            elif status == "alarm":
                lit = r.random() < 0.6
                c = colours[r.randrange(3)]
            rect(a, x0, y0, x0 + 2, y0 + 2, c if lit else (78, 78, 74))
            a[y0 + 1, x0 + 1, :3] = (c[0] * 0.8, c[1] * 0.8, c[2] * 0.8) if lit else (64, 64, 62)
    return a


def lamp(on, seed, emergency=False):
    a = solid((200, 200, 200))
    if emergency:
        rect(a, 0, 0, 15, 15, (210, 60, 40) if on else (130, 50, 40))
        rect(a, 3, 3, 12, 12, (255, 240, 220) if on else (170, 160, 150))
    else:
        rect(a, 0, 0, 15, 15, (180, 182, 186))
        rect(a, 2, 2, 13, 13, (255, 252, 235) if on else (120, 122, 126))
        for x in range(2, 14, 3):
            a[2:14, x, :3] = (235, 232, 215) if on else (105, 106, 110)
    noise(a, seed, 1)
    return a


def beacon(on, seed):
    a = solid((250, 140, 30) if on else (120, 70, 30))
    noise(a, seed, 4)
    for y in range(0, 16, 4):
        a[y, :, :3] *= 1.25 if on else 1.1
    return a


def fuel_assembly(spent, seed):
    a = solid((150, 154, 160), alpha=0)
    for x in range(1, 16, 2):
        a[:, x, :] = (175, 178, 186, 255) if not spent else (120, 116, 110, 255)
    for y in (1, 6, 11):
        a[y, :, :] = (110, 112, 118, 255)
    if spent:
        blotch(a, seed, (90, 80, 70), 6, 1, 0.3)
        a[..., 3] = np.where(a[..., 3] > 0, 255, 0)
    noise(a, seed, 3)
    return a


def rack(seed):
    a = solid((160, 165, 170), alpha=0)
    for i in (0, 7, 8, 15):
        a[i, :, :] = (160, 165, 170, 255)
        a[:, i, :] = (150, 155, 160, 255)
    noise(a, seed, 3)
    return a


def corium(seed):
    a = solid((40, 30, 28))
    noise(a, seed, 8)
    blotch(a, seed + "h", (210, 90, 30), 5, 1.4, 0.8)
    blotch(a, seed + "y", (250, 190, 60), 3, 0.8, 0.7)
    return a


def debris(seed):
    a = concrete((120, 118, 112), seed, ties=False, joints=False)
    blotch(a, seed + "r", (80, 76, 70), 8, 1.2, 0.6)
    blotch(a, seed + "s", (150, 140, 60), 3, 0.8, 0.5)
    return a


def soil(seed):
    a = vanilla("block/coarse_dirt")
    blotch(a, seed, (130, 130, 70), 6, 1.0, 0.45)
    return a


def chamber_wall(seed):
    a = solid((70, 50, 100))
    noise(a, seed, 3)
    rect(a, 0, 7, 15, 8, (40, 30, 60))
    for x in range(0, 16, 4):
        a[7, x, :3] = (160, 120, 230)
    bevel(a)
    return a


def coil(seed):
    a = solid((190, 110, 40))
    for y in range(16):
        a[y, :, :3] *= 0.75 if y % 2 else 1.05
    noise(a, seed, 4)
    rect(a, 0, 0, 1, 15, (60, 60, 70))
    rect(a, 14, 0, 15, 15, (60, 60, 70))
    return a


def glow(seed):
    a = solid((60, 160, 255), alpha=60)
    return a


def drum(seed, sealed=False, top=False):
    a = solid((215, 180, 30))
    noise(a, seed, 4)
    if top:
        border(a, (120, 100, 20))
        rect(a, 3, 3, 12, 12, (200, 165, 25) if sealed else (40, 40, 40))
        if sealed:
            rect(a, 6, 6, 9, 9, (30, 30, 30))
    else:
        for y in (2, 13):
            a[y, :, :3] = (150, 125, 20)
        # trefoil miniature
        rect(a, 6, 6, 9, 9, (30, 30, 30))
        a[7:9, 7:9, :3] = (215, 180, 30)
    return a


# ---------------------------------------------------------------- ores

ORE_BASE = {"stone": "block/stone", "deepslate": "block/deepslate", "sand": "block/sand", "sandstone": "block/sandstone_top",
            "tuff": "block/tuff"}


def ore(base, grain, accent, seed, count=7, glowy=False):
    a = vanilla(ORE_BASE[base])
    r = random.Random(seed)
    for _ in range(count):
        x, y = r.randrange(1, 14), r.randrange(1, 14)
        pts = [(x, y), (x + 1, y), (x, y + 1)] if r.random() < 0.6 else [(x, y), (x + 1, y + 1), (x + 1, y)]
        for (px, py) in pts:
            a[py, px, :3] = grain
        a[y, x, :3] = accent
    if glowy:
        a[..., :3] = a[..., :3]
    return a


def shale(seed):
    a = solid((44, 42, 46))
    noise(a, seed, 4)
    for y in range(0, 16, 3):
        a[y, :, :3] *= 0.75
    blotch(a, seed + "p", (150, 130, 60), 4, 0.7, 0.6)
    return a


def voidstone(seed):
    a = solid((14, 10, 20))
    noise(a, seed, 3)
    r = random.Random(seed)
    for _ in range(6):
        a[r.randrange(16), r.randrange(16), :3] = (90, 60, 150)
    return a


def monazite_sand(seed):
    a = vanilla("block/sand")
    r = random.Random(seed)
    for _ in range(14):
        a[r.randrange(16), r.randrange(16), :3] = (150, 90, 50) if r.random() < 0.7 else (30, 30, 30)
    return a


# ---------------------------------------------------------------- signs (32x32 for legible symbols)

def sign(kind):
    s = 32
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    yellow, black, red, white, blue, green = (245, 200, 20, 255), (20, 20, 20, 255), (200, 30, 30, 255), (245, 245, 245, 255), (30, 80, 170, 255), (20, 140, 70, 255)
    d.rectangle([0, 0, s - 1, s - 1], fill=(90, 90, 90, 255))

    def triangle(fill=yellow):
        d.rectangle([1, 1, s - 2, s - 2], fill=white)
        d.polygon([(16, 3), (29, 27), (3, 27)], fill=black)
        d.polygon([(16, 7), (26, 25), (6, 25)], fill=fill)

    def trefoil(cx, cy, r, colour=black, bg=yellow):
        for k in range(3):
            a0 = -90 + k * 120 - 30
            d.pieslice([cx - r, cy - r, cx + r, cy + r], a0, a0 + 60, fill=colour)
        d.ellipse([cx - r * 0.32, cy - r * 0.32, cx + r * 0.32, cy + r * 0.32], fill=bg)
        d.ellipse([cx - r * 0.2, cy - r * 0.2, cx + r * 0.2, cy + r * 0.2], fill=colour)

    if kind == "radiation":
        d.rectangle([1, 1, s - 2, s - 2], fill=yellow)
        trefoil(16, 15, 12)
        d.rectangle([2, 27, s - 3, 30], fill=black)
    elif kind == "high_radiation":
        d.rectangle([1, 1, s - 2, s - 2], fill=red)
        d.rectangle([3, 3, s - 4, 24], fill=yellow)
        trefoil(16, 14, 9)
        d.rectangle([3, 26, s - 4, 29], fill=white)
    elif kind == "contamination":
        d.rectangle([1, 1, s - 2, s - 2], fill=(150, 60, 160, 255))
        d.rectangle([3, 3, s - 4, s - 4], fill=yellow)
        trefoil(16, 13, 8)
        for x in range(5, 28, 4):
            d.ellipse([x, 24, x + 2, 26], fill=(150, 60, 160, 255))
    elif kind == "high_voltage":
        triangle()
        d.polygon([(17, 10), (12, 18), (16, 18), (14, 24), (20, 15), (16, 15)], fill=black)
    elif kind == "restricted":
        d.rectangle([1, 1, s - 2, s - 2], fill=white)
        d.rectangle([1, 1, s - 2, 10], fill=red)
        for y in (15, 19, 23):
            d.line([5, y, 26, y], fill=black, width=1)
    elif kind == "no_entry":
        d.rectangle([1, 1, s - 2, s - 2], fill=white)
        d.ellipse([3, 3, 28, 28], fill=red)
        d.rectangle([7, 13, 24, 18], fill=white)
    elif kind == "exit":
        d.rectangle([1, 1, s - 2, s - 2], fill=green)
        d.rectangle([4, 5, 13, 26], outline=white, width=2)
        d.ellipse([18, 6, 22, 10], fill=white)
        d.line([20, 11, 19, 18], fill=white, width=2)
        d.line([19, 18, 23, 25], fill=white, width=2)
        d.line([19, 18, 15, 24], fill=white, width=2)
        d.line([20, 13, 25, 15], fill=white, width=2)
    elif kind == "ppe":
        d.rectangle([1, 1, s - 2, s - 2], fill=white)
        d.ellipse([3, 3, 28, 28], fill=blue)
        d.ellipse([11, 7, 20, 15], fill=white)
        d.rectangle([9, 15, 22, 25], fill=white)
    elif kind == "hot_surface":
        triangle()
        for x in (11, 15, 19):
            d.line([x, 12, x + 1, 16, x, 20], fill=black, width=1)
        d.line([9, 23, 23, 23], fill=black, width=2)
    elif kind == "pressure":
        triangle()
        d.ellipse([11, 12, 21, 22], outline=black, width=2)
        d.line([16, 17, 19, 14], fill=black, width=1)
    elif kind == "emergency_shower":
        d.rectangle([1, 1, s - 2, s - 2], fill=green)
        d.line([10, 6, 22, 6], fill=white, width=2)
        d.line([22, 6, 22, 10], fill=white, width=2)
        for x in (18, 21, 24):
            d.line([x, 12, x - 1, 18], fill=white, width=1)
        d.ellipse([8, 14, 13, 19], fill=white)
        d.rectangle([8, 19, 13, 27], fill=white)
    elif kind == "fire":
        d.rectangle([1, 1, s - 2, s - 2], fill=red)
        d.rectangle([12, 8, 19, 26], fill=white)
        d.rectangle([14, 4, 17, 8], fill=white)
        d.line([19, 9, 24, 13], fill=white, width=2)
    elif kind == "crane":
        triangle()
        d.line([10, 12, 23, 12], fill=black, width=2)
        d.line([18, 12, 18, 19], fill=black, width=1)
        d.rectangle([15, 19, 21, 23], fill=black)
    elif kind == "magnetic":
        triangle()
        d.arc([10, 11, 22, 23], 180, 360, fill=black, width=3)
        d.line([11, 17, 11, 23], fill=black, width=3)
        d.line([21, 17, 21, 23], fill=black, width=3)
    elif kind == "laser":
        triangle()
        d.ellipse([13, 15, 19, 21], fill=black)
        for ang in range(0, 360, 45):
            x = 16 + 7 * math.cos(math.radians(ang))
            y = 18 + 7 * math.sin(math.radians(ang))
            d.line([16, 18, x, y], fill=black, width=1)
        d.line([3, 18, 13, 18], fill=red, width=1)
    elif kind == "hearing":
        d.rectangle([1, 1, s - 2, s - 2], fill=white)
        d.ellipse([3, 3, 28, 28], fill=blue)
        d.arc([8, 8, 24, 26], 180, 360, fill=white, width=2)
        d.rectangle([7, 15, 11, 23], fill=white)
        d.rectangle([21, 15, 25, 23], fill=white)
    return np.array(im).astype(np.float32)


# ---------------------------------------------------------------- items

def item_canvas():
    return np.zeros((16, 16, 4), np.float32)


def px(a, pts, rgb):
    for x, y in pts:
        a[y, x] = (*rgb, 255)


def outline_item(a, rgb=(30, 30, 34)):
    m = a[..., 3] > 0
    out = np.zeros_like(m)
    out[1:, :] |= m[:-1, :]
    out[:-1, :] |= m[1:, :]
    out[:, 1:] |= m[:, :-1]
    out[:, :-1] |= m[:, 1:]
    out &= ~m
    a[out] = (*rgb, 255)
    return a


def geiger():
    a = item_canvas()
    rect(a, 2, 6, 10, 13, (230, 190, 30), 255)
    rect(a, 3, 7, 7, 9, (40, 60, 40), 255)
    a[8, 4:7, :3] = (90, 230, 120)
    a[11, 4, :3] = (200, 40, 40)
    a[11, 6, :3] = (60, 60, 60)
    rect(a, 9, 3, 10, 6, (40, 40, 40), 255)
    rect(a, 10, 2, 14, 3, (160, 160, 165), 255)
    a[2, 14, :3] = (60, 60, 60)
    return outline_item(a)


def dosimeter():
    a = item_canvas()
    rect(a, 4, 3, 11, 13, (60, 64, 70), 255)
    rect(a, 5, 4, 10, 7, (150, 200, 150), 255)
    a[5, 6:10, :3] = (30, 60, 30)
    a[10, 6, :3] = (220, 40, 40)
    a[10, 9, :3] = (60, 220, 90)
    rect(a, 6, 1, 9, 2, (200, 200, 205), 255)
    return outline_item(a)


def survey_meter():
    a = item_canvas()
    rect(a, 1, 7, 9, 13, (210, 210, 205), 255)
    rect(a, 2, 8, 6, 10, (240, 240, 230), 255)
    a[9, 3, :3] = (200, 30, 30)
    a[8, 4, :3] = (200, 30, 30)
    rect(a, 3, 5, 7, 6, (40, 40, 40), 255)
    rect(a, 10, 9, 14, 12, (230, 190, 30), 255)
    rect(a, 9, 10, 10, 11, (40, 40, 40), 255)
    return outline_item(a)


def decon_kit():
    a = item_canvas()
    rect(a, 2, 5, 13, 13, (240, 240, 240), 255)
    rect(a, 2, 5, 13, 6, (40, 120, 200), 255)
    rect(a, 7, 8, 8, 11, (40, 160, 80), 255)
    rect(a, 6, 9, 9, 10, (40, 160, 80), 255)
    rect(a, 6, 3, 9, 4, (90, 90, 90), 255)
    return outline_item(a)


def ppe(kind):
    a = item_canvas()
    y, dy = (230, 200, 40), (190, 160, 20)
    if kind == "hazmat_hood":
        rect(a, 3, 2, 12, 12, y, 255)
        rect(a, 5, 5, 10, 8, (140, 200, 230), 255)
        rect(a, 6, 10, 9, 13, (60, 60, 60), 255)
    elif kind == "hazmat_suit":
        rect(a, 3, 2, 12, 13, y, 255)
        rect(a, 1, 3, 2, 10, dy, 255)
        rect(a, 13, 3, 14, 10, dy, 255)
        a[2:14, 7, :3] = (120, 120, 120)
        rect(a, 5, 2, 10, 2, dy, 255)
    elif kind == "hazmat_trousers":
        rect(a, 3, 2, 12, 5, y, 255)
        rect(a, 3, 6, 6, 14, y, 255)
        rect(a, 9, 6, 12, 14, y, 255)
        a[2, 3:13, :3] = (60, 60, 60)
    elif kind == "hazmat_boots":
        rect(a, 2, 7, 6, 13, (40, 40, 44), 255)
        rect(a, 9, 7, 13, 13, (40, 40, 44), 255)
        rect(a, 2, 12, 7, 13, (20, 20, 22), 255)
        rect(a, 9, 12, 14, 13, (20, 20, 22), 255)
    elif kind == "respirator":
        rect(a, 4, 4, 11, 10, (60, 62, 66), 255)
        rect(a, 2, 8, 4, 12, (230, 190, 30), 255)
        rect(a, 11, 8, 13, 12, (230, 190, 30), 255)
        rect(a, 6, 5, 9, 6, (140, 200, 230), 255)
        a[3, 3:13, :3] = (30, 30, 30)
        a[3, 3:13, 3] = 255
    elif kind == "lead_apron":
        rect(a, 3, 3, 12, 14, (70, 80, 110), 255)
        rect(a, 5, 1, 6, 3, (50, 56, 80), 255)
        rect(a, 9, 1, 10, 3, (50, 56, 80), 255)
        a[8, 4:12, :3] = (90, 100, 130)
    return outline_item(a)


SPARE_ICONS = {
    "pump_seal_kit": ((60, 60, 64), "ring"),
    "motor_assembly": ((50, 80, 150), "box"),
    "breaker_module": ((180, 180, 175), "breaker"),
    "diesel_service_kit": ((170, 40, 36), "box"),
    "instrument_module": ((40, 44, 50), "board"),
    "valve_actuator": ((220, 120, 30), "valve"),
    "battery_cells": ((40, 40, 46), "cells"),
    "transformer_kit": ((96, 104, 100), "box"),
    "screen_panels": ((140, 150, 160), "mesh"),
    "bearing_set": ((190, 190, 196), "ring"),
}


def spare(name):
    rgb, shape = SPARE_ICONS[name]
    a = item_canvas()
    if shape == "ring":
        for y in range(16):
            for x in range(16):
                d = math.hypot(x - 7.5, y - 7.5)
                if 3 <= d <= 6:
                    a[y, x] = (*rgb, 255)
    elif shape == "box":
        rect(a, 2, 4, 13, 13, rgb, 255)
        rect(a, 2, 4, 13, 5, [min(255, c * 1.4) for c in rgb], 255)
        rect(a, 6, 8, 9, 10, (220, 220, 220), 255)
    elif shape == "breaker":
        rect(a, 4, 2, 11, 14, rgb, 255)
        rect(a, 6, 5, 9, 9, (30, 30, 30), 255)
        rect(a, 7, 5, 8, 6, (220, 40, 40), 255)
    elif shape == "board":
        rect(a, 2, 3, 13, 12, (30, 120, 60), 255)
        for x in range(3, 13, 3):
            rect(a, x, 5, x + 1, 7, rgb, 255)
        a[10, 3:13, :3] = (220, 190, 60)
    elif shape == "valve":
        rect(a, 3, 9, 12, 12, (110, 110, 115), 255)
        rect(a, 6, 4, 9, 9, rgb, 255)
        rect(a, 4, 2, 11, 3, (60, 60, 60), 255)
    elif shape == "cells":
        for x in (2, 6, 10):
            rect(a, x, 4, x + 3, 13, rgb, 255)
            a[3, x + 1, :] = (220, 220, 220, 255)
            a[6, x:x + 4, :3] = (200, 40, 40)
    elif shape == "mesh":
        for y in range(2, 14):
            for x in range(2, 14):
                if x % 3 == 0 or y % 3 == 0 or x in (2, 13) or y in (2, 13):
                    a[y, x] = (*rgb, 255)
    return outline_item(a)


MATERIAL_SHAPES = {"ingot": "item/iron_ingot", "raw": "item/raw_iron", "crystal": "item/amethyst_shard", "powder": "item/sugar",
                   "chunk": "item/flint", "gem": "item/emerald", "dust": "item/glowstone_dust", "pellet": "item/slime_ball",
                   "flake": "item/phantom_membrane"}


def material(shape, colour, seed, speckle=None):
    base = vanilla(MATERIAL_SHAPES[shape])
    lum = (0.3 * base[..., 0] + 0.59 * base[..., 1] + 0.11 * base[..., 2]) / 255.0
    lum = (lum - lum[base[..., 3] > 0].min()) / max(1e-3, (lum[base[..., 3] > 0].max() - lum[base[..., 3] > 0].min()))
    out = np.zeros_like(base)
    c = np.array(colour, np.float32)
    out[..., :3] = (0.35 + 0.85 * lum[..., None]) * c
    out[..., 3] = base[..., 3]
    if speckle:
        r = random.Random(seed)
        for _ in range(5):
            x, y = r.randrange(16), r.randrange(16)
            if out[y, x, 3] > 0:
                out[y, x, :3] = speckle
    return out


def armor_layer(colour, accents, legs=False, kind="hazmat"):
    """64x32 humanoid armour texture with simple shading."""
    a = np.zeros((32, 64, 4), np.float32)
    def box(x, y, w, h, d, rgb):
        # standard cube UV layout
        regions = [(x + d, y, w, d), (x + d + w, y, w, d), (x, y + d, d, h), (x + d, y + d, w, h), (x + d + w, y + d, d, h),
                   (x + d + w + d, y + d, w, h)]
        for (rx, ry, rw, rh) in regions:
            a[ry:ry + rh, rx:rx + rw, :3] = rgb
            a[ry:ry + rh, rx:rx + rw, 3] = 255
            a[ry:ry + rh, rx:rx + rw, :3] *= np.linspace(1.08, 0.86, rh)[:, None, None]
    if not legs:
        box(0, 0, 8, 8, 8, colour)       # head
        box(16, 16, 8, 12, 4, colour)    # body
        box(40, 16, 4, 12, 4, colour)    # right arm
        box(0, 16, 4, 12, 4, accents.get("boots", colour))  # legs region used by boots
        if kind == "hazmat":
            a[8:16, 10:14, :3] = (140, 200, 230)      # visor on face
            a[20:32, 27:29, :3] = (110, 110, 110)     # zip
        elif kind == "respirator":
            a[:, :, 3] = 0
            box(0, 0, 8, 8, 8, colour)
            a[0:8, :, 3] = 0
            a[8:16, 0:32, 3] = 0
            a[12:16, 8:16, :3] = (60, 62, 66)
            a[12:16, 8:16, 3] = 255
            a[13:15, 9:11, :3] = (230, 190, 30)
            a[13:15, 13:15, :3] = (230, 190, 30)
        elif kind == "lead_apron":
            a[:, :, 3] = 0
            box(16, 16, 8, 12, 4, colour)
    else:
        box(0, 16, 4, 12, 4, colour)
        box(16, 16, 8, 12, 4, colour)
        a[16:20, 16:40, 3] = 0
        a[20:22, 20:28, :3] = (60, 60, 60)
    noise(a, "armor" + kind + str(legs), 3)
    return a


def icon():
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, 127, 127], 18, fill=(28, 40, 52, 255))
    # cooling tower silhouette
    d.polygon([(18, 112), (30, 60), (24, 30), (58, 30), (52, 60), (64, 112)], fill=(200, 205, 210, 255))
    d.ellipse([28, 6, 54, 30], fill=(235, 240, 245, 200))
    d.ellipse([38, 0, 70, 22], fill=(235, 240, 245, 160))
    # containment dome
    d.rectangle([72, 70, 116, 112], fill=(180, 184, 188, 255))
    d.ellipse([72, 50, 116, 92], fill=(180, 184, 188, 255))
    # trefoil
    cx, cy, r = 94, 90, 14
    for k in range(3):
        a0 = -90 + k * 120 - 30
        d.pieslice([cx - r, cy - r, cx + r, cy + r], a0, a0 + 60, fill=(245, 200, 20, 255))
    d.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(245, 200, 20, 255))
    d.rectangle([0, 112, 127, 127], fill=(40, 90, 140, 255))
    return im
