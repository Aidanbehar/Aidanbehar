package dev.aidanbehar.nuclearstation.sim;

import java.util.Arrays;

/**
 * Four-channel instrumentation with fault injection. Channel i is housed in protection
 * rack INSTR_A..D. A channel without rack power or with a failed rack reads NaN and is
 * treated as tripped by the protection logic (de-energise-to-trip design).
 */
public final class Sensors {
	public enum Fault {
		NONE, STUCK, DRIFT_HIGH, DRIFT_LOW, FAIL_HIGH, FAIL_LOW
	}

	private static final int N = SensorId.values().length;
	final Fault[][] fault = new Fault[N][4];
	final double[][] faultValue = new double[N][4];
	final double[][] reading = new double[N][4];

	public Sensors() {
		for (Fault[] row : fault) {
			Arrays.fill(row, Fault.NONE);
		}
	}

	void measure(SensorId id, double trueValue, boolean[] channelPowered, double dt) {
		int s = id.ordinal();
		for (int ch = 0; ch < 4; ch++) {
			if (!channelPowered[ch]) {
				reading[s][ch] = Double.NaN;
				continue;
			}
			double v = switch (fault[s][ch]) {
				case NONE -> trueValue;
				case STUCK -> faultValue[s][ch];
				case DRIFT_HIGH, DRIFT_LOW -> {
					double rate = (fault[s][ch] == Fault.DRIFT_HIGH ? 1 : -1) * Math.max(Math.abs(trueValue), 1.0) * 0.002;
					faultValue[s][ch] += rate * dt;
					yield trueValue + faultValue[s][ch];
				}
				case FAIL_HIGH -> fullScale(id);
				case FAIL_LOW -> 0.0;
			};
			reading[s][ch] = v;
		}
	}

	static double fullScale(SensorId id) {
		return switch (id) {
			case POWER_RANGE -> 120;
			case PZR_PRESSURE -> 20.7;
			case RCS_FLOW -> 120;
			case SG_LEVEL -> 100;
			case T_HOT -> 370;
			case CONT_PRESSURE -> 700;
		};
	}

	public double channel(SensorId id, int ch) {
		return reading[id.ordinal()][ch];
	}

	public Fault fault(SensorId id, int ch) {
		return fault[id.ordinal()][ch];
	}

	/** Median of valid channels; NaN if fewer than one valid channel. */
	public double indicated(SensorId id) {
		double[] r = reading[id.ordinal()];
		double[] valid = new double[4];
		int k = 0;
		for (double v : r) {
			if (!Double.isNaN(v)) {
				valid[k++] = v;
			}
		}
		if (k == 0) {
			return Double.NaN;
		}
		Arrays.sort(valid, 0, k);
		return k % 2 == 1 ? valid[k / 2] : 0.5 * (valid[k / 2 - 1] + valid[k / 2]);
	}

	/** Number of channels voting for a trip: above (or below) the setpoint, or unpowered. */
	public int votes(SensorId id, double setpoint, boolean tripHigh) {
		int votes = 0;
		for (double v : reading[id.ordinal()]) {
			if (Double.isNaN(v) || (tripHigh ? v >= setpoint : v <= setpoint)) {
				votes++;
			}
		}
		return votes;
	}

	public boolean anyDeviation() {
		for (SensorId id : SensorId.values()) {
			double med = indicated(id);
			if (Double.isNaN(med)) {
				continue;
			}
			for (double v : reading[id.ordinal()]) {
				if (!Double.isNaN(v) && Math.abs(v - med) > id.deviationThreshold) {
					return true;
				}
			}
		}
		return false;
	}

	public boolean anyFailedChannel() {
		for (double[] row : reading) {
			for (double v : row) {
				if (Double.isNaN(v)) {
					return true;
				}
			}
		}
		return false;
	}

	void inject(SensorId id, int ch, Fault f, double currentValue) {
		fault[id.ordinal()][ch] = f;
		faultValue[id.ordinal()][ch] = f == Fault.STUCK ? currentValue : 0.0;
	}

	/** Clears all faults on one channel (rack repaired). */
	void clearChannel(int ch) {
		for (int s = 0; s < N; s++) {
			fault[s][ch] = Fault.NONE;
			faultValue[s][ch] = 0;
		}
	}

	void save(StateIO.Writer w) {
		for (SensorId id : SensorId.values()) {
			for (int ch = 0; ch < 4; ch++) {
				if (fault[id.ordinal()][ch] != Fault.NONE) {
					StateIO.Writer c = w.child(id.name() + "_" + ch);
					c.putString("f", fault[id.ordinal()][ch].name());
					c.putDouble("v", faultValue[id.ordinal()][ch]);
				}
			}
		}
	}

	void load(StateIO.Reader r) {
		for (SensorId id : SensorId.values()) {
			for (int ch = 0; ch < 4; ch++) {
				String key = id.name() + "_" + ch;
				if (r.has(key)) {
					StateIO.Reader c = r.child(key);
					try {
						fault[id.ordinal()][ch] = Fault.valueOf(c.getString("f", "NONE"));
					} catch (IllegalArgumentException e) {
						fault[id.ordinal()][ch] = Fault.NONE;
					}
					faultValue[id.ordinal()][ch] = c.getDouble("v", 0);
				} else {
					fault[id.ordinal()][ch] = Fault.NONE;
				}
			}
		}
	}
}
