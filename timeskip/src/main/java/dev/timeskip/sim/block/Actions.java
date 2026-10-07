package dev.timeskip.sim.block;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.mixin.FarmlandBlockInvoker;
import dev.timeskip.mixin.FrogspawnBlockInvoker;
import dev.timeskip.mixin.GrowingPlantBlockAccessor;
import dev.timeskip.mixin.GrowingPlantHeadBlockAccessor;
import dev.timeskip.mixin.PitcherCropBlockInvoker;
import dev.timeskip.mixin.SaplingBlockAccessor;
import dev.timeskip.mixin.StemBlockAccessor;
import dev.timeskip.math.Binomial;
import dev.timeskip.math.RandomTickMath;
import dev.timeskip.math.Rng;
import java.util.Optional;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.Registries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.entity.EntitySpawnReason;
import net.minecraft.world.entity.EntityTypes;
import net.minecraft.world.entity.animal.turtle.Turtle;
import net.minecraft.world.level.biome.Biome;
import net.minecraft.world.level.block.AmethystClusterBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.BuddingAmethystBlock;
import net.minecraft.world.level.block.DriedGhastBlock;
import net.minecraft.world.level.block.FarmlandBlock;
import net.minecraft.world.level.block.FrogspawnBlock;
import net.minecraft.world.level.block.GrowingPlantHeadBlock;
import net.minecraft.world.level.block.HorizontalDirectionalBlock;
import net.minecraft.world.level.block.PitcherCropBlock;
import net.minecraft.world.level.block.SaplingBlock;
import net.minecraft.world.level.block.SnifferEggBlock;
import net.minecraft.world.level.block.StemBlock;
import net.minecraft.world.level.block.TurtleEggBlock;
import net.minecraft.world.level.block.grower.TreeGrower;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.level.material.Fluids;

/** The concrete main-thread actions produced by block handlers. */
public final class Actions {
    private Actions() {
    }

