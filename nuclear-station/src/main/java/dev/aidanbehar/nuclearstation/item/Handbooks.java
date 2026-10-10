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
			"WASTE\nPlace radioactive items and contaminated soil in lead-lined WASTE DRUMS. Store drums away from occupied areas.");
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
