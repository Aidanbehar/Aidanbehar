# Operating Meridian Point

## Getting there
`/nps locate` gives the station centre and the control-room console. The site is fenced;
enter through the north gatehouse off the access road. The protected area (reactor,
auxiliary, fuel, turbine and control buildings) has its own inner fence and gatehouse.

## The control room
The control room is on the upper floor of the control building, north of the containment.
Right-click a **Main Control Console** to open the interface (you must stay near a
console; if you walk away the data link drops and the screen shows LINK LOST). Tabs:

| Tab | Contents |
|---|---|
| Overview | Energy flow reactor -> SG -> turbine -> generator -> grid, key parameters, main status lamps |
| Reactor | Rod bank positions, rod control (out/in/stop, auto/manual, shutdown banks, manual trip, trip reset), core physics and reactivity breakdown, boron (borate/dilute) |
| Primary | RCS temperatures, pressure, pressurizer level, subcooling; RCPs and charging pumps (click a tile to start/stop), heaters, spray, PORVs and block valves, letdown, protection channel values |
| Secondary | SG level/pressure, feed flows, main/aux feed pumps, feed control, MSIVs, atmospheric relief valves, condenser steam dumps, AFW suction |
| Turbine/CW | Turbine latch/trip, speed and load setpoints, ramp rate, sync and breaker; circulating-water pumps, intake screens, number of cooling towers in service, condenser and sea temperatures |
| Electrical | Grid, off-site and generator breakers, the six buses and their source and load, diesels (start/stop, fuel, start timers), transformers, batteries |
| Safety | SI, containment spray, RHR shutdown cooling, recirculation switchover, hydrogen igniters, filtered vent, spent-fuel pool makeup, ECCS pumps, containment and severe-accident indications |
| Alarms & Log | Annunciator window tiles (flashing = new, steady = acknowledged, slow flash = cleared/ringback) and the event log (scroll) |

