package dev.aidanbehar.nuclearstation.registry;

import com.mojang.serialization.Codec;
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

	/**
	 * Stored in each station chunk once it has been painted, holding the generation epoch.
	 * Saved with the chunk itself, so it can never disagree with the chunk's blocks (the
	 * global progress bitset can, if a crash loses chunk data after the bitset was saved).
	 */
	public static final AttachmentType<Integer> FACILITY_PAINTED = AttachmentRegistry.<Integer>builder()
		.persistent(Codec.INT)
		.buildAndRegister(NuclearStation.id("facility_painted"));

	private ModAttachments() {
	}

	public static void init() {
	}
}
