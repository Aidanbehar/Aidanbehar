package dev.timeskip.math;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Checks the closed-form random-tick maths against a brute-force replay of what vanilla does every
 * tick: {@code randomTickSpeed} uniformly random positions out of 4096 per section, and a growth
 * roll of {@code nextInt(floor(25 / speed) + 1) == 0} when this block is hit.
 */
class RandomTickMathTest {
    private static final int SPEED = 3;
    private static final int MAX_AGE = 7;

    /** One crop, simulated tick by tick exactly like ServerLevel.tickChunk + CropBlock.randomTick. */
    private static int bruteForceCrop(long ticks, int chanceDivisor, Rng rng) {
        int age = 0;
        for (long t = 0; t < ticks && age < MAX_AGE; t++) {
            for (int i = 0; i < SPEED; i++) {
                if (rng.nextInt(4096) == 0 && rng.nextInt(chanceDivisor) == 0) {
                    age++;
                }
            }
        }
        return age;
    }

    @ParameterizedTest(name = "{0} ticks, 1/{1} growth chance")
    @CsvSource({
            "24000, 26",   // one day, dry farmland: crops barely start
            "24000, 13",   // one day, typical farm
            "72000, 13",   // three days: mid-growth spread
            "240000, 13",  // ten days: nearly all mature
            "48000, 3",    // best possible farm
    })
    void cropStageDistributionMatchesBruteForce(long ticks, int divisor) {
        int crops = 1500;
        long[] brute = new long[MAX_AGE + 1];
        long[] fast = new long[MAX_AGE + 1];
        Rng bruteRng = new Rng(ticks * 31 + divisor);
        Rng fastRng = new Rng(ticks * 17 + divisor + 99);
        long trials = RandomTickMath.trials(ticks, SPEED);
        for (int c = 0; c < crops; c++) {
            brute[bruteForceCrop(ticks, divisor, bruteRng)]++;
            fast[(int) RandomTickMath.successes(trials, 1.0 / divisor, MAX_AGE, fastRng)]++;
        }
        double[] chi = Stats.homogeneity(brute, fast);
        assertTrue(chi[0] < Stats.chiSquareCritical((int) chi[1]),
                "stage distributions differ: chi=" + chi[0] + " df=" + chi[1]
                        + "\nbrute=" + java.util.Arrays.toString(brute) + "\nfast =" + java.util.Arrays.toString(fast));
    }

    @Test
    void expectedStageMatchesTheory() {
        // E[stages] = min(7, Binomial(N*3, q/4096)) with tiny truncation for short skips.
        long ticks = 12_000;
        double q = 1.0 / 13;
        long trials = RandomTickMath.trials(ticks, SPEED);
        double expected = trials * q / 4096.0; // ~0.676, truncation at 7 negligible
        Rng rng = new Rng(5);
        int samples = 200_000;
        double sum = 0;
        for (int i = 0; i < samples; i++) {
            sum += RandomTickMath.successes(trials, q, MAX_AGE, rng);
        }
        assertEquals(expected, sum / samples, 0.01);
    }

    /** Stage chains with different chances per stage (copper, eggs) against a brute-force replay. */
    @Test
    void stageChainMatchesBruteForce() {
        double[] chances = {0.75 * 0.05688889, 0.05688889, 0.05688889};
        long ticks = 60_000;
        int samples = 3000;
        long[] brute = new long[chances.length + 1];
        long[] fast = new long[chances.length + 1];
        Rng bruteRng = new Rng(42);
        Rng fastRng = new Rng(43);
        long trials = RandomTickMath.trials(ticks, SPEED);
        for (int s = 0; s < samples; s++) {
            int stage = 0;
            for (long t = 0; t < ticks && stage < chances.length; t++) {
                for (int i = 0; i < SPEED; i++) {
                    if (bruteRng.nextInt(4096) == 0 && stage < chances.length && bruteRng.nextDouble() < chances[stage]) {
                        stage++;
                    }
                }
            }
            brute[stage]++;
            fast[RandomTickMath.stageChain(trials, chances, fastRng)]++;
        }
        double[] chi = Stats.homogeneity(brute, fast);
        assertTrue(chi[0] < Stats.chiSquareCritical((int) chi[1]),
                "chain distributions differ: brute=" + java.util.Arrays.toString(brute) + " fast=" + java.util.Arrays.toString(fast));
    }

    @Test
    void hundredMillionYearsSaturatesInstantly() {
        long ticks = 100_000_000L * 365 * 24_000;
        long trials = RandomTickMath.trials(ticks, SPEED);
        assertEquals(2_628_000_000_000_000L, trials);
        Rng rng = new Rng(1);
        long start = System.nanoTime();
        for (int i = 0; i < 100_000; i++) {
            assertEquals(MAX_AGE, RandomTickMath.successes(trials, 1.0 / 26, MAX_AGE, rng));
            assertEquals(3, RandomTickMath.stageChain(trials, new double[] {0.01, 0.02, 0.03}, rng));
        }
        assertTrue(System.nanoTime() - start < 2_000_000_000L, "saturation path should be O(1)");
        assertTrue(RandomTickMath.isSaturated(trials, 1.0 / 4096 / 26, 7));
    }

    @Test
    void uniformChainReportsLeftoverTrials() {
        Rng rng = new Rng(9);
        RandomTickMath.ChainResult result = RandomTickMath.uniformChain(10_000_000, 0.037, 3, rng);
        assertEquals(3, result.stages());
        assertTrue(result.remainingTrials() > 0 && result.remainingTrials() < 10_000_000);
        RandomTickMath.ChainResult none = RandomTickMath.uniformChain(0, 0.5, 3, rng);
        assertEquals(0, none.stages());
    }

    @Test
    void trialsSaturateInsteadOfOverflowing() {
        assertEquals(Long.MAX_VALUE, RandomTickMath.trials(Long.MAX_VALUE / 2, 3));
        assertEquals(0, RandomTickMath.trials(1000, 0));
        assertEquals(72_000, RandomTickMath.trials(24_000, 3));
    }

    @Test
    void geometricHasRightMean() {
        Rng rng = new Rng(3);
        double p = 0.001;
        double sum = 0;
        int n = 200_000;
        for (int i = 0; i < n; i++) {
            sum += RandomTickMath.geometric(p, rng);
        }
        assertEquals(1 / p, sum / n, 0.02 / p);
    }
}
