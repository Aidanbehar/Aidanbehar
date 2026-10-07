package dev.timeskip.mixin;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.block.PitcherCropBlock;
import net.minecraft.world.level.block.state.BlockState;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(PitcherCropBlock.class)
public interface PitcherCropBlockInvoker {
    /** Vanilla two-block growth (handles the upper half and space checks). */
    @Invoker("grow")
    void timeskip$grow(ServerLevel level, BlockState lowerState, BlockPos lowerPos, int increase);
}
