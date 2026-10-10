package dev.aidanbehar.nuclearstation.plant;

import dev.aidanbehar.nuclearstation.facility.FacilityManager;
import dev.aidanbehar.nuclearstation.item.SparePartItem;
import dev.aidanbehar.nuclearstation.registry.ModItems;
import dev.aidanbehar.nuclearstation.sim.Equipment;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import dev.aidanbehar.nuclearstation.sim.PlantCommand;
import dev.aidanbehar.nuclearstation.sim.PlantModel;
import dev.aidanbehar.nuclearstation.sim.PlantOperations;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.MutableComponent;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.item.ItemStack;

/**
 * Local maintenance stations. Using one empty-handed shows the condition of its
 * equipment; sneaking empty-handed operates it locally (start/stop, diesel start,
 * turbine trip, PORV block valve); using the matching spare part repairs it.
 */
public final class Maintenance {
	private Maintenance() {
	}

	public static void useStation(ServerPlayer player, BlockPos pos, ItemStack stack) {
		MinecraftServer server = player.level().getServer();
		var ctx = FacilityManager.context(server).orElse(null);
		EquipmentId id = ctx == null || player.level() != ctx.level ? null : ctx.markers.stationAt(pos);
		if (id == null) {
			player.sendOverlayMessage(Component.translatable("message.nuclearstation.station_unconnected").withStyle(ChatFormatting.GRAY));
			return;
		}
		PlantModel model = PlantService.model(server);
		Equipment eq = model.equipment(id);
		if (!stack.isEmpty()) {
			if (stack.getItem() instanceof SparePartItem part) {
				if (part.part != id.part) {
					player.sendOverlayMessage(Component.translatable("message.nuclearstation.wrong_part",
						Component.translatable("item.nuclearstation." + id.part.itemId)).withStyle(ChatFormatting.YELLOW));
					return;
				}
				PlantCommand.Result r = PlantOperations.repair(model, id);
				PlantService.data(server).setDirty();
				if (!player.isCreative()) {
					stack.shrink(1);
				}
				player.level().playSound(null, pos, SoundEvents.ANVIL_USE, SoundSource.BLOCKS, 0.7f, 1.3f);
				player.sendOverlayMessage(Component.literal(r.message()).withStyle(ChatFormatting.GREEN));
				return;
			}
			showStatus(player, id, eq);
			return;
		}
		if (player.isShiftKeyDown()) {
			localOperation(player, model, id, eq);
			PlantService.data(server).setDirty();
			return;
		}
		if (id == EquipmentId.INTAKE_SCREENS) {
			PlantCommand.Result r = PlantOperations.cleanScreens(model);
			player.sendOverlayMessage(Component.literal(r.message()).withStyle(ChatFormatting.AQUA));
		}
		showStatus(player, id, eq);
	}

	private static void showStatus(ServerPlayer player, EquipmentId id, Equipment eq) {
		ChatFormatting colour = eq.failed ? ChatFormatting.RED : (eq.condition < 0.4 ? ChatFormatting.GOLD : ChatFormatting.GREEN);
		String state = eq.failed ? "FAILED - " + eq.failureCause : (eq.running ? "RUNNING" : "STANDBY");
		MutableComponent msg = Component.literal(id.label + ": ").withStyle(ChatFormatting.WHITE)
			.append(Component.literal(state).withStyle(colour))
			.append(Component.literal(String.format("  condition %.0f%%  starts %d", eq.condition * 100, eq.starts)).withStyle(ChatFormatting.GRAY));
		player.sendSystemMessage(msg);
		player.sendSystemMessage(Component.translatable("message.nuclearstation.station_hint",
			Component.translatable("item.nuclearstation." + id.part.itemId).withStyle(ChatFormatting.AQUA)).withStyle(ChatFormatting.DARK_GRAY));
	}

	private static void localOperation(ServerPlayer player, PlantModel model, EquipmentId id, Equipment eq) {
		PlantCommand.Result r;
		switch (id.kind) {
			case PUMP, FAN, HEATER, STRUCTURE -> r = PlantOperations.execute(model, eq.demanded ? PlantCommand.EQUIP_STOP : PlantCommand.EQUIP_START, id.ordinal(), 0);
			case DIESEL -> r = PlantOperations.execute(model, eq.running ? PlantCommand.EDG_STOP : PlantCommand.EDG_START, id == EquipmentId.EDG_B ? 1 : 0, 0);
			case TURBINE -> r = PlantOperations.execute(model, PlantCommand.TURBINE_TRIP, 0, 0);
			case VALVE -> r = PlantOperations.execute(model, PlantCommand.PORV_BLOCK, id == EquipmentId.PORV_2 ? 1 : 0, 0);
			default -> r = PlantCommand.Result.blocked(id.label + " has no local controls");
		}
		player.sendOverlayMessage(Component.literal("LOCAL: " + r.message()).withStyle(r.accepted() ? ChatFormatting.GREEN : ChatFormatting.RED));
	}

	/** Spare part item for an equipment id (used by commands and loot checks). */
	public static ItemStack partFor(EquipmentId id) {
		return new ItemStack(ModItems.SPARE_PARTS.get(id.part));
	}
}
