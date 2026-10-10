package dev.aidanbehar.nuclearstation.registry;

import com.mojang.serialization.Codec;
import dev.aidanbehar.nuclearstation.NuclearStation;
import net.minecraft.core.Registry;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.codec.ByteBufCodecs;

/** Item data components. */
public final class ModComponents {
	/**
	 * Surface contamination carried by an item stack, in kBq. Picked up in contaminated
	 * areas; removed at a decontamination station.
	 */
	public static final DataComponentType<Float> CONTAMINATION = Registry.register(BuiltInRegistries.DATA_COMPONENT_TYPE,
		NuclearStation.id("contamination"),
		DataComponentType.<Float>builder().persistent(Codec.FLOAT).networkSynchronized(ByteBufCodecs.FLOAT).build());

	/** Accumulated dose recorded by a personal dosimeter, mSv. */
	public static final DataComponentType<Float> RECORDED_DOSE = Registry.register(BuiltInRegistries.DATA_COMPONENT_TYPE,
		NuclearStation.id("recorded_dose"),
		DataComponentType.<Float>builder().persistent(Codec.FLOAT).networkSynchronized(ByteBufCodecs.FLOAT).build());

	private ModComponents() {
	}

	public static void init() {
	}
}
