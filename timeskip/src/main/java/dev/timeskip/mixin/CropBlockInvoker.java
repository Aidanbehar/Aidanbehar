package dev.timeskip.mixin;

import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.CropBlock;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(CropBlock.class)
public interface CropBlockInvoker {
    /** Vanilla's growth-speed formula (farmland moisture, neighbouring crops). Pure: works on a snapshot. */
    @Invoker("getGrowthSpeed")
    static float timeskip$getGrowthSpeed(Block type, BlockGetter level, BlockPos pos) {
        throw new AssertionError();
    }
}
