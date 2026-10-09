package com.deepwinter.item;

import com.deepwinter.block.ModBlocks;
import com.deepwinter.block.SettledSnowBlock;
import com.deepwinter.snow.SnowColumn;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.Holder;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.component.TooltipDisplay;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.item.enchantment.Enchantment;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.item.enchantment.Enchantments;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.SnowLayerBlock;
import net.minecraft.world.level.block.state.BlockState;

import java.util.function.Consumer;

/**
 * Right-click on snow scoops it away: 4 layers off the top of a 3x3 patch when clicking the top of snow,
 * a 3x3 face of a snow wall when clicking its side, or (sneaking) one column straight down.
 * Scooped snow goes straight into the inventory as snowballs, snow blocks or powder snow buckets.
 */
public class SnowShovelItem extends Item {
	private static final int LAYERS_PER_SCOOP = 4;
	private static final int MAX_COLUMN_DEPTH = 4;

	public SnowShovelItem(Properties properties) {
		super(properties);
	}

	private static boolean isSnow(BlockState state) {
		return SnowColumn.isSnow(state);
	}

	@Override
	public InteractionResult useOn(UseOnContext context) {
		Level level = context.getLevel();
		BlockPos clicked = context.getClickedPos();
		if (!isSnow(level.getBlockState(clicked))) {
			return super.useOn(context);
		}
		Player player = context.getPlayer();
		if (!(level instanceof ServerLevel server) || player == null) {
			return InteractionResult.SUCCESS;
		}
		ItemStack stack = context.getItemInHand();
		Haul haul = new Haul();

		if (player.isSecondaryUseActive()) {
			// Precise: clear one column from the clicked block down (doorways, paths).
			BlockPos.MutableBlockPos p = clicked.mutable();
			for (int i = 0; i < MAX_COLUMN_DEPTH && isSnow(level.getBlockState(p)); i++) {
				haul.take(server, p.immutable(), 99);
				p.move(Direction.DOWN);
			}
		} else if (context.getClickedFace().getAxis().isHorizontal()) {
			// Tunnel into a snow wall: a 3x3 face.
			Direction face = context.getClickedFace();
			Direction side = face.getClockWise();
			for (int u = -1; u <= 1; u++) {
				for (int v = -1; v <= 1; v++) {
					BlockPos p = clicked.relative(side, u).above(v);
					if (isSnow(level.getBlockState(p))) {
						haul.take(server, p, 99);
					}
				}
			}
		} else {
			// Scoop the top 4 layers off a 3x3 patch, following the local snow surface.
			for (int dx = -1; dx <= 1; dx++) {
				for (int dz = -1; dz <= 1; dz++) {
					BlockPos top = localTop(level, clicked.offset(dx, 0, dz));
					if (top != null) {
						int left = LAYERS_PER_SCOOP;
						BlockPos p = top;
						while (left > 0 && isSnow(level.getBlockState(p))) {
							left -= haul.take(server, p, left);
							p = p.below();
						}
					}
				}
			}
		}

		if (haul.layers == 0) {
			return InteractionResult.PASS;
		}
		haul.deliver(player);
		stack.hurtAndBreak(1, player, context.getHand() == net.minecraft.world.InteractionHand.MAIN_HAND ? EquipmentSlot.MAINHAND : EquipmentSlot.OFFHAND);
		level.playSound(null, clicked, SoundEvents.SNOW_BREAK, SoundSource.PLAYERS, 1.0F, 0.8F + level.getRandom().nextFloat() * 0.3F);
		player.getCooldowns().addCooldown(stack, cooldown(server, stack));
		return InteractionResult.SUCCESS;
	}

	/** Efficiency shortens the pause between scoops. */
	private static int cooldown(ServerLevel level, ItemStack stack) {
		Holder<Enchantment> efficiency = level.registryAccess().lookupOrThrow(Registries.ENCHANTMENT).getOrThrow(Enchantments.EFFICIENCY);
		int lvl = EnchantmentHelper.getItemEnchantmentLevel(efficiency, stack);
		return Math.max(1, 6 - lvl);
	}

