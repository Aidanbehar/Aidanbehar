package dev.aidanbehar.nuclearstation.item;

import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.server.network.Filterable;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.component.WrittenBookContent;

/**
 * In-world documentation: written books placed on lecterns in the control room,
 * technical support centre, document control and the research wing.
 */
public final class Handbooks {
	private Handbooks() {
	}

	private static ItemStack book(String title, String author, String... pages) {
		ItemStack stack = new ItemStack(Items.WRITTEN_BOOK);
		List<Filterable<Component>> content = new ArrayList<>();
		for (String page : pages) {
			content.add(Filterable.passThrough(Component.literal(page)));
		}
		stack.set(DataComponents.WRITTEN_BOOK_CONTENT, new WrittenBookContent(Filterable.passThrough(title), author, 0, content, true));
		return stack;
	}


	/** Approximate characters per book line and lines per page of a vanilla written book. */
	private static final int LINE = 18;
	private static final int LINES = 13;

	/**
	 * Builds a book from long text: words are wrapped to the page width and pages filled
	 * automatically. A line containing only "---" forces a new page.
	 */
	static List<String> paginate(String text) {
		List<String> pages = new ArrayList<>();
		List<String> lines = new ArrayList<>();
		for (String para : text.split("\n", -1)) {
			if (para.equals("---")) {
				if (!lines.isEmpty()) {
					pages.add(String.join("\n", lines));
					lines.clear();
				}
				continue;
			}
			if (para.isEmpty()) {
				if (!lines.isEmpty()) {
					lines.add("");
				}
			} else {
				StringBuilder line = new StringBuilder();
				for (String word : para.split(" ")) {
					if (line.length() > 0 && line.length() + 1 + word.length() > LINE) {
						lines.add(line.toString());
						line.setLength(0);
					}
					if (line.length() > 0) {
						line.append(' ');
					}
					line.append(word);
				}
				lines.add(line.toString());
			}
			while (lines.size() >= LINES) {
				pages.add(String.join("\n", lines.subList(0, LINES)));
				lines = new ArrayList<>(lines.subList(LINES, lines.size()));
				while (!lines.isEmpty() && lines.get(0).isEmpty()) {
					lines.remove(0);
				}
			}
		}
		if (!lines.isEmpty()) {
			pages.add(String.join("\n", lines));
		}
		return pages;
	}

	private static ItemStack manual(String title, String author, String text) {
		return book(title, author, paginate(text).toArray(String[]::new));
	}


	public static ItemStack siteGuide() {
		return manual("Site Guide", "Meridian Point NGS", """
			MERIDIAN POINT
			NUCLEAR GENERATING
			STATION

			Guide to the site and its buildings.

			Directions are given from the CONTROL BUILDING, where you are now. The sea is to the SOUTH.
			---
			THE SITE
			The station fills a square about 1 km across. The main gate and fire station are on the north side, the reactor and turbine in the middle and the cooling water intake on the shore to the south.

			An inner fence surrounds the PROTECTED AREA (the nuclear island). Its access point is north of the admin wing.
			---
			ADMIN WING
			Directly NORTH of the control building. Offices, reception, document control (more manuals on lecterns), locker rooms and the health physics office.
			---
			CONTROL BUILDING
			You are here. Upper floor: MAIN CONTROL ROOM with the operator consoles, wall boards and annunciators. West of it: TECHNICAL SUPPORT CENTRE. East: crew room.

			Below: cable spreading rooms, switchgear and battery rooms. Stairs in the stair core.
			---
			REACTOR CONTAINMENT
			The domed cylinder directly SOUTH. Steel-lined concrete, about 100 blocks high.

			Inside: the reactor vessel, four steam generators, four reactor coolant pumps and the pressurizer.

			DANGER: lethal radiation inside while the reactor is at power.
			---
			AUXILIARY BUILDING
			WEST side of the containment. Charging, letdown and boron systems, safety injection and RHR pumps, component cooling.

			The basement holds filters and resin beds: a few mSv/h at all times. The RWST (borated water tank) stands outside to the west.
			---
			FUEL BUILDING
			EAST side of the containment. The SPENT FUEL POOL with its racks of used fuel, the fuel handling bridge and the cask bay served by the rail spur.

			The water is the shielding. Never lean into the pool or lift fuel out of it.
			---
			MAIN STEAM VALVE HOUSE
			Between the containment and the turbine hall. Main steam isolation valves (MSIVs) and the atmospheric relief stacks - steam roars from the roof when they open. Steam lines carry N-16 radiation at power.
			---
			TURBINE HALL
			SOUTH of the reactor, the largest building. High and low pressure turbines, the generator, condensers (basement) and the main feed pumps. Hearing protection advised.
			---
			ELECTRICAL
			Main transformers (GSU) are WEST of the turbine hall; the 400 kV switchyard and transmission lines are at the far WEST edge.

			DIESEL GENERATORS: Diesel A west of the auxiliary building, Diesel B east of the control building. They power the safety buses when off-site power is lost.
			---
			COOLING WATER
			On the SOUTH shore: the circulating water pump house and intake screens (4 big pumps feed the condenser), the essential service water pump house to the south-west, and the warm water outfall to the south-east.
			---
			COOLING TOWERS
			The four towers stand EAST of the nuclear island with their pump station south of them. They reject extra heat when the sea is warm.

			Further east: water tower and weather mast. East of the turbine hall: condensate tanks and water treatment.
			---
			RADWASTE BUILDING
			NORTH-WEST of the auxiliary building. Waste drums and solid waste storage: about 1 mSv/h inside. Put radioactive items in a waste drum.
			---
			SUPPORT BUILDINGS
			North-east: WAREHOUSE 1 (spare parts) and WAREHOUSE 2 (bulk stores), and the maintenance WORKSHOP. North: fire station, car park and main gate. A rail line runs along the north and east sides.
			---
			RESEARCH WING
			Far NORTH-WEST. Laboratories and the Experimental Reaction Chamber. The chamber is built but NOT commissioned: its consoles only show status.
			---
			TUNNELS
			Service tunnels about 14 blocks below grade link the main buildings. Stair shafts lead down from the surface.
			""");
	}

