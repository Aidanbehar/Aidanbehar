package dev.aidanbehar.nuclearstation.client.hud;

import dev.aidanbehar.nuclearstation.client.ClientPlantState;
import dev.aidanbehar.nuclearstation.network.Payloads;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import dev.aidanbehar.nuclearstation.registry.ModItems;
import dev.aidanbehar.nuclearstation.registry.ModSounds;
import net.fabricmc.fabric.api.client.rendering.v1.hud.HudElement;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.client.resources.sounds.SimpleSoundInstance;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.item.Item;

/**
 * Instrument read-outs. Nothing is shown unless the player carries an instrument: a Geiger
 * counter (audible clicks plus rate when held), an electronic dosimeter (accumulated dose and
 * an alarm above 1 mSv/h or 20 mSv) or a survey meter (rate and surface contamination).
 */
public final class RadiationHud implements HudElement {
	private static double clickAccumulator;
	private static long lastAlarm;

	public static void tick(Minecraft mc) {
		LocalPlayer player = mc.player;
		Payloads.Radiation rad = ClientPlantState.radiation;
		if (player == null || rad == null || mc.isPaused()) {
			return;
		}
		boolean geiger = holding(player, ModItems.GEIGER_COUNTER) || holding(player, ModItems.SURVEY_METER);
		if (geiger) {
			// a typical pancake probe gives roughly 100 counts per second per 1 µSv/h... far too
			// many to play; scale to an audible, still proportional rate with background ~0.4/s
			double cps = 0.4 + Math.min(40, Math.sqrt(Math.max(0, rad.doseRate())) * 4);
			clickAccumulator += cps / 20.0 * (0.5 + player.getRandom().nextDouble());
			int clicks = 0;
			while (clickAccumulator >= 1 && clicks < 4) {
				clickAccumulator -= 1;
				clicks++;
				mc.getSoundManager().play(SimpleSoundInstance.forUI(ModSounds.GEIGER_CLICK, 0.9f + player.getRandom().nextFloat() * 0.3f, 0.6f));
			}
			clickAccumulator = Math.min(clickAccumulator, 2);
		}
		if (has(player, ModItems.DOSIMETER) && (rad.doseRate() > 1000 || rad.acute() > 20)) {
			long now = System.currentTimeMillis();
			if (now - lastAlarm > (rad.doseRate() > 100_000 ? 400 : 1200)) {
				lastAlarm = now;
				mc.getSoundManager().play(SimpleSoundInstance.forUI(ModSounds.DOSIMETER_ALARM, 1.0f, 0.7f));
			}
		}
	}

	private static boolean holding(LocalPlayer p, Item item) {
		return p.getMainHandItem().is(item) || p.getOffhandItem().is(item);
	}

	private static boolean has(LocalPlayer p, Item item) {
		Inventory inv = p.getInventory();
		for (int i = 0; i < inv.getContainerSize(); i++) {
			if (inv.getItem(i).is(item)) {
				return true;
			}
		}
		return false;
	}

	@Override
	public void extractRenderState(GuiGraphicsExtractor g, DeltaTracker delta) {
		Minecraft mc = Minecraft.getInstance();
		LocalPlayer player = mc.player;
		Payloads.Radiation rad = ClientPlantState.radiation;
		if (player == null || rad == null || mc.gui.hud.isHidden()) {
			return;
		}
		boolean geiger = holding(player, ModItems.GEIGER_COUNTER);
		boolean survey = holding(player, ModItems.SURVEY_METER);
		boolean dosimeter = has(player, ModItems.DOSIMETER);
		if (!geiger && !survey && !dosimeter) {
			return;
		}
		int x = 6;
		int y = mc.getWindow().getGuiScaledHeight() / 2 - 30;
		int lines = (geiger || survey ? 1 : 0) + (survey ? 1 : 0) + (dosimeter ? 2 : 0);
		g.fill(x - 3, y - 3, x + 150, y + lines * 10 + 1, 0x90000000);
		if (geiger || survey) {
			double r = rad.doseRate();
			int colour = r < 2.5 ? 0xFF60E060 : r < 100 ? 0xFFFFD040 : r < 10_000 ? 0xFFFF8020 : 0xFFFF3030;
			g.text(mc.font, (survey ? "Survey " : "Geiger ") + RadiationManager.formatDoseRate(r), x, y, colour, false);
			y += 10;
		}
		if (survey) {
			g.text(mc.font, String.format("Surface %.0f kBq  Ground %.0f", rad.contamination(), rad.ground()), x, y,
				rad.contamination() > 40 ? 0xFFFF8020 : 0xFFC0C0C0, false);
			y += 10;
		}
		if (dosimeter) {
			boolean alarm = rad.doseRate() > 1000 || rad.acute() > 20;
			int colour = alarm && (System.currentTimeMillis() / 300) % 2 == 0 ? 0xFFFF3030 : 0xFFE0E0E0;
			g.text(mc.font, String.format("EPD  %.3f mSv  (acute %.2f)", rad.lifetime(), rad.acute()), x, y, colour, false);
			y += 10;
			g.text(mc.font, String.format("     rate %s", RadiationManager.formatDoseRate(rad.doseRate())), x, y, colour, false);
		}
	}
}