	/** Topmost snow cell within one block of the clicked height in this column. */
	private static BlockPos localTop(Level level, BlockPos around) {
		for (int dy = 1; dy >= -1; dy--) {
			BlockPos p = around.above(dy);
			if (isSnow(level.getBlockState(p)) && !isSnow(level.getBlockState(p.above()))) {
				return p;
			}
		}
		return null;
	}

	/** Collects what the shovel removes. */
	private static final class Haul {
		int layers;
		int snowballs;
		int snowBlocks;
		int powder;

		/** Removes up to {@code max} layers from the cell; returns the layers removed. */
		int take(ServerLevel level, BlockPos pos, int max) {
			BlockState state = level.getBlockState(pos);
			int have;
			if (state.is(Blocks.SNOW)) {
				have = state.getValue(SnowLayerBlock.LAYERS);
			} else if (state.is(ModBlocks.SETTLED_SNOW)) {
				have = state.getValue(SettledSnowBlock.LAYERS);
			} else if (state.is(Blocks.SNOW_BLOCK) || state.is(Blocks.POWDER_SNOW)) {
				have = 8;
			} else {
				return 0;
			}
			int removed = Math.min(have, max);
			if (removed == have) {
				level.setBlock(pos, Blocks.AIR.defaultBlockState(), Block.UPDATE_ALL);
				if (state.is(Blocks.POWDER_SNOW)) {
					powder++;
				} else if (state.is(Blocks.SNOW_BLOCK) || state.is(Blocks.SNOW) && have == 8) {
					snowBlocks++;
				} else {
					snowballs += Math.max(1, removed / 2);
				}
			} else {
				BlockState rest;
				if (state.is(Blocks.SNOW)) {
					rest = state.setValue(SnowLayerBlock.LAYERS, have - removed);
				} else if (state.is(ModBlocks.SETTLED_SNOW)) {
					rest = state.setValue(SettledSnowBlock.LAYERS, have - removed);
				} else {
					// Full block partly scooped: what's left becomes ordinary layers.
					rest = Blocks.SNOW.defaultBlockState().setValue(SnowLayerBlock.LAYERS, have - removed);
				}
				level.setBlock(pos, rest, Block.UPDATE_ALL);
				snowballs += Math.max(1, removed / 2);
			}
			layers += removed;
			return removed;
		}

		void deliver(Player player) {
			give(player, new ItemStack(Items.SNOWBALL, snowballs));
			give(player, new ItemStack(Items.SNOW_BLOCK, snowBlocks));
			// Powder snow needs an empty bucket to carry; without one it just falls apart.
			for (int i = 0; i < powder; i++) {
				int slot = findEmptyBucket(player);
				if (slot < 0) {
					break;
				}
				player.getInventory().getItem(slot).shrink(1);
				give(player, new ItemStack(Items.POWDER_SNOW_BUCKET));
			}
		}

		private static int findEmptyBucket(Player player) {
			for (int i = 0; i < player.getInventory().getContainerSize(); i++) {
				if (player.getInventory().getItem(i).is(Items.BUCKET)) {
					return i;
				}
			}
			return -1;
		}

		private static void give(Player player, ItemStack stack) {
			if (stack.isEmpty()) {
				return;
			}
			if (!player.getInventory().add(stack)) {
				Block.popResource(player.level(), player.blockPosition(), stack);
			}
		}
	}

	@Override
	@SuppressWarnings("deprecation")
	public void appendHoverText(ItemStack stack, TooltipContext context, TooltipDisplay display, Consumer<Component> builder, TooltipFlag flag) {
		builder.accept(Component.translatable("item.deepwinter.snow_shovel.tooltip").withStyle(ChatFormatting.GRAY));
		builder.accept(Component.translatable("item.deepwinter.snow_shovel.tooltip2").withStyle(ChatFormatting.DARK_GRAY));
	}
}