	public static ItemStack controlRoomGuide() {
		return manual("Control Room Guide", "Operations Dept.", """
			CONTROL ROOM
			INTERFACE GUIDE

			Use any Main Control Console. Stay near it: walk away and the data link drops (LINK LOST).

			Every button is checked against the plant interlocks. If refused, the reason appears at the bottom of the screen.
			---
			TOP BAR
			Green banner: reactor at power. Red banner: reactor tripped, with the cause.

			ACK - acknowledge new alarms
			SILENCE - stop the horn
			RESET - clear alarms that are no longer present
			---
			OVERVIEW TAB
			The energy path: Reactor - Steam generators - Turbine - Generator - Grid. Moving arrows mean energy is flowing.

			Three boxes list the key primary, secondary and electrical values. Green values are normal, amber is abnormal, red is dangerous.
			---
			REACTOR TAB
			Bars: shutdown bank and control bank A-D positions (228 steps = fully out).

			ROD OUT / IN / STOP: control bank motion (MANUAL only).
			AUTO / MANUAL: rod control mode.
			TRIP: manual reactor trip.
			SD BANKS OUT / IN.
			RESET REACTOR TRIP BREAKERS.
			---
			REACTOR TAB (2)
			CORE PHYSICS lists power, startup rate, the reactivity balance (rods, boron, Doppler, moderator, xenon), fuel and clad temperatures and the DNB ratio.

			BORON: +50/+10 borate (less power), -50/-10 dilute (more power), HOLD stops.
			---
			PRIMARY TAB
			RCS temperatures, pressure, pressurizer level and subcooling.

			Click an equipment tile to start or stop it: RCP A-D, charging pumps, heaters. RUN green, STOP grey, FAIL red, NO PWR amber.

			Heaters and spray: AUTO, ON/OPEN, OFF/CLOSE.
			---
			PRIMARY TAB (2)
			PORV 1 and 2: AUTO, OPEN, CLOSE, and their BLOCK valves.
			LETDOWN ON/OFF.

			The four columns at the bottom are the four protection channels. A FAIL or amber value means a faulty instrument.
			---
			SECONDARY TAB
			Steam generator levels, steam and feed flows.

			Tiles: main feed pumps A/B, motor aux feed A/B, turbine-driven aux feed (TDAFW).
			FEED AUTO or MAN 25%/75%.
			RESET FW ISOLATION.
			MSIV OPEN/CLOSE.
			---
			SECONDARY TAB (2)
			ADV: atmospheric dump valves AUTO or 0/50/100%.
			ARM STEAM DUMPS / BLOCK DUMPS: dump steam to the condenser.
			AFW SUCTION: condensate tank or sea water (last resort).
			---
			TURBINE/CW TAB
			LATCH / TRIP the turbine.
			0 / 900 / 1800 rpm speed setpoints.
			SYNC closes the generator breaker (1794-1806 rpm). OPEN BKR opens it.
			-100 ... +100: change the load setpoint (MW).
			RAMP 20/50/150 MW per minute.
			---
			TURBINE/CW TAB (2)
			Circulating water pumps CW 1-4 and the intake screens.
			0-4 TWR: cooling towers in service.
			Bottom: condenser vacuum, sea and discharge temperatures, screen fouling.
			---
			ELECTRICAL TAB
			Grid, off-site breaker and generator breaker lamps; CLOSE/OPEN OFFS.

			The six buses show LIVE or DEAD and their source. Diesels A/B: START/STOP. Battery charge and diesel fuel are listed below.
			---
			SAFETY TAB
			Lamps: SI, SI block, containment spray, RHR cooldown, recirculation, igniters, vent.

			MANUAL SI, RESET SI, BLOCK SI, BLOCK SL SI, RESET SPRAY, RHR ON/OFF, TO RECIRC, IGN ON/OFF, VENT OPEN/CLOSE, SFP makeup.
			---
			SAFETY TAB (2)
			Tiles for every safety pump: SI, RHR, containment spray, component cooling, service water, fan coolers, fuel pool cooling, igniters.

			Containment and severe accident values: pressure, hydrogen, dose rate, core damage and melt.
			---
			ALARMS & LOG TAB
			Every annunciator window. Flashing = new, steady = acknowledged, slow flash = cleared but not reset.

			Below: the event log. Scroll with the mouse wheel.
			""");
	}

