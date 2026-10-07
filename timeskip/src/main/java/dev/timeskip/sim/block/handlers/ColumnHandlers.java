package dev.timeskip.sim.block.handlers;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.math.Rng;
import dev.timeskip.mixin.GrowingPlantHeadBlockAccessor;
import dev.timeskip.sim.block.Actions;
import dev.timeskip.sim.block.BlockHandler;
import dev.timeskip.sim.block.ChunkSnapshot;
import dev.timeskip.sim.block.PlanScope;
import net.minecraft.world.level.block.BambooStalkBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.GrowingPlantHeadBlock;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;

/** Plants that grow as columns: sugar cane, cactus, kelp and vines, bamboo. */
public final class ColumnHandlers {
    private static final long SALT_COLUMN = 0x434F4C55L;
    private static final long SALT_HEAD = 0x48454144L;
    private static final long SALT_BAMBOO = 0x42414D42L;
    /** A column reaches its final state in at most 3 blocks x 16 ages (+ flower) random ticks. */
    private static final int COLUMN_TICK_CAP = 80;

    private ColumnHandlers() {
    }

    private static int heightBelow(ChunkSnapshot snapshot, int x, int y, int z, Block block) {
        int height = 1;
        while (height < 8 && snapshot.get(x, y - height, z).is(block)) {
            height++;
        }
        return height;
    }

    /**
     * Sugar cane: exact replay of {@code SugarCaneBlock.randomTick} on the column's top block. Only
     * the top block does anything, and once a new top grows the random ticks it receives continue
     * the same Bernoulli process, so simulating "the current top" with one tick budget is exact.
     */
    public static final BlockHandler SUGAR_CANE = (scope, x, y, z, state) -> {
        ChunkSnapshot snapshot = scope.snapshot;
        Block block = state.getBlock();
        if (snapshot.get(x, y + 1, z).is(block) || !snapshot.get(x, y + 1, z).isAir()) {
            return;
        }
        int height = heightBelow(snapshot, x, y, z, block);
        int age = state.getValue(BlockStateProperties.AGE_15);
        long ticks = Math.min(COLUMN_TICK_CAP, scope.randomTicks(x, y, z, SALT_COLUMN));
        int added = 0;
        for (long i = 0; i < ticks && height < 3; i++) {
            if (!snapshot.get(x, y + added + 1, z).isAir()) {
                break;
            }
            if (age == 15) {
                added++;
                height++;
                age = 0;
            } else {
                age++;
            }
        }
        if (added > 0 || age != state.getValue(BlockStateProperties.AGE_15)) {
            scope.add(new Actions.GrowColumn(PlanScope.pack(x, y, z), state, added, age, false));
        }
    };

    /** Cactus: exact replay of {@code CactusBlock.randomTick}, including the 26.x cactus flower. */
    public static final BlockHandler CACTUS = (scope, x, y, z, state) -> {
        ChunkSnapshot snapshot = scope.snapshot;
        Block block = state.getBlock();
        if (snapshot.get(x, y + 1, z).is(block) || !snapshot.get(x, y + 1, z).isAir()) {
            return;
        }
        int height = heightBelow(snapshot, x, y, z, block);
        int startAge = state.getValue(BlockStateProperties.AGE_15);
        int age = startAge;
        Rng rng = scope.rng(x, y, z, SALT_COLUMN);
        long ticks = Math.min(COLUMN_TICK_CAP, RandomTickMath.randomTicks(scope.trials, rng));
        int added = 0;
        boolean flower = false;
        for (long i = 0; i < ticks; i++) {
            if (!snapshot.get(x, y + added + 1, z).isAir()) {
                break;
            }
            if (height >= 3 && age == 15) {
                break;
            }
            if (age == 8) {
                double chance = height >= 3 ? 0.25 : 0.1;
                if (rng.nextDouble() <= chance) {
                    flower = true;
                    age++;
                    break;
                }
            } else if (age == 15 && height < 3) {
                added++;
                height++;
                age = 0;
                continue;
            }
            if (age < 15) {
                age++;
            }
        }
        if (added > 0 || flower || age != startAge) {
            scope.add(new Actions.GrowColumn(PlanScope.pack(x, y, z), state, added, age, flower));
        }
    };

    /** Kelp, twisting/weeping/cave vines: successes at vanilla's growPerTickProbability, capped by max age. */
    public static final BlockHandler GROWING_PLANT = (scope, x, y, z, state) -> {
        int age = state.getValue(GrowingPlantHeadBlock.AGE);
        if (age >= GrowingPlantHeadBlock.MAX_AGE) {
            return;
        }
        double chance = ((GrowingPlantHeadBlockAccessor) state.getBlock()).timeskip$getGrowPerTickProbability();
        int steps = (int) RandomTickMath.successes(scope.trials, chance, GrowingPlantHeadBlock.MAX_AGE - age,
                scope.rng(x, y, z, SALT_HEAD));
        if (steps > 0) {
            scope.add(new Actions.GrowPlantHead(PlanScope.pack(x, y, z), state, steps, SALT_HEAD));
        }
    };

    /** Bamboo: vanilla random ticks replayed on the growing top (its height rules are intricate). */
    public static final BlockHandler BAMBOO = (scope, x, y, z, state) -> {
        if (scope.snapshot.get(x, y + 1, z).getBlock() instanceof BambooStalkBlock) {
            return; // only the top of a stalk grows
        }
        if (state.hasProperty(BambooStalkBlock.STAGE) && state.getValue(BambooStalkBlock.STAGE) != 0) {
            return; // fully grown stalk
        }
        long ticks = Math.min(scope.config.vanillaReplayMaxRandomTicks, scope.randomTicks(x, y, z, SALT_BAMBOO));
        if (ticks > 0) {
            scope.add(new Actions.Replay(PlanScope.pack(x, y, z), state.getBlock(), (int) ticks, true, Stat.TALL_PLANTS, SALT_BAMBOO));
        }
    };
}
