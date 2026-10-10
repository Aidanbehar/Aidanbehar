package dev.aidanbehar.nuclearstation.client.screen;

import java.util.List;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/**
 * Read-only console of the experimental reaction chamber. The chamber is physically built
 * but inactive; the lines come from the server-side {@code ExperimentalChamber}.
 */
public final class ExperimentalScreen extends Screen {
	private final List<String> lines;
	private int frame;

	public ExperimentalScreen(List<String> lines) {
		super(Component.translatable("screen.nuclearstation.experimental_console"));
		this.lines = List.copyOf(lines);
	}

	@Override
	public boolean isPauseScreen() {
		return false;
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor g, int mouseX, int mouseY, float partial) {
		frame++;
		int w = Math.min(360, width - 20);
		int h = 40 + lines.size() * 11;
		int x = (width - w) / 2;
		int y = Math.max(10, (height - h) / 2);
		g.fill(0, 0, width, height, 0xC0000000);
		g.fill(x, y, x + w, y + h, 0xFF0E1216);
		g.outline(x, y, w, h, 0xFF6040A0);
		g.text(font, "ADVANCED CONCEPTS LABORATORY - CHAMBER 1", x + 8, y + 8, 0xFFB090FF, false);
		boolean blink = frame % 40 < 20;
		g.text(font, "STATUS: OFFLINE", x + w - 8 - font.width("STATUS: OFFLINE"), y + 8, blink ? 0xFFFF6060 : 0xFF803030, false);
		for (int i = 0; i < lines.size(); i++) {
			g.text(font, lines.get(i), x + 8, y + 26 + i * 11, 0xFFC8D0D8, false);
		}
		super.extractRenderState(g, mouseX, mouseY, partial);
	}
}
