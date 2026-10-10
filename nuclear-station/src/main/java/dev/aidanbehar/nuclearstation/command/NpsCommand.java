package dev.aidanbehar.nuclearstation.command;

import dev.aidanbehar.nuclearstation.facility.layout.SiteLayout;
import net.minecraft.world.entity.monster.Enemy;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.entity.Entity;
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
			.then(Commands.literal("meltdown").requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
				.executes(NpsCommand::meltdownInfo)
				.then(Commands.literal("confirm")
					.executes(c -> meltdown(c, 60))
					.then(Commands.argument("speed", DoubleArgumentType.doubleArg(1, PlantData.MAX_TIME_SCALE))
						.executes(c -> meltdown(c, DoubleArgumentType.getDouble(c, "speed"))))))
			.then(Commands.literal("timescale").requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
				.executes(NpsCommand::timeScaleInfo)
				.then(Commands.argument("speed", DoubleArgumentType.doubleArg(1, PlantData.MAX_TIME_SCALE))
					.executes(c -> timeScale(c, DoubleArgumentType.getDouble(c, "speed")))))
			.then(Commands.literal("dev").requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
				.then(Commands.literal("clearmobs").executes(NpsCommand::clearMobs))
				.then(Commands.literal("restore").executes(c -> confirmHelp(c, "restore", "Resets the plant to full power, rebuilds the reactor area and clears ground contamination.")).then(Commands.literal("confirm").executes(NpsCommand::restore)))
				.then(Commands.literal("fail").executes(c -> equipmentHelp(c, "fail"))
					.then(Commands.argument("equipment", StringArgumentType.word()).suggests((c, b) -> suggestEquipment(b))
					.executes(c -> fail(c, StringArgumentType.getString(c, "equipment")))))
				.then(Commands.literal("repair").executes(c -> equipmentHelp(c, "repair"))
					.then(Commands.literal("all").executes(NpsCommand::repairAll))
					.then(Commands.argument("equipment", StringArgumentType.word()).suggests((c, b) -> suggestEquipment(b))
					.executes(c -> repair(c, StringArgumentType.getString(c, "equipment")))))
				.then(Commands.literal("gridloss").executes(NpsCommand::gridLoss))
				.then(Commands.literal("loca").executes(NpsCommand::locaHelp)
					.then(Commands.literal("small").executes(c -> loca(c, 0.005)))
					.then(Commands.literal("medium").executes(c -> loca(c, 0.05)))
					.then(Commands.literal("large").executes(c -> loca(c, 1.0)))
					.then(Commands.argument("area", DoubleArgumentType.doubleArg(0, 1))
						.executes(c -> loca(c, DoubleArgumentType.getDouble(c, "area")))))
				.then(Commands.literal("parts").executes(NpsCommand::parts))
				.then(Commands.literal("resetplant").executes(c -> confirmHelp(c, "resetplant", "Resets the plant simulation to full power (world damage stays).")).then(Commands.literal("confirm").executes(NpsCommand::resetPlant)))
				.then(Commands.literal("cleardose").executes(NpsCommand::clearDose))
				.then(Commands.literal("regenerate").executes(c -> confirmHelp(c, "regenerate", "Repaints the whole station (needs development.allowRegenerate in the config).")).then(Commands.literal("confirm").executes(NpsCommand::regenerate)))));
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
			m.reactorTripped() ? "TRIPPED (" + m.tripCause() + ")" : "CRITICAL", m.neutronPower() * 100, m.thermalPowerMW(), m.rcsTavg(),
			m.rcsPressure(), m.generatorMW(), m.netOutput(), m.turbineSpeed(), m.alarms().worstActivePriority(), m.coreDamage() * 100,
			m.totalEnvironmentalRelease() * 100)).withStyle(ChatFormatting.AQUA), false);
		if (m.coreDamage() > 0 || PlantService.data(server).timeScale() > 1) {
			c.getSource().sendSuccess(() -> Component.literal(String.format(
				"Severe accident: core melt %.0f%% | vessel %s | basemat %s | containment integrity %.0f%% (%.0f kPa, H2 %.1f%%) | plant time x%.0f",
				m.coreMelt() * 100, m.vesselFailed() ? "FAILED" : "intact", m.basematMeltThrough() ? "MELTED THROUGH" : "holding",
				m.containmentIntegrity() * 100, m.containmentPressure(), m.hydrogenFraction() * 100, PlantService.data(server).timeScale()))
				.withStyle(ChatFormatting.RED), false);
		}
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

	private static int equipmentHelp(CommandContext<CommandSourceStack> c, String verb) {
		PlantModel m = PlantService.model(c.getSource().getServer());
		StringBuilder all = new StringBuilder();
		StringBuilder failed = new StringBuilder();
		for (EquipmentId id : EquipmentId.values()) {
			String name = id.name().toLowerCase(Locale.ROOT);
			all.append(all.length() > 0 ? ", " : "").append(name);
			if (m.equipment(id).failed) {
				failed.append(failed.length() > 0 ? ", " : "").append(name);
			}
		}
		c.getSource().sendSuccess(() -> Component.literal("Usage: /nps dev " + verb + " <equipment>" + ("repair".equals(verb) ? "  or  /nps dev repair all" : "")
			+ "\nEquipment: " + all).withStyle(ChatFormatting.YELLOW), false);
		String failedList = failed.length() == 0 ? "none" : failed.toString();
		c.getSource().sendSuccess(() -> Component.literal("Currently failed: " + failedList).withStyle(ChatFormatting.GOLD), false);
		return 1;
	}

	private static int repairAll(CommandContext<CommandSourceStack> c) {
		if (ctx(c) == null) {
			return noSite(c);
		}
		PlantModel m = PlantService.model(c.getSource().getServer());
		int n = 0;
		for (EquipmentId id : EquipmentId.values()) {
			if (m.equipment(id).failed || m.equipment(id).condition < 1) {
				PlantOperations.repair(m, id);
				n++;
			}
		}
		int count = n;
		c.getSource().sendSuccess(() -> Component.literal("Repaired " + count + " pieces of equipment"), true);
		return 1;
	}

	private static int confirmHelp(CommandContext<CommandSourceStack> c, String name, String what) {
		c.getSource().sendSuccess(() -> Component.literal(what + " Type /nps dev " + name + " confirm to do it.").withStyle(ChatFormatting.YELLOW), false);
		return 1;
	}

	private static int locaHelp(CommandContext<CommandSourceStack> c) {
		c.getSource().sendSuccess(() -> Component.literal("Usage: /nps dev loca small | medium | large | <0-1>\n"
			+ "small = 0.005 (a few kg/s leak, charging may keep up), medium = 0.05 (safety injection needed), "
			+ "large = 1.0 (double-ended break of a main coolant pipe)").withStyle(ChatFormatting.YELLOW), false);
		return 1;
	}

	private static int loca(CommandContext<CommandSourceStack> c, double area) {
		if (ctx(c) == null) {
			return noSite(c);
		}
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

	// ================================================================== meltdown and time

	private static int meltdownInfo(CommandContext<CommandSourceStack> c) {
		c.getSource().sendSuccess(() -> Component.literal(
			"/nps meltdown confirm [speed] starts an extended station blackout: off-site power lost for good, both diesels and the "
				+ "turbine-driven feed pump failed. Nothing else is scripted - the core boils dry, melts, fails the reactor vessel and attacks "
				+ "the containment, releasing radioactivity downwind. Plant time runs [speed] times faster (default 60) until the molten core "
				+ "fails the reactor vessel, then returns to normal so you can see the aftermath. Repairing a diesel or restoring feedwater in time can still save the core. "
				+ "Afterwards /nps dev restore confirm rebuilds the damaged area.").withStyle(ChatFormatting.GOLD), false);
		return 1;
	}

	private static int meltdown(CommandContext<CommandSourceStack> c, double speed) {
		if (ctx(c) == null) {
			return noSite(c);
		}
		MinecraftServer server = c.getSource().getServer();
		PlantData data = PlantService.data(server);
		DevHooks.meltdown(data.model());
		data.setTimeScale(speed);
		data.setMeltdownRun(true);
		server.getPlayerList().broadcastSystemMessage(Component.literal("[Meridian Point] ").withStyle(ChatFormatting.AQUA)
			.append(Component.literal("STATION BLACKOUT - all AC power lost, emergency diesels failed. Core cooling is failing.")
				.withStyle(ChatFormatting.RED, ChatFormatting.BOLD)), false);
		c.getSource().sendSuccess(() -> Component.literal(String.format(
			"Meltdown scenario started; plant time x%.0f. Expect core damage after ~3.5 plant hours and vessel failure after ~7.5 (about %.0f and %.0f minutes now).",
			data.timeScale(), 3.5 * 60 / data.timeScale(), 7.5 * 60 / data.timeScale())), true);
		return 1;
	}

	private static int timeScaleInfo(CommandContext<CommandSourceStack> c) {
		double scale = PlantService.data(c.getSource().getServer()).timeScale();
		c.getSource().sendSuccess(() -> Component.literal(String.format("Plant time runs x%.0f. /nps timescale <1-%.0f> to change.", scale, PlantData.MAX_TIME_SCALE)), false);
		return 1;
	}

	private static int timeScale(CommandContext<CommandSourceStack> c, double speed) {
		PlantData data = PlantService.data(c.getSource().getServer());
		data.setTimeScale(speed);
		c.getSource().sendSuccess(() -> Component.literal(String.format("Plant time now runs x%.0f", data.timeScale())), true);
		return 1;
	}

	private static int clearMobs(CommandContext<CommandSourceStack> c) {
		var ctx = ctx(c);
		if (ctx == null) {
			return noSite(c);
		}
		int removed = 0;
		for (Entity e : ctx.level.getAllEntities()) {
			if (e instanceof Enemy && e instanceof Mob mob && !mob.isPersistenceRequired() && ctx.inFootprint(e.blockPosition())) {
				e.discard();
				removed++;
			}
		}
		int n = removed;
		c.getSource().sendSuccess(() -> Component.literal("Removed " + n + " hostile mobs from the station"), true);
		return n;
	}

	private static int restore(CommandContext<CommandSourceStack> c) {
		var ctx = ctx(c);
		if (ctx == null) {
			return noSite(c);
		}
		MinecraftServer server = c.getSource().getServer();
		PlantService.data(server).reset();
		// rebuild every chunk accident damage can reach: the containment surroundings and the fuel building
		int x0 = SiteLayout.CONT_X - SiteLayout.CONT_R - 48;
		int x1 = Math.max(SiteLayout.CONT_X + SiteLayout.CONT_R + 48, SiteLayout.FUEL_X1 + 8);
		int z0 = SiteLayout.CONT_Z - SiteLayout.CONT_R - 48;
		int z1 = SiteLayout.CONT_Z + SiteLayout.CONT_R + 48;
		int chunks = 0;
		for (int cx = x0 >> 4; cx <= x1 >> 4; cx++) {
			for (int cz = z0 >> 4; cz <= z1 >> 4; cz++) {
				int idx = ctx.data.index((ctx.data.originX() >> 4) + cx, (ctx.data.originZ() >> 4) + cz);
				if (idx >= 0) {
					ctx.data.requestRepair(idx);
					chunks++;
				}
			}
		}
		ContaminationData contamination = ContaminationData.get(ctx.level);
		contamination.raw().clear();
		contamination.setDirty();
		FacilityManager.startForcedBuild(ctx);
		int n = chunks;
		c.getSource().sendSuccess(() -> Component.literal("Plant reset to full power; " + n
			+ " chunks around the reactor are being rebuilt and ground contamination has been cleared. Contaminated soil blocks remain."), true);
		return 1;
	}
}
