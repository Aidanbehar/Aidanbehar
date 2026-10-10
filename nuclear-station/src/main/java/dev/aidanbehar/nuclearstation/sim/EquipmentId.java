package dev.aidanbehar.nuclearstation.sim;

/**
 * Every individually simulated piece of plant equipment. Each item has a supply bus,
 * an electrical load when running (MW), the spare part needed to repair it and the
 * plant area where its local control station is found.
 */
public enum EquipmentId {
	RCP_A("Reactor Coolant Pump A", Kind.PUMP, Bus.NS1, 6.0, SparePart.PUMP_SEAL_KIT, Area.CONTAINMENT),
	RCP_B("Reactor Coolant Pump B", Kind.PUMP, Bus.NS1, 6.0, SparePart.PUMP_SEAL_KIT, Area.CONTAINMENT),
	RCP_C("Reactor Coolant Pump C", Kind.PUMP, Bus.NS2, 6.0, SparePart.PUMP_SEAL_KIT, Area.CONTAINMENT),
	RCP_D("Reactor Coolant Pump D", Kind.PUMP, Bus.NS2, 6.0, SparePart.PUMP_SEAL_KIT, Area.CONTAINMENT),
	MFW_A("Main Feedwater Pump A", Kind.PUMP, Bus.NS1, 8.0, SparePart.MOTOR_ASSEMBLY, Area.TURBINE_HALL),
	MFW_B("Main Feedwater Pump B", Kind.PUMP, Bus.NS2, 8.0, SparePart.MOTOR_ASSEMBLY, Area.TURBINE_HALL),
	CW_1("Circulating Water Pump 1", Kind.PUMP, Bus.NS1, 4.0, SparePart.MOTOR_ASSEMBLY, Area.PUMP_HOUSE),
	CW_2("Circulating Water Pump 2", Kind.PUMP, Bus.NS1, 4.0, SparePart.MOTOR_ASSEMBLY, Area.PUMP_HOUSE),
	CW_3("Circulating Water Pump 3", Kind.PUMP, Bus.NS2, 4.0, SparePart.MOTOR_ASSEMBLY, Area.PUMP_HOUSE),
	CW_4("Circulating Water Pump 4", Kind.PUMP, Bus.NS2, 4.0, SparePart.MOTOR_ASSEMBLY, Area.PUMP_HOUSE),
	MDAFW_A("Motor-Driven Aux Feed Pump A", Kind.PUMP, Bus.SA, 0.6, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	MDAFW_B("Motor-Driven Aux Feed Pump B", Kind.PUMP, Bus.SB, 0.6, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	TDAFW("Turbine-Driven Aux Feed Pump", Kind.PUMP, Bus.NONE, 0.0, SparePart.BEARING_SET, Area.AUX_BUILDING),
	CHG_A("Charging / High-Head SI Pump A", Kind.PUMP, Bus.SA, 0.9, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	CHG_B("Charging / High-Head SI Pump B", Kind.PUMP, Bus.SB, 0.9, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	SI_A("Safety Injection Pump A", Kind.PUMP, Bus.SA, 0.7, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	SI_B("Safety Injection Pump B", Kind.PUMP, Bus.SB, 0.7, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	RHR_A("Residual Heat Removal Pump A", Kind.PUMP, Bus.SA, 0.5, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	RHR_B("Residual Heat Removal Pump B", Kind.PUMP, Bus.SB, 0.5, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	CCW_A("Component Cooling Water Pump A", Kind.PUMP, Bus.SA, 0.5, SparePart.MOTOR_ASSEMBLY, Area.AUX_BUILDING),
	CCW_B("Component Cooling Water Pump B", Kind.PUMP, Bus.SB, 0.5, SparePart.MOTOR_ASSEMBLY, Area.AUX_BUILDING),
	ESW_A("Essential Service Water Pump A", Kind.PUMP, Bus.SA, 0.6, SparePart.MOTOR_ASSEMBLY, Area.PUMP_HOUSE),
	ESW_B("Essential Service Water Pump B", Kind.PUMP, Bus.SB, 0.6, SparePart.MOTOR_ASSEMBLY, Area.PUMP_HOUSE),
	CS_A("Containment Spray Pump A", Kind.PUMP, Bus.SA, 0.5, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	CS_B("Containment Spray Pump B", Kind.PUMP, Bus.SB, 0.5, SparePart.PUMP_SEAL_KIT, Area.AUX_BUILDING),
	CFC_A("Containment Fan Cooler A", Kind.FAN, Bus.SA, 0.3, SparePart.MOTOR_ASSEMBLY, Area.CONTAINMENT),
	CFC_B("Containment Fan Cooler B", Kind.FAN, Bus.SB, 0.3, SparePart.MOTOR_ASSEMBLY, Area.CONTAINMENT),
	SFP_A("Spent Fuel Pool Cooling Pump A", Kind.PUMP, Bus.SA, 0.2, SparePart.PUMP_SEAL_KIT, Area.FUEL_BUILDING),
	SFP_B("Spent Fuel Pool Cooling Pump B", Kind.PUMP, Bus.SB, 0.2, SparePart.PUMP_SEAL_KIT, Area.FUEL_BUILDING),
	EDG_A("Emergency Diesel Generator A", Kind.DIESEL, Bus.SA, 0.0, SparePart.DIESEL_SERVICE_KIT, Area.DIESEL_A),
	EDG_B("Emergency Diesel Generator B", Kind.DIESEL, Bus.SB, 0.0, SparePart.DIESEL_SERVICE_KIT, Area.DIESEL_B),
	BAT_A("Station Battery A", Kind.BATTERY, Bus.DCA, 0.0, SparePart.BATTERY_CELLS, Area.CONTROL_BUILDING),
	BAT_B("Station Battery B", Kind.BATTERY, Bus.DCB, 0.0, SparePart.BATTERY_CELLS, Area.CONTROL_BUILDING),
	PORV_1("Pressurizer PORV 1", Kind.VALVE, Bus.DCA, 0.0, SparePart.VALVE_ACTUATOR, Area.CONTAINMENT),
	PORV_2("Pressurizer PORV 2", Kind.VALVE, Bus.DCB, 0.0, SparePart.VALVE_ACTUATOR, Area.CONTAINMENT),
	PZR_HEATERS("Pressurizer Heaters", Kind.HEATER, Bus.SA, 1.8, SparePart.BREAKER_MODULE, Area.CONTAINMENT),
	IGNITERS("Hydrogen Igniters", Kind.HEATER, Bus.SA, 0.1, SparePart.BREAKER_MODULE, Area.CONTAINMENT),
	TURBINE("Main Turbine", Kind.TURBINE, Bus.NONE, 0.0, SparePart.BEARING_SET, Area.TURBINE_HALL),
	GENERATOR("Main Generator", Kind.ELECTRICAL, Bus.NONE, 0.0, SparePart.BREAKER_MODULE, Area.TURBINE_HALL),
	GSU("Main Step-Up Transformer", Kind.ELECTRICAL, Bus.NONE, 0.0, SparePart.TRANSFORMER_KIT, Area.SWITCHYARD),
	UAT("Unit Auxiliary Transformer", Kind.ELECTRICAL, Bus.NONE, 0.0, SparePart.TRANSFORMER_KIT, Area.SWITCHYARD),
	SST("Station Service Transformer", Kind.ELECTRICAL, Bus.NONE, 0.0, SparePart.TRANSFORMER_KIT, Area.SWITCHYARD),
	INSTR_A("Protection Channel I Rack", Kind.INSTRUMENT, Bus.DCA, 0.0, SparePart.INSTRUMENT_MODULE, Area.CONTROL_BUILDING),
	INSTR_B("Protection Channel II Rack", Kind.INSTRUMENT, Bus.DCB, 0.0, SparePart.INSTRUMENT_MODULE, Area.CONTROL_BUILDING),
	INSTR_C("Protection Channel III Rack", Kind.INSTRUMENT, Bus.DCA, 0.0, SparePart.INSTRUMENT_MODULE, Area.CONTROL_BUILDING),
	INSTR_D("Protection Channel IV Rack", Kind.INSTRUMENT, Bus.DCB, 0.0, SparePart.INSTRUMENT_MODULE, Area.CONTROL_BUILDING),
	INTAKE_SCREENS("Intake Travelling Screens", Kind.STRUCTURE, Bus.NS2, 0.2, SparePart.SCREEN_PANELS, Area.INTAKE);

	public final String label;
	public final Kind kind;
	public final Bus bus;
	public final double loadMW;
	public final SparePart part;
	public final Area area;

	EquipmentId(String label, Kind kind, Bus bus, double loadMW, SparePart part, Area area) {
		this.label = label;
		this.kind = kind;
		this.bus = bus;
		this.loadMW = loadMW;
		this.part = part;
		this.area = area;
	}

	public enum Kind {
		PUMP, FAN, VALVE, HEATER, DIESEL, BATTERY, TURBINE, ELECTRICAL, INSTRUMENT, STRUCTURE
	}

	/** Plant area housing the local control station. Used by the world layer to map stations. */
	public enum Area {
		CONTAINMENT, TURBINE_HALL, PUMP_HOUSE, AUX_BUILDING, FUEL_BUILDING, DIESEL_A, DIESEL_B,
		CONTROL_BUILDING, SWITCHYARD, INTAKE
	}
}
