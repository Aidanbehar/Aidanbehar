# Architecture

Package root: `dev.aidanbehar.nuclearstation`. Common code is in `src/main`, client-only
code in `src/client` (Loom split source sets), the pure-Java simulation has no Minecraft
imports and is unit tested in `src/test`.

```
sim/          plant simulation (pure Java, deterministic, serialisable)
plant/        binds the simulation to the world: service tick, persistence, world effects, maintenance
facility/     site selection, blueprint painting, generation manager, markers
facility/layout/  the blueprint: one class per area of the station
radiation/    dose, shielding, contamination, player records, item activity
geology/      ore placement registration and the uranium mine structure
network/      payloads and server networking
command/      /nps
block/, item/, registry/, config/, experimental/
client/       control room screen, experimental console, instrument HUD, soundscape and effects
```

## 1. Facility generation

**Site selection** (`SiteFinder`). On first server start the Overworld's biome source is
sampled (`createUncachedResolver(randomState)`), so no chunks are generated to choose the
site. Candidates on expanding rings are scored: the station's 1024 x 1024 footprint must
have land to the north and ocean along its southern edge (intake and discharge), terrain
must be reasonably flat (noise-router height estimate), and the footprint must not overlap
a village (`hasStructureChunkInRange`) or existing, already generated chunks with player
activity. If nothing passes, requirements are relaxed in stages: first flatness, then land
coverage, then village avoidance; only the last stage stops checking for existing chunks
(paint-time protection of inhabited chunks still applies). The result (origin,
grade height, sea level, how it was chosen) is stored in `FacilityData`, a `SavedData` in
the Overworld. Because the search is deterministic for a seed, the same seed always yields
the same site, and once stored it is never searched again; there is exactly one station.

**Blueprint** (`facility/layout`). `Blueprint` holds ~70 `Component`s (buildings, tanks,
roads, tunnels, towers...). Each component has a bounding box and a `paint(Painter)` method
written in station-local coordinates. `Painter` clips every primitive (fill, walls, room,
cylinder, hyperboloid, dome, stairs, doors...) to a target region, so painting one 16 x 16
column only executes the parts that intersect it. Components are painted in a fixed order
(groundworks, buildings, interiors, tunnels last), so the result of painting a chunk is a
pure function of (blueprint, origin, grade, sea level, chunk) and chunks can be painted in
any order, at any time, and repainted idempotently.

**Generation manager** (`FacilityManager`). When a chunk inside the footprint loads it is
queued; a per-tick time budget (`generationBudgetMs`, default 20 ms) drains the queue.
`LevelSink` writes blocks into the loaded chunk with client updates but without neighbour
updates, drops, shape cascades or `onPlace` callbacks, so placed water does not flow and
nothing spills into ungenerated neighbours. The built set is a 4096-bit bitset in
`FacilityData`; generation is therefore resumable across restarts and crashes. A chunk
whose inhabited time exceeds `protectInhabitedChunksTicks` is skipped and recorded as
protected, so player builds are not overwritten. `/nps generation buildall` loads
footprint chunks through an asynchronous ticket window rather than synchronously.

**Markers**. The same blueprint can be run in *marker mode* without writing blocks to
collect the positions of lamps, panels, consoles, local stations, trip buttons and
features. They are indexed once at start-up (~40 ms, ~7,500 markers) and used to wire
consoles and stations to the simulation and to drive lighting/panel state.

## 2. Plant simulation (`sim/`)

`PlantModel` advances the plant in fixed sub-steps from `PlantService` every
`updateIntervalTicks`. Units are SI-ish (MW, MJ, degC, MPa, kg/s).

* **Neutronics** – `PointKinetics`: six delayed-neutron groups, implicit integration.
  Reactivity = rods (four control banks with overlap + shutdown banks, integral worth
  curve) + boron + Doppler (fuel temperature) + moderator temperature/void (MTC that
  depends on boron) + xenon/iodine + excess fuel reactivity that falls with burnup.
* **Heat** – fuel and clad lumped temperatures, DNBR estimate, decay heat (sum of
  exponentials, tracks operating history).
* **Primary** – four RCP loops with coast-down, natural circulation, pressurizer (heaters,
  spray, PORVs with block valves, code safeties), charging/letdown, seal leakage that grows
  when seal cooling is lost, breaks, inventory and core uncovery, saturated/two-phase
  behaviour, reflux condensation.
* **Secondary** – steam generators (level, pressure from saturation), main and auxiliary
  feedwater (motor and turbine driven), condensate storage, steam dumps, atmospheric
  relief, MSIVs, turbine governor, generator and grid, load rejection and turbine trip.
* **Heat sink** – condenser pressure from circulating-water flow and sea temperature,
  intake screen fouling, cooling towers as supplementary heat rejection.
