# Deep Winter

A Fabric mod for Minecraft Java Edition **26.3**: snow that keeps piling up, region-wide snowstorms,
body temperature and freezing, bigger heated snowy/taiga villages, a Thermometer and a Snow Shovel.

Built against Fabric Loader 0.19.5, Fabric API 0.162.0+26.3, Loom 1.18.3, Java 25.
The ready-made jar is in [`release/deep-winter-1.0.0.jar`](release/deep-winter-1.0.0.jar).

## Install on a Mac

1. **Java 25** (only needed to build from source; the launcher brings its own Java to play):
   `brew install openjdk@25`
2. **Fabric Loader for 26.3**: download the installer from <https://fabricmc.net/use/installer/>
   (the "Download for macOS" / universal `.jar`). Open it (if macOS blocks it, right-click → Open),
   pick the **Client** tab, set Minecraft Version **26.3**, Loader Version **0.19.5**, leave
   "Create profile" ticked, and click **Install**.
3. **Mods folder**: in Finder press ⇧⌘G and go to `~/Library/Application Support/minecraft`.
   Create a folder named `mods` if it isn't there.
4. Put these two jars in `mods`:
   - `deep-winter-1.0.0.jar` (from `release/`)
   - Fabric API for 26.3: <https://modrinth.com/mod/fabric-api> → Versions → 0.162.0+26.3 (or newer for 26.3)
   - Optional: [Mod Menu](https://modrinth.com/mod/modmenu) 21.0.0 for the in-game config screen.
5. Open the Minecraft Launcher, choose the **fabric-loader-0.19.5-26.3** profile from the
   dropdown next to Play, and press **Play**.

The village changes only appear in **newly generated chunks** — explore new land (or start a new
world) to find the new houses.

## Building from source

```sh
./gradlew build          # jar in build/libs/
./gradlew runClient      # dev client
python3 tools/gen_textures.py        # regenerate item textures + icon
python3 tools/gen_village_houses.py  # regenerate village .nbt templates + pools
```

## Commands (operators)

| Command | What it does |
|---|---|
| `/snowstorm start [duration]` | Force a storm everywhere (default 15 min; e.g. `600s`, `12000t`, `1d`) |
| `/snowstorm stop` / `status` | End the storm / show its state |
| `/deepwinter temp [entity]` | Exact air, felt and body temperature plus the full breakdown |
| `/deepwinter speed <x>` | Speed up snowfall/melting for testing (1 = normal) |
| `/deepwinter snow` | Snow depth, max depths and storm status for your column |

## Config

`config/deepwinter.json` (or Mod Menu → Deep Winter): max snow depth multiplier, accumulation
speed, storm accumulation multiplier, storm chance (default 60%), storm particle density and
per-tick cap, chunk catch-up cap, freezing threshold (°C), villagers/other mobs freeze, heat
damage (off by default), °C/°F, plus the per-tick snow column budget and powder snow chances.
