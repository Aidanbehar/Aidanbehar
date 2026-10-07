package dev.timeskip.sim.block.handlers;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.mixin.CropBlockInvoker;
import dev.timeskip.sim.block.Actions;
import dev.timeskip.sim.block.BlockHandler;
import dev.timeskip.sim.block.ChunkSnapshot;
import dev.timeskip.sim.block.PlanScope;
import net.minecraft.world.level.block.BeetrootBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.CocoaBlock;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.MangrovePropaguleBlock;
import net.minecraft.world.level.block.NetherWartBlock;
import net.minecraft.world.level.block.PitcherCropBlock;
import net.minecraft.world.level.block.SaplingBlock;
import net.minecraft.world.level.block.StemBlock;
import net.minecraft.world.level.block.SweetBerryBushBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.IntegerProperty;

/** Crops, stems, bushes, saplings — growth with a per-random-tick chance. */
public final class PlantHandlers {
    private static final long SALT_CROP = 0x43524F50L;
    private static final long SALT_STEM = 0x5354454DL;
    private static final long SALT_AGE = 0x41474521L;
    private static final long SALT_SAPLING = 0x53415050L;
    private static final long SALT_TREE = 0x54524545L;
    private static final long SALT_FRUIT = 0x46525549L;
    /** Vanilla CropBlock/StemBlock need raw brightness of at least 9 at the plant. */
    private static final int CROP_LIGHT = 9;

    private PlantHandlers() {
    }

    /** Vanilla crop chance: {@code 1 / (floor(25 / growthSpeed) + 1)} per random tick. */
    static double cropChance(Block block, ChunkSnapshot snapshot, PlanScope scope, int x, int y, int z) {
        float speed = CropBlockInvoker.timeskip$getGrowthSpeed(block, snapshot, scope.pos(x, y, z));
        return 1.0 / ((int) (25.0F / speed) + 1);
    }

    public static final BlockHandler CROP = (scope, x, y, z, state) -> {
        CropBlock crop = (CropBlock) state.getBlock();
        int age = crop.getAge(state);
        int max = crop.getMaxAge();
        if (age >= max || scope.snapshot.rawBrightness(x, y, z) < CROP_LIGHT) {
            return;
        }
        double q = cropChance(crop, scope.snapshot, scope, x, y, z);
        if (crop instanceof BeetrootBlock) {
            q *= 2.0 / 3.0; // BeetrootBlock only calls super.randomTick when nextInt(3) != 0
        }
        int stages = (int) RandomTickMath.successes(scope.trials, q, max - age, scope.rng(x, y, z, SALT_CROP));
        if (stages > 0) {
            boolean mature = age + stages >= max;
            scope.set(x, y, z, state, crop.getStateForAge(age + stages),
                    mature ? Stat.CROPS_MATURED : Stat.PLANT_GROWTH, mature ? 1 : stages);
        }
    };

    public static final BlockHandler STEM = (scope, x, y, z, state) -> {
        if (scope.snapshot.rawBrightness(x, y, z) < CROP_LIGHT) {
            return;
        }
        int age = state.getValue(StemBlock.AGE);
        double q = cropChance(state.getBlock(), scope.snapshot, scope, x, y, z);
        int stagesLeft = StemBlock.MAX_AGE - age;
        long successes = RandomTickMath.successes(scope.trials, q, stagesLeft + 16L, scope.rng(x, y, z, SALT_STEM));
        int stages = (int) Math.min(stagesLeft, successes);
        int fruitAttempts = (int) (successes - stages);
        BlockState grown = state.setValue(StemBlock.AGE, age + stages);
        if (stages > 0) {
            scope.set(x, y, z, state, grown, Stat.PLANT_GROWTH, stages);
        }
        if (fruitAttempts > 0) {
            scope.add(new Actions.StemFruit(PlanScope.pack(x, y, z), grown, fruitAttempts, SALT_FRUIT));
        }
    };

    /** Generic "age property grows by one with chance q per random tick". */
    static BlockHandler ageChain(IntegerProperty property, int max, double q, boolean needsLightAbove) {
        return (scope, x, y, z, state) -> {
            int age = state.getValue(property);
            if (age >= max) {
                return;
            }
            if (needsLightAbove && scope.snapshot.rawBrightness(x, y + 1, z) < CROP_LIGHT) {
                return;
            }
            int stages = (int) RandomTickMath.successes(scope.trials, q, max - age, scope.rng(x, y, z, SALT_AGE));
            if (stages > 0) {
                boolean mature = age + stages >= max;
                scope.set(x, y, z, state, state.setValue(property, age + stages),
                        mature ? Stat.CROPS_MATURED : Stat.PLANT_GROWTH, mature ? 1 : stages);
            }
        };
    }

    public static final BlockHandler SWEET_BERRY = ageChain(SweetBerryBushBlock.AGE, SweetBerryBushBlock.MAX_AGE, 1.0 / 5, true);
    public static final BlockHandler COCOA = ageChain(CocoaBlock.AGE, CocoaBlock.MAX_AGE, 1.0 / 5, false);
    public static final BlockHandler NETHER_WART = ageChain(NetherWartBlock.AGE, NetherWartBlock.MAX_AGE, 1.0 / 10, false);
    private static final BlockHandler HANGING_PROPAGULE = ageChain(MangrovePropaguleBlock.AGE, MangrovePropaguleBlock.MAX_AGE, 1.0, false);

    /** Saplings: two successes (stage 0 → 1 → tree). Light check includes the day/night cycle. */
    public static final BlockHandler SAPLING = (scope, x, y, z, state) ->
            planSapling(scope, x, y, z, state,
                    scope.info.fractionLit(scope.snapshot.skyLight(x, y + 1, z), scope.snapshot.blockLight(x, y + 1, z), 9) / 7.0);

    /** Mangrove propagules: hanging ones mature their age; planted ones are saplings without a light check. */
    public static final BlockHandler PROPAGULE = (scope, x, y, z, state) -> {
        if (state.getValue(MangrovePropaguleBlock.HANGING)) {
            HANGING_PROPAGULE.plan(scope, x, y, z, state);
        } else {
            planSapling(scope, x, y, z, state, 1.0 / 7.0);
        }
    };

    private static void planSapling(PlanScope scope, int x, int y, int z, BlockState state, double q) {
        int stage = state.getValue(SaplingBlock.STAGE);
        int toTree = 1 - stage;
        long successes = RandomTickMath.successes(scope.trials, q, toTree + (long) scope.config.treeGrowthAttempts,
                scope.rng(x, y, z, SALT_SAPLING));
        if (successes <= 0) {
            return;
        }
        if (successes <= toTree) {
            scope.set(x, y, z, state, state.setValue(SaplingBlock.STAGE, 1), Stat.PLANT_GROWTH, 1);
            return;
        }
        scope.add(new Actions.GrowTree(PlanScope.pack(x, y, z), state, (int) (successes - toTree), SALT_TREE));
    }

    /** Pitcher plants: crop chance, two-block growth done by vanilla on the main thread. */
    public static final BlockHandler PITCHER = (scope, x, y, z, state) -> {
        int age = state.getValue(PitcherCropBlock.AGE);
        if (age >= PitcherCropBlock.MAX_AGE) {
            return;
        }
        double q = cropChance(state.getBlock(), scope.snapshot, scope, x, y, z);
        int stages = (int) RandomTickMath.successes(scope.trials, q, PitcherCropBlock.MAX_AGE - age, scope.rng(x, y, z, SALT_CROP));
        if (stages > 0) {
            scope.add(new Actions.Pitcher(PlanScope.pack(x, y, z), state, stages));
        }
    };
}
