package dev.timeskip.mixin;

import net.minecraft.core.BlockPos;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.LevelReader;
import net.minecraft.world.level.block.FarmlandBlock;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(FarmlandBlock.class)
public interface FarmlandBlockInvoker {
    @Invoker("isNearWater")
    static boolean timeskip$isNearWater(LevelReader level, BlockPos pos) {
        throw new AssertionError();
    }

    @Invoker("shouldMaintainFarmland")
    static boolean timeskip$shouldMaintainFarmland(BlockGetter level, BlockPos pos) {
        throw new AssertionError();
    }
}
