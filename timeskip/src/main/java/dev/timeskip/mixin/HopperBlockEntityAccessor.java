package dev.timeskip.mixin;

import net.minecraft.world.level.block.entity.HopperBlockEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(HopperBlockEntity.class)
public interface HopperBlockEntityAccessor {
    @Accessor("cooldownTime")
    int timeskip$getCooldownTime();

    @Accessor("cooldownTime")
    void timeskip$setCooldownTime(int value);
}