	public static ItemStack reactorManual() {
		return manual("Reactor Operating Manual", "Operations Dept.", """
			REACTOR OPERATING
			MANUAL

			Step by step: running the plant, changing power, recovering from a trip, shutting down and what happens in a meltdown.
			---
			AT POWER (NORMAL)
			The plant starts at 100%: about 3000 MW of heat, 1028 MW from the generator, 963 MW to the grid.

			Rods are in AUTO and follow the turbine. Feed is in AUTO. You can leave it running.
			---
			WATCH THESE
			Pressure 15.5 MPa.
			Pressurizer level 40-60%.
			Subcooling above 20 K.
			SG levels 40-60%.
			Tavg near Tref.
			Condenser pressure low.
			Battery and diesel fuel levels.
			---
			CHANGING POWER
			Turbine tab: choose a RAMP rate, then press -100/-50 or +50/+100 to change the load setpoint. The turbine moves to the new load and AUTO rods follow.

			Over hours XENON changes the balance: borate or dilute a little to keep rods in their band.
			---
			AFTER A TRIP
			1 Overview: rods in, power falling.
			2 Turbine tripped.
			3 Safety buses live (Electrical tab).
			4 Aux feed running, SG levels recovering.
			5 Steam dumps or ADVs holding SG pressure.
			Then find WHY it tripped (red banner, event log).
			---
			RESTART 1
			Fix the cause first.
			Primary tab: at least 2 RCPs running.
			Safety tab: if SI is lit, RESET SI (60 s after it started).
			Reactor tab: RESET REACTOR TRIP BREAKERS.
			SD BANKS OUT - wait until fully out (228 steps).
			---
			RESTART 2
			Select MANUAL. Press ROD OUT and watch STARTUP RATE. Keep it below 1 DPM - press ROD STOP if it climbs.

			The reactor is critical when power keeps rising slowly with rods stopped.
			Soon after a trip XENON fights you: dilute with -50 ppm.
			---
			RESTART 3
			Raise power to about 5%. Secondary tab: MSIVs open, feed in AUTO, steam dumps armed, CW pumps running (condenser vacuum).
			---
			RESTART 4
			Turbine tab:
			LATCH, then 1800 rpm.
			When the speed is 1794-1806 rpm press SYNC.
			Raise load with +50 at a ramp of 20-50 MW/min, withdrawing rods to keep Tavg near Tref.
			Above 15% power select rod AUTO.
			---
			SHUTDOWN
			Reduce load to minimum.
			OPEN BKR, then turbine TRIP.
			Insert rods (or TRIP).
			Decay heat continues: keep feed and steam dumps going.
			Below 177 C and 3 MPa: Safety tab RHR ON for shutdown cooling.
			---
			DECAY HEAT
			A shut-down core still makes about 6% of full power at first and about 1% after an hour. It must ALWAYS be cooled. Losing all cooling after a trip is how meltdowns happen.
			---
			LOSS OF POWER
			If the grid is lost, the turbine and reactor trip and both diesels start. Check the safety buses are live. If a diesel fails, repair it at its local station with a Diesel Service Kit.
			---
			MELTDOWN
			With no AC power and no feedwater the SGs boil dry. Then the core uncovers, the cladding oxidises (making hydrogen) and the fuel melts - a few hours after the trip.
			---
			MELTDOWN (2)
			Molten core (corium) gathers in the lower head and fails the reactor vessel. It then eats into the concrete floor of the containment and can melt through it, while pressure and hydrogen threaten the dome.
			---
			MELTDOWN (3)
			Radioactivity escapes and settles downwind as contamination. The containment and its surroundings become lethal.

			Restoring ANY water before the vessel fails can still stop it: repair a diesel, restore feed, or inject.
			---
			LOCAL STATIONS
			Each pump, diesel and transformer has a local station in the plant. Use it to see its condition. Sneak-use to start/stop locally. Use while holding the right spare part to repair.
			""");
	}

