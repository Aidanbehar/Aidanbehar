package dev.timeskip.mixin;

import net.minecraft.world.entity.animal.frog.Tadpole;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(Tadpole.class)
public interface TadpoleAccessor {
    @Accessor("age")
    int timeskip$getAge();

    /** Vanilla's private setter also turns the tadpole into a frog once old enough. */
    @Invoker("setAge")
    void timeskip$setAge(int age);
}
