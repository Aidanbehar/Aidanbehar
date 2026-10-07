package dev.timeskip.sim.block;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.sim.block.handlers.ColumnHandlers;
import dev.timeskip.sim.block.handlers.PlantHandlers;
import dev.timeskip.sim.block.handlers.SimpleHandlers;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.BambooSaplingBlock;
import net.minecraft.world.level.block.BambooStalkBlock;
import net.minecraft.world.level.block.BaseFireBlock;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.BuddingAmethystBlock;
import net.minecraft.world.level.block.CactusBlock;
import net.minecraft.world.level.block.ChangeOverTimeBlock;
import net.minecraft.world.level.block.ChorusFlowerBlock;
import net.minecraft.world.level.block.CocoaBlock;
import net.minecraft.world.level.block.ComposterBlock;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.DriedGhastBlock;
import net.minecraft.world.level.block.EyeblossomBlock;
import net.minecraft.world.level.block.FarmlandBlock;
import net.minecraft.world.level.block.FlowerPotBlock;
import net.minecraft.world.level.block.FrogspawnBlock;
import net.minecraft.world.level.block.GrowingPlantHeadBlock;
import net.minecraft.world.level.block.IceBlock;
import net.minecraft.world.level.block.LeavesBlock;
import net.minecraft.world.level.block.LiquidBlock;
import net.minecraft.world.level.block.MangrovePropaguleBlock;
import net.minecraft.world.level.block.MushroomBlock;
import net.minecraft.world.level.block.NetherPortalBlock;
import net.minecraft.world.level.block.NetherWartBlock;
import net.minecraft.world.level.block.NyliumBlock;
import net.minecraft.world.level.block.PitcherCropBlock;
import net.minecraft.world.level.block.RedStoneOreBlock;
import net.minecraft.world.level.block.SaplingBlock;
import net.minecraft.world.level.block.SnifferEggBlock;
import net.minecraft.world.level.block.SnowLayerBlock;
import net.minecraft.world.level.block.SpeleothemBlock;
import net.minecraft.world.level.block.SpreadingSnowyBlock;
import net.minecraft.world.level.block.StemBlock;
import net.minecraft.world.level.block.SugarCaneBlock;
import net.minecraft.world.level.block.SweetBerryBushBlock;
import net.minecraft.world.level.block.TurtleEggBlock;
import net.minecraft.world.level.block.VineBlock;
import net.minecraft.world.level.block.state.BlockState;

/**
 * Chooses the handler for each block type (once, then cached).
 *
 * <p>A model is only used if the block still runs vanilla's own {@code randomTick} — checked by
 * finding which class declares the method. Names are not obfuscated in 26.x, so this works in a
 * normal game. A modded block that overrides {@code randomTick} gets the generic fallback, which
 * calls that override directly (up to {@code fallback_max_random_ticks} times).
 */
public final class BlockHandlers {
    private static final Map<Block, BlockHandler> CACHE = new ConcurrentHashMap<>();
    private static final Map<Class<?>, Boolean> VANILLA_TICK = new ConcurrentHashMap<>();
    private static final BlockHandler FALLBACK = SimpleHandlers.replay(Stat.OTHER_BLOCKS, true);
    private static final BlockHandler REPLAY_PLANTS = SimpleHandlers.replay(Stat.TALL_PLANTS, false);
    private static final BlockHandler REPLAY_OTHER = SimpleHandlers.replay(Stat.OTHER_BLOCKS, false);
    private static final BlockHandler COPPER = (scope, x, y, z, state) -> scope.copper().add(x, y, z, state);
    private static final BlockHandler GRASS = (scope, x, y, z, state) -> scope.grass().add(x, y, z, state);

    private BlockHandlers() {
    }

    /** True for states the planner must look at: random tickers plus a few scheduled-tick blocks. */
    public static boolean isInteresting(BlockState state) {
        if (state.isRandomlyTicking()) {
            return true;
        }
        Block block = state.getBlock();
        return block instanceof BaseFireBlock || block instanceof SnifferEggBlock || block instanceof FrogspawnBlock
                || block instanceof DriedGhastBlock
                || (block instanceof ComposterBlock && state.getValue(ComposterBlock.LEVEL) == ComposterBlock.MAX_LEVEL);
    }

    public static BlockHandler forBlock(Block block) {
        return CACHE.computeIfAbsent(block, BlockHandlers::resolve);
    }

