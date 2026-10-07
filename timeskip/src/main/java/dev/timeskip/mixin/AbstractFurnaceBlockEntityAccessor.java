package dev.timeskip.mixin;

import net.minecraft.core.NonNullList;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.entity.AbstractFurnaceBlockEntity;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.gen.Accessor;

@Mixin(AbstractFurnaceBlockEntity.class)
public interface AbstractFurnaceBlockEntityAccessor {
    @Accessor("litTimeRemaining")
    int timeskip$getLitTimeRemaining();

    @Accessor("litTimeRemaining")
    void timeskip$setLitTimeRemaining(int value);

    @Accessor("cookingTimer")
    int timeskip$getCookingTimer();

    @Accessor("cookingTimer")
    void timeskip$setCookingTimer(int value);

    @Accessor("cookingTotalTime")
    int timeskip$getCookingTotalTime();

    @Accessor("items")
    NonNullList<ItemStack> timeskip$getItems();
}
