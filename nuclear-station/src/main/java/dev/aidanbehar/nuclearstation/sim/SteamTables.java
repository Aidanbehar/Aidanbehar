package dev.aidanbehar.nuclearstation.sim;

/**
 * Saturation properties of water, interpolated from the IAPWS-IF97 saturation line.
 * Temperatures are in degrees Celsius, pressures in MPa (absolute).
 * Interpolation is linear in temperature against ln(pressure), which is accurate to
 * well under 1% over the whole liquid/vapour range used by the plant.
 */
public final class SteamTables {
	private static final double[] T = {
		0.01, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 220, 240,
		260, 280, 290, 300, 310, 320, 330, 340, 350, 360, 370, 373.946
	};
	private static final double[] P = {
		0.000612, 0.001228, 0.002339, 0.004247, 0.007384, 0.012352, 0.019946, 0.031201,
		0.047414, 0.070182, 0.101418, 0.198665, 0.36154, 0.61814, 1.0028, 1.5549, 2.3196,
		3.3469, 4.6923, 6.4166, 7.4418, 8.5879, 9.8651, 11.284, 12.858, 14.601, 16.529,
		18.666, 21.044, 22.064
	};
	private static final double[] LN_P = new double[P.length];

	public static final double CRITICAL_T = 373.946;
	public static final double CRITICAL_P = 22.064;

	static {
		for (int i = 0; i < P.length; i++) {
			LN_P[i] = Math.log(P[i]);
		}
	}

	private SteamTables() {
	}

	/** Saturation pressure (MPa) at temperature t (C). Above the critical point the critical pressure is returned. */
	public static double psat(double t) {
		if (t <= T[0]) {
			return P[0];
		}
		if (t >= CRITICAL_T) {
			return CRITICAL_P;
		}
		int i = 1;
		while (T[i] < t) {
			i++;
		}
		double f = (t - T[i - 1]) / (T[i] - T[i - 1]);
		return Math.exp(LN_P[i - 1] + f * (LN_P[i] - LN_P[i - 1]));
	}

	/** Saturation temperature (C) at pressure p (MPa). */
	public static double tsat(double p) {
		if (p <= P[0]) {
			return T[0];
		}
		if (p >= CRITICAL_P) {
			return CRITICAL_T;
		}
		double lp = Math.log(p);
		int i = 1;
		while (LN_P[i] < lp) {
			i++;
		}
		double f = (lp - LN_P[i - 1]) / (LN_P[i] - LN_P[i - 1]);
		return T[i - 1] + f * (T[i] - T[i - 1]);
	}

	private static final double[] HT = {0, 50, 100, 150, 200, 250, 285, 300, 320, 340, 360, 373.946};
	private static final double[] HF = {0.0, 0.2093, 0.4190, 0.6322, 0.8524, 1.0855, 1.2619, 1.3442, 1.4619, 1.5946, 1.7608, 2.0843};
	private static final double[] HFG = {2.5009, 2.3823, 2.2564, 2.1140, 1.9404, 1.7154, 1.5045, 1.4048, 1.2385, 1.0272, 0.7200, 0.0};

	/** Saturated liquid enthalpy, MJ/kg. */
	public static double hf(double t) {
		return interp(HT, HF, t);
	}

	/** Latent heat of vaporisation, MJ/kg. */
	public static double hfg(double t) {
		return Math.max(0.05, interp(HT, HFG, t));
	}

	private static double interp(double[] xs, double[] ys, double x) {
		if (x <= xs[0]) {
			return ys[0];
		}
		if (x >= xs[xs.length - 1]) {
			return ys[ys.length - 1];
		}
		int i = 1;
		while (xs[i] < x) {
			i++;
		}
		double f = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
		return ys[i - 1] + f * (ys[i] - ys[i - 1]);
	}

	/**
	 * Specific volume of subcooled/saturated liquid relative to liquid at the no-load
	 * average temperature (292 C, 15.5 MPa). Used to convert coolant mass into level.
	 */
	public static double relativeLiquidVolume(double t) {
		if (t < 292) {
			return Math.max(0.70, 1.0 - 0.00106 * (292 - t));
		}
		return 1.0 + 0.0030 * Math.min(t - 292, 60);
	}
}
