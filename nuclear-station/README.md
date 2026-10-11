# Meridian Point Nuclear Station

A Fabric mod for **Minecraft Java Edition 26.3** that places one large, fully furnished
pressurised-water-reactor power station on the coast of every Overworld and runs a real,
state-driven plant simulation behind its control room.

* One canonical ~1024 x 1024 block station per world, always the same blueprint, placed on a
  coastline found by sampling the biome source (no chunk generation needed to choose it).
  The location is saved with the world; it is never duplicated.
* Built chunk-by-chunk as chunks load, deterministically and resumably (progress is a bitset
  in the world save). Chunks with significant player activity are protected and skipped.
* Containment, four natural-draught cooling towers, a 240 x 160 turbine hall, control and
  administration buildings, auxiliary and fuel buildings with a spent-fuel pool, main steam
  valve house, switchyard and main transformers, two diesel generator buildings, a seawater
  intake/pump house and discharge, emergency service water, radwaste, warehouses, workshop,
  fire station, gatehouses, rail spur, roads, service tunnels and a research wing with a
  built but inactive experimental chamber. Interiors are furnished: offices, locker rooms,
  labs, stores with loot, panels, consoles, local control stations, signage.
* A coupled plant model: six-group point kinetics with Doppler/moderator/xenon/boron
  feedback, burnup, decay heat, rods, pressurizer, four RCS loops, steam generators, turbine
  and generator, condenser and circulating water from the sea, electrical buses, diesels and
  batteries, ECCS, containment, a spent-fuel pool and a severe-accident model. Accidents
  emerge from equipment failures and operator actions; there is no scripted explosion.
* Radiation that is computed, not scripted: distance and shielding attenuation from real
  sources, cumulative dose, contamination separate from exposure, PPE, instruments,
  decontamination and waste disposal.
* Radioactive and strategic minerals placed where their geology makes sense, plus abandoned
  uranium mine structures.

## Requirements and building

| | |
|---|---|
| Minecraft | 26.3 (Java 25 runtime) |
| Loader | Fabric Loader 0.19.5 |
| Fabric API | 0.162.0+26.3 |
| Build | Gradle 9.7.1 wrapper, Fabric Loom 1.18.3, JDK 25 |

```
export JAVA_HOME=/path/to/jdk-25
./gradlew build          # compiles, runs unit + asset tests, produces build/libs/nuclear-station-<version>.jar
./gradlew runServer      # development server (accept the EULA in run/eula.txt)
./gradlew runClient      # development client
python3 tools/gen_assets.py   # regenerates every texture, model, sound and data file
```

Install the jar together with Fabric API in a 26.3 Fabric instance. The mod must be
installed on both server and client.

## Finding and using the station

* `/nps locate` (operators / cheats) prints the site centre and the control-room console
  position; `/nps tp` takes you there. Players can follow the access road and signage from the gatehouses.
* The **main control room** is on the upper floor of the control building north of the
  reactor. Use a *Main Control Console* to open the plant interface. Other consoles, panels
  and the manual trip pushbuttons are wired into the same plant.
* **Local control stations** next to plant equipment show its condition. Sneak-use to start
  or stop it locally; use while holding the right spare part to repair it.
* The control room has the **Site Guide** (every building and where it is), the **Control
  Room Guide** (every screen and button) and the **Reactor Operating Manual** on lecterns,
  with copies of all manuals in the chests marked MANUALS.
* No mobs spawn naturally anywhere in the station and its water never freezes.
* Carry a **dosimeter**; hold a **Geiger counter** or **survey meter** to hear and see dose
  rates. Wear the hazmat suit and respirator in contaminated areas, decontaminate in the
  showers or with a kit, and put radioactive items in a waste drum.

See [docs/PLAYING.md](docs/PLAYING.md) for operating the plant, [docs/CONFIG.md](docs/CONFIG.md)
for configuration, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it works,
[docs/TESTING.md](docs/TESTING.md) for automated and manual tests, [docs/TOOLCHAIN.md](docs/TOOLCHAIN.md)
for the version decisions and [docs/PROGRESS.md](docs/PROGRESS.md) for what is complete.

## Commands

| Command | Permission | Purpose |
|---|---|---|
| `/nps dose` | all | Your lifetime/acute dose and contamination |
| `/nps locate` | gamemaster | Station location |
| `/nps status` | gamemaster | Plant status (and severe-accident stages if any) |
| `/nps tp` | gamemaster | Teleport to the control room |
| `/nps generation` | gamemaster | Generation progress and performance |
| `/nps generation buildall` | gamemaster | Build every station chunk now (async) |
| `/nps meltdown` / `/nps meltdown confirm [speed]` | gamemaster | Start a real core meltdown (extended station blackout); plant time runs faster (default x60) until the vessel fails |
| `/nps meltdown force minor` / `major` / `catastrophic` | gamemaster | Jump straight to the aftermath of a meltdown of the chosen severity (minor: core damage held inside the containment; major: vessel failure; catastrophic: hydrogen explosion, containment failure, large release) |
| `/nps siren` / `/nps siren auto` / `on` / `off` | gamemaster | Site siren status; automatic (default: sound on core damage, release or containment failure), forced on, or silenced |
| `/nps timescale <1-300>` | gamemaster | Run plant time faster or back to real time |
| `/nps dev restore confirm` | gamemaster | After an accident: reset the plant, rebuild the damaged reactor area, clear ground contamination |
| `/nps dev clearmobs` | gamemaster | Remove hostile mobs already inside the station |
| `/nps dev fail <equipment>` / `repair <equipment>` / `repair all` | gamemaster | Inject or clear equipment failures (type the command alone for the list of equipment names, e.g. `edg_a`, `rcp_b`, `tdafw`) |
| `/nps dev gridloss` | gamemaster | Loss of off-site power |
| `/nps dev loca small` / `medium` / `large` / `<0..1>` | gamemaster | Break in the reactor coolant system (fraction of a large break) |
| `/nps dev recheck` | gamemaster | Compare every station chunk with the blueprint again and rebuild any with leftover terrain or trees (loaded chunks now, others as they load) |
| `/nps dev audit` | gamemaster | Check that every room of the station can be walked into; writes `config/nuclearstation-audit.txt` and floor plans |
| `/nps dev parts` | gamemaster | Give one of each spare part |
| `/nps dev resetplant confirm` | gamemaster | Reset the plant to full power steady state |
| `/nps dev cleardose` | gamemaster | Clear your dose record |
| `/nps dev regenerate confirm` | gamemaster + `allowRegenerate` | Repaint the station (disposable worlds only) |
