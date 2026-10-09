package com.deepwinter;

import com.deepwinter.block.ModBlocks;
import com.deepwinter.command.SnowstormCommand;
import com.deepwinter.snow.SnowAccumulator;
import com.deepwinter.config.DeepWinterConfig;
import com.deepwinter.network.StormSyncPayload;
import com.deepwinter.storm.StormFlags;
import com.deepwinter.storm.StormManager;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerChunkEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.minecraft.resources.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DeepWinter implements ModInitializer {
	public static final String MOD_ID = "deepwinter";
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(MOD_ID, path);
	}

	@Override
	public void onInitialize() {
		DeepWinterConfig.load();

		ModBlocks.init();
		SnowAccumulator.STAMP.identifier();

		PayloadTypeRegistry.clientboundPlay().register(StormSyncPayload.TYPE, StormSyncPayload.CODEC);

		ServerLifecycleEvents.SERVER_STARTED.register(StormManager::onServerStarted);
		ServerLifecycleEvents.SERVER_STOPPED.register(server -> {
			StormFlags.reset();
			SnowAccumulator.clear();
		});
		ServerLifecycleEvents.BEFORE_SAVE.register((server, flush, force) -> SnowAccumulator.beforeSave(server));
		ServerChunkEvents.CHUNK_LOAD.register(SnowAccumulator::onChunkLoad);
		ServerChunkEvents.CHUNK_UNLOAD.register(SnowAccumulator::onChunkUnload);
		ServerTickEvents.END_LEVEL_TICK.register(SnowAccumulator::tick);
		ServerTickEvents.END_SERVER_TICK.register(StormManager::tick);
		ServerPlayConnectionEvents.JOIN.register((listener, sender, server) ->
			sender.sendPacket(StormManager.payload(StormManager.data(server))));

		CommandRegistrationCallback.EVENT.register((dispatcher, buildContext, selection) -> {
			SnowstormCommand.register(dispatcher);
			com.deepwinter.command.DeepWinterCommand.register(dispatcher);
		});
	}
}
