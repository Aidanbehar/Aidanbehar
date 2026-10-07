package dev.timeskip.sim.enderman;

import dev.timeskip.math.EndermanMath;
import dev.timeskip.sim.block.ApplyContext;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.tags.BlockTags;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.phys.AABB;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Where an enderman puts its block down (main thread, live world).
 *
 * <p>How far a carrier gets between pickup and placement follows vanilla's movement rules
 * ({@link Wander}). Wherever it ends up, the placement is vanilla's: an offset per
 * {@link EndermanMath#PLACE_XZ}/{@link EndermanMath#PLACE_Y} around its feet, accepted by the exact
 * {@code EndermanLeaveBlockGoal.canPlaceBlock} rule — target is air; the block below is not air, not
 * bedrock and has a full collision shape; the (neighbour-updated) carried block can survive there;
 * no entity occupies the space.
 */
public final class EndermanPlacement {
    /** Standard deviation of a strolling carrier's drift per horizontal axis, in blocks. */
    public static final double STROLL_SIGMA = 12.0;
    /** Stroll drift is truncated to this radius. */
    public static final int MAX_STROLL = 28;
    /** {@code Enderman.teleport()}: up to 32 blocks each way horizontally and vertically. */
    private static final int TELEPORT_RANGE = 32;
    /** Daylight teleports repeat until the enderman is out of the sun; give up after this many. */
    private static final int MAX_TELEPORTS = 16;
    /** How far up or down from the drifted height a standing spot may be found. */
    private static final int VERTICAL_SEARCH = 6;
    private static final int STROLL_ATTEMPTS = 24;
    /** Opt-in diagnostics: start the server with {@code -Dtimeskip.debugEndermen=true}. */
    static final boolean DEBUG = Boolean.getBoolean("timeskip.debugEndermen");
    static final Logger LOGGER = LoggerFactory.getLogger("timeskip");

    /**
     * How a carrier moves between picking a block up and putting it down.
     *
     * <ul>
     *   <li>{@link #STAY}: more than 32 blocks from every player a mob's {@code noActionTime} is never
     *       reset ({@code Mob.checkDespawn}), and {@code RandomStrollGoal} refuses to run once it
     *       reaches 100 — so the enderman stands where it picked the block up and places it right
     *       there (vanilla keeps trying every ~2000 ticks; if no spot around it ever works, it keeps
     *       the block).</li>
     *   <li>{@link #STROLL}: within 32 blocks of a player it keeps strolling (up to 10 blocks every
     *       ~120 ticks), so the placement spot drifts; modelled as a truncated 2D Gaussian.</li>
     *   <li>{@link #SKY}: like {@code STAY}, but under open sky in daylight
     *       {@code Enderman.customServerAiStep} teleports it (±32 blocks) again and again until it
     *       is out of the sun; {@link EndermanPopulation#teleportChance()} of such carriers are
     *       still holding their block when that happens.</li>
     * </ul>
     */
    public enum Wander {
        STAY, STROLL, SKY;

        private static final Wander[] VALUES = values();

        public static Wander of(byte ordinal) {
            return VALUES[ordinal];
        }
    }

    private EndermanPlacement() {
    }

    /**
     * Finds a valid placement spot for {@code carried}, or null if the enderman would not have
     * managed to put it down (it would still be carrying it).
     *
     * @param feet  where the enderman stood when it picked the block up (or stands now)
     * @param avoid the block's original position (never chosen, nor anything resting on it), or null
     */
    public static @Nullable BlockPos findSpot(ServerLevel level, BlockPos feet, BlockState carried, RandomSource random,
                                              @Nullable BlockPos avoid, Wander wander, double teleportChance) {
        return switch (wander) {
            case STAY -> placeAround(level, feet, carried, random, avoid);
            case STROLL -> stroll(level, feet, carried, random, avoid);
            case SKY -> {
                BlockPos from = feet;
                if (random.nextDouble() < teleportChance) {
                    BlockPos shade = teleportOutOfSun(level, feet, random);
                    if (shade != null) {
                        from = shade;
                    }
                }
                yield placeAround(level, from, carried, random, avoid);
            }
        };
    }

    /** A carrier that keeps strolling: one vanilla placement attempt from each drifted standing spot. */
    private static @Nullable BlockPos stroll(ServerLevel level, BlockPos origin, BlockState carried, RandomSource random,
                                            @Nullable BlockPos avoid) {
        BlockPos.MutableBlockPos feet = new BlockPos.MutableBlockPos();
        for (int attempt = 0; attempt < STROLL_ATTEMPTS; attempt++) {
            int x = origin.getX() + clamp(random.nextGaussian() * STROLL_SIGMA, MAX_STROLL);
            int z = origin.getZ() + clamp(random.nextGaussian() * STROLL_SIGMA, MAX_STROLL);
            if (!ApplyContext.chunksLoaded(level, x - 16, z - 16, x + 16, z + 16)
                    || !findStandingSpot(level, x, origin.getY(), z, feet)) {
                continue;
            }
            BlockPos target = feet.offset(sample(EndermanMath.PLACE_XZ, EndermanMath.PLACE_XZ_MIN, random),
                    sample(EndermanMath.PLACE_Y, 0, random),
                    sample(EndermanMath.PLACE_XZ, EndermanMath.PLACE_XZ_MIN, random));
            if (allowed(target, avoid) && canPlace(level, target, carried)) {
                return target;
            }
        }
        return placeAround(level, origin, carried, random, avoid);
    }

    /**
     * A carrier standing at {@code feet}: vanilla's placement offsets, tried in random order by
     * probability (each placement attempt draws one; over thousands of ticks every reachable one
     * gets drawn), until one is valid.
     */
    private static @Nullable BlockPos placeAround(ServerLevel level, BlockPos feet, BlockState carried, RandomSource random,
                                                 @Nullable BlockPos avoid) {
        if (!ApplyContext.chunksLoaded(level, feet.getX() - 16, feet.getZ() - 16, feet.getX() + 16, feet.getZ() + 16)) {
            return null;
        }
        int n = EndermanMath.PLACE_XZ.length * EndermanMath.PLACE_Y.length * EndermanMath.PLACE_XZ.length;
        double[] weight = new double[n];
        double total = 0;
        for (int i = 0; i < n; i++) {
            weight[i] = EndermanMath.placeOffsetProbability(dx(i), dy(i), dz(i));
            total += weight[i];
        }
        for (int tries = 0; tries < n && total > 1e-12; tries++) {
            double u = random.nextDouble() * total;
            int i = 0;
            while (i < n - 1 && (u -= weight[i]) >= 0) {
                i++;
            }
            total -= weight[i];
            weight[i] = 0;
            BlockPos target = feet.offset(dx(i), dy(i), dz(i));
            if (allowed(target, avoid) && canPlace(level, target, carried)) {
                return target;
            }
        }
        return null;
    }

    private static int dx(int i) {
        return i % 3 + EndermanMath.PLACE_XZ_MIN;
    }

    private static int dy(int i) {
        return (i / 3) % 2;
    }

    private static int dz(int i) {
        return i / 6 + EndermanMath.PLACE_XZ_MIN;
    }

    /** Never back into its own hole, nor on top of it (the support is the block being moved). */
    private static boolean allowed(BlockPos target, @Nullable BlockPos avoid) {
        return avoid == null || (!target.equals(avoid) && !target.below().equals(avoid));
    }

    /**
     * Vanilla's daylight teleport chain: {@code Enderman.teleport()} picks a point up to 32 blocks
     * away each way, drops down to the first {@code #entities_can_teleport_to} block, and lands if
     * there is room and no liquid; it keeps doing so while it can see the sky. Returns where it ends
     * up, or null if it never managed to teleport.
     */
    private static @Nullable BlockPos teleportOutOfSun(ServerLevel level, BlockPos start, RandomSource random) {
        BlockPos at = null;
        BlockPos.MutableBlockPos probe = new BlockPos.MutableBlockPos();
        BlockPos from = start;
        for (int jump = 0; jump < MAX_TELEPORTS; jump++) {
            int x = from.getX() + (int) Math.floor((random.nextDouble() - 0.5) * 2 * TELEPORT_RANGE);
            int y = from.getY() + random.nextInt(2 * TELEPORT_RANGE) - TELEPORT_RANGE;
            int z = from.getZ() + (int) Math.floor((random.nextDouble() - 0.5) * 2 * TELEPORT_RANGE);
            if (!ApplyContext.chunksLoaded(level, x - 16, z - 16, x + 16, z + 16)) {
                continue;
            }
            y = Math.min(y, level.getMaxY());
            BlockPos landing = null;
            for (int fy = y; fy > level.getMinY(); fy--) {
                BlockState ground = level.getBlockState(probe.set(x, fy - 1, z));
                if (ground.is(BlockTags.ENTITIES_CAN_TELEPORT_TO)) {
                    if (!ground.is(BlockTags.ENDERMAN_DOES_NOT_TELEPORT_TO) && clearToStand(level, x, fy, z, probe)) {
                        landing = new BlockPos(x, fy, z);
                    }
                    break;
                }
            }
            if (landing == null) {
                continue; // vanilla: the teleport fails and it tries again a moment later
            }
            at = landing;
            from = landing;
            if (!level.canSeeSky(landing)) {
                break;
            }
        }
        return at;
    }

    /** Three blocks without collision, liquid or {@code #enderman_does_not_teleport_to} blocks. */
    private static boolean clearToStand(ServerLevel level, int x, int fy, int z, BlockPos.MutableBlockPos probe) {
        for (int h = 0; h < 3; h++) {
            if (!level.isInsideBuildHeight(fy + h)) {
                return false;
            }
            probe.set(x, fy + h, z);
            BlockState state = level.getBlockState(probe);
            if (!state.getCollisionShape(level, probe).isEmpty() || !state.getFluidState().isEmpty()
                    || state.is(BlockTags.ENDERMAN_DOES_NOT_TELEPORT_TO)) {
                return false;
            }
        }
        return true;
    }

    /** Vanilla {@code EndermanLeaveBlockGoal.canPlaceBlock} (the enderman itself is not in the world). */
    public static boolean canPlace(ServerLevel level, BlockPos target, BlockState carried) {
        if (!level.isInsideBuildHeight(target.getY()) || !level.isInsideBuildHeight(target.getY() - 1)) {
            return false;
        }
        BlockState targetState = level.getBlockState(target);
        BlockPos below = target.below();
        BlockState belowState = level.getBlockState(below);
        if (!targetState.isAir() || belowState.isAir() || belowState.is(Blocks.BEDROCK)
                || !belowState.isCollisionShapeFullBlock(level, below)) {
            return false;
        }
        BlockState updated = Block.updateFromNeighbourShapes(carried, level, target);
        return updated.canSurvive(level, target) && level.getEntities((Entity) null, new AABB(target)).isEmpty();
    }

    /**
     * Places the block exactly like the leave goal does. Returns false if the neighbour update
     * turned it into air (a plant that can't live there): vanilla "places" that air and the plant is
     * gone, which we copy, but it is not counted as a move.
     */
    public static boolean place(ServerLevel level, BlockPos target, BlockState carried) {
        BlockState updated = Block.updateFromNeighbourShapes(carried, level, target);
        level.setBlockAndUpdate(target, updated);
        return !updated.isAir();
    }

    /**
     * Looks in column (x, z) for the standing spot closest to height {@code y}: a block with a full
     * collision top below, and three blocks without collision or fluid above it (endermen are 2.9
     * blocks tall and avoid water).
     */
    static boolean findStandingSpot(ServerLevel level, int x, int y, int z, BlockPos.MutableBlockPos out) {
        BlockPos.MutableBlockPos probe = new BlockPos.MutableBlockPos();
        for (int d = 0; d <= VERTICAL_SEARCH * 2; d++) {
            int fy = y + ((d & 1) == 0 ? d / 2 : -(d + 1) / 2);
            if (!level.isInsideBuildHeight(fy - 1) || !level.isInsideBuildHeight(fy + 2)) {
                continue;
            }
            probe.set(x, fy - 1, z);
            BlockState ground = level.getBlockState(probe);
            if (!ground.isCollisionShapeFullBlock(level, probe)) {
                continue;
            }
            boolean clear = true;
            for (int h = 0; h < 3 && clear; h++) {
                probe.set(x, fy + h, z);
                BlockState state = level.getBlockState(probe);
                clear = state.getCollisionShape(level, probe).isEmpty() && state.getFluidState().isEmpty();
            }
            if (clear) {
                out.set(x, fy, z);
                return true;
            }
        }
        return false;
    }

    /** Logs one move when {@code -Dtimeskip.debugEndermen=true} is set (off by default). */
    public static void debugLog(ServerLevel level, @Nullable BlockPos from, BlockPos to, BlockState block, String what) {
        if (DEBUG) {
            LOGGER.info("[Time Skip] enderman {} {} {} -> {} (distance {}) in {}", what,
                    block.getBlock().builtInRegistryHolder().key().identifier().getPath(),
                    from == null ? "-" : from.toShortString(), to.toShortString(),
                    from == null ? "-" : String.format("%.1f", Math.sqrt(from.distSqr(to))), level.dimension().identifier());
        }
    }

    private static int clamp(double value, int max) {
        return (int) Math.round(Math.max(-max, Math.min(max, value)));
    }

    private static int sample(double[] table, int min, RandomSource random) {
        double u = random.nextDouble();
        for (int i = 0; i < table.length; i++) {
            u -= table[i];
            if (u < 0) {
                return min + i;
            }
        }
        return min + table.length - 1;
    }
}
