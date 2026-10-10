package dev.aidanbehar.nuclearstation.command;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.context.CommandContext;
import com.mojang.brigadier.exceptions.CommandSyntaxException;
import com.mojang.brigadier.suggestion.SuggestionsBuilder;
import dev.aidanbehar.nuclearstation.config.ModConfig;
import dev.aidanbehar.nuclearstation.facility.FacilityManager;
import dev.aidanbehar.nuclearstation.facility.layout.Blueprint;
import dev.aidanbehar.nuclearstation.plant.PlantData;
import dev.aidanbehar.nuclearstation.plant.PlantService;
import dev.aidanbehar.nuclearstation.radiation.ContaminationData;
import dev.aidanbehar.nuclearstation.radiation.PlayerRadiation;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import dev.aidanbehar.nuclearstation.registry.ModItems;
import dev.aidanbehar.nuclearstation.sim.DevHooks;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import dev.aidanbehar.nuclearstation.sim.PlantCommand;
import dev.aidanbehar.nuclearstation.sim.PlantModel;
import dev.aidanbehar.nuclearstation.sim.PlantOperations;
import dev.aidanbehar.nuclearstation.sim.Readout;
import dev.aidanbehar.nuclearstation.sim.PlantSnapshot;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;

/**
 * {@code /nps} - Meridian Point station commands. Information and diagnostics need
 * operator permission (they reveal the hidden site); {@code /nps dev ...} commands are
 * development tools and some of them are additionally gated by the configuration.
 */
public final class NpsCommand {
	private NpsCommand() {
	}

	public static void register() {
		CommandRegistrationCallback.EVENT.register((dispatcher, registry, environment) -> register(dispatcher));
	}

