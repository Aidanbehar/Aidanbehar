package dev.timeskip.mixin;

import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.TagKey;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.StemBlock;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(StemBlock.class)
public interface StemBlockAccessor {
    @Accessor("fruit")
    ResourceKey<Block> timeskip$getFruit();

    @Accessor("attachedStem")
    ResourceKey<Block> timeskip$getAttachedStem();

    @Accessor("fruitSupportBlocks")
    TagKey<Block> timeskip$getFruitSupportBlocks();
}
