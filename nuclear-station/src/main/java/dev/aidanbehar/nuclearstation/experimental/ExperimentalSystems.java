package dev.aidanbehar.nuclearstation.experimental;

import java.util.List;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;

/** Holds the active experimental chamber implementation (currently {@link InactiveChamber}). */
public final class ExperimentalSystems {
	private static ExperimentalChamber chamber = new InactiveChamber();

	private ExperimentalSystems() {
	}

	public static void register() {
		ServerTickEvents.END_SERVER_TICK.register(server -> chamber.tick(server));
	}

	/** Future updates install a real implementation here during mod initialisation. */
	public static void install(ExperimentalChamber implementation) {
		chamber = implementation;
	}

	public static ExperimentalChamber chamber() {
		return chamber;
	}

	public static List<String> statusLines() {
		return chamber.statusLines();
	}
}
