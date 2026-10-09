package com.deepwinter.client;

import com.deepwinter.network.StormSyncPayload;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;

public class DeepWinterClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		ClientPlayNetworking.registerGlobalReceiver(StormSyncPayload.TYPE, (payload, context) -> ClientStormState.apply(payload));
		ClientPlayConnectionEvents.DISCONNECT.register((listener, client) -> ClientStormState.reset());
		ClientTickEvents.END_CLIENT_TICK.register(ClientStormState::tick);
	}
}