ACK acknowledges alarms, SILENCE stops the horn, RESET clears acknowledged alarms whose
condition has gone. Every command passes the plant's interlocks; when one is refused the
reason is shown at the bottom of the screen (e.g. "Rod control in AUTO - select MANUAL
first" or "Reset the reactor trip breakers first").

Indications come from instrumentation. If DC power is lost the indications fail ("NO DC
POWER") and protection channels on dead buses vote trip.

## Protection setpoints (2 of 4 channels)
Reactor trip: power range high flux 109 %, positive rate, pressurizer pressure high 16.6
MPa / low 12.9 MPa (above P-7, 10 %), hot leg overtemperature 338 C, RCS low flow 90 %
(above P-8, 30 %), SG level low-low 15 %, RCP bus undervoltage, turbine trip above P-9
(50 %), safety injection, loss of rod drive power.

Safety injection: pressurizer pressure low-low 12.7 MPa (blockable below P-11, 13.8 MPa),
containment pressure high 125 kPa, steam line pressure low 4.1 MPa (blockable).
Containment spray at 250 kPa. MSIVs close on containment pressure 200 kPa or low steam
line pressure. Feed isolation and turbine trip on SG level high-high 80 %. AFW starts on
SG level low-low, loss of main feed, loss of off-site power or SI. Diesels start on safety
bus undervoltage or SI.

## Typical tasks
* **Load change**: Turbine tab, adjust the load setpoint and ramp rate; with rods in AUTO,
  rods follow Tavg to Tref. Over hours xenon shifts and boron must be adjusted.
* **Trip recovery**: after a trip the plant settles to hot standby on steam dumps or the
  atmospheric relief valves with AFW feeding. Reset the trip breakers, withdraw shutdown
  banks, dilute/withdraw to criticality, heat up, latch and roll the turbine to 1800 rpm,
  sync and load.
* **Loss of off-site power**: diesels start automatically (each start can fail, more likely when worn) and pick up the safety buses;
  check AFW, RCP seal cooling (charging or CCW), and restore off-site power when the grid
  returns.
* **Station blackout**: batteries last a few hours (accelerated); the turbine-driven AFW
  pump needs no AC. Without AC the RCP seals degrade, and without feedwater the core will
  eventually uncover. Repair a diesel at its local station with a *Diesel Service Kit*.
* **LOCA**: SI injects from the RWST; when it runs low, switch to sump recirculation
  (Safety tab) or the core will be lost once the RWST is empty.

## Maintenance
Equipment wears with running hours. Its condition is shown on its tile and at its local
control station in the plant. A failed component must be repaired locally with the right
spare part (shown when you use the station). Parts come from the warehouses and
workshop, or can be crafted.

## Radiation protection
* Radiation is computed, not scripted: distance and shielding (water, concrete, lead) from
  real sources, plus fields that exist because the reactor exists. These follow the plant
  state:

| Place | Reactor at power | Shut down |
|---|---|---|
| Reactor cavity (inside the primary shield) | ~300 Sv/h - fatal in under a minute | ~2 Sv/h, falling with decay heat |
| Steam generator / RCP compartments | ~2 Sv/h (N-16) | ~5 mSv/h |
| Rest of lower containment | ~100 mSv/h | ~1 mSv/h |
| Containment operating deck | ~20 mSv/h | ~0.2 mSv/h |
| Auxiliary building basement | ~2 mSv/h | ~0.6 mSv/h |
| Main steam valve house | ~1 mSv/h | background |
| Radwaste building | ~1 mSv/h | ~1 mSv/h |
| Fuel building (beside the pool) | tens of uSv/h; lethal if fuel leaves the water | same |
| Control room, offices, turbine hall | background | background |

  After core damage every figure inside the nuclear island rises by orders of magnitude.
* **Exposure** (dose from sources nearby) and **contamination** (radioactive material on
  you or your items) are different. Contamination keeps dosing you after you leave and
  spreads to items you carry.
* Wear the full hazmat set and a respirator in contaminated areas; boots stop pickup from
  the ground. No suit stops the gamma fields above: only time, distance and shielding do.
  Use a decontamination shower or kit afterwards. Radioactive items (ores, fuel, debris)
  cannot be cleaned: store them in a waste drum (256 items, heavily shielded).
* Sickness by acute dose: 250 mSv nausea, 500 mSv vomiting, 1 Sv weakness and bleeding
  damage, 2 Sv severe, 4 Sv often fatal, 8 Sv rapidly fatal. Above 50 Sv/h you are burned
  where you stand. Acute dose recovers with a one-hour half-life; lifetime dose is a
  permanent record (`/nps dose`).

## Meltdown
A meltdown is not an animation: it is what the plant model does when decay heat cannot be
removed. `/nps meltdown confirm [speed]` starts the classic initiator, an extended station
blackout (grid lost, both diesels and the turbine-driven feed pump failed), and runs plant
time faster (default x60, up to x300). What follows comes from the physics:

1. The steam generators boil dry; primary pressure and temperature climb.
2. The core uncovers; the cladding oxidises, generating hydrogen (about 3.5 plant hours).
3. The fuel melts and relocates to the lower head; the vessel fails (about 7.5 hours).
   Plant time returns to normal speed here. Corium appears in the reactor cavity.
4. The corium attacks the concrete floor and can melt through the basemat; hydrogen burns
   or over-pressure can fail the dome. Radioactivity leaks to the environment and settles
   downwind as ground contamination.

### Severity and what you see
The damage in the world follows the severity of the accident and grows as it gets worse:

| Severity | Seen in the world |
|---|---|
| Contained core damage | Smoke and steam above the dome, corium and debris inside the containment, radiation alarms; nothing outside is damaged |
| Vessel failure | Corium in the reactor cavity, heavier smoke, rising dose rates around the reactor building |
| Containment failure | A ragged hole torn in the dome (larger with a larger breach), lava glow and smoke columns visible from far away, contaminated debris thrown up to about 80 blocks, burning wreckage, scorched ground, holes in nearby roofs, and a radioactive plume downwind |

`/nps meltdown force minor|major|catastrophic` jumps straight to one of these outcomes.

### Sirens
Twenty siren masts stand across the site. In automatic mode (the default) they sound as soon
as the core is damaged, radioactivity is released, the containment fails or spent fuel is
damaged, with a red warning light on each mast and a site-wide broadcast. The SAFETY tab of the
control room has AUTO / SOUND / SILENCE buttons; `/nps siren auto|on|off` does the same.

Repairing a diesel, restoring feedwater or injecting water before the vessel fails can
still save the plant. `/nps status` shows each stage. `/nps dev restore confirm` resets the
plant, rebuilds the reactor area and clears ground contamination afterwards.
