# Progress checklist

Status key: **done** = implemented and verified (unit test, server run or both);
**done (unverified in client)** = implemented and compiles, but not yet seen in a rendered
client; **partial**; **not implemented**.

## Platform
| Item | Status |
|---|---|
| Minecraft 26.3, Fabric, Java 25 build, jar artifact | done |
| Dedicated server start with all data packs valid | done |
| Client start | compiles; could not be rendered in the build container (no GPU / GLX visual) - needs a manual run |

## Facility
| Item | Status |
|---|---|
| One canonical station per Overworld, persisted, never duplicated | done (restart reloads, no second search) |
| Deterministic, seed-only site search; coastal; village/existing-chunk avoidance; staged relaxation | done |
| Chunk-by-chunk, resumable, idempotent painting under a tick budget | done (4096/4096 chunks, 7-10 ms/chunk) |
| Protection of inhabited chunks | done (unit of protection: chunk) |
| Each painted chunk carries its own mark; chunks recorded as built but missing their blocks are rebuilt on load (fixes holes after a crash) | done |
| Content upgrades for existing worlds (revision 2: stairwells and control building rebuilt once) | done (server-tested: 141 chunks) |
| No natural mob spawns (including patrols, phantoms, sieges) and no freezing in the station; existing ice melts | done (mixins load; natural spawning needs a player to observe) |
| Every station chunk rebuilt once on load in 0.3.0 (removes terrain and trees left inside buildings) | done (server-tested: 3926 chunks, 0.7 ms average) |
| Access audit: every room reachable on foot (stair landings, doors, walkways) | done (`/nps dev audit`; remaining flagged pockets are machine and tank tops) |
| Terrain clearing reads the real column height (not the stored heightmap); chunk check compares final blocks only; revision 4 re-checks every chunk once; `/nps dev recheck` | done |
| Hostile mobs kept out of the whole footprint (spawning blocked, intruders removed) | done |
| Emergency siren network (20 masts, auto/on/off) | done |
| Meltdown damage scaled by severity; `/nps meltdown force` | done |
| Station manuals: site guide, control room guide, operating manual on lecterns and in chests | done |
| Dev options: near spawn, fixed origin, locate, buildall, regenerate, disable | done |
| Exterior: containment, 4 towers, turbine hall, control/admin, aux, fuel, MSIV house, tanks, water treatment, radwaste, switchyard, GSUs, diesels, CW pump house, ESW, intake/discharge, sea wall, roads, parking, rail spur, warehouses, workshop, fire station, gatehouses, met mast, water tower, fences, tunnels, research wing | done (unverified in client) |
| Furnished interiors (control room, offices, locker rooms, labs, workshop, stores, machinery, panels, consoles, signage, lighting, loot) | done (unverified in client) |
| Visual review of every building in a client | not done - see TESTING.md manual procedure 1-2 |

## Simulation
| Item | Status |
|---|---|
| Point kinetics (6 groups), Doppler/MTC/void/xenon/boron feedback, burnup, decay heat, rods | done (tests) |
| Primary, pressurizer, secondary, turbine/generator/grid, condenser and CW from the sea, towers | done (tests) |
| Electrical buses, EDGs, batteries, load shedding by bus | done (tests, server) |
| Protection, ESFAS, interlocks, permissives | done (tests, server) |
| Alarms (debounce, ack/silence/reset, ringback) and event log | done |
| Wear, failures, repair with spare parts at local stations | done (server command paths); in-world repair unverified in client |
| Accidents emerging from state (LOOP, SBO, LOCA, loss of feed, seal LOCA, H2, melt, vessel failure, MCCI, release) | done (tests) - no bomb-style explosion |
| Persistent physical damage in the world | done (unverified in client) |
| Spent fuel pool heat-up/boil-off | done |
| Meltdown on demand (`/nps meltdown`), accelerated plant time, restore after an accident | done (server-tested: vessel failure, corium in cavity, restore rebuilds it) |
| Refuelling outage / reloading fuel at end of cycle | **not implemented** - burnup accumulates; reactivity runs out after a long cycle (`/nps dev resetplant` restores) |

## Interface
| Item | Status |
|---|---|
| Control room screen with 8 tabs, live values, clickable controls, interlock feedback | done (unverified in client) |
| Experimental console screen | done (unverified in client) |
| Instrument HUD, Geiger clicks, dosimeter alarm | done (unverified in client) |
| Soundscape (turbine, pumps, transformers, HVAC, diesels, towers, horns, siren) and particle effects | done (unverified in client) |
| Lighting / panels / beacons following plant state in the world | done (server) |

## Radiation
| Item | Status |
|---|---|
| Distance and shielding, cumulative dose, acute dose recovery, sickness | done |
| Contamination separate from exposure, ground deposition, item contamination | done |
| PPE, instruments, decontamination, waste drums | done (unverified in client) |
| No full-world scans (lazy section index, 40-block range, cached rays) | done |
| Persistent plant radiation fields (reactor cavity, SG compartments, containment, aux basement, steam lines, radwaste) | done |
| Graded acute radiation syndrome and burns at very high dose rates | done |

## Geology
| Item | Status |
|---|---|
| 20 ore placements with geological placement rules | done (data validated at load) |
| Abandoned uranium mine structures | done (generates without errors; 0.1.0 crashed on mine signs during world generation - fixed) |
| Reserved future materials, marked in tooltips | done |

## Content and assets
| Item | Status |
|---|---|
| Textures for all blocks/items/armour (procedural, generated by `tools/gen_assets.py`) | done - functional "programmer art" quality, worth an artist pass |
| 16 synthesised sounds | done |
| Recipes for instruments, PPE, spare parts, materials and building blocks | done; large plant machinery is creative-only by design |
| Workers / NPCs in the station | not implemented |
| Working trains on the rail spur | not implemented (track and buffer stops only) |
| Active experimental chamber | intentionally inactive; extension point provided |

## Multiplayer
| Item | Status |
|---|---|
| Server-authoritative simulation, per-viewer snapshots, range-limited status | done |
| Multiple simultaneous operators | designed for it; needs a two-client manual test |
