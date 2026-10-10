package dev.aidanbehar.nuclearstation.sim;

/**
 * Six-group point reactor kinetics, integrated with backward (implicit) Euler so that
 * the very short prompt-neutron generation time does not make the integration unstable.
 *
 * <p>The neutron population {@code n} is normalised so that 1.0 equals rated thermal
 * power. Precursor concentrations are stored in the same normalisation, scaled so that
 * at steady state {@code c[i] = beta[i] * n / (lambda[i] * generationTime)}.
 *
 * <p>Equations (reactivity rho is dimensionless, dk/k):
 * <pre>
 *   dn/dt   = (rho - beta) / L * n + sum(lambda_i c_i) + S
 *   dc_i/dt = beta_i / L * n - lambda_i c_i
 * </pre>
 * Backward Euler for a fixed rho over the step gives a closed form solution for n.
 */
public final class PointKinetics {
	public static final double[] BETA = {0.000215, 0.001424, 0.001274, 0.002568, 0.000748, 0.000273};
	public static final double[] LAMBDA = {0.0124, 0.0305, 0.111, 0.301, 1.14, 3.01};
	public static final double BETA_TOTAL;
	/** Prompt neutron generation time, seconds. Typical light-water reactor value. */
	public static final double GENERATION_TIME = 2.0e-5;

	static {
		double b = 0;
		for (double v : BETA) {
			b += v;
		}
		BETA_TOTAL = b;
	}

	private double n;
	private final double[] c = new double[6];
	private double period = Double.POSITIVE_INFINITY;

	public PointKinetics(double initialPower) {
		setEquilibrium(initialPower);
	}

	/** Puts precursors in equilibrium with the given power (critical, no source). */
	public void setEquilibrium(double power) {
		this.n = Math.max(power, 1e-14);
		for (int i = 0; i < 6; i++) {
			c[i] = BETA[i] * n / (LAMBDA[i] * GENERATION_TIME);
		}
		period = Double.POSITIVE_INFINITY;
	}

	/**
	 * Advances the kinetics by dt seconds at constant reactivity rho with an external
	 * neutron source s (same units as dn/dt).
	 */
	public void step(double rho, double dt, double source) {
		double before = n;
		double denom = 1.0 - dt * (rho - BETA_TOTAL) / GENERATION_TIME;
		double rhs = n + dt * source;
		for (int i = 0; i < 6; i++) {
			double k = 1.0 + LAMBDA[i] * dt;
			denom -= dt * LAMBDA[i] * dt * BETA[i] / (GENERATION_TIME * k);
			rhs += dt * LAMBDA[i] * c[i] / k;
		}
		double nNew = rhs / denom;
		if (!(nNew > 0) || Double.isNaN(nNew)) {
			nNew = 1e-14;
		}
		// Physical cap: an excursion this large would already have destroyed the core
		// geometry; the thermal model handles the consequences.
		nNew = Math.min(nNew, 50.0);
		for (int i = 0; i < 6; i++) {
			c[i] = (c[i] + dt * BETA[i] * nNew / GENERATION_TIME) / (1.0 + LAMBDA[i] * dt);
		}
		n = nNew;
		double growth = Math.log(n / before) / dt;
		period = Math.abs(growth) < 1e-9 ? Double.POSITIVE_INFINITY : 1.0 / growth;
	}

	public double power() {
		return n;
	}

	public double[] precursors() {
		return c;
	}

	/** Reactor period in seconds (positive = rising power). Infinite when steady. */
	public double period() {
		return period;
	}

	/** Startup rate in decades per minute. */
	public double startupRate() {
		if (Double.isInfinite(period)) {
			return 0;
		}
		return 60.0 / (Math.log(10) * period);
	}

	public void load(double n, double[] precursors) {
		this.n = Math.max(1e-14, n);
		System.arraycopy(precursors, 0, c, 0, 6);
	}
}
