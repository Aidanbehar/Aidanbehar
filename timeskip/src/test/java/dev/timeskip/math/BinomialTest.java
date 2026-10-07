package dev.timeskip.math;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

class BinomialTest {

    /** Goodness of fit against the exact binomial pmf, covering the inversion and BTPE branches. */
    @ParameterizedTest(name = "n={0}, p={1}")
    @CsvSource({
            "20, 0.3",          // inversion
            "1000, 0.01",       // inversion, small mean
            "1000, 0.2",        // BTPE
            "100000, 0.5",      // BTPE, symmetric
            "50, 0.9",          // p > 0.5 path
            "2000000000000, 0.00000000002", // huge n, tiny p (mean 40, BTPE)
            "3000000000000000, 0.000000000000005", // n = 3e15 trials (100M years), mean 15, inversion
    })
    void matchesExactDistribution(long n, double p) {
        int samples = 200_000;
        Rng rng = new Rng(Rng.seed(n, Double.doubleToLongBits(p)));
        double mean = n * p;
        double sd = Math.sqrt(mean * (1 - p));
        long lo = Math.max(0, (long) Math.floor(mean - 7 * sd - 2));
        long hi = Math.min(n, (long) Math.ceil(mean + 7 * sd + 2));
        int width = (int) (hi - lo + 1);
        long[] observed = new long[width];
        for (int i = 0; i < samples; i++) {
            long k = Binomial.sample(n, p, rng);
            assertTrue(k >= 0 && k <= n);
            if (k >= lo && k <= hi) {
                observed[(int) (k - lo)]++;
            }
        }
        // Merge bins until each expected count is at least 5.
        double chi = 0;
        int df = -1;
        double expAcc = 0;
        long obsAcc = 0;
        for (int i = 0; i < width; i++) {
            expAcc += samples * Stats.binomialPmf(n, p, lo + i);
            obsAcc += observed[i];
            if (expAcc >= 5 || i == width - 1) {
                chi += (obsAcc - expAcc) * (obsAcc - expAcc) / Math.max(expAcc, 1e-9);
                df++;
                expAcc = 0;
                obsAcc = 0;
            }
        }
        assertTrue(chi < Stats.chiSquareCritical(Math.max(1, df)),
                "chi-square " + chi + " too large for df=" + df);
    }

    @Test
    void normalBranchHasRightMoments() {
        long n = 900_000_000_000_000_000L; // beyond 2^53
        double p = 1.0e-15;
        Rng rng = new Rng(7);
        int samples = 50_000;
        double sum = 0;
        double sumSq = 0;
        for (int i = 0; i < samples; i++) {
            double k = Binomial.sample(n, p, rng);
            sum += k;
            sumSq += k * k;
        }
        double mean = sum / samples;
        double variance = sumSq / samples - mean * mean;
        double expected = n * p;
        assertEquals(expected, mean, 6 * Math.sqrt(expected / samples));
        assertEquals(expected, variance, expected * 0.05);
    }

    @Test
    void edgeCases() {
        Rng rng = new Rng(1);
        assertEquals(0, Binomial.sample(0, 0.5, rng));
        assertEquals(0, Binomial.sample(100, 0.0, rng));
        assertEquals(100, Binomial.sample(100, 1.0, rng));
        assertEquals(0, Binomial.sample(-5, 0.5, rng));
    }
}
