package dev.timeskip.math;

/**
 * Small, fast, deterministic random number generator (SplitMix64).
 *
 * <p>Every simulated block gets its own generator whose seed is derived from the world seed, the
 * skip number, the dimension and the block position, so results never depend on which worker
 * thread processed a chunk or in which order chunks finished.
 */
public final class Rng {
    private static final long GOLDEN = 0x9E3779B97F4A7C15L;
    private static final double DOUBLE_UNIT = 0x1.0p-53;

    private long state;

    public Rng(long seed) {
        this.state = seed;
    }

    /** Mixes any number of values into one well-distributed 64-bit seed. */
    public static long seed(long... parts) {
        long h = 0x5DEECE66DL;
        for (long part : parts) {
            h = mix(h ^ mix(part + GOLDEN));
        }
        return h;
    }

    /** Stafford variant 13 finaliser used by SplitMix64. */
    public static long mix(long z) {
        z = (z ^ (z >>> 30)) * 0xBF58476D1CE4E5B9L;
        z = (z ^ (z >>> 27)) * 0x94D049BB133111EBL;
        return z ^ (z >>> 31);
    }

    /** Packs block coordinates the same way regardless of platform. */
    public static long packPos(int x, int y, int z) {
        return ((long) x & 0x3FFFFFFL) << 38 | ((long) z & 0x3FFFFFFL) << 12 | ((long) y & 0xFFFL);
    }

    public long nextLong() {
        state += GOLDEN;
        return mix(state);
    }

    public int nextInt() {
        return (int) (nextLong() >>> 32);
    }

    /** Uniform integer in {@code [0, bound)}. */
    public int nextInt(int bound) {
        if (bound <= 0) {
            throw new IllegalArgumentException("bound must be positive");
        }
        // Lemire's multiply-shift with rejection: unbiased and branch-light.
        long m = (nextLong() >>> 32) * bound;
        long low = m & 0xFFFFFFFFL;
        if (low < bound) {
            long threshold = (0x100000000L - bound) % bound;
            while (low < threshold) {
                m = (nextLong() >>> 32) * bound;
                low = m & 0xFFFFFFFFL;
            }
        }
        return (int) (m >>> 32);
    }

    /** Uniform integer in {@code [min, max]} (inclusive), like vanilla {@code UniformInt}. */
    public int nextIntBetweenInclusive(int min, int max) {
        return min + nextInt(max - min + 1);
    }

    /** Uniform double in {@code [0, 1)}. */
    public double nextDouble() {
        return (nextLong() >>> 11) * DOUBLE_UNIT;
    }

    /** Uniform double in {@code (0, 1]}, safe to pass to {@code Math.log}. */
    public double nextDoubleNonZero() {
        return ((nextLong() >>> 11) + 1) * DOUBLE_UNIT;
    }

    public float nextFloat() {
        return (nextInt() >>> 8) * 0x1.0p-24f;
    }

    public boolean nextBoolean() {
        return nextLong() < 0;
    }

    /** Standard normal deviate (Marsaglia polar method). */
    public double nextGaussian() {
        double v1;
        double v2;
        double s;
        do {
            v1 = 2 * nextDouble() - 1;
            v2 = 2 * nextDouble() - 1;
            s = v1 * v1 + v2 * v2;
        } while (s >= 1 || s == 0);
        return v1 * StrictMath.sqrt(-2 * StrictMath.log(s) / s);
    }

    /** Derives an independent child generator (for handing to a sub-task). */
    public Rng fork(long salt) {
        return new Rng(seed(nextLong(), salt));
    }
}
