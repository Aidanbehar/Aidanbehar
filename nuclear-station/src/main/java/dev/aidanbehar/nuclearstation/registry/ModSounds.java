package dev.aidanbehar.nuclearstation.registry;

import dev.aidanbehar.nuclearstation.NuclearStation;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.Identifier;
import net.minecraft.sounds.SoundEvent;

/** Sound events; the audio itself is synthesised by tools/gen_sounds.py into assets/nuclearstation/sounds. */
public final class ModSounds {
	public static final SoundEvent TURBINE_HUM = register("machine.turbine_hum");
	public static final SoundEvent PUMP_HUM = register("machine.pump_hum");
	public static final SoundEvent TRANSFORMER_HUM = register("machine.transformer_hum");
	public static final SoundEvent VENTILATION = register("machine.ventilation");
	public static final SoundEvent DIESEL_ENGINE = register("machine.diesel_engine");
	public static final SoundEvent COOLING_TOWER = register("ambient.cooling_tower");
	public static final SoundEvent UNDERGROUND = register("ambient.underground");
	public static final SoundEvent ALARM_HORN = register("alarm.horn");
	public static final SoundEvent ALARM_SIREN = register("alarm.siren");
	public static final SoundEvent ANNUNCIATOR_CHIME = register("alarm.chime");
	public static final SoundEvent GEIGER_CLICK = register("instrument.geiger_click");
	public static final SoundEvent DOSIMETER_ALARM = register("instrument.dosimeter_alarm");
	public static final SoundEvent STEAM_RELEASE = register("event.steam_release");
	public static final SoundEvent ROD_DROP = register("event.rod_drop");
	public static final SoundEvent BREAKER_TRIP = register("event.breaker_trip");
	public static final SoundEvent RUMBLE = register("event.rumble");

	private ModSounds() {
	}

	private static SoundEvent register(String name) {
		Identifier id = NuclearStation.id(name);
		return Registry.register(BuiltInRegistries.SOUND_EVENT, id, SoundEvent.createVariableRangeEvent(id));
	}

	public static void init() {
	}
}
