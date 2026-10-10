package dev.aidanbehar.nuclearstation.registry;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.radiation.PlayerRadiation;
import net.fabricmc.fabric.api.attachment.v1.AttachmentRegistry;
import net.fabricmc.fabric.api.attachment.v1.AttachmentType;

/** Persistent data attached to game objects. */
public final class ModAttachments {
	/** Radiation record of a player; survives death (the dose history is permanent). */
	public static final AttachmentType<PlayerRadiation> RADIATION = AttachmentRegistry.<PlayerRadiation>builder()
		.persistent(PlayerRadiation.CODEC)
		.initializer(PlayerRadiation::new)
		.copyOnDeath()
		.buildAndRegister(NuclearStation.id("radiation"));

	private ModAttachments() {
	}

	public static void init() {
	}
}
