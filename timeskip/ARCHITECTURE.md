# Time Skip — Architecture

Target: **Minecraft Java 26.3**, **Fabric** (Loader 0.19.5, Loom 1.18.2 non-remapping plugin,
Fabric API 0.162.0+26.3 modules bundled jar-in-jar), **Java 25**, Mojang's own (unobfuscated)
names, no mappings.

## 1. Toolchain decision

| Loader   | 26.3 status (checked 2026-10-07)                                  |
|----------|-------------------------------------------------------------------|
| Fabric   | Stable. Loader 0.19.5, Fabric API `0.162.0+26.3`, Loom 1.18.2      |
| NeoForge | `26.3.0.x-beta` only (ModDevGradle 2.0.148)                        |
| Quilt    | Runs Fabric mods; no reason to target separately                  |

Since 26.1 Mojang ships the game **unobfuscated**. Fabric stopped publishing Yarn/intermediary
for these versions (`intermediary 0.0.0` is a placeholder), and Loom's `net.fabricmc.fabric-loom`
plugin (vs. `fabric-loom-remap` for ≤1.21.11) compiles straight against Mojang names with no
remapping step. 26.3's `version.json` requires Java 25.

## 2. Packaging

* One jar. Fabric API modules we use (`fabric-api-base`, `fabric-command-api-v2`,
  `fabric-lifecycle-events-v1`) are bundled with Loom `include` (jar-in-jar). If the player also
  has Fabric API installed, Loader picks the newest copy of each module — no conflict.
* No registry entries. Built-in registries are already frozen when mods initialise, so the chunk
  ticket that keeps chunks loaded during a skip is a private, unregistered `TicketType` instance;
  vanilla compares ticket types by identity and only saves `persist` tickets, so it can neither
  collide with a vanilla ticket nor end up on disk.
