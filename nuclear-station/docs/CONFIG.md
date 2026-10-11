# Configuration

File: `config/nuclearstation.json` (created with defaults on first start; missing keys
take their default). Changes need a restart.

## facility
| Key | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Generate the station at all. When false no site is chosen and nothing is painted (an existing site's data is kept). |
| `searchMinDistance` | `900` | Minimum distance of the site centre from world spawn. |
| `searchMaxDistance` | `6000` | Search radius. |
| `generationBudgetMs` | `20` | Server-thread time per tick spent painting station chunks. |
| `protectInhabitedChunksTicks` | `12000` | Chunks with more inhabited time than this (10 min) are not overwritten. 0 disables protection. Applies only to sites chosen on untouched land; on sites the search had to relax onto (strictness 3+), and when a content upgrade rebuilds the station, every station chunk is rebuilt, so terrain never stays inside buildings. |
| `noHostileMobs` | `true` | No hostile mobs anywhere in the station footprint: natural, spawner, patrol, phantom and siege spawns are blocked, and hostile mobs that walk in are removed (named, leashed and persistent mobs are kept). |

## simulation
| Key | Default | Meaning |
|---|---|---|
| `updateIntervalTicks` | `10` | Simulation update period (the model sub-steps internally). |
| `slowTimeFactor` | `20` | Acceleration of slow processes (xenon, decay heat tail, burnup, wear, batteries, pool). 1 = real time. |
| `accidentDifficulty` | `NORMAL` | `CALM` (no random failures), `NORMAL`, `HARSH` (3x failure hazard). |
| `automaticOperatorActions` | `false` | Let the plant computer perform the ECCS switchover to sump recirculation when the RWST runs low (otherwise it is an operator action). |
| `runWithoutPlayers` | `true` | Keep simulating while no player is near the station. Note: a vanilla server with no players online pauses entirely after `pause-when-empty-seconds` (server.properties). |

## radiation
| Key | Default | Meaning |
|---|---|---|
| `severity` | `1.0` | Multiplier on all doses. |
| `sickness` | `true` | Acute dose causes sickness effects and damage. |
| `releaseSpreadRadius` | `700` | Maximum radius of ground contamination from an off-site release. |

## geology
| Key | Default | Meaning |
|---|---|---|
| `generateOres` | `true` | Add radioactive and strategic ores to biomes. |
| `generateMines` | `true` | Generate abandoned uranium mines. |

## experimental
| Key | Default | Meaning |
|---|---|---|
| `enableExperimentalChamber` | `false` | Reserved for a future chamber system. With the shipped inactive chamber it changes nothing. |

## development
| Key | Default | Meaning |
|---|---|---|
| `placementMode` | `AUTO` | `AUTO` (search per the settings above), `NEAR_SPAWN` (nearest suitable coast within 3000 blocks of spawn), `FIXED` (use `fixedOriginX/Z` as the north-west corner, no checks). Only used when the world has no site yet. |
| `fixedOriginX`, `fixedOriginZ` | `0` | Origin for `FIXED`. |
| `allowRegenerate` | `false` | Enables `/nps dev regenerate confirm`, which marks every chunk unbuilt so it is repainted. For disposable test worlds. |
| `debugLogging` | `false` | Log every painted chunk and extra diagnostics. |

Revealing the location: `/nps locate`. Triggering/resuming generation: it resumes
automatically as chunks load; `/nps generation buildall` builds everything now.
Disabling generation: `facility.enabled = false`.
