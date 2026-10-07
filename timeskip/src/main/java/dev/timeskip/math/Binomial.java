package dev.timeskip.math;

/**
 * Exact binomial sampling for the huge trial counts a long time skip produces.
 *
 * <p>Uses inversion for small means and the BTPE algorithm (Kachitvichyanukul &amp; Schmeiser,
 * 1988 — the same pair numpy uses) otherwise. Trial counts beyond 2^53, where {@code double}
 * stops representing every integer, fall back to a normal approximation whose error at that
 * scale is far below one part in a billion.
 */
public final class Binomial {
    private static final double TWO_POW_53 = 9007199254740992.0;
    private static final double INVERSION_MEAN_LIMIT = 30.0;

    private Binomial() {
    }

    /** Draws the number of successes in {@code n} independent trials of probability {@code p}. */
    public static long sample(long n, double p, Rng rng) {
        if (n <= 0 || p <= 0.0 || Double.isNaN(p)) {
            return 0;
        }
        if (p >= 1.0) {
            return n;
        }
        if (p > 0.5) {
            return n - sample(n, 1.0 - p, rng);
        }
        double mean = n * p;
        if (mean < INVERSION_MEAN_LIMIT) {
            return inversion(n, p, rng);
        }
        if (n >= TWO_POW_53) {
            return normal(n, p, rng);
        }
        return btpe(n, p, rng);
    }

    /** Expected value helper used by saturation checks. */
    public static double mean(long n, double p) {
        return n * p;
    }

    public static double stdDev(long n, double p) {
        return Math.sqrt(n * p * (1.0 - p));
    }

    static long normal(long n, double p, Rng rng) {
        double mean = n * p;
        double sd = Math.sqrt(mean * (1.0 - p));
        double x = Math.rint(mean + sd * rng.nextGaussian());
        if (x < 0) {
            return 0;
        }
        return x >= n ? n : (long) x;
    }

    static long inversion(long n, double p, Rng rng) {
        double q = 1.0 - p;
        double qn = Math.exp(n * Math.log1p(-p));
        double np = n * p;
        double bound = Math.min((double) n, np + 10.0 * Math.sqrt(np * q + 1));
        long x = 0;
        double px = qn;
        double u = rng.nextDouble();
        while (u > px) {
            x++;
            if (x > bound) {
                x = 0;
                px = qn;
                u = rng.nextDouble();
            } else {
                u -= px;
                px = ((n - x + 1) * p * px) / (x * q);
            }
        }
        return x;
    }

    static long btpe(long nLong, double p, Rng rng) {
        double n = nLong;
        double r = Math.min(p, 1.0 - p);
        double q = 1.0 - r;
        double fm = n * r + r;
        double m = Math.floor(fm);
        double p1 = Math.floor(2.195 * Math.sqrt(n * r * q) - 4.6 * q) + 0.5;
        double xm = m + 0.5;
        double xl = xm - p1;
        double xr = xm + p1;
        double c = 0.134 + 20.5 / (15.3 + m);
        double a = (fm - xl) / (fm - xl * r);
        double laml = a * (1.0 + a / 2.0);
        a = (xr - fm) / (xr * q);
        double lamr = a * (1.0 + a / 2.0);
        double p2 = p1 * (1.0 + 2.0 * c);
        double p3 = p2 + c / laml;
        double p4 = p3 + c / lamr;
        double nrq = n * r * q;

        while (true) {
            double u = rng.nextDouble() * p4;
            double v = rng.nextDouble();
            double y;
            if (u <= p1) {
                y = Math.floor(xm - p1 * v + u);
                return finish(y, nLong, p);
            }
            if (u <= p2) {
                double x = xl + (u - p1) / c;
                v = v * c + 1.0 - Math.abs(m - x + 0.5) / p1;
                if (v > 1.0) {
                    continue;
                }
                y = Math.floor(x);
            } else if (u <= p3) {
                y = Math.floor(xl + Math.log(v) / laml);
                if (y < 0 || v == 0.0) {
                    continue;
                }
                v = v * (u - p2) * laml;
            } else {
                y = Math.floor(xr - Math.log(v) / lamr);
                if (y > n || v == 0.0) {
                    continue;
                }
                v = v * (u - p3) * lamr;
            }

            double k = Math.abs(y - m);
            if (!(k > 20 && k < nrq / 2.0 - 1)) {
                // Explicit evaluation of f(y)/f(m) by recursion.
                double s = r / q;
                double aa = s * (n + 1);
                double f = 1.0;
                if (m < y) {
                    for (double i = m + 1; i <= y; i++) {
                        f *= (aa / i - s);
                    }
                } else if (m > y) {
                    for (double i = y + 1; i <= m; i++) {
                        f /= (aa / i - s);
                    }
                }
                if (v > f) {
                    continue;
                }
                return finish(y, nLong, p);
            }

            // Squeezing using upper and lower bounds on log(f(y)).
            double rho = (k / nrq) * ((k * (k / 3.0 + 0.625) + 0.16666666666666666) / nrq + 0.5);
            double t = -k * k / (2 * nrq);
            double logV = Math.log(v);
            if (logV < t - rho) {
                return finish(y, nLong, p);
            }
            if (logV > t + rho) {
                continue;
            }
            double x1 = y + 1;
            double f1 = m + 1;
            double z = n + 1 - m;
            double w = n - y + 1;
            double x2 = x1 * x1;
            double f2 = f1 * f1;
            double z2 = z * z;
            double w2 = w * w;
            double bound = xm * Math.log(f1 / x1)
                    + (n - m + 0.5) * Math.log(z / w)
                    + (y - m) * Math.log(w * r / (x1 * q))
                    + stirlingTail(f1, f2)
                    + stirlingTail(z, z2)
                    + stirlingTail(x1, x2)
                    + stirlingTail(w, w2);
            if (logV > bound) {
                continue;
            }
            return finish(y, nLong, p);
        }
    }

    private static double stirlingTail(double v, double v2) {
        return (13680.0 - (462.0 - (132.0 - (99.0 - 140.0 / v2) / v2) / v2) / v2) / v / 166320.0;
    }

    private static long finish(double y, long n, double p) {
        long result = (long) y;
        if (p > 0.5) {
            result = n - result;
        }
        return Math.max(0, Math.min(n, result));
    }
}
