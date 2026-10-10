#!/usr/bin/env python3
"""Generates every resource of the mod: textures, block states, models, item model
definitions, equipment assets, sounds, language file, loot tables, recipes, tags, damage
type and world generation JSON.

Usage:  python3 tools/gen_assets.py            (run from the project root)

The output is committed; re-run after adding blocks or items. AssetConsistencyTest checks
that every registered block and item has its resources.
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
import sounds as snd  # noqa: E402
import textures as tx  # noqa: E402

NS = "nuclearstation"
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "main", "resources")
ASSETS = os.path.join(ROOT, "assets", NS)
DATA = os.path.join(ROOT, "data", NS)


def write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=2, sort_keys=False)
        f.write("\n")


def save_tex(rel, arr):
    path = os.path.join(ASSETS, "textures", rel + ".png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tx.to_img(arr).save(path)


def ref(path):
    return f"{NS}:{path}"


# =====================================================================================
# blocks
# =====================================================================================

FACINGS = {"north": 0, "east": 90, "south": 180, "west": 270}
SIGN_KINDS = ["radiation", "contamination", "high_radiation", "high_voltage", "restricted", "no_entry", "exit", "ppe", "hot_surface",
              "pressure", "emergency_shower", "fire", "crane", "magnetic", "laser", "hearing"]
PANEL_STATUS = ["off", "normal", "caution", "alarm"]

block_states = {}
block_models = {}
item_models = {}      # item id -> model ref
textures_done = set()


def model(name, obj):
    block_models[name] = obj
    return ref("block/" + name)


def tex(name, arr):
    save_tex("block/" + name, arr)
    textures_done.add("block/" + name)
    return ref("block/" + name)


def simple(bid, texture_arr):
    t = tex(bid, texture_arr)
    m = model(bid, {"parent": "minecraft:block/cube_all", "textures": {"all": t}})
    block_states[bid] = {"variants": {"": {"model": m}}}
    item_models[bid] = m


def column(bid, side_arr, end_arr):
    s = tex(bid, side_arr)
    e = tex(bid + "_end", end_arr)
    m = model(bid, {"parent": "minecraft:block/cube_column", "textures": {"side": s, "end": e}})
    block_states[bid] = {"variants": {"": {"model": m}}}
    item_models[bid] = m


def facing(bid, side_arr, front_arr, top_arr=None):
    s = tex(bid + "_side", side_arr)
    f = tex(bid + "_front", front_arr)
    t = tex(bid + "_top", top_arr) if top_arr is not None else s
    m = model(bid, {"parent": "minecraft:block/orientable", "textures": {"top": t, "front": f, "side": s, "particle": s}})
    block_states[bid] = {"variants": {f"facing={d}": ({"model": m, "y": r} if r else {"model": m}) for d, r in FACINGS.items()}}
    item_models[bid] = m


def box_model(name, frm, to, textures, faces_tex=None, extra=None, tint=None):
    """A single cuboid element model. textures: dict of texture vars; faces_tex maps face->var."""
    faces = {}
    for face in ("north", "south", "east", "west", "up", "down"):
        var = (faces_tex or {}).get(face, "all")
        if var is None:
            continue
        faces[face] = {"texture": "#" + var}
        if face in ("north", "south"):
            faces[face]["uv"] = [frm[0], 16 - to[1], to[0], 16 - frm[1]]
        elif face in ("east", "west"):
            faces[face]["uv"] = [frm[2], 16 - to[1], to[2], 16 - frm[1]]
        else:
            faces[face]["uv"] = [frm[0], frm[2], to[0], to[2]]
    elements = [{"from": frm, "to": to, "faces": faces}]
    if extra:
        elements += extra
    obj = {"parent": "minecraft:block/block", "textures": textures, "elements": elements}
    return model(name, obj)


def build_blocks():
    # ---------------------------------------------------------------- structural
    simple("reinforced_concrete", tx.concrete((150, 150, 146), "rc"))
    simple("concrete_panel", tx.concrete((176, 174, 168), "cp", ties=False))
    simple("dark_concrete", tx.concrete((98, 98, 100), "dc"))
    simple("containment_concrete", tx.concrete((168, 166, 160), "cc"))
    simple("containment_liner", tx.metal_plate((140, 146, 150), "liner"))
    simple("steel_floor_plate", diamond_plate())
    simple("hazard_stripes", tx.stripes("hz"))
    simple("epoxy_floor", tx.noise(tx.solid((96, 140, 104)), "epoxy", 3))
    simple("lab_floor", tx.tile((232, 232, 228), "lab", grout=(200, 200, 196), size=8))
    simple("rubber_floor", rubber())
    simple("cladding_blue", tx.cladding((52, 92, 150), "cb"))
    simple("cladding_white", tx.cladding((222, 224, 222), "cw"))
    simple("cladding_grey", tx.cladding((150, 154, 158), "cg"))
    simple("painted_wall", tx.noise(tx.solid((214, 204, 178)), "pw", 2))
    simple("acoustic_ceiling", tx.acoustic("ac"))
    simple("office_carpet", tx.carpet("oc"))
    simple("white_tile", tx.tile((236, 238, 238), "wt"))
    simple("lead_block", tx.metal_plate((88, 90, 104), "lead", rivet=False))
    simple("duct", tx.duct("duct"))
    simple("insulation_cladding", insulation())
    simple("damaged_concrete", tx.damaged("dmg"))
    simple("lead_glass", tx.glass((120, 150, 130), 110, "lg", frame=(70, 72, 80)))
    simple("steel_grating", tx.grating("gr"))
    simple("crane_girder", tx.girder("crane"))
    simple("observation_glass", tx.glass((150, 200, 230), 90, "og", frame=(50, 50, 60)))

    # ---------------------------------------------------------------- machinery
    column("reactor_vessel", tx.vessel("rv"), tx.vessel_head("rve"))
    simple("reactor_vessel_head", tx.vessel_head("rvh"))
    column("crdm_housing", tx.crdm("crdm"), tx.vessel_head("crdm_e"))
    column("steam_generator_shell", tx.white_shell("sg"), tx.noise(tx.solid((200, 200, 196)), "sge", 3))
    column("pressurizer_shell", tx.white_shell("pzr"), tx.noise(tx.solid((200, 200, 196)), "pzre", 3))
    simple("turbine_casing", tx.turbine("tc"))
    simple("generator_housing", tx.generator("gen"))
    simple("condenser_shell", tx.machine_side((126, 130, 134), "cond"))
    simple("transformer_body", tx.transformer("tb"))
    simple("transformer_radiator", tx.radiator("tr"))
    column("tank_shell", tx.tank("tank"), tx.noise(tx.solid((210, 210, 206)), "tanke", 3))
    simple("diesel_engine", tx.diesel("de"))
    simple("battery_rack", tx.battery("bat"))
    simple("heat_exchanger", tx.heat_exchanger("hx"))
    simple("motor_housing", tx.motor("motor"))
    facing("pump_casing", tx.machine_side((50, 80, 150), "pc"), tx.front_face((50, 80, 150), "pcf", "pump"))
    facing("reactor_coolant_pump", tx.machine_side((130, 134, 140), "rcp"), tx.front_face((130, 134, 140), "rcpf", "rcp"))
    facing("instrument_rack", tx.machine_side((80, 86, 92), "ir"), tx.front_face((80, 86, 92), "irf", "instrument"))
    facing("switchgear_cabinet", tx.machine_side((170, 174, 176), "sw"), tx.front_face((170, 174, 176), "swf", "switchgear"))
    facing("ventilation_fan", tx.machine_side((150, 154, 158), "vf"), tx.front_face((150, 154, 158), "vff", "fan"))
    facing("server_rack", tx.machine_side((30, 30, 34), "sr", panel=False), tx.front_face((30, 30, 34), "srf", "server"))
    facing("locker", tx.machine_side((170, 174, 178), "lk", panel=False), tx.front_face((170, 174, 178), "lkf", "locker"))

    # pipes: 12x12 column, axis rotation as logs
    pipe_colours = {"pipe_primary": ((200, 200, 196), (200, 40, 40)), "pipe_steam": ((220, 220, 216), (230, 170, 30)),
                    "pipe_feedwater": ((60, 120, 70), (240, 240, 240)), "pipe_seawater": ((40, 90, 150), (90, 200, 120)),
                    "pipe_service": ((150, 150, 150), (60, 120, 200))}
    for bid, (body, band) in pipe_colours.items():
        side = tx.solid(body)
        tx.noise(side, bid, 3)
        side[:, 2, :3] *= 0.8
        side[:, 13, :3] *= 0.8
        side[6:9, :, :3] = band
        end = tx.solid(body)
        end[4:12, 4:12, :3] = (50, 52, 56)
        tx.border(end, [c * 0.7 for c in body], 2)
        s = tex(bid, side)
        e = tex(bid + "_end", end)
        m = model(bid, {"parent": "minecraft:block/block", "textures": {"side": s, "end": e, "particle": s},
                        "elements": [{"from": [2, 0, 2], "to": [14, 16, 14], "faces": {
                            "north": {"texture": "#side", "uv": [2, 0, 14, 16]}, "south": {"texture": "#side", "uv": [2, 0, 14, 16]},
                            "east": {"texture": "#side", "uv": [2, 0, 14, 16]}, "west": {"texture": "#side", "uv": [2, 0, 14, 16]},
                            "up": {"texture": "#end", "uv": [2, 2, 14, 14], "cullface": "up"},
                            "down": {"texture": "#end", "uv": [2, 2, 14, 14], "cullface": "down"}}}]})
        block_states[bid] = {"variants": {"axis=y": {"model": m}, "axis=x": {"model": m, "x": 90, "y": 90}, "axis=z": {"model": m, "x": 90}}}
        item_models[bid] = m

    # cable tray: open tray along an axis near the ceiling
    t = tray_tex()
    tt = tex("cable_tray", t)
    m = model("cable_tray", {"parent": "minecraft:block/block", "textures": {"tray": tt, "particle": tt}, "elements": [
        {"from": [2, 12, 0], "to": [14, 13, 16], "faces": {d: {"texture": "#tray", "uv": [2, 0, 14, 16]} for d in ("up", "down")}},
        {"from": [2, 13, 0], "to": [3, 16, 16], "faces": {d: {"texture": "#tray", "uv": [0, 0, 16, 3]} for d in ("east", "west", "up")}},
        {"from": [13, 13, 0], "to": [14, 16, 16], "faces": {d: {"texture": "#tray", "uv": [0, 0, 16, 3]} for d in ("east", "west", "up")}},
        {"from": [3, 13, 1], "to": [13, 14.5, 15], "faces": {"up": {"texture": "#tray", "uv": [3, 3, 13, 13]}}}]})
    block_states["cable_tray"] = {"variants": {"axis=z": {"model": m}, "axis=x": {"model": m, "y": 90}}}
    item_models["cable_tray"] = m

    # sign plates: one model per kind (plate on the south side of the block, facing north)
    back = tex("sign_back", tx.noise(tx.solid((120, 122, 126)), "signback", 2))
    variants = {}
    for kind in SIGN_KINDS:
        save_tex("block/sign_" + kind, tx.sign(kind))
        textures_done.add("block/sign_" + kind)
        m = model("sign_plate_" + kind, {"parent": "minecraft:block/block", "textures": {"face": ref("block/sign_" + kind), "back": back,
                                                                                       "particle": ref("block/sign_" + kind)},
                                          "elements": [{"from": [1, 1, 15], "to": [15, 15, 16], "faces": {
                                              "north": {"texture": "#face", "uv": [0, 0, 16, 16]},
                                              "south": {"texture": "#back", "uv": [1, 1, 15, 15], "cullface": "south"},
                                              "east": {"texture": "#back", "uv": [0, 1, 1, 15]}, "west": {"texture": "#back", "uv": [0, 1, 1, 15]},
                                              "up": {"texture": "#back", "uv": [1, 0, 15, 1]}, "down": {"texture": "#back", "uv": [1, 0, 15, 1]}}}]})
        for d, r in FACINGS.items():
            variants[f"facing={d},kind={kind}"] = {"model": m, "y": r} if r else {"model": m}
    block_states["sign_plate"] = {"variants": variants}
    item_models["sign_plate"] = ref("block/sign_plate_radiation")

    # ceiling lamps
    for bid, emergency in (("facility_lamp", False), ("emergency_lamp", True)):
        on = tex(bid + "_on", tx.lamp(True, bid, emergency))
        off = tex(bid + "_off", tx.lamp(False, bid, emergency))
        frame = tex(bid + "_frame", tx.noise(tx.solid((150, 152, 156)), bid + "f", 2))
        mods = {}
        for state, t in (("true", on), ("false", off)):
            mods[state] = box_model(f"{bid}_{'on' if state == 'true' else 'off'}", [1, 13, 1], [15, 16, 15],
                                    {"lens": t, "frame": frame, "particle": frame},
                                    {"down": "lens", "up": "frame", "north": "frame", "south": "frame", "east": "frame", "west": "frame"})
        block_states[bid] = {"variants": {"powered=true": {"model": mods["true"]}, "powered=false": {"model": mods["false"]}}}
        item_models[bid] = mods["true"]

    # rotating warning beacon
    on = tex("warning_beacon_on", tx.beacon(True, "wb"))
    off = tex("warning_beacon_off", tx.beacon(False, "wb"))
    base = tex("warning_beacon_base", tx.noise(tx.solid((50, 50, 54)), "wbb", 2))
    mods = {}
    for lit, t in (("true", on), ("false", off)):
        mods[lit] = model("warning_beacon_" + ("on" if lit == "true" else "off"), {
            "parent": "minecraft:block/block", "textures": {"lens": t, "base": base, "particle": t}, "elements": [
                {"from": [4, 0, 4], "to": [12, 2, 12], "faces": {f: {"texture": "#base"} for f in ("north", "south", "east", "west", "up", "down")}},
                {"from": [5, 2, 5], "to": [11, 8, 11], "faces": {f: {"texture": "#lens"} for f in ("north", "south", "east", "west", "up")}}]})
    block_states["warning_beacon"] = {"variants": {"lit=true": {"model": mods["true"]}, "lit=false": {"model": mods["false"]}}}
    item_models["warning_beacon"] = mods["true"]

    # console and panel blocks
    console_side = tx.machine_side((70, 84, 90), "con", panel=False)
    facing("control_console", console_side, tx.front_face((70, 84, 90), "conf", "console"),
           tx.noise(tx.solid((60, 66, 72)), "cont", 2))
    for bid, fn in (("control_panel", tx.control_panel), ("annunciator_panel", tx.annunciator)):
        side = tex(bid + "_side", tx.machine_side((70, 84, 90), bid + "s", panel=False))
        variants = {}
        for st in PANEL_STATUS:
            f = tex(f"{bid}_{st}", fn(st, bid + st))
            m = model(f"{bid}_{st}", {"parent": "minecraft:block/orientable", "textures": {"top": side, "front": f, "side": side, "particle": side}})
            for d, r in FACINGS.items():
                variants[f"facing={d},status={st}"] = {"model": m, "y": r} if r else {"model": m}
        block_states[bid] = {"variants": variants}
        item_models[bid] = ref(f"block/{bid}_normal")

    # scram button: red mushroom button on a yellow back plate (mounted on the south face)
    sb = tex("scram_button", scram_tex())
    plate = tex("scram_plate", tx.noise(tx.solid((230, 190, 30)), "scramp", 3))
    m = model("scram_button", {"parent": "minecraft:block/block", "textures": {"button": sb, "plate": plate, "particle": plate}, "elements": [
        {"from": [4, 4, 15], "to": [12, 12, 16], "faces": {f: {"texture": "#plate"} for f in ("north", "south", "east", "west", "up", "down")}},
        {"from": [5, 5, 11], "to": [11, 11, 15], "faces": {f: {"texture": "#button"} for f in ("north", "east", "west", "up", "down")}}]})
    block_states["scram_button"] = {"variants": {f"facing={d}": ({"model": m, "y": r} if r else {"model": m}) for d, r in FACINGS.items()}}
    item_models["scram_button"] = m

    facing("local_station", tx.machine_side((80, 86, 92), "ls"), tx.front_face((80, 86, 92), "lsf", "local_station"))
    facing("decon_shower", tx.machine_side((200, 204, 210), "ds", panel=False), tx.front_face((200, 204, 210), "dsf", "decon"))

    # waste drum
    side = tex("waste_drum_side", tx.drum("wd"))
    top_open = tex("waste_drum_top", tx.drum("wdt", sealed=False, top=True))
    top_sealed = tex("waste_drum_top_sealed", tx.drum("wdts", sealed=True, top=True))
    mods = {}
    for name, top in (("waste_drum", top_open), ("waste_drum_sealed", top_sealed)):
        mods[name] = box_model(name, [2, 0, 2], [14, 15, 14], {"side": side, "top": top, "particle": side},
                               {"north": "side", "south": "side", "east": "side", "west": "side", "up": "top", "down": "top"})
    block_states["waste_drum"] = {"variants": {f"fill={i}": {"model": mods["waste_drum_sealed" if i == 4 else "waste_drum"]} for i in range(5)}}
    item_models["waste_drum"] = mods["waste_drum"]

    # fuel
    for bid, spent in (("fuel_assembly", False), ("spent_fuel_assembly", True)):
        s = tex(bid, tx.fuel_assembly(spent, bid))
        top = tex(bid + "_top", fuel_top(spent))
        m = box_model(bid, [3, 0, 3], [13, 16, 13], {"side": s, "top": top, "particle": s},
                      {"north": "side", "south": "side", "east": "side", "west": "side", "up": "top", "down": "top"})
        block_states[bid] = {"variants": {"": {"model": m}}}
        item_models[bid] = m
    simple("spent_fuel_rack", tx.rack("rack"))
    t = tex("cherenkov_glow", tx.glow("glow"))
    m = model("cherenkov_glow", {"textures": {"particle": t}})
    block_states["cherenkov_glow"] = {"variants": {"": {"model": m}}}
    item_models["cherenkov_glow"] = m
    simple("corium", tx.corium("corium"))
    simple("contaminated_debris", tx.debris("debris"))
    simple("contaminated_soil", tx.soil("soil"))

    # experimental wing
    simple("exp_chamber_wall", tx.chamber_wall("ecw"))
    column("exp_coil", tx.coil("coil"), tx.noise(tx.solid((60, 60, 70)), "coile", 3))
    facing("exp_emitter", tx.machine_side((40, 60, 70), "em"), tx.front_face((40, 60, 70), "emf", "emitter"))
    facing("exp_console", tx.machine_side((40, 34, 54), "ec", panel=False), tx.front_face((40, 34, 54), "ecf", "exp_console"))

    # ores
    simple("uraninite_ore", tx.ore("stone", (40, 40, 36), (90, 110, 40), "ur"))
    simple("deepslate_uraninite_ore", tx.ore("deepslate", (30, 30, 28), (110, 130, 50), "dur"))
    simple("pitchblende_ore", tx.ore("deepslate", (20, 18, 16), (60, 50, 30), "pb", count=10))
    simple("thorianite_ore", tx.ore("deepslate", (90, 80, 70), (150, 140, 120), "th"))
    simple("monazite_sand", tx.monazite_sand("ms"))
    simple("monazite_ore", tx.ore("stone", (150, 90, 50), (190, 120, 70), "mo"))
    simple("carnotite_ore", tx.ore("sandstone", (220, 210, 40), (250, 240, 90), "ca", count=9))
    simple("autunite_ore", tx.ore("stone", (180, 220, 40), (220, 255, 90), "au"))
    simple("radiferous_barite_ore", tx.ore("stone", (230, 225, 215), (250, 240, 230), "ba"))
    simple("radioactive_shale", tx.shale("sh"))
    simple("xenotime_ore", tx.ore("stone", (170, 120, 60), (210, 160, 90), "xe"))
    simple("zircon_ore", tx.ore("stone", (170, 60, 40), (220, 120, 70), "zr"))
    simple("beryl_ore", tx.ore("stone", (100, 190, 150), (160, 230, 200), "be"))
    simple("colemanite_ore", tx.ore("stone", (235, 235, 230), (250, 250, 250), "co"))
    simple("spodumene_ore", tx.ore("stone", (220, 180, 200), (240, 210, 225), "sp"))
    simple("greenockite_ore", tx.ore("stone", (220, 180, 30), (250, 210, 60), "gr"))
    simple("graphite_ore", tx.ore("stone", (40, 40, 44), (90, 90, 96), "gp", count=9))
    simple("galena_ore", tx.ore("stone", (120, 124, 136), (180, 186, 200), "ga"))
    simple("resonite_ore", tx.ore("deepslate", (90, 220, 210), (180, 255, 250), "re"))
    simple("voidstone", tx.voidstone("vo"))


def diamond_plate():
    a = tx.solid((132, 136, 140))
    tx.noise(a, "dp", 3)
    for y in range(0, 16, 4):
        for x in range(0, 16, 4):
            ox = 2 if (y // 4) % 2 else 0
            xx = (x + ox) % 16
            a[y + 1, xx, :3] = (175, 178, 182)
            a[y + 2, (xx + 1) % 16, :3] = (175, 178, 182)
            a[y + 2, xx, :3] = (95, 98, 102)
    return a


def rubber():
    a = tx.solid((34, 34, 36))
    tx.noise(a, "rub", 3)
    for y in range(1, 16, 4):
        for x in range(1, 16, 4):
            a[y, x, :3] = (60, 60, 62)
    return a


def insulation():
    a = tx.solid((196, 200, 204))
    tx.noise(a, "ins", 2)
    for y in (0, 8):
        a[y, :, :3] = (150, 152, 156)
    for y in (3, 11):
        for x in range(16):
            a[y, x, :3] *= 1.08
    return a


def tray_tex():
    a = tx.solid((150, 154, 160))
    tx.noise(a, "tray", 3)
    for y in range(3, 13):
        if y % 2:
            a[y, 3:13, :3] = (40, 40, 44)
        else:
            a[y, 3:13, :3] = (200, 60, 40) if y % 4 == 0 else (40, 90, 170)
    return a


def scram_tex():
    a = tx.solid((200, 30, 30))
    tx.noise(a, "scram", 4)
    a[2:5, 2:5, :3] = (240, 90, 90)
    return a


def fuel_top(spent):
    a = tx.solid((100, 100, 104))
    for y in range(1, 16, 2):
        for x in range(1, 16, 2):
            a[y, x, :3] = (180, 180, 186) if not spent else (120, 110, 100)
    return a


# =====================================================================================
# items
# =====================================================================================

MATERIALS = {
    # id: (shape, colour, speckle)
    "raw_uraninite": ("raw", (70, 74, 52), (120, 140, 50)),
    "pitchblende_chunk": ("chunk", (52, 46, 38), (100, 90, 40)),
    "thorianite_crystal": ("gem", (130, 116, 100), None),
    "monazite_concentrate": ("powder", (190, 120, 70), None),
    "carnotite_powder": ("powder", (235, 220, 60), None),
    "autunite_crystal": ("crystal", (190, 230, 60), None),
    "barite_chunk": ("chunk", (235, 230, 220), (200, 180, 160)),
    "radium_salts": ("dust", (220, 240, 255), None),
    "shale_fragment": ("chunk", (50, 48, 52), (150, 130, 60)),
    "raw_galena": ("raw", (130, 136, 150), (200, 205, 215)),
    "lead_ingot": ("ingot", (100, 104, 124), None),
    "yellowcake": ("powder", (240, 200, 40), None),
    "uranium_dioxide_pellet": ("pellet", (60, 60, 64), None),
    "zircon_crystal": ("gem", (200, 90, 60), None),
    "zircaloy_ingot": ("ingot", (190, 196, 200), None),
    "colemanite_chunk": ("chunk", (240, 240, 236), None),
    "boron_carbide": ("chunk", (40, 40, 46), (90, 90, 100)),
    "graphite_flake": ("flake", (60, 60, 66), None),
    "xenotime_crystal": ("crystal", (190, 140, 80), None),
    "beryl_crystal": ("gem", (120, 210, 170), None),
    "spodumene_crystal": ("crystal", (230, 190, 210), None),
    "greenockite_chunk": ("chunk", (230, 190, 40), None),
    "thorium_dioxide": ("powder", (230, 230, 220), None),
    "beryllium_ingot": ("ingot", (170, 180, 175), None),
    "lithium_carbonate": ("powder", (245, 245, 245), None),
    "cadmium_ingot": ("ingot", (175, 180, 190), None),
    "resonite_shard": ("crystal", (90, 230, 220), None),
    "voidstone_fragment": ("chunk", (30, 20, 44), (110, 70, 170)),
}
RESERVED = {"xenotime_crystal", "beryl_crystal", "spodumene_crystal", "greenockite_chunk", "thorium_dioxide", "beryllium_ingot",
            "lithium_carbonate", "cadmium_ingot", "resonite_shard", "voidstone_fragment"}
SPARE_PARTS = list(tx.SPARE_ICONS.keys())
INSTRUMENTS = {"geiger_counter": tx.geiger, "dosimeter": tx.dosimeter, "survey_meter": tx.survey_meter, "decon_kit": tx.decon_kit}
PPE = ["hazmat_hood", "hazmat_suit", "hazmat_trousers", "hazmat_boots", "respirator", "lead_apron"]


def build_items():
    for iid, fn in INSTRUMENTS.items():
        save_tex("item/" + iid, fn())
        item_models[iid] = generated(iid)
    for iid in PPE:
        save_tex("item/" + iid, tx.ppe(iid))
        item_models[iid] = generated(iid)
    for iid in SPARE_PARTS:
        save_tex("item/" + iid, tx.spare(iid))
        item_models[iid] = generated(iid)
    for iid, (shape, colour, speck) in MATERIALS.items():
        save_tex("item/" + iid, tx.material(shape, colour, iid, speck))
        item_models[iid] = generated(iid)
    # armour layers
    save_tex("entity/equipment/humanoid/hazmat", tx.armor_layer((230, 200, 40), {"boots": (40, 40, 44)}))
    save_tex("entity/equipment/humanoid_leggings/hazmat", tx.armor_layer((230, 200, 40), {}, legs=True))
    save_tex("entity/equipment/humanoid/respirator", tx.armor_layer((60, 62, 66), {}, kind="respirator"))
    save_tex("entity/equipment/humanoid/lead_apron", tx.armor_layer((70, 80, 110), {}, kind="lead_apron"))
    for name in ("hazmat", "respirator", "lead_apron"):
        layers = {"humanoid": [{"texture": ref(name)}]}
        if name == "hazmat":
            layers["humanoid_leggings"] = [{"texture": ref(name)}]
        write_json(os.path.join(ASSETS, "equipment", name + ".json"), {"layers": layers})


def generated(iid):
    path = "item/" + iid
    block_models  # noqa
    write_json(os.path.join(ASSETS, "models", "item", iid + ".json"), {"parent": "minecraft:item/generated", "textures": {"layer0": ref(path)}})
    return ref(path)


# =====================================================================================
# language
# =====================================================================================

NAME_OVERRIDES = {
    "crdm_housing": "CRDM Housing", "pipe_primary": "Primary Coolant Pipe", "pipe_steam": "Main Steam Pipe", "pipe_feedwater": "Feedwater Pipe",
    "pipe_seawater": "Seawater Pipe", "pipe_service": "Service Water Pipe", "sign_plate": "Safety Sign", "exp_chamber_wall": "Chamber Wall Segment",
    "exp_coil": "Field Coil", "exp_emitter": "Beam Emitter", "exp_console": "Experimental Chamber Console", "decon_shower": "Decontamination Shower",
    "rcp": "Reactor Coolant Pump", "radiferous_barite_ore": "Radiferous Barite Ore", "uranium_dioxide_pellet": "Uranium Dioxide Fuel Pellet",
    "voidstone": "Voidstone", "local_station": "Local Control Station", "scram_button": "Manual Reactor Trip Pushbutton",
    "control_console": "Main Control Console", "annunciator_panel": "Annunciator Panel", "control_panel": "Control Board Section",
    "facility_lamp": "Facility Light Fitting", "emergency_lamp": "Emergency Light", "cherenkov_glow": "Cherenkov Glow",
    "spent_fuel_rack": "Spent Fuel Storage Rack", "geiger_counter": "Geiger Counter", "dosimeter": "Electronic Personal Dosimeter",
    "survey_meter": "Contamination Survey Meter", "decon_kit": "Decontamination Kit", "lead_apron": "Lead Apron",
    "diesel_service_kit": "Diesel Service Kit", "screen_panels": "Intake Screen Panels", "transformer_kit": "Transformer Repair Kit",
    "batt": "", "tank_shell": "Tank Shell", "hazmat_hood": "Hazmat Hood", "hazmat_suit": "Hazmat Suit", "hazmat_trousers": "Hazmat Trousers",
    "hazmat_boots": "Hazmat Boots", "raw_galena": "Raw Galena", "lead_glass": "Lead Glass", "steel_grating": "Steel Grating",
}

DESCRIPTIONS = {
    "geiger_counter": "Hold to hear the count rate and read it on screen. Use for a full reading with ground contamination.",
    "dosimeter": "Carried anywhere in the inventory. Records your dose and alarms above 1 mSv/h or 20 mSv acute dose.",
    "survey_meter": "Pancake probe meter. Hold to read dose rate and surface contamination; use for a 13x13 survey map.",
    "decon_kit": "Wipes, decontamination gel and bags. Use to clean yourself; use on a contaminated item held in the other hand.",
    "hazmat_hood": "Keeps contamination off skin and hair. Pair with the full suit for best protection.",
    "hazmat_suit": "Disposable coverall. Strongly reduces skin contamination; offers no shielding from gamma rays.",
    "hazmat_trousers": "Part of the anti-contamination suit.",
    "hazmat_boots": "Overshoes. Stop ground contamination being picked up while walking.",
    "respirator": "Full-face respirator with particulate and iodine cartridges. Cuts inhaled dose from airborne activity.",
    "lead_apron": "0.5 mm lead equivalent. Modest reduction of low-energy gamma dose; heavy.",
    "raw_uraninite": "UO2 ore lumps. Weakly radioactive; process into yellowcake.",
    "pitchblende_chunk": "Massive uraninite from hydrothermal veins. Richer, and more radioactive, than ordinary ore.",
    "thorianite_crystal": "Thorium oxide mineral. Radioactive.",
    "monazite_concentrate": "Heavy mineral sand concentrate: rare earths with thorium.",
    "carnotite_powder": "Bright yellow potassium uranyl vanadate from desert sandstones.",
    "autunite_crystal": "Calcium uranyl phosphate. Fluoresces under ultraviolet light.",
    "barite_chunk": "Barite that co-precipitated radium. Surprisingly radioactive for its uranium content.",
    "radium_salts": "Radium-bearing residue. Intensely radioactive - store in a shielded drum.",
    "shale_fragment": "Black shale with dispersed uranium. Barely above background.",
    "raw_galena": "Lead sulphide ore. Smelt to lead.",
    "lead_ingot": "Dense, soft metal used for radiation shielding.",
    "yellowcake": "Uranium ore concentrate (U3O8).",
    "uranium_dioxide_pellet": "Sintered UO2 ceramic fuel pellet.",
    "zircon_crystal": "Zirconium silicate. The source of zirconium for fuel cladding.",
    "zircaloy_ingot": "Zirconium alloy with low neutron absorption, used for fuel cladding.",
    "colemanite_chunk": "Calcium borate mineral from evaporite basins.",
    "boron_carbide": "Strong neutron absorber used in control rods.",
    "graphite_flake": "Natural graphite.",
    "xenotime_crystal": "Yttrium phosphate with heavy rare earths.",
    "beryl_crystal": "Beryllium aluminium silicate from granite pegmatites.",
    "spodumene_crystal": "Lithium pyroxene from pegmatites.",
    "greenockite_chunk": "Cadmium sulphide, found with zinc and lead ores.",
    "thorium_dioxide": "Purified thoria.",
    "beryllium_ingot": "Light metal and neutron reflector.",
    "lithium_carbonate": "Lithium salt.",
    "cadmium_ingot": "Strong thermal-neutron absorber.",
    "resonite_shard": "An unexplained crystal that hums faintly. Not understood by any known science.",
    "voidstone_fragment": "Absorbs almost all light. Origin unknown.",
}

SOUND_SUBTITLES = {
    "machine.turbine_hum": "Turbine hums", "machine.pump_hum": "Pumps run", "machine.transformer_hum": "Transformer hums",
    "machine.ventilation": "Ventilation blows", "machine.diesel_engine": "Diesel generator runs", "ambient.cooling_tower": "Cooling tower rains",
    "ambient.underground": "Deep rumble", "alarm.horn": "Alarm horn sounds", "alarm.siren": "Site emergency siren wails",
    "alarm.chime": "Annunciator chimes", "instrument.geiger_click": "Geiger counter clicks", "instrument.dosimeter_alarm": "Dosimeter alarms",
    "event.steam_release": "Steam roars", "event.rod_drop": "Control rods drop", "event.breaker_trip": "Breaker trips", "event.rumble": "Ground rumbles",
}

MESSAGES = {
    "message.nuclearstation.console_unconnected": "This console is not wired to the plant computer.",
    "message.nuclearstation.not_at_console": "You must be at a control room console to operate the plant.",
    "message.nuclearstation.scram": "REACTOR TRIP initiated - rods inserting.",
    "message.nuclearstation.scram_already": "Reactor already tripped. Trip breakers are open.",
    "message.nuclearstation.scram_not_wired": "This pushbutton is not connected to the reactor protection system.",
    "message.nuclearstation.station_unconnected": "This local station is not connected to any plant equipment.",
    "message.nuclearstation.station_hint": "Repair with: %s (hold it and use the station). Sneak-use for local start/stop.",
    "message.nuclearstation.wrong_part": "Wrong part. This equipment needs: %s",
    "message.nuclearstation.drum_full": "Drum is full and sealed.",
    "message.nuclearstation.drum_sealed": "Sealed %s item(s) in the drum (%s/%s).",
    "message.nuclearstation.drum_status": "Waste drum: %s/%s items, surface dose rate about %s uSv/h.",
    "message.nuclearstation.geiger_reading": "Dose rate %s | ground %s kBq/m2 | at %s %s %s",
    "message.nuclearstation.dosimeter": "Lifetime dose %s | acute %s | rate %s | skin contamination %s kBq",
    "message.nuclearstation.decon_player": "Decontaminated: %s -> %s kBq",
    "message.nuclearstation.decon_item_radioactive": "This item is itself radioactive - it cannot be wiped clean. Dispose of it in a waste drum.",
    "message.nuclearstation.decon_item_clean": "Item decontaminated.",
    "message.nuclearstation.decon_item_already_clean": "Nothing to clean.",
    "message.nuclearstation.survey_header": "Radiation survey centred on %s, %s (north up, 4 blocks per cell):",
    "message.nuclearstation.survey_legend": "Legend: . background  - low  + elevated  # high  @ very high   (max %s)",
    "tooltip.nuclearstation.radioactive": "Radioactive: %s uSv/h at contact",
    "tooltip.nuclearstation.contaminated": "Surface contamination: %s kBq",
    "tooltip.nuclearstation.reserved": "Reserved for future research - no current use",
    "tooltip.nuclearstation.spare_part": "Spare part. Used at local stations to repair:",
    "tooltip.nuclearstation.and_more": "...and %s more",
    "screen.nuclearstation.control_room": "Main Control Room",
    "screen.nuclearstation.experimental_console": "Experimental Chamber",
    "itemGroup.nuclearstation.main": "Meridian Point Nuclear Station",
    "death.attack.nuclearstation.radiation_sickness": "%1$s died of acute radiation syndrome",
    "death.attack.nuclearstation.radiation_sickness.player": "%1$s died of acute radiation syndrome",
}


def title(iid):
    if iid in NAME_OVERRIDES:
        return NAME_OVERRIDES[iid]
    return " ".join(w.capitalize() for w in iid.split("_"))


def build_lang(block_ids, item_ids):
    lang = {}
    for b in block_ids:
        lang[f"block.{NS}.{b}"] = title(b)
    for i in item_ids:
        lang[f"item.{NS}.{i}"] = title(i)
        if i in DESCRIPTIONS:
            lang[f"item.{NS}.{i}.desc"] = DESCRIPTIONS[i]
    for key, sub in SOUND_SUBTITLES.items():
        lang[f"subtitles.{NS}.{key}"] = sub
    lang.update(MESSAGES)
    write_json(os.path.join(ASSETS, "lang", "en_us.json"), lang)


# =====================================================================================
# data
# =====================================================================================

ORE_DROPS = {
    "uraninite_ore": "raw_uraninite", "deepslate_uraninite_ore": "raw_uraninite", "pitchblende_ore": "pitchblende_chunk",
    "thorianite_ore": "thorianite_crystal", "monazite_ore": "monazite_concentrate", "carnotite_ore": "carnotite_powder",
    "autunite_ore": "autunite_crystal", "radiferous_barite_ore": "barite_chunk", "radioactive_shale": "shale_fragment",
    "xenotime_ore": "xenotime_crystal", "zircon_ore": "zircon_crystal", "beryl_ore": "beryl_crystal", "colemanite_ore": "colemanite_chunk",
    "spodumene_ore": "spodumene_crystal", "greenockite_ore": "greenockite_chunk", "graphite_ore": "graphite_flake", "galena_ore": "raw_galena",
    "resonite_ore": "resonite_shard", "voidstone": "voidstone_fragment",
}
NO_LOOT = {"cherenkov_glow"}
SHOVEL = {"monazite_sand", "contaminated_soil"}
NO_TOOL = {"rubber_floor", "acoustic_ceiling", "office_carpet", "lead_glass", "observation_glass", "facility_lamp", "emergency_lamp",
           "warning_beacon", "cherenkov_glow", "monazite_sand", "contaminated_soil"}
NEEDS_IRON = {"uraninite_ore", "deepslate_uraninite_ore", "pitchblende_ore", "thorianite_ore", "radiferous_barite_ore", "xenotime_ore",
              "beryl_ore", "spodumene_ore", "resonite_ore", "containment_concrete", "lead_block"}
NEEDS_DIAMOND = {"voidstone", "corium"}


def block_loot(b):
    if b in NO_LOOT:
        return None
    if b in ORE_DROPS:
        drop = ORE_DROPS[b]
        return {"type": "minecraft:block", "pools": [{"rolls": 1, "entries": [{"type": "minecraft:alternatives", "children": [
            {"type": "minecraft:item", "condition": "minecraft:tool/can_silk_touch", "name": ref(b)},
            {"type": "minecraft:item", "modifier": [
                {"type": "minecraft:apply_bonus", "enchantment": "minecraft:fortune", "formula": "minecraft:ore_drops"},
                {"type": "minecraft:explosion_decay"}], "name": ref(drop)}]}]}], "random_sequence": f"{NS}:blocks/{b}"}
    return {"type": "minecraft:block", "pools": [{"condition": {"type": "minecraft:survives_explosion"}, "rolls": 1,
                                                  "entries": [{"type": "minecraft:item", "name": ref(b)}]}],
            "random_sequence": f"{NS}:blocks/{b}"}


def entry(item, weight, lo=1, hi=1):
    e = {"type": "minecraft:item", "name": item if ":" in item else ref(item), "weight": weight}
    if hi > 1:
        e["modifier"] = {"type": "minecraft:set_count", "count": {"type": "minecraft:uniform", "min": lo, "max": hi}}
    return e


def chest(rolls, entries, extra_pools=()):
    pools = [{"rolls": {"type": "minecraft:uniform", "min": rolls[0], "max": rolls[1]}, "entries": entries}]
    pools += list(extra_pools)
    return {"type": "minecraft:chest", "pools": pools}


CHESTS = {
    "warehouse_parts": chest((3, 6), [entry(p, 10, 1, 3) for p in SPARE_PARTS] + [
        entry("minecraft:iron_ingot", 8, 2, 6), entry("minecraft:copper_ingot", 8, 2, 8), entry("minecraft:redstone", 6, 2, 8),
        entry("lead_ingot", 5, 1, 4)]),
    "ppe_store": chest((3, 6), [entry("hazmat_hood", 6), entry("hazmat_suit", 6), entry("hazmat_trousers", 6), entry("hazmat_boots", 6),
                                entry("respirator", 5), entry("lead_apron", 3), entry("decon_kit", 10, 1, 4), entry("dosimeter", 4),
                                entry("geiger_counter", 3)]),
    "lab_supplies": chest((2, 5), [entry("survey_meter", 4), entry("geiger_counter", 4), entry("decon_kit", 8, 1, 3),
                                   entry("minecraft:glass_bottle", 8, 1, 4), entry("instrument_module", 6), entry("yellowcake", 3, 1, 2),
                                   entry("zircon_crystal", 4, 1, 3), entry("autunite_crystal", 3, 1, 2), entry("minecraft:paper", 8, 2, 6)]),
    "office": chest((2, 5), [entry("minecraft:paper", 20, 2, 10), entry("minecraft:book", 10, 1, 3), entry("minecraft:writable_book", 4),
                             entry("minecraft:clock", 3), entry("minecraft:compass", 3), entry("minecraft:map", 4), entry("dosimeter", 3),
                             entry("minecraft:cookie", 8, 1, 6), entry("minecraft:bread", 6, 1, 3)]),
    "workshop": chest((3, 6), [entry(p, 6, 1, 2) for p in SPARE_PARTS] + [
        entry("minecraft:iron_ingot", 10, 2, 8), entry("minecraft:iron_nugget", 8, 4, 16), entry("minecraft:shears", 3),
        entry("minecraft:iron_pickaxe", 2), entry("minecraft:flint_and_steel", 2), entry("lead_ingot", 6, 2, 6), entry("zircaloy_ingot", 2, 1, 2)]),
    "mine_store": chest((3, 6), [entry("raw_uraninite", 10, 2, 8), entry("pitchblende_chunk", 4, 1, 3), entry("minecraft:torch", 10, 4, 16),
                                 entry("minecraft:rail", 6, 4, 12), entry("minecraft:iron_pickaxe", 3), entry("minecraft:bread", 6, 1, 4),
                                 entry("geiger_counter", 3), entry("minecraft:tnt", 2, 1, 3), entry("autunite_crystal", 5, 1, 3)]),
}


def shaped(pattern, key, result, count=1, category="misc"):
    return {"type": "minecraft:crafting_shaped", "category": category,
            "key": {k: (v if ":" in v or v.startswith("#") else ref(v)) for k, v in key.items()},
            "pattern": pattern, "result": {"id": ref(result) if ":" not in result else result, "count": count}}


def shapeless(ingredients, result, count=1, category="misc"):
    return {"type": "minecraft:crafting_shapeless", "category": category,
            "ingredients": [i if ":" in i or i.startswith("#") else ref(i) for i in ingredients],
            "result": {"id": ref(result) if ":" not in result else result, "count": count}}


def cooking(kind, ingredient, result, xp=0.2, time=200):
    return {"type": "minecraft:" + kind, "category": "misc", "cookingtime": time if kind == "smelting" else time // 2, "experience": xp,
            "ingredient": ingredient if ":" in ingredient else ref(ingredient), "result": {"id": ref(result) if ":" not in result else result}}


def recipes():
    r = {}
    for src in ("raw_galena", "galena_ore"):
        r[f"lead_ingot_from_smelting_{src}"] = cooking("smelting", src, "lead_ingot", 0.5)
        r[f"lead_ingot_from_blasting_{src}"] = cooking("blasting", src, "lead_ingot", 0.5)
    r["lead_block"] = shaped(["###", "###", "###"], {"#": "lead_ingot"}, "lead_block", category="building")
    r["lead_ingot_from_block"] = shapeless(["lead_block"], "lead_ingot", 9)
    r["lead_glass"] = shaped(["GLG", "LGL", "GLG"], {"G": "minecraft:glass", "L": "lead_ingot"}, "lead_glass", 4, "building")
    for src in ("raw_uraninite", "pitchblende_chunk", "carnotite_powder", "autunite_crystal"):
        r[f"yellowcake_from_{src}"] = cooking("smelting", src, "yellowcake", 0.7, 300)
    r["uranium_dioxide_pellet"] = cooking("blasting", "yellowcake", "uranium_dioxide_pellet", 0.5, 400)
    r["zircaloy_ingot"] = shapeless(["zircon_crystal", "zircon_crystal", "minecraft:iron_nugget", "minecraft:coal"], "zircaloy_ingot")
    r["boron_carbide"] = shapeless(["colemanite_chunk", "colemanite_chunk", "graphite_flake"], "boron_carbide")
    r["radium_salts"] = cooking("blasting", "barite_chunk", "radium_salts", 1.0, 400)
    r["monazite_concentrate"] = shapeless(["monazite_sand"] * 4, "monazite_concentrate")
    r["thorium_dioxide"] = cooking("blasting", "thorianite_crystal", "thorium_dioxide", 0.5)
    r["beryllium_ingot"] = cooking("blasting", "beryl_crystal", "beryllium_ingot", 0.5)
    r["lithium_carbonate"] = cooking("smelting", "spodumene_crystal", "lithium_carbonate", 0.5)
    r["cadmium_ingot"] = cooking("smelting", "greenockite_chunk", "cadmium_ingot", 0.5)
    r["fuel_assembly"] = shaped(["ZPZ", "PPP", "ZPZ"], {"Z": "zircaloy_ingot", "P": "uranium_dioxide_pellet"}, "fuel_assembly")
    # instruments and PPE
    r["geiger_counter"] = shaped([" GI", "CRC", "III"], {"G": "minecraft:glass_pane", "I": "minecraft:iron_ingot", "C": "minecraft:copper_ingot",
                                                       "R": "minecraft:redstone"}, "geiger_counter", category="equipment")
    r["dosimeter"] = shaped(["IGI", "CRC", "III"], {"G": "minecraft:glass_pane", "I": "minecraft:iron_nugget", "C": "minecraft:copper_ingot",
                                                    "R": "minecraft:redstone"}, "dosimeter", category="equipment")
    r["survey_meter"] = shaped(["GRC", "III", "  L"], {"G": "minecraft:glass_pane", "I": "minecraft:iron_ingot", "C": "minecraft:copper_ingot",
                                                       "R": "minecraft:redstone", "L": "lead_ingot"}, "survey_meter", category="equipment")
    r["decon_kit"] = shapeless(["minecraft:paper", "minecraft:slime_ball", "minecraft:kelp", "minecraft:paper"], "decon_kit", 4, "equipment")
    hz = {"Y": "minecraft:yellow_wool", "L": "minecraft:leather"}
    r["hazmat_hood"] = shaped(["YYY", "YGY"], {"Y": "minecraft:yellow_wool", "G": "minecraft:glass_pane"}, "hazmat_hood", category="equipment")
    r["hazmat_suit"] = shaped(["Y Y", "YLY", "YYY"], hz, "hazmat_suit", category="equipment")
    r["hazmat_trousers"] = shaped(["YLY", "Y Y", "Y Y"], hz, "hazmat_trousers", category="equipment")
    r["hazmat_boots"] = shaped(["L L", "L L"], {"L": "minecraft:black_wool"}, "hazmat_boots", category="equipment")
    r["respirator"] = shaped(["S S", "IGI", "CIC"], {"S": "minecraft:string", "I": "minecraft:iron_ingot", "G": "minecraft:glass_pane",
                                                     "C": "minecraft:charcoal"}, "respirator", category="equipment")
    r["lead_apron"] = shaped(["L L", "PLP", "PPP"], {"L": "minecraft:leather", "P": "lead_ingot"}, "lead_apron", category="equipment")
    # spare parts
    r["pump_seal_kit"] = shaped([" R ", "RIR", " R "], {"R": "minecraft:dried_kelp", "I": "minecraft:iron_ingot"}, "pump_seal_kit", 2)
    r["motor_assembly"] = shaped(["ICI", "CRC", "ICI"], {"I": "minecraft:iron_ingot", "C": "minecraft:copper_ingot", "R": "minecraft:redstone_block"}, "motor_assembly")
    r["breaker_module"] = shaped(["IRI", "CLC", "III"], {"I": "minecraft:iron_ingot", "C": "minecraft:copper_ingot", "R": "minecraft:redstone",
                                                         "L": "minecraft:lever"}, "breaker_module")
    r["diesel_service_kit"] = shapeless(["minecraft:iron_ingot", "minecraft:paper", "minecraft:honey_bottle", "minecraft:string"], "diesel_service_kit")
    r["instrument_module"] = shaped(["GQG", "RCR"], {"G": "minecraft:gold_nugget", "Q": "minecraft:quartz", "R": "minecraft:redstone",
                                                     "C": "minecraft:comparator"}, "instrument_module")
    r["valve_actuator"] = shaped([" P ", "IRI", " I "], {"P": "minecraft:piston", "I": "minecraft:iron_ingot", "R": "minecraft:redstone"}, "valve_actuator")
    r["battery_cells"] = shaped(["CLC", "CRC", "CLC"], {"C": "minecraft:copper_ingot", "L": "lead_ingot", "R": "minecraft:redstone"}, "battery_cells")
    r["transformer_kit"] = shaped(["CCC", "IRI", "CCC"], {"C": "minecraft:copper_ingot", "I": "minecraft:iron_ingot", "R": "minecraft:redstone_block"}, "transformer_kit")
    r["screen_panels"] = shaped(["BBB", "BBB"], {"B": "minecraft:iron_bars"}, "screen_panels", 2)
    r["bearing_set"] = shaped([" N ", "NIN", " N "], {"N": "minecraft:iron_nugget", "I": "minecraft:iron_ingot"}, "bearing_set", 2)
    # building and fittings
    r["reinforced_concrete"] = shaped(["CCC", "CIC", "CCC"], {"C": "minecraft:gray_concrete", "I": "minecraft:iron_ingot"}, "reinforced_concrete", 8, "building")
    r["concrete_panel"] = shaped(["CC", "CC"], {"C": "minecraft:light_gray_concrete"}, "concrete_panel", 4, "building")
    r["dark_concrete"] = shaped(["CC", "CC"], {"C": "minecraft:gray_concrete"}, "dark_concrete", 4, "building")
    r["steel_floor_plate"] = shaped(["II", "II"], {"I": "minecraft:iron_ingot"}, "steel_floor_plate", 8, "building")
    r["steel_grating"] = shaped(["BB", "BB"], {"B": "minecraft:iron_bars"}, "steel_grating", 4, "building")
    r["hazard_stripes"] = shaped(["YB", "BY"], {"Y": "minecraft:yellow_concrete", "B": "minecraft:black_concrete"}, "hazard_stripes", 4, "building")
    r["white_tile"] = shaped(["CC", "CC"], {"C": "minecraft:white_concrete"}, "white_tile", 4, "building")
    r["cable_tray"] = shaped(["I I", "III"], {"I": "minecraft:iron_nugget"}, "cable_tray", 4, "building")
    r["facility_lamp"] = shaped(["III", "GLG"], {"I": "minecraft:iron_ingot", "G": "minecraft:glass_pane", "L": "minecraft:glowstone"}, "facility_lamp", 4, "building")
    r["emergency_lamp"] = shaped(["IRI", "GLG"], {"I": "minecraft:iron_ingot", "R": "minecraft:red_dye", "G": "minecraft:glass_pane",
                                                  "L": "minecraft:glowstone"}, "emergency_lamp", 2, "building")
    r["sign_plate"] = shapeless(["minecraft:iron_ingot", "minecraft:yellow_dye", "minecraft:black_dye"], "sign_plate", 4, "building")
    r["waste_drum"] = shaped(["I I", "ILI", "III"], {"I": "minecraft:iron_ingot", "L": "lead_ingot"}, "waste_drum")
    r["decon_shower"] = shaped(["III", " B ", " I "], {"I": "minecraft:iron_ingot", "B": "minecraft:water_bucket"}, "decon_shower")
    for name, (body, _) in {"pipe_primary": (0, 0), "pipe_steam": (0, 0), "pipe_feedwater": (0, 0), "pipe_seawater": (0, 0), "pipe_service": (0, 0)}.items():
        dye = {"pipe_primary": "minecraft:red_dye", "pipe_steam": "minecraft:orange_dye", "pipe_feedwater": "minecraft:green_dye",
               "pipe_seawater": "minecraft:blue_dye", "pipe_service": "minecraft:light_gray_dye"}[name]
        r[name] = shaped(["I", "D", "I"], {"I": "minecraft:iron_ingot", "D": dye}, name, 4, "building")
    return r


def tags(block_ids):
    t = {}
    pick = [ref(b) for b in block_ids if b not in SHOVEL and b not in {"cherenkov_glow", "rubber_floor", "acoustic_ceiling", "office_carpet"}]
    t["block/mineable/pickaxe"] = pick
    t["block/mineable/shovel"] = [ref(b) for b in sorted(SHOVEL)]
    t["block/needs_iron_tool"] = [ref(b) for b in sorted(NEEDS_IRON)]
    t["block/needs_diamond_tool"] = [ref(b) for b in sorted(NEEDS_DIAMOND)]
    t["block/needs_stone_tool"] = [ref(b) for b in block_ids if b in ORE_DROPS and b not in NEEDS_IRON and b not in NEEDS_DIAMOND]
    return t


# ---------------------------------------------------------------- worldgen

def tag_rule(tag):
    return {"predicate_type": "minecraft:tag_match", "tag": tag}


def block_rule(block):
    return {"predicate_type": "minecraft:block_match", "block": block}


STONE = tag_rule("minecraft:stone_ore_replaceables")
DEEP = tag_rule("minecraft:deepslate_ore_replaceables")

ORES = [
    # name, targets [(rule, block)], size, count, rarity, (min, max), shape, air discard
    ("ore_uraninite", [(STONE, "uraninite_ore"), (DEEP, "deepslate_uraninite_ore")], 6, 3, None, (-48, 48), "trapezoid", 0.0),
    ("ore_uraninite_rich", [(STONE, "uraninite_ore"), (DEEP, "deepslate_uraninite_ore")], 9, 4, None, (20, 200), "trapezoid", 0.0),
    ("ore_pitchblende", [(DEEP, "pitchblende_ore")], 5, 2, None, (-64, -10), "uniform", 0.3),
    ("ore_thorianite", [(DEEP, "thorianite_ore"), (STONE, "thorianite_ore")], 4, 2, None, (-48, 40), "uniform", 0.0),
    ("ore_monazite_sand", [(block_rule("minecraft:sand"), "monazite_sand")], 14, 5, None, (56, 72), "uniform", 0.0),
    ("ore_monazite", [(block_rule("minecraft:granite"), "monazite_ore"), (STONE, "monazite_ore")], 6, 2, None, (-20, 80), "uniform", 0.0),
    ("ore_carnotite", [(block_rule("minecraft:sandstone"), "carnotite_ore"), (tag_rule("minecraft:terracotta"), "carnotite_ore"),
                       (STONE, "carnotite_ore")], 8, 6, None, (40, 120), "uniform", 0.0),
    ("ore_autunite", [(STONE, "autunite_ore")], 4, 3, None, (60, 200), "uniform", 0.0),
    ("ore_radiferous_barite", [(STONE, "radiferous_barite_ore")], 5, 2, None, (-16, 48), "uniform", 0.0),
    ("ore_radioactive_shale", [(STONE, "radioactive_shale")], 24, 1, None, (0, 50), "uniform", 0.0),
    ("ore_xenotime", [(STONE, "xenotime_ore")], 3, 2, None, (30, 160), "uniform", 0.0),
    ("ore_zircon", [(block_rule("minecraft:granite"), "zircon_ore"), (STONE, "zircon_ore")], 4, 3, None, (-30, 80), "uniform", 0.0),
    ("ore_beryl", [(STONE, "beryl_ore")], 3, 2, None, (60, 220), "uniform", 0.0),
    ("ore_colemanite", [(block_rule("minecraft:sandstone"), "colemanite_ore"), (tag_rule("minecraft:terracotta"), "colemanite_ore"),
                        (STONE, "colemanite_ore")], 6, 3, None, (50, 110), "uniform", 0.0),
    ("ore_spodumene", [(STONE, "spodumene_ore")], 4, 2, None, (50, 200), "uniform", 0.0),
    ("ore_greenockite", [(STONE, "greenockite_ore")], 3, 2, None, (-10, 50), "uniform", 0.0),
    ("ore_graphite", [(STONE, "graphite_ore")], 7, 3, None, (-10, 64), "uniform", 0.0),
    ("ore_galena", [(STONE, "galena_ore")], 7, 5, None, (-32, 64), "trapezoid", 0.0),
    ("ore_resonite", [(DEEP, "resonite_ore")], 3, 1, 4, (-64, -40), "uniform", 0.5),
    ("ore_voidstone", [(DEEP, "voidstone")], 2, 1, 8, (-64, -56), "uniform", 0.0),
]


def worldgen():
    out = {}
    for name, targets, size, count, rarity, (lo, hi), shape, discard in ORES:
        out[f"worldgen/feature/{name}"] = {"type": "minecraft:ore", "discard_chance_on_air_exposure": discard, "size": size,
                                           "targets": [{"state": ref(b), "target": rule} for rule, b in targets]}
        placement = []
        if rarity:
            placement.append({"type": "minecraft:rarity_filter", "chance": rarity})
        placement.append({"type": "minecraft:count", "count": count})
        placement.append({"type": "minecraft:in_square"})
        placement.append({"type": "minecraft:height_range", "height": {"type": "minecraft:" + shape, "min_inclusive": {"absolute": lo},
                                                                       "max_inclusive": {"absolute": hi}}})
        placement.append({"type": "minecraft:biome"})
        out[f"worldgen/placed_feature/{name}"] = {"feature": ref(name), "placement": placement}
    out["worldgen/structure/uranium_mine"] = {"type": ref("uranium_mine"), "biomes": f"#{NS}:has_structure/uranium_mine",
                                              "spawn_overrides": {}, "step": "surface_structures", "terrain_adaptation": "beard_thin"}
    out["worldgen/structure_set/uranium_mines"] = {"placement": {"type": "minecraft:random_spread", "salt": 238_916_331, "separation": 24,
                                                                 "spacing": 64}, "structures": [{"structure": ref("uranium_mine"), "weight": 1}]}
    out["tags/worldgen/biome/has_structure/uranium_mine"] = {"values": ["#minecraft:is_mountain", "#minecraft:is_hill", "#minecraft:is_badlands",
                                                                        "minecraft:windswept_hills", "minecraft:windswept_gravelly_hills",
                                                                        "minecraft:taiga", "minecraft:old_growth_pine_taiga"]}
    return out


def main():
    # clean generated directories so removed resources do not linger
    for d in (os.path.join(ASSETS, "textures"), os.path.join(ASSETS, "models"), os.path.join(ASSETS, "blockstates"),
              os.path.join(ASSETS, "items"), os.path.join(DATA, "loot_table"), os.path.join(DATA, "recipe"), os.path.join(DATA, "worldgen")):
        shutil.rmtree(d, ignore_errors=True)
    build_blocks()
    build_items()

    block_ids = list(block_states.keys())
    item_ids = [i for i in item_models if i not in block_states]
    for b, st in block_states.items():
        write_json(os.path.join(ASSETS, "blockstates", b + ".json"), st)
    for name, m in block_models.items():
        write_json(os.path.join(ASSETS, "models", "block", name + ".json"), m)
    for iid, m in item_models.items():
        write_json(os.path.join(ASSETS, "items", iid + ".json"), {"model": {"type": "minecraft:model", "model": m}})
    build_lang(block_ids, item_ids)

    # sounds
    snd.write(os.path.join(ASSETS, "sounds"), os.path.join(os.path.dirname(__file__), "..", "build", "tmp", "sounds"))
    sounds_json = {}
    for path in snd.SOUNDS:
        key = path.replace("/", ".")
        sounds_json[key] = {"subtitle": f"subtitles.{NS}.{key}", "sounds": [{"name": ref(path)}]}
    write_json(os.path.join(ASSETS, "sounds.json"), sounds_json)

    # icon
    tx.icon().save(os.path.join(ASSETS, "icon.png"))

    # data
    for b in block_ids:
        loot = block_loot(b)
        if loot:
            write_json(os.path.join(DATA, "loot_table", "blocks", b + ".json"), loot)
    for name, table in CHESTS.items():
        write_json(os.path.join(DATA, "loot_table", "chests", name + ".json"), table)
    for name, recipe in recipes().items():
        write_json(os.path.join(DATA, "recipe", name + ".json"), recipe)
    mc_tags = tags(block_ids)
    for path, values in mc_tags.items():
        write_json(os.path.join(ROOT, "data", "minecraft", "tags", path + ".json"), {"replace": False, "values": values})
    write_json(os.path.join(DATA, "tags", "item", "repairs_hazmat.json"), {"values": ["minecraft:leather", "minecraft:yellow_wool"]})
    write_json(os.path.join(DATA, "damage_type", "radiation_sickness.json"),
               {"exhaustion": 0.0, "message_id": f"{NS}.radiation_sickness", "scaling": "never"})
    write_json(os.path.join(ROOT, "data", "minecraft", "tags", "damage_type", "bypasses_armor.json"),
               {"replace": False, "values": [ref("radiation_sickness")]})
    for path, obj in worldgen().items():
        write_json(os.path.join(DATA, path + ".json"), obj)
    print(f"{len(block_ids)} blocks, {len(item_ids)} items, {len(block_models)} block models, {len(snd.SOUNDS)} sounds")


if __name__ == "__main__":
    main()
