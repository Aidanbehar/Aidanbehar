package dev.aidanbehar.nuclearstation;

import net.fabricmc.api.ModInitializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class NuclearStation implements ModInitializer {
	public static final String MOD_ID = "nuclearstation";
	public static final Logger LOG = LoggerFactory.getLogger(MOD_ID);

	@Override
	public void onInitialize() {
		LOG.info("Meridian Point Nuclear Station initialising");
	}
}
