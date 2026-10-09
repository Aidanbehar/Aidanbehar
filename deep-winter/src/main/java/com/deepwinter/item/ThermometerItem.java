package com.deepwinter.item;

import com.deepwinter.temperature.BodyTemperature;
import com.deepwinter.temperature.TemperatureBreakdown;
import com.deepwinter.temperature.TemperatureFormat;
import net.minecraft.ChatFormatting;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.TooltipDisplay;
import net.minecraft.world.level.Level;
import org.jspecify.annotations.Nullable;

import java.util.function.Consumer;

/** Held: exact air and body temperature in the action bar. Right-click: what is affecting the temperature. */
public class ThermometerItem extends Item {
	public ThermometerItem(Properties properties) {
		super(properties);
	}

	@Override
	public void inventoryTick(ItemStack stack, ServerLevel level, Entity owner, @Nullable EquipmentSlot slot) {
		if (!(owner instanceof ServerPlayer player) || (slot != EquipmentSlot.MAINHAND && slot != EquipmentSlot.OFFHAND)) {
			return;
		}
		// Avoid flicker when one is held in each hand.
		if (slot == EquipmentSlot.OFFHAND && player.getMainHandItem().getItem() instanceof ThermometerItem) {
			return;
		}
		if (player.tickCount % 10 != 0) {
			return;
		}
		TemperatureBreakdown t = BodyTemperature.refresh(player);
		float body = BodyTemperature.state(player).body();
		player.sendOverlayMessage(Component.translatable("thermometer.deepwinter.readout",
			Component.literal(TemperatureFormat.exact(t.ambient())).withStyle(ChatFormatting.WHITE),
			Component.literal(TemperatureFormat.exact(body)).withStyle(body < -5 ? ChatFormatting.AQUA : body > 35 ? ChatFormatting.GOLD : ChatFormatting.GREEN)
		).withStyle(ChatFormatting.GRAY));
	}

	@Override
	public InteractionResult use(Level level, Player player, InteractionHand hand) {
		if (player instanceof ServerPlayer serverPlayer) {
			TemperatureBreakdown t = BodyTemperature.refresh(serverPlayer);
			serverPlayer.sendSystemMessage(Component.translatable("thermometer.deepwinter.breakdown_title").withStyle(ChatFormatting.YELLOW));
			for (Component line : TemperatureFormat.breakdownLines(t)) {
				serverPlayer.sendSystemMessage(Component.literal("  ").append(line));
			}
			level.playSound(null, player.blockPosition(), SoundEvents.SPYGLASS_USE, SoundSource.PLAYERS, 0.6F, 1.6F);
		}
		player.getCooldowns().addCooldown(player.getItemInHand(hand), 20);
		return InteractionResult.SUCCESS;
	}

	@Override
	@SuppressWarnings("deprecation")
	public void appendHoverText(ItemStack stack, TooltipContext context, TooltipDisplay display, Consumer<Component> builder, TooltipFlag flag) {
		builder.accept(Component.translatable("item.deepwinter.thermometer.tooltip").withStyle(ChatFormatting.GRAY));
		builder.accept(Component.translatable("item.deepwinter.thermometer.tooltip2").withStyle(ChatFormatting.DARK_GRAY));
	}
}
