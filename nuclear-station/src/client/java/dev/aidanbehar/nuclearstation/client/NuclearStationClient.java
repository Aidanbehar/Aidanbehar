package dev.aidanbehar.nuclearstation.client;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.client.ambience.PlantAmbience;
import dev.aidanbehar.nuclearstation.client.hud.RadiationHud;
import dev.aidanbehar.nuclearstation.client.screen.ControlRoomScreen;
import dev.aidanbehar.nuclearstation.client.screen.ExperimentalScreen;
import dev.aidanbehar.nuclearstation.network.Payloads;
import dev.aidanbehar.nuclearstation.sim.PlantSnapshot;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayConnectionEvents;
import net.fabricmc.fabric.api.client.networking.v1.ClientPlayNetworking;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElementRegistry;
import net.minecraft.client.Minecraft;

/** Client initialisation: network receivers, HUD, screens and the plant soundscape. */
public final class NuclearStationClient implements ClientModInitializer {
	@Override
	public void onInitializeClient() {
		ClientPlayNetworking.registerGlobalReceiver(Payloads.Snapshot.TYPE, (payload, context) -> {
			try {
				ClientPlantState.snapshot = PlantSnapshot.decode(payload.data());
				ClientPlantState.snapshotTime = System.currentTimeMillis();
			} catch (RuntimeException e) {
				NuclearStation.LOG.warn("Ignoring malformed plant snapshot: {}", e.getMessage());
			}
		});
		ClientPlayNetworking.registerGlobalReceiver(Payloads.Status.TYPE, (payload, context) -> {
			ClientPlantState.status = payload;
			ClientPlantState.statusTime = System.currentTimeMillis();
		});
		ClientPlayNetworking.registerGlobalReceiver(Payloads.Radiation.TYPE, (payload, context) -> ClientPlantState.radiation = payload);
		ClientPlayNetworking.registerGlobalReceiver(Payloads.CommandResult.TYPE, (payload, context) -> {
			ClientPlantState.commandMessage = payload.message();
			ClientPlantState.commandAccepted = payload.accepted();
			ClientPlantState.commandTime = System.currentTimeMillis();
		});
		ClientPlayNetworking.registerGlobalReceiver(Payloads.OpenScreen.TYPE, (payload, context) -> {
			Minecraft mc = context.client();
			if (payload.kind() == 0) {
				mc.gui.setScreen(new ControlRoomScreen());
			} else {
				mc.gui.setScreen(new ExperimentalScreen(payload.lines()));
			}
		});
		ClientPlayConnectionEvents.DISCONNECT.register((handler, client) -> ClientPlantState.clear());
		HudElementRegistry.addLast(NuclearStation.id("radiation_hud"), new RadiationHud());
		ClientTickEvents.END_CLIENT_TICK.register(PlantAmbience::tick);
	}
}
