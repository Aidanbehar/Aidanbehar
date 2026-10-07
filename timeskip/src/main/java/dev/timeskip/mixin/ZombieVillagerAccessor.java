package dev.timeskip.mixin;

import net.minecraft.world.entity.monster.zombie.ZombieVillager;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(ZombieVillager.class)
public interface ZombieVillagerAccessor {
    @Accessor("villagerConversionTime")
    int timeskip$getConversionTime();

    @Accessor("villagerConversionTime")
    void timeskip$setConversionTime(int value);
}