	private static void register(CommandDispatcher<CommandSourceStack> d) {
		d.register(Commands.literal("nps")
			.then(Commands.literal("dose").executes(NpsCommand::dose))
			.then(Commands.literal("locate").requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS)).executes(NpsCommand::locate))
			.then(Commands.literal("tp").requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS)).executes(NpsCommand::teleport))
			.then(Commands.literal("status").requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS)).executes(NpsCommand::status))
			.then(Commands.literal("generation").requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
				.executes(NpsCommand::generation)
				.then(Commands.literal("buildall").executes(NpsCommand::buildAll)))
			.then(Commands.literal("dev").requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
				.then(Commands.literal("fail").then(Commands.argument("equipment", StringArgumentType.word()).suggests((c, b) -> suggestEquipment(b))
					.executes(c -> fail(c, StringArgumentType.getString(c, "equipment")))))
				.then(Commands.literal("repair").then(Commands.argument("equipment", StringArgumentType.word()).suggests((c, b) -> suggestEquipment(b))
					.executes(c -> repair(c, StringArgumentType.getString(c, "equipment")))))
				.then(Commands.literal("gridloss").executes(NpsCommand::gridLoss))
				.then(Commands.literal("loca").then(Commands.argument("area", DoubleArgumentType.doubleArg(0, 1)).executes(NpsCommand::loca)))
				.then(Commands.literal("parts").executes(NpsCommand::parts))
				.then(Commands.literal("resetplant").then(Commands.literal("confirm").executes(NpsCommand::resetPlant)))
				.then(Commands.literal("cleardose").executes(NpsCommand::clearDose))
				.then(Commands.literal("regenerate").then(Commands.literal("confirm").executes(NpsCommand::regenerate)))));
	}

	private static CompletableFuture<com.mojang.brigadier.suggestion.Suggestions> suggestEquipment(SuggestionsBuilder b) {
		for (EquipmentId id : EquipmentId.values()) {
			if (id.name().toLowerCase(Locale.ROOT).startsWith(b.getRemainingLowerCase())) {
				b.suggest(id.name().toLowerCase(Locale.ROOT));
			}
		}
		return b.buildFuture();
	}

	private static FacilityManager.Context ctx(CommandContext<CommandSourceStack> c) {
		return FacilityManager.context(c.getSource().getServer()).orElse(null);
	}

	private static int noSite(CommandContext<CommandSourceStack> c) {
		c.getSource().sendFailure(Component.literal("No facility site in this world (generation disabled?)"));
		return 0;
	}

	private static int locate(CommandContext<CommandSourceStack> c) {
		var ctx = ctx(c);
		if (ctx == null) {
			return noSite(c);
		}
		BlockPos centre = ctx.centre();
		BlockPos cr = ctx.markers.consoles().stream().findFirst().orElse(centre);
		c.getSource().sendSuccess(() -> Component.literal(String.format(
			"Meridian Point NGS: centre (%d, %d), footprint (%d..%d, %d..%d), grade y=%d. Control room console at (%d, %d, %d). Selected by: %s",
			centre.getX(), centre.getZ(), ctx.data.originX(), ctx.data.originX() + Blueprint.SIZE - 1, ctx.data.originZ(),
			ctx.data.originZ() + Blueprint.SIZE - 1, ctx.data.grade(), cr.getX(), cr.getY(), cr.getZ(), ctx.data.selectionNote())), false);
		return 1;
	}

	private static int teleport(CommandContext<CommandSourceStack> c) throws CommandSyntaxException {
		var ctx = ctx(c);
		if (ctx == null) {
			return noSite(c);
		}
		ServerPlayer player = c.getSource().getPlayerOrException();
		BlockPos target = ctx.local(512, ctx.data.grade() + 1, 300);
		if (player.level() != ctx.level) {
			c.getSource().sendFailure(Component.literal("Go to the Overworld first"));
			return 0;
		}
		player.teleportTo(target.getX() + 0.5, target.getY(), target.getZ() + 0.5);
		return 1;
	}

	private static int status(CommandContext<CommandSourceStack> c) {
		if (ctx(c) == null) {
			return noSite(c);
		}
		MinecraftServer server = c.getSource().getServer();
		PlantModel m = PlantService.model(server);
		PlantSnapshot s = PlantSnapshot.capture(m);
		c.getSource().sendSuccess(() -> Component.literal(String.format(
			"Reactor %s | power %.1f%% (%.0f MWt) | Tavg %.1f C | P %.2f MPa | gen %.0f MWe net %.0f | turbine %.0f rpm | alarms P%d | core damage %.1f%% | release %.3g%%",
			m.reactorTripped() ? "TRIPPED (" + m.tripCause() + ")" : "CRITICAL", s.get(Readout.NEUTRON_POWER), m.thermalPowerMW(), m.rcsTavg(),
			m.rcsPressure(), m.generatorMW(), m.netOutput(), m.turbineSpeed(), m.alarms().worstActivePriority(), m.coreDamage() * 100,
			m.totalEnvironmentalRelease() * 100)).withStyle(ChatFormatting.AQUA), false);
		return 1;
	}

	private static int generation(CommandContext<CommandSourceStack> c) {
		var ctx = ctx(c);
		if (ctx == null) {
			return noSite(c);
		}
		c.getSource().sendSuccess(() -> Component.literal(String.format(
			"Facility generation: %d/%d chunks built, %d skipped (protected), %d queued, %d built this session (avg %.1f ms each)%s. Radiation index: %d sections. Contaminated chunks: %d",
			ctx.data.builtCount(), Blueprint.CHUNKS * Blueprint.CHUNKS, ctx.data.skippedCount(), ctx.queuedChunks(), ctx.paintedThisSession(),
			ctx.averagePaintMillis(), ctx.forcedBuildActive() ? " [forced build running]" : "", RadiationManager.indexedSections(ctx.level),
			ContaminationData.get(ctx.level).contaminatedChunks())), false);
		return 1;
	}

	private static int buildAll(CommandContext<CommandSourceStack> c) {
		var ctx = ctx(c);
		if (ctx == null) {
			return noSite(c);
		}
		FacilityManager.startForcedBuild(ctx);
		c.getSource().sendSuccess(() -> Component.literal("Building every facility chunk in the background (this generates ~4096 chunks; watch /nps generation)"), true);
		return 1;
	}

	private static EquipmentId equipment(CommandContext<CommandSourceStack> c, String name) {
		try {
			return EquipmentId.valueOf(name.toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException e) {
			c.getSource().sendFailure(Component.literal("Unknown equipment " + name));
			return null;
		}
	}

	private static int fail(CommandContext<CommandSourceStack> c, String name) {
		EquipmentId id = equipment(c, name);
		if (id == null || ctx(c) == null) {
			return 0;
		}
		PlantModel m = PlantService.model(c.getSource().getServer());
		DevHooks.fail(m, id);
		c.getSource().sendSuccess(() -> Component.literal("Failed " + id.label), true);
		return 1;
	}

	private static int repair(CommandContext<CommandSourceStack> c, String name) {
		EquipmentId id = equipment(c, name);
		if (id == null || ctx(c) == null) {
			return 0;
		}
		PlantCommand.Result r = PlantOperations.repair(PlantService.model(c.getSource().getServer()), id);
		c.getSource().sendSuccess(() -> Component.literal(r.message()), true);
		return 1;
	}

	private static int gridLoss(CommandContext<CommandSourceStack> c) {
		if (ctx(c) == null) {
			return noSite(c);
		}
		DevHooks.gridLoss(PlantService.model(c.getSource().getServer()));
		c.getSource().sendSuccess(() -> Component.literal("Offsite grid lost"), true);
		return 1;
	}

	private static int loca(CommandContext<CommandSourceStack> c) {
		if (ctx(c) == null) {
			return noSite(c);
		}
		double area = DoubleArgumentType.getDouble(c, "area");
		DevHooks.loca(PlantService.model(c.getSource().getServer()), area);
		c.getSource().sendSuccess(() -> Component.literal(String.format("RCS break area set to %.4f of a double-ended guillotine break", area)), true);
		return 1;
	}

	private static int parts(CommandContext<CommandSourceStack> c) throws CommandSyntaxException {
		ServerPlayer player = c.getSource().getPlayerOrException();
		ModItems.SPARE_PARTS.values().forEach(item -> player.getInventory().add(new ItemStack(item, 4)));
		player.getInventory().add(new ItemStack(ModItems.GEIGER_COUNTER));
		player.getInventory().add(new ItemStack(ModItems.DOSIMETER));
		player.getInventory().add(new ItemStack(ModItems.SURVEY_METER));
		return 1;
	}

	private static int resetPlant(CommandContext<CommandSourceStack> c) {
		PlantData data = PlantService.data(c.getSource().getServer());
		data.reset();
		c.getSource().sendSuccess(() -> Component.literal("Plant simulation reset to full-power equilibrium (world damage already applied is not undone)"), true);
		return 1;
	}

	private static int dose(CommandContext<CommandSourceStack> c) throws CommandSyntaxException {
		ServerPlayer player = c.getSource().getPlayerOrException();
		PlayerRadiation rad = RadiationManager.data(player);
		c.getSource().sendSuccess(() -> Component.literal(String.format("Lifetime dose %.2f mSv, recent dose %.1f mSv, dose rate %s, contamination %.0f kBq",
			rad.lifetimeDose(), rad.acuteDose(), RadiationManager.formatDoseRate(rad.lastDoseRate()), rad.contamination())), false);
		return 1;
	}

	private static int clearDose(CommandContext<CommandSourceStack> c) throws CommandSyntaxException {
		ServerPlayer player = c.getSource().getPlayerOrException();
		player.setAttached(dev.aidanbehar.nuclearstation.registry.ModAttachments.RADIATION, new PlayerRadiation());
		c.getSource().sendSuccess(() -> Component.literal("Radiation record cleared"), true);
		return 1;
	}

	private static int regenerate(CommandContext<CommandSourceStack> c) {
		var ctx = ctx(c);
		if (ctx == null) {
			return noSite(c);
		}
		if (!ModConfig.get().development.allowRegenerate) {
			c.getSource().sendFailure(Component.literal("Regeneration is disabled. Set development.allowRegenerate=true in config/nuclearstation.json (disposable test worlds only)."));
			return 0;
		}
		FacilityManager.resetForRegeneration(ctx);
		c.getSource().sendSuccess(() -> Component.literal("All facility chunks marked for repainting; they are rebuilt as they load. The site itself does not move."), true);
		return 1;
	}
}