    private static BlockHandler resolve(Block block) {
        // Scheduled-tick blocks (not random ticks).
        if (block instanceof BaseFireBlock) {
            return SimpleHandlers.FIRE;
        }
        if (block instanceof SnifferEggBlock) {
            return SimpleHandlers.SNIFFER_EGG;
        }
        if (block instanceof FrogspawnBlock) {
            return SimpleHandlers.FROGSPAWN;
        }
        if (block instanceof ComposterBlock) {
            return SimpleHandlers.COMPOSTER;
        }
        if (block instanceof DriedGhastBlock) {
            return SimpleHandlers.DRIED_GHAST;
        }

        if (!usesVanillaRandomTick(block)) {
            return FALLBACK;
        }
        if (block instanceof NetherPortalBlock || block instanceof LiquidBlock) {
            return SimpleHandlers.IGNORE;
        }
        if (block instanceof PitcherCropBlock) {
            return PlantHandlers.PITCHER;
        }
        if (block instanceof CropBlock) {
            return PlantHandlers.CROP;
        }
        if (block instanceof StemBlock) {
            return PlantHandlers.STEM;
        }
        if (block instanceof SweetBerryBushBlock) {
            return PlantHandlers.SWEET_BERRY;
        }
        if (block instanceof CocoaBlock) {
            return PlantHandlers.COCOA;
        }
        if (block instanceof NetherWartBlock) {
            return PlantHandlers.NETHER_WART;
        }
        if (block instanceof MangrovePropaguleBlock) {
            return PlantHandlers.PROPAGULE;
        }
        if (block instanceof SaplingBlock) {
            return PlantHandlers.SAPLING;
        }
        if (block instanceof SugarCaneBlock) {
            return ColumnHandlers.SUGAR_CANE;
        }
        if (block instanceof CactusBlock) {
            return ColumnHandlers.CACTUS;
        }
        if (block instanceof GrowingPlantHeadBlock) {
            return ColumnHandlers.GROWING_PLANT;
        }
        if (block instanceof BambooStalkBlock || block instanceof BambooSaplingBlock) {
            return ColumnHandlers.BAMBOO;
        }
        if (block instanceof ChorusFlowerBlock || block instanceof VineBlock) {
            return REPLAY_PLANTS;
        }
        if (block instanceof MushroomBlock || block instanceof SpeleothemBlock) {
            return REPLAY_OTHER;
        }
        if (block instanceof BuddingAmethystBlock) {
            return SimpleHandlers.AMETHYST;
        }
        if (block instanceof ChangeOverTimeBlock<?>) {
            return COPPER;
        }
        if (block instanceof LeavesBlock) {
            return SimpleHandlers.LEAVES;
        }
        if (block instanceof SpreadingSnowyBlock) {
            return GRASS;
        }
        if (block instanceof NyliumBlock) {
            return SimpleHandlers.NYLIUM;
        }
        if (block instanceof FarmlandBlock) {
            return SimpleHandlers.FARMLAND;
        }
        if (block instanceof IceBlock) {
            return SimpleHandlers.ICE;
        }
        if (block instanceof SnowLayerBlock) {
            return SimpleHandlers.SNOW_LAYER;
        }
        if (block instanceof TurtleEggBlock) {
            return SimpleHandlers.TURTLE_EGG;
        }
        if (block instanceof RedStoneOreBlock) {
            return SimpleHandlers.REDSTONE_ORE;
        }
        if (block instanceof EyeblossomBlock || block instanceof FlowerPotBlock) {
            return SimpleHandlers.EYEBLOSSOM;
        }
        return FALLBACK;
    }

    /** True if the class that implements {@code randomTick} for this block is part of Minecraft. */
    static boolean usesVanillaRandomTick(Block block) {
        return VANILLA_TICK.computeIfAbsent(block.getClass(), BlockHandlers::declaresVanillaRandomTick);
    }

    private static boolean declaresVanillaRandomTick(Class<?> type) {
        for (Class<?> c = type; c != null && c != Object.class; c = c.getSuperclass()) {
            try {
                Method method = c.getDeclaredMethod("randomTick", BlockState.class, ServerLevel.class, BlockPos.class, RandomSource.class);
                return method.getDeclaringClass().getName().startsWith("net.minecraft.");
            } catch (NoSuchMethodException ignored) {
                // keep walking up
            }
        }
        return true;
    }
}