	/** One copy of every station manual, for document chests. */
	public static ItemStack[] allManuals() {
		return new ItemStack[] {siteGuide(), reactorManual(), controlRoomGuide(), operatorHandbook(), emergencyProcedures(),
			radiationProtection(), shiftLog()};
	}

	public static ItemStack operatorHandbook() {
		return book("Unit 1 Operator Handbook", "Operations Dept.",
			"MERIDIAN POINT NGS\nUnit 1 Operator Handbook\n\n3000 MWt pressurized water reactor, 4 loops, ~1000 MWe.\n\nUse any operator console in the Main Control Room to open the plant interface.",
			"THE HEAT PATH\n\nCore -> primary coolant (15.5 MPa, 4 RCPs) -> 4 steam generators -> steam (6.8 MPa) -> HP + 3 LP turbines -> condenser -> sea water from the intake, trimmed by 4 cooling towers.",
			"REACTIVITY\n\nRods: fast control. Shutdown banks must be fully out before control banks move.\nBoron: slow control via charging pumps (borate = less power).\nFeedback: hotter fuel (Doppler) and hotter water (moderator) reduce power.",
			"XENON\n\nXenon-135 builds up for hours after a power reduction or trip, then decays. Restarting soon after a trip needs extra dilution or rod withdrawal. Watch the XENON readout.",
			"NORMAL STARTUP\n1 RCPs running, 15.5 MPa, Tavg ~292 C.\n2 Reset trip, withdraw shutdown banks.\n3 Rods MANUAL, withdraw control banks. Watch startup rate (< 1 DPM).\n4 Critical: hold. Raise power to ~5%.",
			"TURBINE\n5 Latch turbine, speed 1800 rpm.\n6 Synchronise (1794-1806 rpm).\n7 Raise load setpoint; above 15% select rod AUTO.\nRods in AUTO follow the turbine: Tavg tracks Tref.",
			"SHUTDOWN\nReduce load, open breaker, trip turbine, insert rods or trip reactor.\n\nDECAY HEAT does not stop at a trip: about 6% of full power at first, still ~1% an hour later. It must ALWAYS be removed.",
			"HEAT REMOVAL AFTER TRIP\n- Steam dumps to the condenser (needs CW pumps & vacuum)\n- Atmospheric dump valves\n- Aux feedwater keeps SG levels up (CST water!)\n- Below 177 C and 3 MPa: RHR shutdown cooling.",
			"ELECTRICAL\nHouse loads come from the generator (UAT) or the grid (SST). Losing both de-energises RCPs, feed and CW pumps. Diesels A/B then carry the safety buses only. Batteries carry instruments for ~4 h (accelerated).",
			"MAINTENANCE\nEquipment wears with use. Failed or worn equipment is repaired at its LOCAL STATION in the plant using the matching spare part (warehouses, workshops). The station shows condition when used empty-handed.");
	}

