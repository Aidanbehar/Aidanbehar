package dev.aidanbehar.nuclearstation.block;

import net.minecraft.util.StringRepresentable;

/** Lamp state of a control-room panel or annunciator section. */
public enum PanelStatus implements StringRepresentable {
	OFF("off"),
	NORMAL("normal"),
	CAUTION("caution"),
	ALARM("alarm");

	private final String name;

	PanelStatus(String name) {
		this.name = name;
	}

	@Override
	public String getSerializedName() {
		return name;
	}
}
