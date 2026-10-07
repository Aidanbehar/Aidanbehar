package dev.timeskip.math;

/** Small statistics helpers for the tests. */
final class Stats {
    private Stats() {
    }

    /** Upper critical value of chi-square with {@code df} degrees of freedom (Wilson-Hilferty), p ≈ 0.0005. */
    static double chiSquareCritical(int df) {
        double z = 3.29;
        double a = 2.0 / (9.0 * df);
        return df * Math.pow(1 - a + z * Math.sqrt(a), 3);
    }

    /** Lanczos approximation of ln Γ(x). */
    static double lnGamma(double x) {
        double[] g = {676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
                12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7};
        if (x < 0.5) {
            return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
        }
        x -= 1;
        double a = 0.99999999999980993;
        double t = x + 7.5;
        for (int i = 0; i < g.length; i++) {
            a += g[i] / (x + i + 1);
        }
        return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
    }

    static double binomialPmf(long n, double p, long k) {
        // For huge n, lnGamma(n) - lnGamma(n - k) cancels catastrophically in double precision;
        // summing log(n - i) over the k factors of the falling factorial is exact enough.
        double logC;
        if (k < 100_000) {
            double logFalling = 0;
            for (long i = 0; i < k; i++) {
                logFalling += Math.log((double) (n - i));
            }
            logC = logFalling - lnGamma(k + 1.0);
        } else {
            logC = lnGamma(n + 1.0) - lnGamma(k + 1.0) - lnGamma(n - k + 1.0);
        }
        return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log1p(-p));
    }

    /**
     * Two-sample chi-square homogeneity statistic over categories, merging sparse categories so
     * each expected count is at least 5. Returns {statistic, degreesOfFreedom}.
     */
    static double[] homogeneity(long[] a, long[] b) {
        long na = 0;
        long nb = 0;
        for (int i = 0; i < a.length; i++) {
            na += a[i];
            nb += b[i];
        }
        java.util.List<long[]> merged = new java.util.ArrayList<>();
        long ca = 0;
        long cb = 0;
        for (int i = 0; i < a.length; i++) {
            ca += a[i];
            cb += b[i];
            double expectedMin = Math.min((ca + cb) * (double) na / (na + nb), (ca + cb) * (double) nb / (na + nb));
            if (expectedMin >= 5) {
                merged.add(new long[] {ca, cb});
                ca = 0;
                cb = 0;
            }
        }
        if (ca + cb > 0) {
            if (merged.isEmpty()) {
                merged.add(new long[] {ca, cb});
            } else {
                long[] last = merged.get(merged.size() - 1);
                last[0] += ca;
                last[1] += cb;
            }
        }
        double stat = 0;
        for (long[] cell : merged) {
            double total = cell[0] + cell[1];
            double ea = total * na / (na + nb);
            double eb = total * nb / (na + nb);
            stat += (cell[0] - ea) * (cell[0] - ea) / ea + (cell[1] - eb) * (cell[1] - eb) / eb;
        }
        return new double[] {stat, Math.max(1, merged.size() - 1)};
    }
}
