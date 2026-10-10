package dev.aidanbehar.nuclearstation.experimental;

import java.util.List;
import net.minecraft.server.MinecraftServer;

/**
 * Extension point for the Experimental Reaction Chamber in the research wing.
 *
 * <p>The chamber is a self-contained system. Implementations must keep their own state
 * (their own saved data) and must not read or modify the main PWR {@code PlantModel};
 * any future coupling (for example drawing power from the station's electrical buses)
 * must go through an explicit, reviewed interface added for that purpose.
 */
public interface ExperimentalChamber {
	/** Short identifier, used in logs and commands. */
	String id();

	/** True only once the chamber's behaviour is implemented and enabled. */
	boolean active();

	/** Status lines displayed on the chamber control consoles. */
	List<String> statusLines();

	/** Called every server tick while the server runs; inactive chambers do nothing. */
	void tick(MinecraftServer server);
}