* `environment: "*"`. All logic is server-side; vanilla clients can join a server running it.
  No client classes are referenced, no custom packets, every message is a literal `Component`
  (no translation keys a vanilla client wouldn't have).
* Config: `config/timeskip.properties`, generated with comments on first run, missing keys
  are re-added on load, `/timeskip reload` re-reads it.

## 3. Package layout (`dev.timeskip`)

```
TimeSkipMod                  entrypoint: config, command, tick + lifecycle hooks
config/                      TimeSkipConfig (values + defaults), ConfigIO (commented .properties)
command/                     TimeSkipCommand (Brigadier), SkipUnit
core/                        SkipManager (one session per server), SkipSession (phase state
                             machine), SkipPlan, SkipStats (summary counters), ProgressBar
scheduler/                   TickBudget, WorkerPool, OrderedResults (deterministic apply order)
math/                        Rng (SplitMix64 + per-block seed derivation), Binomial (inversion +
                             BTPE), Geometric, RandomTickMath (successes, stage chains,
                             saturation), DaylightModel, WeatherMath (renewal process)
sim/block/                   ChunkSnapshot, ChunkPlanner (worker), ChunkPlan, BlockHandler,
                             BlockHandlers (registry), PlanContext, handlers/*
sim/blockentity/             BlockEntitySimulator, FurnaceSim, BrewingStandSim, CampfireSim,
                             ComposterSim, HopperSim
sim/entity/                  EntitySimulator
sim/world/                   WorldStateSimulator (clocks, game time, weather, trader, raids)
tier1/                       RealTickRunner
mixin/                       player damage guard + @Accessor/@Invoker interfaces
```

## 4. Skip lifecycle

```
/timeskip 5000 years ─► validate ─► (≥ confirm threshold?) ─► /timeskip confirm ─► start
                                                                                     │
         ┌───────────────────────── ticks ≤ real_tick_max_ticks ─────────────────────┤
         ▼                                                                           ▼
 TIER 1: RealTickRunner                                  TIER 2: analytical (world frozen)
 extra clock+level ticks inside the                      COLLECT  loaded chunks (+radius, async)
 per-tick budget until N ticks ran                       PLAN     snapshot on main ─► workers plan
                                                         APPLY    ordered, budgeted, verified
                                                         BLOCK_ENTITIES  hopper/furnace passes
                                                         ENTITIES aging, despawn, restock
                                                         WORLD    clocks, time, weather, timers
         └────────────────────────────────┬──────────────────────────────────────────┘
                                          ▼
                         RESEND changed chunks ─► SAVE ─► unfreeze ─► summary
```

Everything runs from `END_SERVER_TICK` inside a `TickBudget` (default 30 ms). Each phase is a
resumable step function; it does as much as the budget allows and returns.

* **Freezing (tier 2):** vanilla's own `/tick freeze` mechanism (`ServerTickRateManager`).
  Mobs, block ticks, random ticks and time stop; players still move, chat and run commands. The
  previous frozen state is restored afterwards. A mixin cancels player damage while a skip runs
  (`protect_players`). Snapshots stay valid because nothing else changes the world while frozen;
  the apply phase still re-checks every block in case a player edited it.
* **Cancel:** stops at a chunk boundary. A chunk is either fully aged or untouched, the clock is
  only moved once the skip completes, the freeze is lifted, the boss bar is removed.
  On server stop the session is cancelled the same way.

## 5. Tier 1 — real ticking (default ≤ 72,000 ticks = 3 days)

Per server tick, while the budget lasts: `clockManager.tick()` then `level.tick(() -> false)` for
every level (this runs scheduled ticks, random ticks, entities, block entities, redstone,
weather, scheduled functions — the real game). This is the only tier where redstone, mob farms
and contraptions behave correctly. Speed ≈ budget ÷ (cost of one world tick), and a world tick
is only started when the remaining budget covers its moving-average cost. Measured: 48,000 ticks
in 3.2 s on a small world, but only ~14 ticks per server tick (1 day in 86 s) with 529 busy
chunks. To keep the "seconds to a minute or two" promise, tier 1 is chosen only if
`ticks × averageServerTickTime / budget × 50 ms ≤ real_tick_max_seconds` (default 90); otherwise
the skip is calculated and the start message says why.

## 6. Tier 2 — analytical fast-forward

### 6.1 Random-tick math
Vanilla picks `randomTickSpeed` random positions per 16³ section per tick, so one block gets
`K ~ Binomial(N·speed, 1/4096)` random ticks over `N` ticks. A behaviour that succeeds with
probability `q` per random tick therefore succeeds `S ~ Binomial(N·speed, q/4096)` times
(Bernoulli thinning — exact, not an approximation). Multi-stage behaviours with stage-dependent
`q_i` use a **stage chain**: draw the number of trials until each success from `Geometric(q_i/4096)`
and subtract from the trial budget — exact for any `N`, `O(stages)` cost. Saturation is automatic
(the chain ends at the max stage) and an explicit shortcut skips sampling when
`mean − 12σ ≥ needed`. Binomial sampling: inversion for small means, BTPE for large (same
algorithms numpy uses), all driven by a deterministic per-block RNG
`seed = mix(worldSeed, skipSerial, dimension, blockPos, salt)` so results do not depend on thread
scheduling.

### 6.2 Snapshot → plan → apply
* **COLLECT** takes every *ticking* chunk (`ChunkMap.forEachReadyToSendChunk`): the area the
  game simulates around players plus force-loaded chunks — exactly the chunks vanilla would have
  advanced. Each gets a ticket so it cannot unload mid-skip.
* **Main thread** copies each chunk's section `PalettedContainer`s and sky/block `DataLayer`s
  (`copy()` — array copies, microseconds). The snapshot implements vanilla's `BlockGetter`, so
  pure vanilla helpers such as `CropBlock.getGrowthSpeed` run on it from worker threads.
* **Workers** scan the copies for `isRandomlyTicking()` states and run the matching handler
  against the snapshot, producing a `ChunkPlan`: plain `(pos, expectedOld, new)` block changes
  plus a few *main-thread actions* (grow a tree, place a stem's fruit, hatch eggs, replay vanilla
  random ticks).
* **Main thread** applies plans in submission order (deterministic), verifying `expectedOld`.
  Flags: `UPDATE_KNOWN_SHAPE | UPDATE_SUPPRESS_DROPS` — no neighbour updates and no per-block
  client packets. Lighting/heightmaps update through the normal (already batched) light engine.
  Structural actions (trees, column growth, buds) use vanilla's normal flags so shapes connect.
* The pipeline keeps up to `max(32, 16 × threads)` chunks in flight and, when the next plan is
  not ready, waits for it inside the tick budget instead of ending the tick (otherwise the tick
  cadence, not the maths, becomes the bottleneck).
* **Edge rule:** actions that reach outside their own block (vanilla ticks, trees, neighbour
  updates, precipitation) only run if the surrounding 3×3 chunks are loaded, so a skip never
  forces a synchronous chunk load at the border of the loaded area. Plain state replacements
  always run.
* Changed chunks are re-sent once at the end as full chunk packets, each as soon as
  `ThreadedLevelLightEngine.waitForPendingTasks` reports its lighting final.

### 6.3 Handlers (vanilla behaviour → model)
Handlers only claim a block if its class still uses the vanilla `randomTick` they model (checked
reflectively once per class — names are unobfuscated at runtime), so a modded subclass with
custom behaviour falls through to the generic fallback.

| Block(s) | Model |
|---|---|
| `CropBlock` (+ beetroot ⅔, torchflower), `PitcherCropBlock` | light ≥ 9; `q = 1/(⌊25/speed⌋+1)` from vanilla `getGrowthSpeed` on the snapshot; stage chain to `getMaxAge()` |
| `StemBlock` | stage chain to age 7, then fruit placement on a valid side (main thread, vanilla rules) |
| Sweet berries ⅕, cocoa ⅕, nether wart ⅒, mangrove propagule (hanging age) | stage chains |
| `SaplingBlock` / propagule | `q = 1/7 ×` daylight fraction (from the 26.3 overworld timeline) unless block-light ≥ 9; 2 stages, then vanilla `TreeGrower.growTree` on the main thread (respects space/light, 2×2 trees); a few retries for long skips |
| Sugar cane, cactus (+ cactus flower) | exact per-tick state machine of the top block, `K` capped at the absorbing state |
| Kelp, twisting/weeping/cave vines (`GrowingPlantHeadBlock`) | successes `~ Binomial(·, growPerTickProbability)`, capped by `25 − age` and free space; columns built on main thread with vanilla `getGrowIntoState` (cave-vine berries included) |
| Bamboo, chorus, vines, mushrooms, dripstone (growth, cauldron fill, mud→clay), unknown/modded random tickers | **vanilla replay**: call the block's own `randomTick` `min(K, cap)` times on the main thread (bamboo follows the growing top) |
| Budding amethyst | per face: stage chain with `q = 1/30`, only into air/water |
| `ChangeOverTimeBlock` (all copper incl. bulbs, doors, chests, golem statues, lanterns…) | event-driven cluster simulation using the exact vanilla formula (younger-neighbour abort, `((older+1)/(older+same+1))² × modifier`) with incremental neighbour counts; saturates to the final `getNext` state; waxed blocks never tick |
| Leaves | `decaying()` + `K ≥ 1` → removed |
| Grass / mycelium (`SpreadingSnowyBlock`), nylium | die if they can't stay alive; spread by multi-source BFS over spread-eligible base blocks, hop times sampled from the vanilla 4-tries-in-3×5×3 rate |
| Farmland | near water → moisture 7; otherwise dries; reverts to dirt only with nothing on top |
| Ice / snow layer | melt where block light exceeds vanilla thresholds |
| Precipitation (not a block tick) | per column `speed/12288` visits per tick (`nextInt(48)` × `speed` tries per chunk). Freezing (any weather): breadth-first from the shore — a block `d` from the edge needs `d` visits — with vanilla `shouldFreeze`. While raining: snow layers up to `maxSnowAccumulationHeight` (`shouldSnow`) and vanilla `handlePrecipitation` for cauldrons |
| Turtle eggs | hatch rate from night/day probabilities; spawn babies (grown if time allows) |
| Redstone ore, eyeblossoms | lit → unlit; open/closed to match the final time of day |
| Scheduled-tick blocks | fire burns out (except on infiniburn), sniffer eggs hatch, frogspawn hatches |

### 6.4 Block entities (main thread, after blocks)
* **Furnace / smoker / blast furnace** — macro-stepped *vanilla* `serverTick`: timers are
  advanced in one jump to the tick before the next event (item done / fuel out), then vanilla runs
  that tick, so fuel remainders, `COOKING_FUEL` speed multipliers, the wet-sponge bucket and
  recipe XP all come from the game. ~one call per item.
* **Brewing stand** — same macro-step over 400-tick brews with blaze-powder refuelling.
* **Campfire** — each slot finishes; drops older than 6000 ticks are counted as despawned.
* **Composter** — level 7 → 8.
* **Hoppers** — a few alternating passes of `hopper → furnace → hopper` using vanilla
  `HopperBlockEntity.addItem` (respects sided inventories), throughput-limited to 1 item / 8
  ticks, locked hoppers skipped. Best effort: no redstone.

### 6.5 Entities
Babies age (`AgeableMob.setAge`), love/breeding cooldowns reset; item entities and XP orbs
despawn past 6000 ticks (infinite-lifetime items kept), stuck arrows despawn; villagers with a
workstation `restock()` and gossips decay; zombie villagers mid-cure finish (timer set so vanilla
completes it); tadpoles become frogs. Mob equilibrium (`mob_equilibrium`): `despawn` (default)
removes every mob vanilla would be allowed to despawn and lets the normal spawner refill caps
after unfreezing; persistent / named / tamed / leashed / riding mobs always stay. `keep` leaves
them.

### 6.6 World state
Every clock advances `⌊N × rate⌋` unless paused or `advance_time` is off (`setTotalTicks`, long-safe),
game time `+N`, so day count and moon phase follow. Weather: exact replay of vanilla's
rain/thunder/clear timers (jumping event to event) for skips up to 2×10¹⁰ ticks, otherwise a draw from the process's
stationary distribution (phase ∝ mean duration, residual from the length-biased law) — the
correct "where it would end" distribution. Wandering-trader delay/chance advance, finished raids
stop, chunks near players gain inhabited time. Pending scheduled ticks become due and run
normally after the skip.

## 7. Lag control summary
Budgeted main-thread work in every phase; planning on `worker_threads` daemon threads using
copies only; per-block packets suppressed, full-chunk resends spread across ticks; light work
batched by the vanilla engine; radius chunks loaded asynchronously with a custom ticket and
released afterwards.

## 8. Measured performance (4-core container, dedicated server)

| Test | Result |
|---|---|
| 100 million years, 25 chunks (test plot) | 0.3 s |
| 100 million years / 50 years, 529 chunks of normal terrain | 1.1 s cold JIT, 0.6 s warm |
| Main-thread time during the 529-chunk skip | avg 22–28 ms per tick (budget 30 ms), worst ≈ 37 ms (the final world save, given its own tick) |
| Worker planning | 0.5–1.2 ms per chunk |
| Tier 1, 2 days (48,000 real ticks), small world | 3.2 s |

## 9. Tests
Pure-Java JUnit 5 (no Minecraft bootstrap):
binomial vs exact pmf (chi-square), stage chain vs brute-force per-tick simulation of a crop
(stage distribution after N ticks), saturation shortcut, weather stationary distribution vs
brute force, daylight fraction, deterministic seeding, unit conversion/validation.
Plus an end-to-end smoke test on a dedicated server (scripted console commands).

## 10. Known limitations (documented)
Only ticking chunks (+ optional radius) age; unloaded chunks stay as they were, just like in
vanilla. Results are reproducible except where vanilla code we call draws from the level's own
shared random source (e.g. cauldron fill chance). Tier 2 does not run redstone, mob farms or fluid flow. Mob spawning is an equilibrium,
not a simulation. Grass-spread seams can appear at chunk borders for short skips.
