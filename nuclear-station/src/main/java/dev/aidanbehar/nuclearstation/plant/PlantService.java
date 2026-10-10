package dev.aidanbehar.nuclearstation.plant;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.config.ModConfig;
import dev.aidanbehar.nuclearstation.facility.FacilityManager;
import dev.aidanbehar.nuclearstation.facility.Feature;
import dev.aidanbehar.nuclearstation.network.ModNetwork;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import dev.aidanbehar.nuclearstation.sim.PlantCommand;
import dev.aidanbehar.nuclearstation.sim.PlantEnvironment;
import dev.aidanbehar.nuclearstation.sim.PlantEvent;
import dev.aidanbehar.nuclearstation.sim.PlantModel;
import dev.aidanbehar.nuclearstation.sim.PlantOperations;
import dev.aidanbehar.nuclearstation.sim.PlantSnapshot;
import java.util.List;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.level.biome.Biome;

/**
 * Runs the plant simulation on the server: steps the model at a fixed interval using
 * environment inputs from the world, dispatches plant events to the world layer,
 * deposits environmental releases and validates operator commands from clients.
 * The simulation always runs on the server thread and is never trusted to clients.
 */
public final class PlantService {
	/** Maximum distance from an operator console from which control-room commands are accepted. */
	public static final double CONSOLE_REACH = 10.0;
	private static final double RELEASE_DEPOSIT_INTERVAL = 200;

	private static long consecutiveErrors;

	private PlantService() {
	}

	public static void register() {
		ServerTickEvents.END_SERVER_TICK.register(PlantService::tick);
	}

	public static PlantData data(MinecraftServer server) {
		return PlantData.get(server.overworld());
	}

	public static PlantModel model(MinecraftServer server) {
		return data(server).model();
	}

	private static void tick(MinecraftServer server) {
		ModConfig cfg = ModConfig.get();
		ServerLevel overworld = server.overworld();
		if (overworld == null || FacilityManager.context(server).isEmpty()) {
			return;
		}
		if (!cfg.simulation.runWithoutPlayers && overworld.players().isEmpty()) {
			return;
		}
		long tick = server.getTickCount();
		int interval = cfg.simulation.updateIntervalTicks;
		if (tick % interval != 0) {
			return;
		}
		PlantData data = data(server);
		PlantModel model = data.model();
		PlantEnvironment env = environment(overworld, cfg);
		try {
			model.step(interval / 20.0, env);
			consecutiveErrors = 0;
		} catch (RuntimeException e) {
			if (consecutiveErrors++ < 3) {
				NuclearStation.LOG.error("Plant simulation step failed", e);
			}
			return;
		}
		data.setDirty();
		List<PlantEvent> events = model.drainEvents();
		var ctx = FacilityManager.context(server).get();
		for (PlantEvent event : events) {
			PlantWorldEffects.handle(overworld, ctx, data, event);
		}
		data.addPendingRelease(model.drainEnvironmentalRelease());
		if (tick % RELEASE_DEPOSIT_INTERVAL == 0) {
			double release = data.takePendingRelease();
			if (release > 1e-12) {
				RadiationManager.depositRelease(overworld, releasePoint(ctx, model), release, overworld.getGameTime(), overworld.isRaining());
			}
		}
		PlantWorldEffects.periodic(overworld, ctx, data, tick);
		PlantSnapshot snapshot = null;
		for (ServerPlayer player : ModNetwork.controlRoomViewers(server)) {
			if (snapshot == null) {
				snapshot = PlantSnapshot.capture(model);
			}
			ModNetwork.sendSnapshot(player, snapshot);
		}
		if (tick % 20 == 0) {
			ModNetwork.broadcastStatus(server, ctx, model);
		}
	}

	private static BlockPos releasePoint(dev.aidanbehar.nuclearstation.facility.FacilityManager.Context ctx, PlantModel model) {
		Feature f = model.sfpDamage() > 0 && model.airborneActivity() < 1e-6 ? Feature.SPENT_FUEL_POOL : Feature.CONTAINMENT_DOME_TOP;
		BlockPos pos = ctx.markers.feature(f);
		return pos != null ? pos : ctx.centre();
	}

