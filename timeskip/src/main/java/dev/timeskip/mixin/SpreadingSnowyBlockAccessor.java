package dev.timeskip.mixin;

import net.minecraft.resources.ResourceKey;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.SpreadingSnowyBlock;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(SpreadingSnowyBlock.class)
public interface SpreadingSnowyBlockAccessor {
    @Accessor("baseBlock")
    ResourceKey<Block> timeskip$getBaseBlock();
}
