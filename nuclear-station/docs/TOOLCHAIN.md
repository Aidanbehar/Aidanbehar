# Toolchain decision

The brief required Minecraft Java **26.3** specifically, without downgrading.

* 26.3 was released on 2026-09-15. Since the 26.x line the game ships **unobfuscated**
  (Mojang names, no mapping layer) and requires **Java 25**.
* **Fabric** was chosen: Fabric Loader 0.19.5 and Fabric API 0.162.0+26.3 were available
  for 26.3 when this was built; Fabric Loom 1.18.3 (plugin id `net.fabricmc.fabric-loom`)
  supports unobfuscated versions directly, with `implementation` dependencies and no
  mappings. NeoForge for 26.3 was not used, as one loader was required and Fabric's
  lighter hooks suited the runtime-painting approach.
* Gradle 9.7.1 wrapper, JDK 25 (`JAVA_HOME` must point to a JDK 25).
* Resources follow 26.3 formats: item model definitions in `assets/<ns>/items`,
  equipment assets in `assets/<ns>/equipment`, ore feature targets as block-id strings,
  loot `modifier`/`condition` keys, recipe ingredients as plain ids, `Identifier` in code.
* Assets are produced by `tools/gen_assets.py` (Python 3, Pillow, NumPy, FFmpeg with
  libvorbis). Generated files are committed so building does not need Python.

Nothing in the build is blocked by the version choice.
