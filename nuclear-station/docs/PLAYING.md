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
* Dose rates: background ~0.1-0.3 uSv/h, plant areas a few uSv/h, near spent fuel or a
  damaged core lethal within minutes. Distance and shielding (water, concrete, lead) are
  computed.
* **Exposure** (dose from sources nearby) and **contamination** (radioactive material on
  you or your items) are different. Contamination keeps dosing you after you leave and
  spreads to items you carry.
* Wear the full hazmat set and a respirator in contaminated areas; boots stop pickup from
  the ground. Use a decontamination shower or kit afterwards; check yourself with a survey
  meter. Radioactive items (ores, fuel, debris) cannot be cleaned: store them in a waste
  drum (seals 256 items, heavily shielded).
* Acute dose above 200 mSv causes nausea (hunger), above 1 Sv weakness, above 2 Sv
  radiation damage that grows with dose; 8 Sv is quickly lethal. Acute dose recovers slowly; lifetime dose is a permanent record (`/nps dose`).
