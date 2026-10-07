package dev.timeskip.mixin;

import net.minecraft.core.Direction;
import net.minecraft.world.level.block.GrowingPlantBlock;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(GrowingPlantBlock.class)
public interface GrowingPlantBlockAccessor {
    @Accessor("growthDirection")
    Direction timeskip$getGrowthDirection();
}
