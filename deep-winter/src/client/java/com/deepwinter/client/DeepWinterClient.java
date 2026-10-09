package com.deepwinter.client;

import com.deepwinter.DeepWinter;
import com.deepwinter.ModParticles;
import com.deepwinter.network.StormSyncPayload;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.fabricmc.fabric.api.client.particle.v1.ParticleProviderRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.hud.VanillaHudElements;

public class DeepWinterClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		ClientPlayNetworking.registerGlobalReceiver(StormSyncPayload.TYPE, (payload, context) -> ClientStormState.apply(payload));
		ClientPlayConnectionEvents.DISCONNECT.register((listener, client) -> ClientStormState.reset());
		ClientTickEvents.END_CLIENT_TICK.register(client -> {
			ClientStormState.tick(client);
			TemperatureHud.tick(client);
		});
		ParticleProviderRegistry.getInstance().register(ModParticles.STORM_SNOW, StormSnowParticle.Provider::new);
		HudElementRegistry.attachElementAfter(VanillaHudElements.HOTBAR, DeepWinter.id("thermometer"), TemperatureHud::render);
	}
}