    /** Plain state replacement (the bulk of all changes). */
    public record SetBlock(long pos, BlockState expected, BlockState to, Stat stat, int amount) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            if (ctx.replace(ctx.at(pos), expected, to)) {
                ctx.stats.add(stat, amount);
            }
        }

        @Override
        public boolean local() {
            return true;
        }
    }

    /**
     * Calls the block's own vanilla {@code randomTick} {@code count} times. Used for behaviour that
     * is too intricate to model (vines, chorus, dripstone, mushrooms) and for unknown/modded blocks.
     * With {@code followTop} the position moves up as the plant grows (bamboo).
     */
    public record Replay(long pos, Block block, int count, boolean followTop, Stat stat, long salt) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            ServerLevel level = ctx.level;
            BlockPos.MutableBlockPos p = ctx.at(pos).mutable();
            RandomSource random = ctx.random(p, salt);
            if (!ctx.areaLoaded(p, 9)) {
                return;
            }
            int changes = 0;
            for (int i = 0; i < count; i++) {
                BlockState state = level.getBlockState(p);
                if (!state.isRandomlyTicking() || (!followTop && !state.is(block))) {
                    break;
                }
                state.randomTick(level, p, random);
                if (level.getBlockState(p) != state) {
                    changes++;
                }
                if (followTop) {
                    while (level.isInsideBuildHeight(p.getY() + 1)
                            && level.getBlockState(p.above()).getBlock() == level.getBlockState(p).getBlock()) {
                        p.move(Direction.UP);
                        changes++;
                    }
                }
            }
            if (changes > 0) {
                ctx.stats.add(stat, changes);
                ctx.markChanged();
            }
        }

        @Override
        public int cost() {
            return Math.max(1, count / 4);
        }
    }

    /** A sapling (or propagule) that reached its last stage: grow a real tree with vanilla's grower. */
    public record GrowTree(long pos, BlockState sapling, int attempts, long salt) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            BlockPos p = ctx.at(pos).immutable();
            BlockState state = ctx.level.getBlockState(p);
            if (!state.is(sapling.getBlock()) || !(state.getBlock() instanceof SaplingBlock block)) {
                return;
            }
            if (!ctx.areaLoaded(p, 17)) {
                return;
            }
            if (ctx.sim.config.growTrees) {
                TreeGrower grower = ((SaplingBlockAccessor) block).timeskip$getTreeGrower();
                RandomSource random = ctx.random(p, salt);
                for (int i = 0; i < attempts; i++) {
                    if (grower.growTree(ctx.level, ctx.level.getChunkSource().getGenerator(), p, state, random)) {
                        ctx.stats.inc(Stat.TREES_GROWN);
                        ctx.markChanged();
                        return;
                    }
                    state = ctx.level.getBlockState(p);
                    if (!state.is(block)) {
                        return;
                    }
                }
            }
            if (state.hasProperty(SaplingBlock.STAGE) && state.getValue(SaplingBlock.STAGE) == 0) {
                ctx.replace(p, state, state.setValue(SaplingBlock.STAGE, 1));
            }
        }

        @Override
        public int cost() {
            return 200;
        }
    }

    /** A fully grown stem tries to place its melon/pumpkin on a free side, using vanilla's rules. */
    public record StemFruit(long pos, BlockState stem, int attempts, long salt) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            BlockPos p = ctx.at(pos).immutable();
            if (ctx.level.getBlockState(p) != stem || !(stem.getBlock() instanceof StemBlock block)) {
                return;
            }
            StemBlockAccessor accessor = (StemBlockAccessor) block;
            Registry<Block> blocks = ctx.level.registryAccess().lookupOrThrow(Registries.BLOCK);
            Optional<Block> fruit = blocks.getOptional(accessor.timeskip$getFruit());
            Optional<Block> attached = blocks.getOptional(accessor.timeskip$getAttachedStem());
            if (fruit.isEmpty() || attached.isEmpty()) {
                return;
            }
            RandomSource random = ctx.random(p, salt);
            for (int i = 0; i < attempts; i++) {
                Direction direction = Direction.Plane.HORIZONTAL.getRandomDirection(random);
                BlockPos target = p.relative(direction);
                if (ctx.level.getBlockState(target).isAir()
                        && ctx.level.getBlockState(target.below()).is(accessor.timeskip$getFruitSupportBlocks())) {
                    ctx.setNormal(target, fruit.get().defaultBlockState());
                    ctx.setNormal(p, attached.get().defaultBlockState().setValue(HorizontalDirectionalBlock.FACING, direction));
                    ctx.stats.inc(Stat.FRUIT_GROWN);
                    return;
                }
            }
        }
    }

    /** Sugar cane / cactus: add blocks on top, set the final age, maybe a cactus flower. */
    public record GrowColumn(long topPos, BlockState expectedTop, int add, int finalAge, boolean flower) implements PlanAction {
        private static final IntegerProperty AGE = BlockStateProperties.AGE_15;

        @Override
        public void apply(ApplyContext ctx) {
            ServerLevel level = ctx.level;
            BlockPos.MutableBlockPos p = ctx.at(topPos).mutable();
            if (level.getBlockState(p) != expectedTop) {
                return;
            }
            Block block = expectedTop.getBlock();
            int added = 0;
            for (int i = 0; i < add; i++) {
                BlockPos above = p.above();
                BlockState place = block.defaultBlockState();
                if (!level.isInsideBuildHeight(above.getY()) || !level.isEmptyBlock(above) || !place.canSurvive(level, above)) {
                    break;
                }
                BlockState oldTop = level.getBlockState(p);
                if (oldTop.hasProperty(AGE)) {
                    ctx.replace(p, oldTop, oldTop.setValue(AGE, 0));
                }
                ctx.setNormal(above, place);
                p.move(Direction.UP);
                added++;
            }
            BlockState top = level.getBlockState(p);
            if (top.is(block) && top.hasProperty(AGE)) {
                int age = added == add ? finalAge : 15;
                ctx.replace(p, top, top.setValue(AGE, Math.max(0, Math.min(15, age))));
            }
            if (flower && added == add && block == Blocks.CACTUS) {
                BlockPos above = p.above();
                if (level.isInsideBuildHeight(above.getY()) && level.isEmptyBlock(above)
                        && Blocks.CACTUS.defaultBlockState().canSurvive(level, above)) {
                    ctx.setNormal(above, Blocks.CACTUS_FLOWER.defaultBlockState());
                    ctx.stats.inc(Stat.PLANT_GROWTH);
                }
            }
            ctx.stats.add(Stat.TALL_PLANTS, added);
            ctx.markChanged();
        }
    }

    /** Kelp, twisting/weeping/cave vines: extend the plant with vanilla's own growth state. */
    public record GrowPlantHead(long pos, BlockState expected, int steps, long salt) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            ServerLevel level = ctx.level;
            BlockPos.MutableBlockPos p = ctx.at(pos).mutable();
            BlockState state = level.getBlockState(p);
            if (state != expected || !(state.getBlock() instanceof GrowingPlantHeadBlock head)) {
                return;
            }
            Direction direction = ((GrowingPlantBlockAccessor) head).timeskip$getGrowthDirection();
            GrowingPlantHeadBlockAccessor accessor = (GrowingPlantHeadBlockAccessor) head;
            RandomSource random = ctx.random(p, salt);
            int grown = 0;
            for (int i = 0; i < steps; i++) {
                if (state.getValue(GrowingPlantHeadBlock.AGE) >= GrowingPlantHeadBlock.MAX_AGE) {
                    break;
                }
                BlockPos next = p.relative(direction);
                if (!level.isInsideBuildHeight(next.getY()) || !accessor.timeskip$canGrowInto(level.getBlockState(next))) {
                    break;
                }
                BlockState newHead = accessor.timeskip$getGrowIntoState(state, random);
                ctx.setNormal(next, newHead);
                p.move(direction);
                state = newHead;
                grown++;
            }
            ctx.stats.add(Stat.TALL_PLANTS, grown);
        }
    }

    /** Budding amethyst: advance the bud on each face by the sampled number of successes. */
    public record Amethyst(long pos, int[] faceSuccesses) implements PlanAction {
        private static final Block[] STAGES = {
                Blocks.SMALL_AMETHYST_BUD, Blocks.MEDIUM_AMETHYST_BUD, Blocks.LARGE_AMETHYST_BUD, Blocks.AMETHYST_CLUSTER
        };

        @Override
        public void apply(ApplyContext ctx) {
            BlockPos p = ctx.at(pos).immutable();
            if (!ctx.level.getBlockState(p).is(Blocks.BUDDING_AMETHYST)) {
                return;
            }
            for (Direction direction : Direction.values()) {
                int successes = faceSuccesses[direction.ordinal()];
                if (successes <= 0) {
                    continue;
                }
                BlockPos target = p.relative(direction);
                BlockState current = ctx.level.getBlockState(target);
                int stage = stageOf(current, direction);
                if (stage < 0) {
                    continue;
                }
                int finalStage = Math.min(STAGES.length, stage + successes);
                if (finalStage == stage) {
                    continue;
                }
                BlockState bud = STAGES[finalStage - 1].defaultBlockState()
                        .setValue(AmethystClusterBlock.FACING, direction)
                        .setValue(AmethystClusterBlock.WATERLOGGED, current.getFluidState().is(Fluids.WATER));
                ctx.setNormal(target, bud);
                ctx.stats.add(Stat.AMETHYST_GROWN, finalStage - stage);
            }
        }

        private static int stageOf(BlockState state, Direction direction) {
            if (BuddingAmethystBlock.canClusterGrowAtState(state)) {
                return 0;
            }
            for (int i = 0; i < STAGES.length; i++) {
                if (state.is(STAGES[i])) {
                    return state.getValue(AmethystClusterBlock.FACING) == direction ? i + 1 : -1;
                }
            }
            return -1;
        }
    }

    /**
     * Farmland moisture. Needs the water scan, sky and biome checks vanilla does, so it runs on the
     * main thread. Dry spells shorter than the skip are modelled by the typical age of the final
     * dry spell (vanilla rain delays are uniform 12000-180000 ticks; mean age ≈ 60000).
     */
    public record Farmland(long pos, BlockState expected, long salt) implements PlanAction {
        private static final long TYPICAL_DRY_SPELL_AGE = 60_000;

        @Override
        public void apply(ApplyContext ctx) {
            ServerLevel level = ctx.level;
            BlockPos p = ctx.at(pos).immutable();
            BlockState state = level.getBlockState(p);
            if (state != expected || !(state.getBlock() instanceof FarmlandBlock farmland)) {
                return;
            }
            int moisture = state.getValue(FarmlandBlock.MOISTURE);
            if (FarmlandBlockInvoker.timeskip$isNearWater(level, p)) {
                if (moisture < 7 && ctx.replace(p, state, state.setValue(FarmlandBlock.MOISTURE, 7))) {
                    ctx.stats.inc(Stat.FARMLAND_CHANGED);
                }
                return;
            }
            BlockPos above = p.above();
            boolean exposed = ctx.info.canHaveWeather && level.canSeeSky(above)
                    && level.getBiome(above).value().getPrecipitationAt(above, ctx.info.seaLevel) == Biome.Precipitation.RAIN;
            boolean rainingAtEnd = exposed && ctx.sim.weather.state().clearWeatherTime() <= 0 && ctx.sim.weather.state().rain().on();
            if (rainingAtEnd) {
                if (moisture < 7 && ctx.replace(p, state, state.setValue(FarmlandBlock.MOISTURE, 7))) {
                    ctx.stats.inc(Stat.FARMLAND_CHANGED);
                }
                return;
            }
            long dryTicks = exposed && ctx.info.rainTicks > 0 ? Math.min(ctx.info.ticks, TYPICAL_DRY_SPELL_AGE) : ctx.info.ticks;
            Rng rng = ctx.sim.rng(ctx.info, p.getX(), p.getY(), p.getZ(), salt);
            long dryingTicks = Binomial.sample(RandomTickMath.trials(dryTicks, ctx.info.randomTickSpeed), 1.0 / RandomTickMath.SECTION_VOLUME, rng);
            if (dryingTicks <= 0) {
                return;
            }
            if (dryingTicks <= moisture) {
                ctx.replace(p, state, state.setValue(FarmlandBlock.MOISTURE, (int) (moisture - dryingTicks)));
                ctx.stats.inc(Stat.FARMLAND_CHANGED);
            } else if (!FarmlandBlockInvoker.timeskip$shouldMaintainFarmland(level, p)) {
                farmland.turnToBaseBlock(null, state, level, p);
                ctx.stats.inc(Stat.FARMLAND_CHANGED);
                ctx.markChanged();
            } else if (moisture > 0) {
                ctx.replace(p, state, state.setValue(FarmlandBlock.MOISTURE, 0));
                ctx.stats.inc(Stat.FARMLAND_CHANGED);
            }
        }
    }

    /** Turtle eggs: crack further, or hatch into baby turtles (which may have grown up since). */
    public record TurtleEggs(long pos, BlockState expected, int newHatch, boolean hatched, long ticksAfterHatch) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            ServerLevel level = ctx.level;
            BlockPos p = ctx.at(pos).immutable();
            if (level.getBlockState(p) != expected) {
                return;
            }
            if (!hatched) {
                ctx.replace(p, expected, expected.setValue(TurtleEggBlock.HATCH, newHatch));
                return;
            }
            level.removeBlock(p, false);
            int eggs = expected.getValue(TurtleEggBlock.EGGS);
            int age = (int) Math.min(0L, -24000L + Math.max(0L, ticksAfterHatch));
            for (int i = 0; i < eggs; i++) {
                Turtle turtle = EntityTypes.TURTLE.create(level, EntitySpawnReason.BREEDING);
                if (turtle != null) {
                    turtle.setAge(age);
                    turtle.setHomePos(p);
                    turtle.snapTo(p.getX() + 0.3 + i * 0.2, p.getY(), p.getZ() + 0.3, 0.0F, 0.0F);
                    ctx.sim.markNewborn(turtle.getUUID());
                    level.addFreshEntity(turtle);
                }
            }
            ctx.stats.add(Stat.EGGS_HATCHED, eggs);
            ctx.markChanged();
        }
    }

    /** Sniffer eggs run on scheduled ticks; run vanilla's own tick once per remaining stage. */
    public record SnifferEgg(long pos, BlockState expected, int stages, long salt) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            BlockPos p = ctx.at(pos).immutable();
            RandomSource random = ctx.random(p, salt);
            for (int i = 0; i < stages; i++) {
                BlockState state = ctx.level.getBlockState(p);
                if (!(state.getBlock() instanceof SnifferEggBlock)) {
                    break;
                }
                boolean hatching = state.getValue(SnifferEggBlock.HATCH) >= SnifferEggBlock.MAX_HATCH_LEVEL;
                state.tick(ctx.level, p, random);
                if (hatching) {
                    ctx.stats.inc(Stat.EGGS_HATCHED);
                }
            }
            ctx.markChanged();
        }
    }

    /** Frogspawn always hatches within 12000 ticks; let vanilla spawn the tadpoles. */
    public record Frogspawn(long pos, long salt) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            BlockPos p = ctx.at(pos).immutable();
            BlockState state = ctx.level.getBlockState(p);
            if (state.getBlock() instanceof FrogspawnBlock block) {
                ((FrogspawnBlockInvoker) block).timeskip$hatchFrogspawn(ctx.level, p, ctx.random(p, salt));
                ctx.stats.inc(Stat.EGGS_HATCHED);
                ctx.markChanged();
            }
        }
    }

    /** Fire burns out unless it sits on an infiniburn block (netherrack, magma, ...). */
    public record Fire(long pos, BlockState expected) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            BlockPos p = ctx.at(pos).immutable();
            if (ctx.level.getBlockState(p.below()).is(ctx.level.dimensionType().infiniburn())) {
                return;
            }
            if (ctx.replace(p, expected, Blocks.AIR.defaultBlockState())) {
                ctx.stats.inc(Stat.FIRES_OUT);
            }
        }
    }

    /** Dried ghasts hydrate (or dry out) through scheduled ticks; run vanilla's tick a few times. */
    public record DriedGhast(long pos, long salt) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            BlockPos p = ctx.at(pos).immutable();
            RandomSource random = ctx.random(p, salt);
            for (int i = 0; i < 6; i++) {
                BlockState state = ctx.level.getBlockState(p);
                if (!(state.getBlock() instanceof DriedGhastBlock)) {
                    break;
                }
                state.tick(ctx.level, p, random);
            }
            ctx.markChanged();
        }
    }

    /** Pitcher plants are two blocks tall; vanilla's grow() handles the upper half. */
    public record Pitcher(long pos, BlockState expected, int stages) implements PlanAction {
        @Override
        public void apply(ApplyContext ctx) {
            BlockPos p = ctx.at(pos).immutable();
            if (ctx.level.getBlockState(p) != expected || !(expected.getBlock() instanceof PitcherCropBlock block)) {
                return;
            }
            ((PitcherCropBlockInvoker) block).timeskip$grow(ctx.level, expected, p, stages);
            ctx.stats.add(Stat.PLANT_GROWTH, stages);
            ctx.markChanged();
        }
    }
}
