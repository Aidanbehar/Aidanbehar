# Time Skip

**Skip anywhere from one day to 100 million years in Minecraft Java 26.3.**
Crops ripen, saplings become trees, copper turns green, furnaces finish their smelting,
baby animals grow up, dropped items vanish, snow piles up, lakes freeze, and the sun, moon and
weather end up exactly where they would have. A 100-million-year skip takes about a second.

Works in singleplayer and on servers. Players joining a server do **not** need the mod.

---

## Install it in 3 steps

1. **Install Fabric.** Go to <https://fabricmc.net/use/installer/>, download the installer,
   open it, pick Minecraft **26.3** and click *Install*. (On a server, choose the *Server* tab
   instead.)
2. **Add the mod.** Put `timeskip-1.1.0.jar` into your `mods` folder. In the Minecraft launcher, open
   *Installations*, hover over *fabric-loader-26.3*, click the folder icon, and open `mods`
   (create it if it isn't there). On a server it is the `mods` folder next to the server jar.
3. **Play.** Start Minecraft with the *fabric-loader-26.3* profile, open a world with cheats on
   (or be an operator on the server), and type:

   ```
   /timeskip 10 years
   ```

That's it. Nothing else to download: the few Fabric API parts the mod uses are built into the jar.
You need Java 25, which the Minecraft launcher already provides for 26.3.

> **Tip:** before a really big skip, make a copy of your world folder. Skips can't be undone.

---

## Commands

You need cheats enabled (singleplayer) or operator level 2 (servers).

| Command | What it does |
|---|---|
| `/timeskip <amount> ticks` | Skip a number of game ticks (24000 ticks = 1 day) |
| `/timeskip <amount> days` | Skip Minecraft days |
| `/timeskip <amount> years` | Skip years (1 year = 365 Minecraft days) |
| `/timeskip <amount> thousand_years` | Skip thousands of years |
| `/timeskip <amount> million_years` | Skip millions of years (up to 100) |
| `/timeskip status` | Show how far along the current skip is |
| `/timeskip cancel` | Stop the current skip safely |
| `/timeskip confirm` | Go ahead with a big skip (1,000 years or more asks first) |
| `/timeskip reload` | Re-read the config file |

Decimals work too: `/timeskip 1.5 days`, `/timeskip 2.5 million_years`.
A progress bar appears at the top of the screen, and a chat message lists what changed.

---

## How it works (the short version)

**Short skips (up to 3 days)** actually run the game forward, many ticks per real tick, while
keeping each tick within a time limit so the game stays smooth. This is the only mode in which
**redstone, mob farms and other contraptions** work exactly as in normal play. How fast this goes
depends on how busy your world is: a small world runs a day in a few seconds, a big busy one is
slower. If running it for real would take longer than about 90 seconds, the skip is calculated
instead (see `real_tick_max_seconds`), and the chat message tells you so.

**Longer skips** are *calculated*. The game is briefly frozen (players can still move and chat,
mobs and machines pause). The mod then works out the final state of every loaded chunk directly
from Minecraft's own rules and probabilities, instead of running billions of ticks:

* **Plants:** wheat, carrots, potatoes, beetroot, torchflowers, pitcher plants, melon and pumpkin
  stems (which then grow fruit), sweet berries, cocoa, nether wart, sugar cane, cactus (including
  cactus flowers), bamboo, kelp, twisting, weeping and cave vines (with glow berries), vines,
  chorus, mushrooms.
* **Trees:** saplings grow into real trees with Minecraft's own tree generator, so they need room
  and light, and 2×2 saplings make big trees.
* **Blocks:** copper and all copper variants weather until fully oxidized (waxed copper doesn't
  change). Amethyst buds grow into clusters. Leaves cut off from logs decay. Grass and mycelium
  spread, and die when covered. Nylium dies when covered. Farmland dries out or stays wet near
  water. Dripstone grows and drips into cauldrons. Fire burns out. Lit redstone ore goes dark.
  Eyeblossoms open or close. Turtle eggs, sniffer eggs and frogspawn hatch. Dried ghasts hydrate.
* **Weather on blocks:** water freezes in cold biomes (from the shore inward), snow piles up while
  it rains, cauldrons fill with rain or powder snow, and ice and snow melt next to bright light.
* **Machines:** furnaces, smokers and blast furnaces smelt exactly what their fuel and input
  allow, and keep the XP for you. Brewing stands brew, campfires finish cooking, composters
  finish, and hoppers move items along simple chains (for example a chest → hopper → furnace →
  hopper → chest auto-smelter).
* **Endermen:** endermen pick up grass, dirt, sand, gravel, flowers, mushrooms, pumpkins, melons
  and the other blocks they can hold, and put them down again, at the rate they would have in
  normal play. Like in vanilla this only happens where monsters spawn near players (dark spots
  24-128 blocks away: caves, open ground at night, the Nether and the End), and not at all if the
  `mob_griefing` or `spawn_mobs` game rule is off or the game is on peaceful. Most endermen put a
  block down close to where they took it; some teleport into the shade first. Very long skips don't
  scramble the landscape: the share of moved blocks levels off (see
  `enderman_max_disturbed_percent`), also across many skips in a row. An enderman that was holding
  a block when the skip started puts it down before it despawns, so no block disappears with it.
* **Creatures and items:** babies grow up, breeding cooldowns reset, tadpoles become frogs,
  zombie villagers being cured finish curing, villagers with a job site restock, and dropped items,
  XP orbs and stuck arrows despawn. Mobs that would normally despawn are removed so the world
  refills naturally. Named, tamed, leashed and persistent mobs always stay.
* **The world:** the day/night clock, day count, moon phase, game time, rain and thunder,
  wandering-trader timers and raids all end where they would have.

Results are repeatable: the same world and the same skip give the same outcome. (A few small
details that Minecraft's own code randomizes from the world's shared random generator, such as
exactly how full a cauldron gets, can differ.)

### Good to know

* Only **loaded chunks age**: the area around players and any force-loaded chunks. That matches
  vanilla, where unloaded chunks never change. You can set `extra_chunk_radius` in the config to
  age a ring of extra chunks around each player.
* Calculated skips **don't run redstone, mob farms, flowing water or lava**, and mobs are handled
  as "the world refills normally afterwards" rather than simulated one by one (only what endermen
  do to blocks is worked out). Use a skip of 3 days or less when you want contraptions to really
  run.
* Blocks added by other mods that grow with random ticks get their own growth code run a limited
  number of times, so most modded crops grow too.
* Players can't take damage while a skip is running.
* The world is saved automatically when a skip finishes.

---

## Configuration (optional)

The first start creates `config/timeskip.properties`. Every setting is explained inside the
file, and nobody needs to change anything. Highlights:

| Setting | Default | Meaning |
|---|---|---|
| `days_per_year` | 365 | Length of a year |
| `max_skip_years` | 100000000 | Longest allowed skip |
| `confirm_threshold_years` | 1000 | Skips this long need `/timeskip confirm` |
| `real_tick_max_ticks` | 72000 | Up to this many ticks, the world really runs (3 days) |
| `real_tick_max_seconds` | 90 | ...if the server can do it within this many seconds |
| `tick_budget_ms` | 30 | Milliseconds per server tick the skip may use |
| `extra_chunk_radius` | 0 | Extra chunks to load and age around players |
| `simulate_endermen` | true | Endermen move blocks during calculated skips |
| `enderman_max_disturbed_percent` | 10 | At most this % of the blocks endermen can reach end up moved |
| `mob_equilibrium` | despawn | `despawn` or `keep` |
| `freeze_world_during_skip` | true | Pause mobs and machines during calculated skips |
| `protect_players_during_skip` | true | No player damage during skips |

Edit the file, save, then run `/timeskip reload`.

---

## Building from source

You need Java 25. From the `timeskip` folder run:

```
./gradlew build
```

On Windows, run `gradlew.bat build`. The mod appears in `build/libs/timeskip-1.1.0.jar`.
This also runs the unit tests, which check the probability maths against brute-force,
tick-by-tick simulations of Minecraft's random ticks.

The GitHub Actions workflow in `.github/workflows/timeskip.yml` runs the same build on every
push and uploads the jar as a downloadable artifact.

Technical design notes are in [ARCHITECTURE.md](ARCHITECTURE.md).

## License

MIT
