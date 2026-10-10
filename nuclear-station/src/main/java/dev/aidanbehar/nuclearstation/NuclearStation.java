package dev.aidanbehar.nuclearstation;

import dev.aidanbehar.nuclearstation.command.NpsCommand;
import dev.aidanbehar.nuclearstation.config.ModConfig;
import dev.aidanbehar.nuclearstation.experimental.ExperimentalSystems;
import dev.aidanbehar.nuclearstation.facility.FacilityManager;
import dev.aidanbehar.nuclearstation.geology.Geology;
import dev.aidanbehar.nuclearstation.network.ModNetwork;
import dev.aidanbehar.nuclearstation.plant.PlantService;
import dev.aidanbehar.nuclearstation.radiation.ItemRadioactivity;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import dev.aidanbehar.nuclearstation.registry.ModAttachments;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.registry.ModComponents;
import dev.aidanbehar.nuclearstation.registry.ModItems;
import dev.aidanbehar.nuclearstation.registry.ModSounds;
import dev.aidanbehar.nuclearstation.registry.ModTab;
import net.fabricmc.api.ModInitializer;
import net.minecraft.resources.Identifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Meridian Point Nuclear Station - common (server and client) initialisation.
 */
public final class NuclearStation implements ModInitializer {
	public static final String MOD_ID = "nuclearstation";
	public static final Logger LOG = LoggerFactory.getLogger(MOD_ID);

	public static Identifier id(String path) {
		return Identifier.fromNamespaceAndPath(MOD_ID, path);
	}

	@Override
	public void onInitialize() {
		long t = System.nanoTime();
		ModConfig.load();
		ModComponents.init();
		ModBlocks.init();
		ModItems.init();
		ModSounds.init();
		ModAttachments.init();
		ModTab.init();
		ItemRadioactivity.init();
		Geology.register();
		ModNetwork.register();
		FacilityManager.register();
		PlantService.register();
		RadiationManager.register();
		ExperimentalSystems.register();
		NpsCommand.register();
		LOG.info("Meridian Point Nuclear Station initialised: {} blocks, {} items in {} ms", ModBlocks.ALL.size(), ModItems.ALL.size(),
			(System.nanoTime() - t) / 1_000_000);
	}
}
