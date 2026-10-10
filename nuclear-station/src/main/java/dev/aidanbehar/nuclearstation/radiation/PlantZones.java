package dev.aidanbehar.nuclearstation.radiation;

import static dev.aidanbehar.nuclearstation.facility.layout.SiteLayout.*;

import dev.aidanbehar.nuclearstation.facility.FacilityManager;
import dev.aidanbehar.nuclearstation.plant.PlantService;
import dev.aidanbehar.nuclearstation.sim.PlantModel;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerLevel;

/**
 * Direct (gamma and neutron) radiation fields inside the plant that exist because the
 * reactor exists - not because of an accident. They follow the plant state: N-16 in the
 * primary coolant and steam makes the loop compartments and steam lines intense only at
 * power; fission and activation products keep the reactor cavity dangerous after
 * shutdown; resin, filters and stored waste are always hot. Values are in uSv/h and are
 * of realistic magnitude, so the inside of an operating containment is genuinely lethal.
 */
public final class PlantZones {
	private static final double SV = 1.0e6;
	private static final double MSV = 1.0e3;

	private PlantZones() {
	}

	/** Direct dose rate (uSv/h) at a position from the plant itself. */
	public static double directDoseRate(ServerLevel level, BlockPos pos) {
		var ctx = FacilityManager.context(level.getServer()).orElse(null);
		if (ctx == null) {
			return 0;
		}
		int lx = ctx.localX(pos.getX());
		int lz = ctx.localZ(pos.getZ());
		if (lx < 0 || lz < 0 || lx >= 1024 || lz >= 1024) {
			return 0;
		}
		int dy = pos.getY() - ctx.data.grade();
		PlantModel m = PlantService.model(level.getServer());
		double p = Math.max(0, Math.min(1.2, m.neutronPower()));
		double decay = Math.min(1.5, m.decayHeatFraction() / 0.065);
		double damage = m.coreDamage();

		if (inContainment(lx + 0.5, lz + 0.5) && dy >= -21 && dy <= 102) {
			double rx = lx + 0.5 - CONT_X;
			double rz = lz + 0.5 - CONT_Z;
			double r = Math.sqrt(rx * rx + rz * rz);
			if (r < 8 && dy <= 14) {
				// inside the primary shield: core neutrons and gamma, then decay gamma after shutdown
				return 300 * SV * p + 2 * SV * decay + 50 * SV * damage;
			}
			double sg = Double.MAX_VALUE;
			for (int[] s : new int[][] {{-22, -22}, {22, -22}, {-22, 22}, {22, 22}}) {
				sg = Math.min(sg, Math.hypot(rx - s[0], rz - s[1]));
			}
			if (sg < 9 && dy >= -8 && dy <= 28) {
				// steam generator / reactor coolant pump compartments: N-16 gamma at power, crud otherwise
				return 2 * SV * p + 5 * MSV + 1 * SV * damage;
			}
			if (dy < 28) {
				return 100 * MSV * p + 1 * MSV + 0.5 * SV * damage;
			}
			return 20 * MSV * p + 0.2 * MSV + 0.2 * SV * damage;
		}
		if (lx >= AUX_X0 && lx <= AUX_X1 && lz >= AUX_Z0 && lz <= AUX_Z1 && dy >= -16 && dy <= 30) {
			// letdown, demineralisers, filters and (after an accident) recirculating sump water
			if (dy < 0) {
				return 2 * MSV * (0.3 + 0.7 * p) + 2 * SV * damage;
			}
			return 50 * (0.5 + 0.5 * p) + 0.1 * SV * damage;
		}
		if (lx >= MSIV_X0 && lx <= MSIV_X1 && lz >= MSIV_Z0 && lz <= TH_Z0 && dy >= 0 && dy <= 30) {
			// main steam lines carry N-16 while the reactor is at power
			return 1 * MSV * p;
		}
		if (lx >= RW_X0 && lx <= RW_X1 && lz >= RW_Z0 && lz <= RW_Z1 && dy >= -10 && dy <= 20) {
			return 1 * MSV;
		}
		if (lx >= FUEL_X0 && lx <= FUEL_X1 && lz >= FUEL_Z0 && lz <= FUEL_Z1 && dy >= -2 && dy <= 30) {
			return 30;
		}
		if (lx >= TH_X0 && lx <= TH_X1 && lz >= TH_Z0 && lz <= TH_Z1 && dy >= -14 && dy <= 50) {
			return 5 * p;
		}
		return 0;
	}
}
