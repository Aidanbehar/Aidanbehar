package com.deepwinter.storm;

import com.deepwinter.DeepWinter;
import com.deepwinter.config.DeepWinterConfig;
import com.deepwinter.network.StormSyncPayload;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.saveddata.WeatherData;

/** Drives the snowstorm weather state on the server. */
public final class StormManager {
	/** Layers per reference column per tick of ordinary snowfall at accumulationSpeed 1. */
	public static final double BASE_LAYERS_PER_TICK = 1.0 / 2400.0;

	private StormManager() {
	}

	public static StormData data(MinecraftServer server) {
		return server.getDataStorage().computeIfAbsent(StormData.TYPE);
	}

	public static double normalRate() {
		DeepWinterConfig c = DeepWinterConfig.get();
		return BASE_LAYERS_PER_TICK * c.accumulationSpeed * c.debugSpeedMultiplier;
	}

	public static double stormRate() {
		return normalRate() * DeepWinterConfig.get().stormAccumulationMultiplier;
	}

	/** Called at the end of each server tick. */
	public static void tick(MinecraftServer server) {
		StormData data = data(server);
		WeatherData weather = server.getWeatherData();
		boolean raining = weather.isRaining();
		boolean changed = false;

		if (raining && !data.wasRaining && !data.active) {
			// Rain just started: roll for a snowstorm.
			if (server.overworld().getRandom().nextDouble() < DeepWinterConfig.get().stormChance) {
				begin(data, false, -1);
				changed = true;
				DeepWinter.LOGGER.info("A snowstorm is rolling in");
			}
		}
		if (data.wasRaining != raining) {
			data.wasRaining = raining;
			data.setDirty();
		}

		if (data.active) {
			data.stormTicks++;
			if (data.remainingTicks > 0) {
				data.remainingTicks--;
				if (data.remainingTicks == 0) {
					end(server, data, true);
					changed = true;
				}
			} else if (!raining) {
				end(server, data, false);
				changed = true;
			}
		}

		// Snow clocks only run while something is falling.
		if (data.active) {
			data.stormClock += stormRate();
			data.setDirty();
		} else if (raining) {
			data.snowClock += normalRate();
			data.setDirty();
		}

		if (StormFlags.active != data.active || StormFlags.forced != data.forced) {
			StormFlags.active = data.active;
			StormFlags.forced = data.forced;
			changed = true;
		}
		if (changed) {
			broadcast(server, data);
		}
	}

	private static void begin(StormData data, boolean forced, int duration) {
		data.active = true;
		data.forced = forced;
		data.remainingTicks = duration;
		data.stormTicks = 0;
		data.stormClockAtStart = data.stormClock;
		data.setDirty();
	}

	private static void end(MinecraftServer server, StormData data, boolean clearRain) {
		data.active = false;
		data.forced = false;
		data.remainingTicks = -1;
		data.setDirty();
		if (clearRain) {
			int clear = ServerLevel.RAIN_DELAY.sample(server.overworld().getRandom());
			server.setWeatherParameters(clear, 0, false, false);
		}
	}

	/** /snowstorm start: forces a storm everywhere for the given duration (ticks). */
	public static void forceStart(MinecraftServer server, int duration) {
		StormData data = data(server);
		begin(data, true, duration);
		data.wasRaining = true;
		server.setWeatherParameters(0, duration, true, false);
		StormFlags.active = true;
		StormFlags.forced = true;
		broadcast(server, data);
	}

	/** /snowstorm stop: ends the storm and the precipitation that carried it. */
	public static boolean stop(MinecraftServer server) {
		StormData data = data(server);
		if (!data.active) {
			return false;
		}
		end(server, data, true);
		data.wasRaining = false;
		StormFlags.active = false;
		StormFlags.forced = false;
		broadcast(server, data);
		return true;
	}

	public static StormSyncPayload payload(StormData data) {
		return new StormSyncPayload(data.active, data.forced);
	}

	public static void broadcast(MinecraftServer server, StormData data) {
		StormSyncPayload payload = payload(data);
		for (ServerPlayer player : server.getPlayerList().getPlayers()) {
			ServerPlayNetworking.send(player, payload);
		}
	}

	public static void onServerStarted(MinecraftServer server) {
		StormData data = data(server);
		StormFlags.active = data.active;
		StormFlags.forced = data.forced;
	}
}
