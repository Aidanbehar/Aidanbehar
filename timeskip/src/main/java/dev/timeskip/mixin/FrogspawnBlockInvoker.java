package dev.timeskip.mixin;

import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.FrogspawnBlock;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(FrogspawnBlock.class)
public interface FrogspawnBlockInvoker {
    @Invoker("hatchFrogspawn")
    void timeskip$hatchFrogspawn(ServerLevel level, BlockPos pos, RandomSource random);
}