* **Electrical** – grid, off-site breaker, generator breaker, two 6.9 kV and two 4.16 kV
  safety buses, two DC buses with batteries, two diesels with start sequence and fuel.
  Each pump is on a bus; a dead bus stops its loads.
* **Protection** – four sensor channels per parameter with faults and power dependence,
  2-of-4 voting, reactor trip, ESFAS (SI, AFW, containment spray, MSIV and feed
  isolation), permissives (P-7/8/9/11/14), interlocks on operator commands.
* **Containment and severe accidents** – containment pressure/temperature, fan coolers,
  sprays, hydrogen from zirconium oxidation, igniters, burns, integrity; core damage and
  melt with latent heat, vessel failure, core-concrete interaction, filtered vent, source
  term and release fraction.
* **Spent fuel pool** – heat load, cooling pumps, makeup, boil-off.
* **Equipment** – every pump, diesel and transformer has condition that wears with
  running hours and stress; failure hazard rises with wear and with the accident-difficulty
  setting. Repairs need the right spare part at its local station.
* **Alarms** – ~50 annunciators with priorities, 1 s on / 4 s off debounce, standard
  NEW / ACKNOWLEDGED / RINGBACK sequence, and a 120-entry event log.

Slow processes (xenon, decay heat tail, burnup, wear, battery drain, pool heat-up) are
accelerated by `slowTimeFactor` so they are observable in play; fast dynamics are not.

Everything is deterministic and serialised through `StateIO` into the plant `SavedData`
(`PlantData`); `PlantSnapshot` is the compact, instrument-filtered view sent to clients.

## 3. World binding (`plant/`)

* `PlantService` runs the model, supplies the environment (sea temperature from the biome
  temperature plus a daily cycle, cooling-tower wet-bulb temperature), validates operator commands (the player must be within
  reach of a wired console; commands pass through `PlantOperations` interlocks) and
  reports results.
* `PlantWorldEffects` turns state into the world: AC lighting goes dark in a station
  blackout while emergency lights stay lit, panels and annunciators show caution/alarm,
  beacons rotate in emergencies, events play sounds. Severe accidents record damage stages
  (hydrogen burn, containment breach, vessel failure, melt-through, pool boil-down) that
  are applied deterministically to chunks as they load: corium, debris, a ragged dome
  opening, lowered pool water. Releases deposit contamination on the ground downwind.
* `Maintenance` handles local stations: status, local start/stop and repairs.

## 4. Radiation (`radiation/`)

* **Sources** are blocks implementing `RadiationSource` (ores, fuel, corium, debris, drums),
  radioactive items in inventories (`ItemRadioactivity`), the plant zones (containment dose
  rate from the model, the spent-fuel building, airborne activity around a breached
  containment) and ground contamination
  (`ContaminationData`, 4 x 4-block cells per chunk with short- and long-lived components).
* **No world scans**: a lazily built per-section index records which sections may contain
  sources (using palette checks); dose from blocks is computed only from indexed sections
  within 40 blocks, with inverse-square falloff and ray-marched attenuation through blocks
  (lead, concrete, water, steel coefficients), cached per source/target pair.
* **Players** (`PlayerRadiation`, a persistent data attachment): lifetime dose (permanent),
  acute dose (recovers biologically), skin contamination (decays and spreads to items).
  PPE reduces contamination pickup and inhalation; lead apron gives a modest gamma
  reduction. Acute dose drives sickness effects and, at extreme doses, the
  `radiation_sickness` damage type. Updates run every 10 ticks per player.
* **Decontamination**: showers and kits remove skin contamination; kits clean contaminated
  items; items that are themselves radioactive must go in a waste drum (shielded storage).

## 5. Networking and client

Payloads (`network/Payloads`): snapshots only to players with the control room open and
still at a console; a compact status once a second to players within ~1.5 km for ambience
and visual effects; personal radiation readings every half second; commands and results.
The client (`client/`) draws the control room entirely from the snapshot, plays the
instrument clicks/alarms, the machine soundscape (turbine pitch follows rpm, diesels only
when running, horns when alarms are active, site siren on release) and particle effects
(tower plumes in proportion to heat rejected, relief valve steam, outfall, release plume).

## 6. Extension points

* `experimental/ExperimentalChamber` – the research wing chamber is built and wired to its
  console through this interface; `InactiveChamber` is the shipped implementation (reports
  "offline", does nothing). A future system registers a different implementation in
  `ExperimentalSystems` behind the `experimental.enableExperimentalChamber` option.
* Reserved materials (xenotime, beryl, spodumene, greenockite, thorium dioxide,
  beryllium, lithium carbonate, cadmium, resonite, voidstone) are generated, obtainable and
  marked *Reserved for future research* in their tooltips. They have no gameplay use yet.