	/** Environment inputs derived from the world at the plant. */
	static PlantEnvironment environment(ServerLevel level, ModConfig cfg) {
		PlantEnvironment env = new PlantEnvironment();
		var ctx = FacilityManager.context(level.getServer()).orElse(null);
		BlockPos intake = ctx == null ? level.getRespawnData().pos() : ctx.local(470, ctx.data.sea(), 960);
		Biome biome = level.getBiome(intake).value();
		float temp = biome.getBaseTemperature();
		long day = level.getOverworldClockTime() % 24000L;
		double diurnal = Math.sin(2 * Math.PI * (day - 6000) / 24000.0);
		env.seaTemperature = 5 + 21 * Math.max(0, Math.min(1.1, temp)) + 0.8 * diurnal;
		env.wetBulb = env.seaTemperature - 3 + 2 * diurnal;
		env.thunderstorm = level.isThundering();
		env.gridDemandMW = 880 + 140 * Math.max(0, diurnal) + 40 * Math.sin(2 * Math.PI * day / 8000.0);
		env.slowTimeFactor = cfg.simulation.slowTimeFactor;
		env.failureRateFactor = cfg.failureRateFactor();
		env.automaticOperatorActions = cfg.simulation.automaticOperatorActions;
		return env;
	}

	// ================================================================== operator interaction

	/** Executes a control-room command from a player after server-side validation. */
	public static void handleCommand(ServerPlayer player, PlantCommand command, int index, double value) {
		MinecraftServer server = player.level().getServer();
		var ctx = FacilityManager.context(server).orElse(null);
		if (ctx == null) {
			return;
		}
		if (!nearConsole(player, ctx) && !player.permissions().hasPermission(net.minecraft.server.permissions.Permissions.COMMANDS_GAMEMASTER)) {
			player.sendOverlayMessage(Component.translatable("message.nuclearstation.not_at_console").withStyle(ChatFormatting.RED));
			return;
		}
		if (!Double.isFinite(value)) {
			return;
		}
		PlantCommand.Result result = PlantOperations.execute(model(server), command, index, value);
		data(server).setDirty();
		ModNetwork.sendCommandResult(player, result);
	}

	static boolean nearConsole(ServerPlayer player, FacilityManager.Context ctx) {
		if (player.level() != ctx.level) {
			return false;
		}
		for (BlockPos console : ctx.markers.consoles()) {
			if (console.distToCenterSqr(player.position()) < CONSOLE_REACH * CONSOLE_REACH) {
				return true;
			}
		}
		return false;
	}

	public static void manualTripButton(ServerPlayer player, BlockPos pos) {
		MinecraftServer server = player.level().getServer();
		var ctx = FacilityManager.context(server).orElse(null);
		if (ctx == null || player.level() != ctx.level || !ctx.markers.isScram(pos)) {
			player.sendOverlayMessage(Component.translatable("message.nuclearstation.scram_not_wired").withStyle(ChatFormatting.GRAY));
			return;
		}
		PlantModel model = model(server);
		boolean wasTripped = model.reactorTripped();
		PlantOperations.execute(model, PlantCommand.MANUAL_TRIP, 0, 0);
		player.level().playSound(null, pos, SoundEvents.STONE_BUTTON_CLICK_ON, SoundSource.BLOCKS, 1.0f, 0.6f);
		player.sendOverlayMessage(Component.translatable(wasTripped ? "message.nuclearstation.scram_already" : "message.nuclearstation.scram")
			.withStyle(ChatFormatting.RED));
	}

	// ================================================================== radiation zones

	/** Dose rate (uSv/h) from airborne activity in plant volumes at this position. */
	public static double zoneDoseRate(ServerLevel level, BlockPos pos) {
		var ctx = FacilityManager.context(level.getServer()).orElse(null);
		if (ctx == null) {
			return 0;
		}
		int lx = ctx.localX(pos.getX());
		int lz = ctx.localZ(pos.getZ());
		int g = ctx.data.grade();
		PlantModel model = model(level.getServer());
		if (inContainment(lx + 0.5, lz + 0.5) && pos.getY() >= g - 20 && pos.getY() <= g + 64 + 38) {
			double rate = model.containmentDoseRate() * 1e6;
			if (model.containmentIntegrity() < 0.5) {
				rate *= 0.5; // breached: activity is escaping
			}
			return rate;
		}
		if (inFuelBuilding(lx, lz) && pos.getY() >= g - 2 && pos.getY() <= g + 30) {
			return model.sfpDamage() * 5e6 + (model.sfpLevel() < 0.5 ? (0.5 - model.sfpLevel()) * 2e5 : 0);
		}
		if (model.containmentIntegrity() < 0.5 && model.airborneActivity() > 0) {
			double dx = lx - CONT_X;
			double dz = lz - CONT_Z;
			double d = Math.sqrt(dx * dx + dz * dz);
			if (d < 150) {
				return model.airborneActivity() * 2e6 * Math.exp(-d / 40);
			}
		}
		return 0;
	}
}
