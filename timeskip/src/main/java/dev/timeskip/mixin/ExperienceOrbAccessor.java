package dev.timeskip.mixin;

import net.minecraft.world.entity.ExperienceOrb;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(ExperienceOrb.class)
public interface ExperienceOrbAccessor {
    @Accessor("age")
    int timeskip$getAge();

    @Accessor("age")
    void timeskip$setAge(int value);
}
