package dev.aidanbehar.nuclearstation.sim;

/** Electrical buses. NS = non-safety 6.9 kV, S = safety (Class 1E) 4.16 kV, DC = 125 V DC. */
public enum Bus {
	NS1("6.9 kV Bus NS-1", false),
	NS2("6.9 kV Bus NS-2", false),
	SA("4.16 kV Safety Bus A", true),
	SB("4.16 kV Safety Bus B", true),
	DCA("125 V DC Bus A", true),
	DCB("125 V DC Bus B", true),
	/** Equipment that needs no electrical power (steam driven, passive). */
	NONE("No electrical supply", false);

	public final String label;
	public final boolean safety;

	Bus(String label, boolean safety) {
		this.label = label;
		this.safety = safety;
	}
}
