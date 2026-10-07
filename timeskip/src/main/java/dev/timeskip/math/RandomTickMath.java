package dev.timeskip.math;

/**
 * Turns "N game ticks passed" into "what happened to this block".
 *
 * <p>Vanilla picks {@code randomTickSpeed} uniformly random positions in every 16x16x16 section
 * each tick. Over {@code N} ticks that is {@code N * randomTickSpeed} independent trials, each
 * hitting a given block with probability 1/4096. If the block's own random tick then succeeds
 * with probability {@code q}, the number of successes is exactly
 * {@code Binomial(N * randomTickSpeed, q / 4096)} (Bernoulli thinning).
 *
 * <p>Multi-stage growth where each stage can have its own chance uses a <em>stage chain</em>:
 * the trials needed to pass stage {@code i} are {@code Geometric(q_i / 4096)}; subtracting them
 * from the trial budget until it runs out is an exact simulation that costs O(stages) instead of
 * O(N), so a hundred million years costs the same as a day.
 */
public final class RandomTickMath {
    /** Number of blocks in a chunk section; each trial hits one of them. */
    public static final double SECTION_VOLUME = 4096.0;
    /** How many standard deviations past the requirement count as "certainly saturated". */
    private static final double SATURATION_SIGMAS = 12.0;

    private RandomTickMath() {
    }

    /** {@code ticks * randomTickSpeed}, saturating instead of overflowing. */
    public static long trials(long ticks, int randomTickSpeed) {
        if (ticks <= 0 || randomTickSpeed <= 0) {
            return 0;
        }
        return Math.multiplyHigh(ticks, randomTickSpeed) != 0 || ticks * randomTickSpeed < 0
                ? Long.MAX_VALUE
                : ticks * randomTickSpeed;
    }

    /** Number of random ticks one block receives during {@code trials} section trials. */
    public static long randomTicks(long trials, Rng rng) {
        return Binomial.sample(trials, 1.0 / SECTION_VOLUME, rng);
    }

    /**
     * Successes of a behaviour with chance {@code qPerRandomTick}, capped at {@code cap}.
     * Skips sampling entirely when the cap is reached with overwhelming probability.
     */
    public static long successes(long trials, double qPerRandomTick, long cap, Rng rng) {
        if (cap <= 0 || trials <= 0 || qPerRandomTick <= 0) {
            return 0;
        }
        double p = Math.min(1.0, qPerRandomTick / SECTION_VOLUME);
        if (isSaturated(trials, p, cap)) {
            return cap;
        }
        return Math.min(cap, Binomial.sample(trials, p, rng));
    }

    /** True when {@code Binomial(trials, p) >= needed} with probability ≈ 1 - 1e-30. */
    public static boolean isSaturated(long trials, double p, long needed) {
        double mean = trials * p;
        double sd = Math.sqrt(mean * (1.0 - p));
        return mean - SATURATION_SIGMAS * sd - 1 >= needed;
    }

    /** Trials until (and including) the first success; {@code Long.MAX_VALUE} if p == 0. */
    public static long geometric(double p, Rng rng) {
        if (p <= 0.0) {
            return Long.MAX_VALUE;
        }
        if (p >= 1.0) {
            return 1;
        }
        double g = Math.floor(Math.log(rng.nextDoubleNonZero()) / Math.log1p(-p)) + 1.0;
        return g >= 9.0e18 ? Long.MAX_VALUE : (long) g;
    }

    /**
     * Advances through consecutive stages whose per-random-tick success chances are
     * {@code stageChances[0..]} and returns how many stages were completed.
     */
    public static int stageChain(long trials, double[] stageChances, Rng rng) {
        return stageChain(trials, stageChances, stageChances.length, rng);
    }

    /** Same as {@link #stageChain(long, double[], Rng)} but only considers the first {@code count} stages. */
    public static int stageChain(long trials, double[] stageChances, int count, Rng rng) {
        if (trials <= 0 || count <= 0) {
            return 0;
        }
        if (chainSaturated(trials, stageChances, count)) {
            return count;
        }
        long remaining = trials;
        for (int i = 0; i < count; i++) {
            double p = stageChances[i] / SECTION_VOLUME;
            long needed = geometric(p, rng);
            if (needed > remaining) {
                return i;
            }
            remaining -= needed;
        }
        return count;
    }

    /** Stages completed plus the trials left over afterwards (for "how long ago did it finish"). */
    public record ChainResult(int stages, long remainingTrials) {
    }

    /** Stage chain with a single per-random-tick chance for every stage, reporting leftover trials. */
    public static ChainResult uniformChain(long trials, double qPerRandomTick, int stages, Rng rng) {
        if (trials <= 0 || stages <= 0 || qPerRandomTick <= 0) {
            return new ChainResult(0, Math.max(0, trials));
        }
        double p = Math.min(1.0, qPerRandomTick / SECTION_VOLUME);
        long remaining = trials;
        for (int i = 0; i < stages; i++) {
            long needed = geometric(p, rng);
            if (needed > remaining) {
                return new ChainResult(i, remaining);
            }
            remaining -= needed;
        }
        return new ChainResult(stages, remaining);
    }

    /** Convenience for the common case where every stage has the same chance. */
    public static int uniformStages(long trials, double qPerRandomTick, int stages, Rng rng) {
        if (stages <= 0) {
            return 0;
        }
        return (int) successes(trials, qPerRandomTick, stages, rng);
    }

    private static boolean chainSaturated(long trials, double[] stageChances, int count) {
        double mean = 0;
        double variance = 0;
        for (int i = 0; i < count; i++) {
            double p = stageChances[i] / SECTION_VOLUME;
            if (p <= 0) {
                return false;
            }
            mean += 1.0 / p;
            variance += (1.0 - p) / (p * p);
        }
        return mean + SATURATION_SIGMAS * Math.sqrt(variance) + 1 <= trials;
    }
}
