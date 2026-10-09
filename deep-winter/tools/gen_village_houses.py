#!/usr/bin/env python3
"""Generates Deep Winter's snowy and taiga village houses as structure templates (.nbt) and
overrides the vanilla house template pools to use them.

Every building is bigger than its vanilla counterpart (wider floor, taller vaulted interior) and
has a lit campfire in a stone fireplace with a chimney in the back wall. Profession houses keep
their job-site block so villages still get all professions. Farms and animal pens stay vanilla.

Run from the project root:  python3 tools/gen_village_houses.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import nbt  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src/main/resources/data"
DATA_VERSION = 5023  # Minecraft 26.3


class Building:
    def __init__(self, sx, sy, sz):
        self.size = (sx, sy, sz)
        self.cells = {}

    def set(self, x, y, z, block, props=None, block_nbt=None):
        sx, sy, sz = self.size
        if not (0 <= x < sx and 0 <= y < sy and 0 <= z < sz):
            raise ValueError(f"{block} at {(x, y, z)} outside {self.size}")
        self.cells[(x, y, z)] = (block, dict(props or {}), block_nbt)

    def get(self, x, y, z):
        c = self.cells.get((x, y, z))
        return c[0] if c else None

    def fill(self, x0, y0, z0, x1, y1, z1, block, props=None):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set(x, y, z, block, props)

    def to_nbt(self):
        palette = []
        index = {}
        blocks = []
        for pos in sorted(self.cells, key=lambda p: (p[1], p[2], p[0])):
            block, props, block_nbt = self.cells[pos]
            key = (block, tuple(sorted(props.items())))
            if key not in index:
                index[key] = len(palette)
                entry = {"id": block}
                if props:
                    entry["properties"] = {k: str(v) for k, v in sorted(props.items())}
                palette.append(entry)
            b = {"pos": nbt.TagList(nbt.INT, [nbt.Int(v) for v in pos]), "state": nbt.Int(index[key])}
            if block_nbt is not None:
                b["nbt"] = block_nbt
            blocks.append(b)
        return {
            "DataVersion": nbt.Int(DATA_VERSION),
            "size": nbt.TagList(nbt.INT, [nbt.Int(v) for v in self.size]),
            "palette": nbt.TagList(nbt.COMPOUND, palette),
            "blocks": nbt.TagList(nbt.COMPOUND, blocks),
            "entities": nbt.TagList(nbt.COMPOUND, []),
        }


def jigsaw(name, target, pool, final_state, orientation, joint="aligned"):
    return ("minecraft:jigsaw", {"orientation": orientation},
            {"id": "minecraft:jigsaw", "name": name, "target": target, "pool": pool,
             "final_state": final_state, "joint": joint,
             "selection_priority": nbt.Int(0), "placement_priority": nbt.Int(0)})


PALETTES = {
    # Vanilla-style materials per biome.
    "snowy_timber": dict(frame="minecraft:stripped_spruce_log", wall="minecraft:spruce_planks",
                         foundation="minecraft:stone_bricks", stone="minecraft:stone_bricks",
                         floor="minecraft:spruce_planks", stairs="minecraft:spruce_stairs", slab="minecraft:spruce_slab",
                         window="minecraft:glass_pane", door="minecraft:spruce_door",
                         ground="minecraft:snow_block", path="minecraft:dirt_path", carpet="minecraft:light_blue_carpet",
                         beds=["minecraft:white_bed", "minecraft:light_blue_bed", "minecraft:cyan_bed"]),
    "snowy_igloo": dict(frame="minecraft:spruce_log", wall="minecraft:snow_block",
                        foundation="minecraft:cobblestone", stone="minecraft:cobblestone",
                        floor="minecraft:spruce_planks", stairs="minecraft:spruce_stairs", slab="minecraft:spruce_slab",
                        window="minecraft:glass_pane", door="minecraft:spruce_door",
                        ground="minecraft:snow_block", path="minecraft:dirt_path", carpet="minecraft:white_carpet",
                        beds=["minecraft:white_bed", "minecraft:blue_bed", "minecraft:light_gray_bed"]),
    "taiga_log": dict(frame="minecraft:spruce_log", wall="minecraft:spruce_planks",
                      foundation="minecraft:cobblestone", stone="minecraft:cobblestone",
                      floor="minecraft:spruce_planks", stairs="minecraft:spruce_stairs", slab="minecraft:spruce_slab",
                      window="minecraft:glass_pane", door="minecraft:spruce_door",
                      ground="minecraft:grass_block", path="minecraft:dirt_path", carpet="minecraft:brown_carpet",
                      beds=["minecraft:red_bed", "minecraft:brown_bed", "minecraft:green_bed"]),
    "taiga_stone": dict(frame="minecraft:spruce_log", wall="minecraft:mossy_cobblestone",
                        foundation="minecraft:cobblestone", stone="minecraft:stone_bricks",
                        floor="minecraft:spruce_planks", stairs="minecraft:spruce_stairs", slab="minecraft:spruce_slab",
                        window="minecraft:glass_pane", door="minecraft:spruce_door",
                        ground="minecraft:grass_block", path="minecraft:dirt_path", carpet="minecraft:orange_carpet",
                        beds=["minecraft:purple_bed", "minecraft:blue_bed", "minecraft:red_bed"]),
}

JOBS = {
    "butcher": ("minecraft:smoker", {"facing": "south", "lit": "false"}),
    "armorer": ("minecraft:blast_furnace", {"facing": "south", "lit": "false"}),
    "toolsmith": ("minecraft:smithing_table", {}),
    "weaponsmith": ("minecraft:grindstone", {"face": "floor", "facing": "south"}),
    "fletcher": ("minecraft:fletching_table", {}),
    "shepherd": ("minecraft:loom", {"facing": "south"}),
    "fisher": ("minecraft:barrel", {"facing": "up", "open": "false"}),
    "leatherworker": ("minecraft:cauldron", {}),
    "cartographer": ("minecraft:cartography_table", {}),
    "librarian": ("minecraft:lectern", {"facing": "south", "has_book": "false", "powered": "false"}),
    "mason": ("minecraft:stonecutter", {"facing": "south"}),
    "cleric": ("minecraft:brewing_stand", {"has_bottle_0": "false", "has_bottle_1": "false", "has_bottle_2": "false"}),
}


def house(biome, palette, width, depth, height, beds, villagers, job=None):
    """width/depth: outer wall size; height: interior wall height (blocks of air above the floor)."""
    p = PALETTES[palette]
    W, D, H = width, depth, height
    roof_layers = (W + 1) // 2
    chimney_top = H + roof_layers + 2
    SX, SY, SZ = W, chimney_top + 2, D + 3
    b = Building(SX, SY, SZ)
    back, front, porch = 2, D + 1, D + 2  # wall rows in z
    c = W // 2

    # --- foundation and floor
    for x in range(W):
        for z in range(back, front + 1):
            edge = x in (0, W - 1) or z in (back, front)
            b.set(x, 0, z, p["foundation"] if edge else p["floor"])
    # --- walls with log frame, windows
    for y in range(1, H + 1):
        for x in range(W):
            for z in range(back, front + 1):
                edge_x = x in (0, W - 1)
                edge_z = z in (back, front)
                if edge_x and edge_z:
                    b.set(x, y, z, p["frame"], {"axis": "y"})
                elif edge_x or edge_z:
                    b.set(x, y, z, p["wall"])
                else:
                    b.set(x, y, z, "minecraft:air")
    window_rows = [2] if H < 4 else [2, 3]
    for z in range(back + 2, front - 1, 3):
        for x in (0, W - 1):
            for y in window_rows:
                b.set(x, y, z, p["window"], {"east": "false", "west": "false", "north": "true", "south": "true"})
    for x in (c - 2, c + 2):
        if 0 < x < W - 1:
            for y in window_rows:
                b.set(x, y, front, p["window"], {"east": "true", "west": "true", "north": "false", "south": "false"})

    # --- gable roof: stairs rising from both side walls, vaulted interior beneath
    for k in range(roof_layers):
        y = H + 1 + k
        xl, xr = k, W - 1 - k
        for z in range(back, porch + 1):
            if xl < xr:
                b.set(xl, y, z, p["stairs"], {"facing": "east", "half": "bottom", "shape": "straight"})
                b.set(xr, y, z, p["stairs"], {"facing": "west", "half": "bottom", "shape": "straight"})
            elif xl == xr:
                b.set(xl, y, z, p["slab"], {"type": "bottom"})
        # gable ends and the vaulted air inside
        for x in range(xl + 1, xr):
            for z in range(back, front + 1):
                b.set(x, y, z, p["wall"] if z in (back, front) else "minecraft:air")
    # porch roof overhang sits on posts
    for x in (0, W - 1):
        for y in range(1, H + 1):
            b.set(x, y, porch, "minecraft:spruce_fence", {"north": "true", "south": "false", "east": "false", "west": "false"})
    for x in range(1, W - 1):
        for y in range(1, H + 1):
            b.set(x, y, porch, "minecraft:air")
    for x in range(W):
        b.set(x, 0, porch, p["path"] if abs(x - c) <= 1 else p["ground"])

    # --- door and entrance jigsaw
    b.set(c, 1, front, p["door"], {"facing": "south", "half": "lower", "hinge": "left", "open": "false", "powered": "false"})
    b.set(c, 2, front, p["door"], {"facing": "south", "half": "upper", "hinge": "left", "open": "false", "powered": "false"})
    jb, jp, jn = jigsaw("minecraft:building_entrance", "minecraft:building_entrance", "minecraft:empty",
                        "minecraft:air", "south_up")
    b.set(c, 1, porch, jb, jp, jn)
    b.set(c, 0, porch, p["path"])

    # --- fireplace and chimney behind the back wall
    stone = p["stone"]
    for y in range(0, chimney_top + 1):
        b.set(c - 1, y, 1, stone)
        b.set(c + 1, y, 1, stone)
        b.set(c, y, 0, stone)
        if y >= 2:
            b.set(c, y, back, stone)  # flue front / lintel, through wall, gable and roof
            b.set(c, y, 1, "minecraft:air")  # the flue
    b.set(c, 0, 1, stone)
    b.set(c, 1, 1, "minecraft:campfire", {"lit": "true", "facing": "south", "signal_fire": "false", "waterlogged": "false"})
    b.set(c, 1, back, "minecraft:air")  # fireplace mouth
    for x in (c - 1, c + 1):
        b.set(x, 1, back, stone)
        b.set(x, 2, back, stone)

    # --- furnishings
    interior_x = range(1, W - 1)
    interior_z = range(back + 1, front)
    occupied = {(c, back + 1)}  # keep the hearth front clear

    def free(x, z):
        return (x, z) not in occupied and x in interior_x and z in interior_z and (x, z) != (c, front - 1)

    def place(x, z, block, props=None, y=1):
        b.set(x, y, z, block, props)
        occupied.add((x, z))

    # beds along the side walls, heads toward the warm back wall
    bed_spots = []
    for x in (1, W - 2):
        for z in range(back + 1, front - 2, 3):
            bed_spots.append((x, z))
    for i, (x, z) in enumerate(bed_spots[:beds]):
        colour = p["beds"][i % len(p["beds"])]
        place(x, z, colour, {"facing": "north", "part": "head", "occupied": "false"})
        place(x, z + 1, colour, {"facing": "north", "part": "foot", "occupied": "false"})

    # job site (profession houses) near the front, otherwise a crafting table
    front_spots = [(W - 2, front - 1), (1, front - 1), (W - 2, front - 2), (1, front - 2)]
    spot = next((s for s in front_spots if free(*s)), None)
    if spot:
        if job:
            block, props = JOBS[job]
            place(spot[0], spot[1], block, props)
        else:
            place(spot[0], spot[1], "minecraft:crafting_table")
    spot = next((s for s in front_spots if free(*s)), None)
    if spot:
        place(spot[0], spot[1], "minecraft:barrel", {"facing": "up", "open": "false"})
    # light and a rug in front of the fire
    for (x, z) in [(1, back + 1), (W - 2, back + 1)]:
        if free(x, z):
            place(x, z, "minecraft:lantern", {"hanging": "false", "waterlogged": "false"})
    for x in range(c - 1, c + 2):
        for z in range(back + 2, min(back + 4, front - 1)):
            if free(x, z):
                b.set(x, 1, z, p["carpet"])
    # --- villagers spawn from the floor
    spawn_spots = [(c, front - 2), (c - 1, back + 3), (c + 1, back + 3)]
    for (x, z) in spawn_spots[:villagers]:
        jb, jp, jn = jigsaw("minecraft:bottom", "minecraft:bottom", f"minecraft:village/{biome}/villagers",
                            p["floor"], "up_north", "rollable")
        b.set(x, 0, z, jb, jp, jn)
    return b


def variants(biome):
    if biome == "snowy":
        a, bb = "snowy_timber", "snowy_igloo"
    else:
        a, bb = "taiga_log", "taiga_stone"
    houses = [
        # (name, palette, width, depth, height, beds, villagers, job, weight)
        ("cozy_cabin_1", a, 7, 7, 3, 1, 1, None, 4),
        ("cozy_cabin_2", bb, 7, 8, 3, 2, 1, None, 4),
        ("house_1", a, 9, 9, 4, 2, 2, None, 4),
        ("house_2", bb, 9, 10, 4, 3, 2, None, 3),
        ("longhouse_1", a, 11, 11, 4, 4, 3, None, 3),
    ]
    for i, job in enumerate(JOBS):
        weight = 1 if job == "armorer" else 2
        houses.append((f"{job}_house", a if i % 2 == 0 else bb, 9, 8, 4, 1, 1, job, weight))
    return houses


VANILLA_KEEP = {
    "snowy": [
        ("minecraft:village/snowy/houses/snowy_farm_1", "minecraft:farm_snowy", 3),
        ("minecraft:village/snowy/houses/snowy_farm_2", "minecraft:farm_snowy", 3),
        ("minecraft:village/snowy/houses/snowy_animal_pen_1", None, 2),
        ("minecraft:village/snowy/houses/snowy_animal_pen_2", None, 2),
    ],
    "taiga": [
        ("minecraft:village/taiga/houses/taiga_large_farm_1", "minecraft:farm_taiga", 6),
        ("minecraft:village/taiga/houses/taiga_large_farm_2", "minecraft:farm_taiga", 6),
        ("minecraft:village/taiga/houses/taiga_small_farm_1", "minecraft:mossify_10_percent", 1),
        ("minecraft:village/taiga/houses/taiga_animal_pen_1", "minecraft:mossify_10_percent", 2),
    ],
}


def main():
    for biome in ("snowy", "taiga"):
        out_dir = DATA / "deepwinter/structure/village" / biome
        out_dir.mkdir(parents=True, exist_ok=True)
        elements = []
        processors = "minecraft:mossify_10_percent" if biome == "taiga" else {"processors": []}
        for (name, palette, w, d, h, beds, vill, job, weight) in variants(biome):
            building = house(biome, palette, w, d, h, beds, vill, job)
            nbt.write(out_dir / f"{name}.nbt", building.to_nbt())
            elements.append({"weight": weight, "element": {
                "element_type": "minecraft:single_pool_element",
                "location": f"deepwinter:village/{biome}/{name}",
                "processors": processors,
                "projection": "rigid",
            }})
        for (loc, proc, weight) in VANILLA_KEEP[biome]:
            elements.append({"weight": weight, "element": {
                "element_type": "minecraft:legacy_single_pool_element",
                "location": loc,
                "processors": proc if proc else {"processors": []},
                "projection": "rigid",
            }})
        elements.append({"weight": 6, "element": {"element_type": "minecraft:empty_pool_element"}})
        pool = {"fallback": f"minecraft:village/{biome}/terminators", "elements": elements}
        pool_path = DATA / f"minecraft/worldgen/template_pool/village/{biome}/houses.json"
        pool_path.parent.mkdir(parents=True, exist_ok=True)
        pool_path.write_text(json.dumps(pool, indent=2) + "\n")
        print(f"{biome}: {len(variants(biome))} houses -> {out_dir}")


if __name__ == "__main__":
    main()
