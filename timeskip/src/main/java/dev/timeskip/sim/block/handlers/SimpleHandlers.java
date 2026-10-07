package dev.timeskip.sim.block.handlers;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.math.Rng;
import dev.timeskip.mixin.LeavesBlockInvoker;
import dev.timeskip.sim.block.Actions;
import dev.timeskip.sim.block.BlockHandler;
import dev.timeskip.sim.block.ChunkSnapshot;
import dev.timeskip.sim.block.PlanScope;
import net.minecraft.core.Direction;
import net.minecraft.tags.BlockTags;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.BuddingAmethystBlock;
import net.minecraft.world.level.block.ComposterBlock;
import net.minecraft.world.level.block.DriedGhastBlock;
import net.minecraft.world.level.block.RedStoneOreBlock;
import net.minecraft.world.level.block.SnifferEggBlock;
import net.minecraft.world.level.block.TurtleEggBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.lighting.LightEngine;

/** Blocks whose long-run outcome is simple to state. */
public final class SimpleHandlers {
    private static final long SALT_TICKED = 0x5449434BL;
    private static final long SALT_EGG = 0x45474721L;
    private static final long SALT_AMETHYST = 0x414D4554L;
    private static final long SALT_REPLAY = 0x5245504CL;
    private static final long SALT_MISC = 0x4D495343L;
    /** Overworld timeline: eyeblossoms are open from tick 12600 until 23401. */
    private static final int EYEBLOSSOM_OPEN_FROM = 12600;
    private static final int EYEBLOSSOM_OPEN_UNTIL = 23401;
    /** BuddingAmethystBlock: 1-in-5 chance, then one of 6 directions. */
    private static final double AMETHYST_FACE_CHANCE = 1.0 / 5.0 / 6.0;

    private SimpleHandlers() {
    }

    /** Non-persistent leaves at distance 7 vanish on their first random tick (drops would have despawned). */
    public static final BlockHandler LEAVES = (scope, x, y, z, state) -> {
        if (((LeavesBlockInvoker) state.getBlock()).timeskip$decaying(state) && scope.ticked(x, y, z, SALT_TICKED)) {
            scope.set(x, y, z, state, state.getFluidState().createLegacyBlock(), Stat.LEAVES_DECAYED, 1);
        }
    };

    /** Ice melts next to bright block light (vanilla: block light > 11 - opacity). */
    public static final BlockHandler ICE = (scope, x, y, z, state) -> {
        if (scope.snapshot.blockLight(x, y, z) > 11 - state.getLightDampening() && scope.ticked(x, y, z, SALT_TICKED)) {
            scope.add(new Actions.Replay(PlanScope.pack(x, y, z), state.getBlock(), 1, false, Stat.MELTED, SALT_REPLAY));
        }
    };

    /** Snow layers melt in block light above 11. */
    public static final BlockHandler SNOW_LAYER = (scope, x, y, z, state) -> {
        if (scope.snapshot.blockLight(x, y, z) > 11 && scope.ticked(x, y, z, SALT_TICKED)) {
            scope.add(new Actions.Replay(PlanScope.pack(x, y, z), state.getBlock(), 1, false, Stat.MELTED, SALT_REPLAY));
        }
    };

    /** Lit redstone ore goes dark on its next random tick. */
    public static final BlockHandler REDSTONE_ORE = (scope, x, y, z, state) -> {
        if (state.getValue(RedStoneOreBlock.LIT) && scope.ticked(x, y, z, SALT_TICKED)) {
            scope.set(x, y, z, state, state.setValue(RedStoneOreBlock.LIT, false), Stat.OTHER_BLOCKS, 1);
        }
    };

    /** Eyeblossoms (planted or potted) end open or closed to match the final time of day. */
    public static final BlockHandler EYEBLOSSOM = (scope, x, y, z, state) -> {
        if (!scope.info.dayCycle || !scope.ticked(x, y, z, SALT_TICKED)) {
            return;
        }
        long time = scope.info.endTimeOfDay;
        boolean shouldBeOpen = time >= EYEBLOSSOM_OPEN_FROM && time < EYEBLOSSOM_OPEN_UNTIL;
        Block block = state.getBlock();
        Block target = null;
        if (block == Blocks.OPEN_EYEBLOSSOM && !shouldBeOpen) {
            target = Blocks.CLOSED_EYEBLOSSOM;
        } else if (block == Blocks.CLOSED_EYEBLOSSOM && shouldBeOpen) {
            target = Blocks.OPEN_EYEBLOSSOM;
        } else if (block == Blocks.POTTED_OPEN_EYEBLOSSOM && !shouldBeOpen) {
            target = Blocks.POTTED_CLOSED_EYEBLOSSOM;
        } else if (block == Blocks.POTTED_CLOSED_EYEBLOSSOM && shouldBeOpen) {
            target = Blocks.POTTED_OPEN_EYEBLOSSOM;
        }
        if (target != null) {
            scope.set(x, y, z, state, target.defaultBlockState(), Stat.OTHER_BLOCKS, 1);
        }
    };

    /** Turtle eggs on sand crack and hatch at the night-weighted chance from the 26.3 timeline. */
    public static final BlockHandler TURTLE_EGG = (scope, x, y, z, state) -> {
        if (!scope.snapshot.get(x, y - 1, z).is(BlockTags.SAND)) {
            return;
        }
        int hatch = state.getValue(TurtleEggBlock.HATCH);
        int needed = 3 - hatch;
        RandomTickMath.ChainResult result = RandomTickMath.uniformChain(scope.trials, scope.info.turtleHatchChance,
                needed, scope.rng(x, y, z, SALT_EGG));
        if (result.stages() <= 0) {
            return;
        }
        boolean hatched = result.stages() >= needed;
        scope.add(new Actions.TurtleEggs(PlanScope.pack(x, y, z), state, hatch + result.stages(), hatched,
                scope.info.ticksForTrials(result.remainingTrials())));
    };

