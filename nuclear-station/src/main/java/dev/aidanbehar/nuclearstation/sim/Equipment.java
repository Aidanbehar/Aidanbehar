package dev.aidanbehar.nuclearstation.sim;

/**
 * Mutable state of one piece of equipment.
 *
 * <p>{@code demanded} is what the operator or automatic logic wants; {@code running} is
 * what the equipment actually does once power and failures are taken into account.
 * Rotating equipment has a {@code speed} that coasts down after a trip (pump flywheels).
 */
public final class Equipment {
	public final EquipmentId id;
	public boolean demanded;
	public boolean running;
	public boolean failed;
	/** 1.0 = as new, 0.0 = worn out. Drives failure probability. */
	public double condition = 1.0;
	/** Normalised speed 0..1 for rotating equipment (coastdown and spin-up). */
	public double speed;
	/** Accumulated operating time in plant seconds. */
	public double runSeconds;
	public String failureCause = "";
	/** Starts since last maintenance; frequent starts add wear. */
	public int starts;

	public Equipment(EquipmentId id) {
		this.id = id;
	}

	public boolean available() {
		return !failed;
	}

	public void fail(String cause) {
		if (!failed) {
			failed = true;
			failureCause = cause;
		}
	}

	public void repair() {
		failed = false;
		failureCause = "";
		condition = 1.0;
		starts = 0;
	}

	void save(StateIO.Writer w) {
		w.putBoolean("demanded", demanded);
		w.putBoolean("running", running);
		w.putBoolean("failed", failed);
		w.putDouble("condition", condition);
		w.putDouble("speed", speed);
		w.putDouble("runSeconds", runSeconds);
		w.putString("cause", failureCause);
		w.putInt("starts", starts);
	}

	void load(StateIO.Reader r) {
		demanded = r.getBoolean("demanded", demanded);
		running = r.getBoolean("running", running);
		failed = r.getBoolean("failed", failed);
		condition = r.getDouble("condition", condition);
		speed = r.getDouble("speed", speed);
		runSeconds = r.getDouble("runSeconds", runSeconds);
		failureCause = r.getString("cause", failureCause);
		starts = r.getInt("starts", starts);
	}
}
