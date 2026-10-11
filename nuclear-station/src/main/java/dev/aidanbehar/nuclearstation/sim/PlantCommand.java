package dev.aidanbehar.nuclearstation.sim;

/**
 * Operator commands available from the main control room. {@code index} selects a
 * component (pump number, valve number, equipment ordinal) and {@code value} carries a
 * setpoint where applicable.
 */
public enum PlantCommand {
	MANUAL_TRIP("Manual reactor trip"),
	RESET_TRIP("Reset reactor trip breakers"),
	ROD_OUT("Control rods: withdraw"),
	ROD_IN("Control rods: insert"),
	ROD_STOP("Control rods: stop"),
	ROD_AUTO("Rod control: automatic"),
	ROD_MANUAL("Rod control: manual"),
	SHUTDOWN_BANKS_OUT("Withdraw shutdown banks"),
	SHUTDOWN_BANKS_IN("Insert shutdown banks"),
	BORON_ADJUST("Change boron target"),
	BORON_HOLD("Stop boration / dilution"),
	EQUIP_START("Start equipment"),
	EQUIP_STOP("Stop equipment"),
	PZR_HEATERS_AUTO("Pressurizer heaters: auto"),
	PZR_HEATERS_ON("Pressurizer heaters: on"),
	PZR_HEATERS_OFF("Pressurizer heaters: off"),
	SPRAY_AUTO("Pressurizer spray: auto"),
	SPRAY_OPEN("Pressurizer spray: open"),
	SPRAY_CLOSE("Pressurizer spray: close"),
	PORV_AUTO("PORV: auto"),
	PORV_OPEN("PORV: open"),
	PORV_CLOSE("PORV: close"),
	PORV_BLOCK("PORV block valve toggle"),
	FEED_AUTO("Feedwater control: auto"),
	FEED_MANUAL("Feedwater control: manual"),
	MFW_RESET("Reset feedwater isolation"),
	MSIV_OPEN("Open MSIVs"),
	MSIV_CLOSE("Close MSIVs"),
	ADV_AUTO("Atmospheric dumps: auto"),
	ADV_MANUAL("Atmospheric dumps: manual"),
	STEAM_DUMP_ARM("Arm condenser steam dumps"),
	STEAM_DUMP_BLOCK("Block condenser steam dumps"),
	AFW_SUCTION_SWAP("Swap AFW suction CST/ESW"),
	TURBINE_LATCH("Latch turbine"),
	TURBINE_TRIP("Trip turbine"),
	TURBINE_SPEED("Turbine speed setpoint"),
	GENERATOR_SYNC("Synchronise generator"),
	GENERATOR_OPEN("Open generator breaker"),
	LOAD_SETPOINT("Turbine load setpoint"),
	LOAD_ADJUST("Turbine load adjust"),
	RAMP_RATE("Load ramp rate"),
	TOWERS("Cooling towers in service"),
	EDG_START("Start diesel generator"),
	EDG_STOP("Stop diesel generator"),
	OFFSITE_CLOSE("Close offsite supply breaker"),
	OFFSITE_OPEN("Open offsite supply breaker"),
	SI_MANUAL("Manual safety injection"),
	SI_RESET("Reset safety injection"),
	SI_BLOCK("Block low-pressure SI (P-11)"),
	STEAMLINE_SI_BLOCK("Block steam line SI"),
	SPRAY_RESET("Reset containment spray"),
	RHR_COOLDOWN_ON("Place RHR in shutdown cooling"),
	RHR_COOLDOWN_OFF("Remove RHR from shutdown cooling"),
	RECIRC_SWITCHOVER("Switch ECCS to sump recirculation"),
	LETDOWN_ON("Restore letdown"),
	LETDOWN_OFF("Isolate letdown"),
	IGNITERS_ON("Hydrogen igniters on"),
	IGNITERS_OFF("Hydrogen igniters off"),
	VENT_OPEN("Open filtered containment vent"),
	VENT_CLOSE("Close filtered containment vent"),
	SFP_MAKEUP_ON("Spent fuel pool makeup on"),
	SFP_MAKEUP_OFF("Spent fuel pool makeup off"),
	ALARM_ACK("Acknowledge alarms"),
	ALARM_RESET("Reset cleared alarms"),
	ALARM_SILENCE("Silence horn"),
	SIREN_AUTO("Site sirens: automatic"),
	SIREN_ON("Site sirens: sound"),
	SIREN_OFF("Site sirens: silence");

	public final String label;

	PlantCommand(String label) {
		this.label = label;
	}

	public record Result(boolean accepted, String message) {
		public static Result ok(String message) {
			return new Result(true, message);
		}

		public static Result blocked(String message) {
			return new Result(false, message);
		}
	}
}