    /** Nylium covered by an opaque block reverts to netherrack. */
    public static final BlockHandler NYLIUM = (scope, x, y, z, state) -> {
        BlockState above = scope.snapshot.get(x, y + 1, z);
        if (ChunkSnapshot.isUnknown(above)) {
            return;
        }
        int dampening = LightEngine.getLightDampeningInto(state, above, Direction.UP, above.getLightDampening());
        if (dampening >= 15 && scope.ticked(x, y, z, SALT_TICKED)) {
            scope.set(x, y, z, state, Blocks.NETHERRACK.defaultBlockState(), Stat.GRASS_DIED, 1);
        }
    };

    /** Farmland needs vanilla's water scan and rain checks: decided on the main thread. */
    public static final BlockHandler FARMLAND = (scope, x, y, z, state) -> {
        if (scope.ticked(x, y, z, SALT_TICKED)) {
            scope.add(new Actions.Farmland(PlanScope.pack(x, y, z), state, SALT_MISC));
        }
    };

    /** Budding amethyst: each face grows at 1/30 per random tick, four stages to a cluster. */
    public static final BlockHandler AMETHYST = (scope, x, y, z, state) -> {
        int[] successes = new int[6];
        boolean any = false;
        Rng rng = scope.rng(x, y, z, SALT_AMETHYST);
        for (Direction direction : Direction.values()) {
            BlockState neighbour = scope.snapshot.get(x + direction.getStepX(), y + direction.getStepY(), z + direction.getStepZ());
            boolean possible = ChunkSnapshot.isUnknown(neighbour)
                    || BuddingAmethystBlock.canClusterGrowAtState(neighbour)
                    || neighbour.is(Blocks.SMALL_AMETHYST_BUD) || neighbour.is(Blocks.MEDIUM_AMETHYST_BUD)
                    || neighbour.is(Blocks.LARGE_AMETHYST_BUD);
            if (!possible) {
                continue;
            }
            successes[direction.ordinal()] = (int) RandomTickMath.successes(scope.trials, AMETHYST_FACE_CHANCE, 4, rng);
            any |= successes[direction.ordinal()] > 0;
        }
        if (any) {
            scope.add(new Actions.Amethyst(PlanScope.pack(x, y, z), successes));
        }
    };

    /** Fire burns out (scheduled ticks, not random ticks). */
    public static final BlockHandler FIRE = (scope, x, y, z, state) ->
            scope.add(new Actions.Fire(PlanScope.pack(x, y, z), state));

    /** Sniffer eggs: 24000 ticks to hatch (12000 on moss), in three equal stages. */
    public static final BlockHandler SNIFFER_EGG = (scope, x, y, z, state) -> {
        int hatch = state.getValue(SnifferEggBlock.HATCH);
        int remainingStages = SnifferEggBlock.MAX_HATCH_LEVEL + 1 - hatch;
        boolean boosted = SnifferEggBlock.hatchBoost(scope.snapshot, scope.pos(x, y, z));
        long perStage = (boosted ? 12000 : 24000) / 3 + 300;
        int stages = (int) Math.min(remainingStages, scope.info.ticks / perStage);
        if (stages > 0) {
            scope.add(new Actions.SnifferEgg(PlanScope.pack(x, y, z), state, stages, SALT_EGG));
        }
    };

    /** Frogspawn hatches within 3600-12000 ticks. */
    public static final BlockHandler FROGSPAWN = (scope, x, y, z, state) -> {
        if (scope.info.ticks >= 12000) {
            scope.add(new Actions.Frogspawn(PlanScope.pack(x, y, z), SALT_EGG));
        }
    };

    /** A composter at level 7 turns ready (level 8) 20 ticks later. */
    public static final BlockHandler COMPOSTER = (scope, x, y, z, state) -> {
        if (state.getValue(ComposterBlock.LEVEL) == ComposterBlock.MAX_LEVEL) {
            scope.set(x, y, z, state, state.setValue(ComposterBlock.LEVEL, ComposterBlock.READY), Stat.COMPOSTERS_READY, 1);
        }
    };

    /** Dried ghasts hydrate in water (or dry out) through scheduled ticks. */
    public static final BlockHandler DRIED_GHAST = (scope, x, y, z, state) -> {
        if (state.getValue(DriedGhastBlock.WATERLOGGED) || state.getValue(DriedGhastBlock.HYDRATION_LEVEL) > 0) {
            scope.add(new Actions.DriedGhast(PlanScope.pack(x, y, z), SALT_MISC));
        }
    };

    /** Replays vanilla's own random tick (capped). */
    public static BlockHandler replay(Stat stat, boolean fallback) {
        return (scope, x, y, z, state) -> {
            int cap = fallback ? scope.config.fallbackMaxRandomTicks : scope.config.vanillaReplayMaxRandomTicks;
            if (cap <= 0) {
                return;
            }
            long ticks = Math.min(cap, scope.randomTicks(x, y, z, SALT_REPLAY));
            if (ticks > 0) {
                scope.add(new Actions.Replay(PlanScope.pack(x, y, z), state.getBlock(), (int) ticks, false, stat, SALT_REPLAY));
            }
        };
    }

    /** Blocks deliberately left alone (portals spawning piglins, lava starting fires). */
    public static final BlockHandler IGNORE = (scope, x, y, z, state) -> {
    };
}
