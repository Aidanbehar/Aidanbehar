# Testing

## Automated (`./gradlew test`, also run by `./gradlew build`)

`PlantModelTest` (simulation, no game needed):
1. Initial equilibrium: ~3000 MWt, ~1028 MWe gross / ~963 MWe net, boron ~1575 ppm.
2. Steady state holds for an hour of plant time.
3. Manual trip settles to hot standby with decay heat removed.
4. Rod withdrawal raises power, reactivity balances.
5. Loss of off-site power: diesels pick up the safety buses, no core damage.
6. Station blackout with AFW failed: core damage after ~3 h (no scripted timer).
7. Small-break LOCA mitigated by SI.
8. Xenon peaks after a trip and decays.
9. Save/load round trip is exact.
10. Interlocks refuse invalid commands.
11. Snapshot encode/decode.
12. Determinism: identical histories give identical states.
13. Restart: rods withdrawn back to criticality.
14. Load follow to 700 MW.
15. Loss of all feedwater boils the steam generators dry.

`MeltdownTest`: an extended station blackout melts the core (~3.5 h), fails the vessel
(~7.5 h) and keeps progressing; releases stay physically bounded over two more days.

`AssetConsistencyTest` (static, no game needed): every block has a block state, item model
definition, name and loot table; every item has a model, texture and name; every described
item has a description; every translation key in code exists; sound events, loot tables,
placed features, equipment assets and the damage type exist; every model and texture
referenced exists.

## Server tests performed (dedicated server, `./gradlew runServer`, RCON)
| Check | Result |
|---|---|
| Data packs load without registry errors | pass (after fixing 26.3 formats) |
| Site selection without generating chunks | 646 candidates in ~1.4 s, coastal site |
| Same seed -> same site; restart reloads the stored site, no second search | pass |
| Marker index | 72 components, ~7,500 markers, ~40 ms |
| `/nps generation buildall` builds all 4096 chunks | pass; 7-10 ms average per chunk paint; no "Can't keep up" with the 20 ms budget |
| Generation resumes after restart | pass (1419 -> 4096 across restarts) |
| Pending block entities of replaced blocks | fixed (no more orphaned beehive/chest errors) |
| `/nps status` at start | 100 % power, 15.5 MPa, 1028 MWe |
| `/nps dev gridloss` | turbine trip above P-9 -> reactor trip, decay heat falls, diesels carry buses |
| `/nps dev loca 0.05` | pressurizer pressure low trip, SI holds pressure ~7.7 MPa, no core damage |

Version 0.2.0 additions (server):
| Check | Result |
|---|---|
| Uranium mine generation (crashed in 0.1.0 when writing sign text during world generation) | pass, no errors |
| Upgrade of a 0.1.0 world: stairwell and control-building chunks rebuilt once | pass (141 chunks) |
| Stairwell bridges between shorter flights and landings | pass (block checks) |
| Manuals on lecterns and in chests | pass (`data get block`) |
| `/nps meltdown confirm 300` | core damage 100 %, vessel failure, corium in the cavity |
| `/nps dev restore confirm` | plant back at 100 %, corium removed, vessel rebuilt (195 chunks) |

Version 0.3.0 additions (server):
| Check | Result |
|---|---|
| Upgrade 2 -> 3: every built chunk re-verified and rebuilt once | pass (3926 chunks, 0.7 ms average, about 6,000 block writes in total, no errors) |
| Access audit (`/nps dev audit`) | 662 unreachable pockets before the fixes, 90 after; all remaining are machinery, tank and roof tops (checked on the floor plans) |
| Refuelling cavity flooded | pass (block checks) |
| Hostile mobs | zombies summoned inside the footprint removed within 5 s; one outside kept |
| Siren network | 20 masts; mode persists across restart; sound on forced meltdown, quiet after restore |
| `/nps meltdown force minor` | core damage 50 %, containment intact, no debris or fires outside (area force-loaded and counted) |
| `/nps meltdown force catastrophic` | containment 8 %, release 22 %, dome breached, 663 debris blocks and 153 fires outside |
| `/nps dev restore confirm` after catastrophic | plant 100 %, sirens quiet, 0 debris, 0 fires, 0 corium within 150 blocks |

Note: a vanilla server pauses after 60 s with no players (`pause-when-empty-seconds`);
set it to -1 for unattended testing.

## Manual procedures (client)
1. **Arrival**: `/nps locate`, fly to the site. Expect terrain graded to y = grade, roads,
   fences, cooling towers (165 blocks), containment dome, turbine hall, intake on the coast.
   No floating terrain at the footprint edge; no water flowing out of the pool or intake.
2. **Interiors**: walk the control building, admin offices, locker rooms, turbine hall
   operating floor and basement, auxiliary building, fuel building (pool with racks and
   blue light), diesel rooms, workshop, warehouses, research wing. Check doors, stairs and
   ladders connect every floor; chests contain loot.
3. **Control room**: use a console; switch through all tabs; press ACK / SILENCE; try a
   refused command (withdraw rods while tripped) and see the reason.
4. **Trip**: press a manual trip pushbutton in the world; hear the rod drop and breaker
   trip; see the annunciators turn red and the log entries; turbine hum spins down.
5. **Blackout**: `/nps dev gridloss` then `/nps dev fail EDG_A` and `EDG_B`; facility
   lights go out, emergency lights stay; horn sounds; repair a diesel at its local station
   with a Diesel Service Kit (`/nps dev parts`).
6. **Radiation**: hold a Geiger counter near the spent fuel pool edge (clicks rise), then
   lean over the water (rises steeply) and step back. Carry ore in the inventory and watch
   the dosimeter. Stand on contaminated soil without boots, check the survey meter, use a
   shower.
7. **Multiplayer**: two clients; both open consoles; commands from one appear on the
   other's screen; walking away from the console drops the link (LINK LOST).
8. **Persistence**: restart the server mid-accident; plant state, alarms, damage and dose
   records continue.