	public static ItemStack emergencyProcedures() {
		return book("Emergency Operating Procedures", "Operations Dept.",
			"E-0 REACTOR TRIP OR SAFETY INJECTION\n\n1 Verify reactor trip: rods in, power falling.\n2 Verify turbine trip.\n3 Verify power to safety buses.\n4 Check SI status.\n5 Verify AFW flow.",
			"E-0 (cont.)\n6 Check RCS: subcooling > 15 K, pressurizer level.\n7 Stop RCPs if subcooling is lost.\n8 Identify the event: LOCA, steam break, loss of heat sink, station blackout.",
			"ECA-0.0 STATION BLACKOUT\nNo AC on either safety bus.\n- Start diesels; repair at their local panels.\n- TDAFW feeds the SGs while DC lasts.\n- Restore offsite power as soon as the grid allows.\n- Minimise DC loads.",
			"FR-H LOSS OF HEAT SINK\nSG levels falling, no feed.\n- Restore MFW or AFW.\n- AFW suction to ESW if the CST is empty.\n- Last resort: FEED AND BLEED\n  open PORVs + safety injection.",
			"E-1 LOSS OF COOLANT\n- Verify SI flow.\n- When RWST is LOW: switch to SUMP RECIRCULATION or injection stops.\n- Keep containment spray and fan coolers running.\n- Monitor hydrogen; igniters on early.",
			"SEVERE ACCIDENT\nCore exit > 650 C or core damage indicated.\n- Depressurise the RCS (PORVs) to let low-pressure systems inject.\n- Flood containment via sprays.\n- Filtered vent ONLY to prevent containment failure.",
			"RADIOLOGICAL EMERGENCY\nRelease alarm or high dose rates outside:\n- Shelter, wear hood, suit and respirator.\n- Check routes with a survey meter.\n- Decontaminate at Health Physics before leaving.");
	}

	public static ItemStack radiationProtection() {
		return book("Radiation Protection Manual", "Health Physics",
			"TIME - DISTANCE - SHIELDING\n\nDose = dose rate x time.\nDose rate falls with the square of distance.\nConcrete, water and especially lead absorb gamma rays.",
			"LIMITS\nAnnual worker limit 20-50 mSv.\nAbove ~250 mSv acute: blood changes.\n~1 Sv: radiation sickness (nausea, weakness).\nSeveral Sv: severe, potentially fatal without care.",
			"INSTRUMENTS\nGeiger counter: local dose rate, clicks.\nDosimeter: your accumulated dose; alarms.\nSurvey meter: map of ground contamination.\nAlways carry a dosimeter in the plant.",
			"CONTAMINATION vs EXPOSURE\nExposure: radiation reaching you from a source.\nContamination: radioactive material ON you or your kit. It keeps irradiating you until removed - wash at a decon shower.",
			"PROTECTIVE EQUIPMENT\nHood, suit, trousers, boots stop most surface contamination.\nRespirator stops inhaled particles.\nLead apron: modest gamma reduction.\nNO suit stops strong gamma fields.",
			"WASTE\nPlace radioactive items and contaminated soil in lead-lined WASTE DRUMS. Store drums away from occupied areas.",
			"PLANT DOSE RATES\n(reactor at power)\nReactor cavity:\n 300 Sv/h - fatal in under a minute\nSG compartments:\n 2 Sv/h\nRest of containment:\n 20-100 mSv/h",
			"PLANT DOSE RATES (2)\nAux bldg basement:\n ~2 mSv/h always\nRadwaste building:\n ~1 mSv/h\nMain steam lines:\n 1 mSv/h at power\nControl room, offices:\n background",
			"AFTER SHUTDOWN\nN-16 vanishes within seconds of a trip, but the reactor cavity stays at Sv/h from decay products.\n\nAfter core damage every figure rises by orders of magnitude.",
			"SICKNESS\n250 mSv: nausea\n500 mSv: vomiting\n1 Sv: weakness, internal bleeding\n2 Sv: severe\n4 Sv: often fatal\n8 Sv: rapidly fatal\nAbove 50 Sv/h you are burned where you stand.");
	}

	public static ItemStack shiftLog() {
		return book("Shift Log - Unit 1", "Night Shift",
			"03:10 100% steady. CW pump 3 bearing temp trending up, WO raised.\n04:45 Intake screen dP high after storm. Screen wash in service.\n05:30 Turbine vibration brg 4 slightly elevated.",
			"06:00 Handover. Diesel B monthly run due. PORV-2 seat leakage suspected, monitor PRT.\n07:20 Spare seal kits LOW in warehouse 1. Order placed.\n08:15 Ch. III pressurizer pressure reading 0.2 MPa high. I&C notified.",
			"09:40 Grid control requests evening peak 1000 MWe.\n11:05 Health physics: contamination found near drain tank room, area roped off.\n\n-- entries end --");
	}

	public static ItemStack experimentalChamberNotice() {
		return book("ERC Commissioning Status", "Experimental Physics",
			"EXPERIMENTAL REACTION CHAMBER\n\nSTATUS: NOT COMMISSIONED\n\nAll chamber systems are de-energised and locked out. The chamber is not connected to Unit 1.",
			"Construction of the chamber, field coils, beam emitters, observation gallery and this control room is complete.\n\nControl software, power supplies and experiment protocols are awaiting approval.",
			"Do not attempt to energise any chamber system. Consoles in this room display status only.\n\n-- Experimental Physics Division");
	}
}
