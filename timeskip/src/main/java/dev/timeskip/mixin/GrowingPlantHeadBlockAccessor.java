package dev.timeskip.mixin;

import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.GrowingPlantHeadBlock;
import net.minecraft.world.level.block.state.BlockState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(GrowingPlantHeadBlock.class)
public interface GrowingPlantHeadBlockAccessor {
    @Accessor("growPerTickProbability")
    double timeskip$getGrowPerTickProbability();

    @Invoker("canGrowInto")
    boolean timeskip$canGrowInto(BlockState state);

    @Invoker("getGrowIntoState")
    BlockState timeskip$getGrowIntoState(BlockState growFromState, RandomSource random);
}
