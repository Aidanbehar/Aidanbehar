package dev.timeskip.mixin;

import net.minecraft.world.entity.projectile.arrow.AbstractArrow;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;
import org.spongepowered.asm.mixin.gen.Invoker;

@Mixin(AbstractArrow.class)
public interface AbstractArrowAccessor {
    @Accessor("life")
    int timeskip$getLife();

    @Accessor("life")
    void timeskip$setLife(int value);

    @Invoker("isInGround")
    boolean timeskip$isInGround();
}
