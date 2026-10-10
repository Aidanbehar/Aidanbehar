package dev.aidanbehar.nuclearstation.experimental;

import java.util.List;
import net.minecraft.server.MinecraftServer;

/** The chamber as shipped: physically built, all systems de-energised and locked out. */
public final class InactiveChamber implements ExperimentalChamber {
	@Override
	public String id() {
		return "erc-1";
	}

	@Override
	public boolean active() {
		return false;
	}

	@Override
	public List<String> statusLines() {
		return List.of(
			"EXPERIMENTAL REACTION CHAMBER  ERC-1",
			"",
			"SYSTEM STATUS ........ INACTIVE",
			"COMMISSIONING ........ NOT STARTED",
			"FIELD COIL SUPPLY .... LOCKED OUT",
			"BEAM EMITTERS ........ DE-ENERGISED",
			"VACUUM SYSTEM ........ NOT INSTALLED",
			"INTERLOCK TO UNIT 1 .. NONE (ISOLATED)",
			"",
			"This system has not been implemented yet.",
			"Controls on this console have no effect.");
	}

	@Override
	public void tick(MinecraftServer server) {
		// intentionally inert: the chamber is not commissioned
	}
}
