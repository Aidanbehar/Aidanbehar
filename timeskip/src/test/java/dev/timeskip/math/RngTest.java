package dev.timeskip.math;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class RngTest {
    @Test
    void sameSeedSameSequence() {
        Rng a = new Rng(Rng.seed(1, 2, 3));
        Rng b = new Rng(Rng.seed(1, 2, 3));
        for (int i = 0; i < 1000; i++) {
            assertEquals(a.nextLong(), b.nextLong());
        }
    }

    @Test
    void seedDependsOnEveryPartAndOrder() {
        assertNotEquals(Rng.seed(1, 2, 3), Rng.seed(1, 2, 4));
        assertNotEquals(Rng.seed(1, 2, 3), Rng.seed(3, 2, 1));
        assertNotEquals(Rng.packPos(1, 2, 3), Rng.packPos(3, 2, 1));
    }

    @Test
    void nextIntIsUniform() {
        Rng rng = new Rng(77);
        int bound = 7;
        long[] counts = new long[bound];
        int n = 700_000;
        for (int i = 0; i < n; i++) {
            counts[rng.nextInt(bound)]++;
        }
        double chi = 0;
        double expected = n / (double) bound;
        for (long c : counts) {
            chi += (c - expected) * (c - expected) / expected;
        }
        assertTrue(chi < Stats.chiSquareCritical(bound - 1));
    }

    @Test
    void doublesStayInRange() {
        Rng rng = new Rng(5);
        for (int i = 0; i < 100_000; i++) {
            double d = rng.nextDouble();
            double nz = rng.nextDoubleNonZero();
            assertTrue(d >= 0 && d < 1);
            assertTrue(nz > 0 && nz <= 1);
        }
    }
}
