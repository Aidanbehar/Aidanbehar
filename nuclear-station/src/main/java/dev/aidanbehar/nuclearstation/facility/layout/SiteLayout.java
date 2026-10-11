package dev.aidanbehar.nuclearstation.facility.layout;

import java.util.ArrayList;
import java.util.List;

/**
 * Master site plan of the Meridian Point Nuclear Generating Station (local coordinates,
 * 1024 x 1024 blocks, ocean to the south). Building rectangles are public so that the
 * plant layer and the client soundscape can tell where the player is.
 */
public final class SiteLayout {
	// ---------------------------------------------------------------- security
	public static final int FENCE_X0 = 24;
	public static final int FENCE_X1 = 1000;
	public static final int FENCE_Z0 = 24;
	public static final int FENCE_Z1 = 876;
	/** Protected area (inner double fence) around the power block. */
	public static final int PA_X0 = 280;
	public static final int PA_X1 = 720;
	public static final int PA_Z0 = 290;
	public static final int PA_Z1 = 879;
	public static final int SPINE_X0 = 506;
	public static final int SPINE_X1 = 518;

	// ---------------------------------------------------------------- nuclear island
	public static final int CONT_X = 520;
	public static final int CONT_Z = 560;
	public static final int CONT_R = 48;
	public static final int AUX_X0 = 400;
	public static final int AUX_X1 = 466;
	public static final int AUX_Z0 = 500;
	public static final int AUX_Z1 = 620;
	public static final int FUEL_X0 = 574;
	public static final int FUEL_X1 = 640;
	public static final int FUEL_Z0 = 520;
	public static final int FUEL_Z1 = 610;
	public static final int MSIV_X0 = 470;
	public static final int MSIV_X1 = 570;
	public static final int MSIV_Z0 = 612;
	public static final int MSIV_Z1 = 646;

	// ---------------------------------------------------------------- turbine island
	public static final int TH_X0 = 360;
	public static final int TH_X1 = 600;
	public static final int TH_Z0 = 650;
	public static final int TH_Z1 = 810;
	public static final int TH_AXIS_Z = 730;

	// ---------------------------------------------------------------- control & admin
	public static final int CB_X0 = 450;
	public static final int CB_X1 = 590;
	public static final int CB_Z0 = 400;
	public static final int CB_Z1 = 470;
	public static final int ADMIN_X0 = 470;
	public static final int ADMIN_X1 = 570;
	public static final int ADMIN_Z0 = 310;
	public static final int ADMIN_Z1 = 398;

	// ---------------------------------------------------------------- electrical
	public static final int GSU_X0 = 300;
	public static final int GSU_X1 = 352;
	public static final int GSU_Z0 = 670;
	public static final int GSU_Z1 = 790;
	public static final int SY_X0 = 70;
	public static final int SY_X1 = 270;
	public static final int SY_Z0 = 600;
	public static final int SY_Z1 = 840;
	public static final int EDGA_X0 = 300;
	public static final int EDGA_X1 = 350;
	public static final int EDGA_Z0 = 486;
	public static final int EDGA_Z1 = 546;
	public static final int EDGB_X0 = 640;
	public static final int EDGB_X1 = 690;
	public static final int EDGB_Z0 = 420;
	public static final int EDGB_Z1 = 470;

	// ---------------------------------------------------------------- cooling water
	public static final int CWPH_X0 = 400;
	public static final int CWPH_X1 = 540;
	public static final int CWPH_Z0 = 830;
	public static final int CWPH_Z1 = 879;
	public static final int ESW_X0 = 300;
	public static final int ESW_X1 = 360;
	public static final int ESW_Z0 = 836;
	public static final int ESW_Z1 = 879;
	public static final int DIS_X0 = 620;
	public static final int DIS_X1 = 680;
	public static final int[][] TOWERS = {{800, 330}, {930, 330}, {800, 480}, {930, 480}};
	public static final int TOWER_BASE_R = 52;
	public static final int TOWER_HEIGHT = 165;

	// ---------------------------------------------------------------- support
	public static final int RES_X0 = 100;
	public static final int RES_X1 = 300;
	public static final int RES_Z0 = 80;
	public static final int RES_Z1 = 280;
	public static final int CHAMBER_X0 = 160;
	public static final int CHAMBER_X1 = 240;
	public static final int CHAMBER_Z0 = 160;
	public static final int CHAMBER_Z1 = 240;
	public static final int RW_X0 = 300;
	public static final int RW_X1 = 390;
	public static final int RW_Z0 = 300;
	public static final int RW_Z1 = 440;
	public static final int WAREHOUSE_X0 = 800;
	public static final int WAREHOUSE_X1 = 980;
	public static final int WAREHOUSE_Z0 = 80;
	public static final int WAREHOUSE_Z1 = 220;

	// ---------------------------------------------------------------- tunnels (floor at grade - 14)
	public static final int TUNNEL_FLOOR = -14;

	private SiteLayout() {
	}

	static List<Component> components() {
		List<Component> list = new ArrayList<>();
		// ground-level infrastructure first, buildings over it, tunnels carve last
		list.addAll(Infrastructure.groundworks());
		list.addAll(CoolingWater.components());
		list.addAll(Electrical.components());
		list.addAll(NuclearIsland.components());
		list.add(new ContainmentBuilding());
		list.add(new TurbineHall());
		list.addAll(ControlBuilding.components());
		list.addAll(Support.components());
		list.add(new ResearchWing());
		list.addAll(Infrastructure.tunnels());
		list.addAll(Infrastructure.security());
		list.add(new SirenNetwork(list));
		return list;
	}

	/** True if the local position is inside the containment cylinder. */
	public static boolean inContainment(double x, double z) {
		double dx = x - CONT_X;
		double dz = z - CONT_Z;
		return dx * dx + dz * dz < (CONT_R - 4) * (CONT_R - 4);
	}

	public static boolean inTurbineHall(int x, int z) {
		return x >= TH_X0 && x <= TH_X1 && z >= TH_Z0 && z <= TH_Z1;
	}

	public static boolean inFuelBuilding(int x, int z) {
		return x >= FUEL_X0 && x <= FUEL_X1 && z >= FUEL_Z0 && z <= FUEL_Z1;
	}

	public static boolean inChamber(int x, int z) {
		return x >= CHAMBER_X0 && x <= CHAMBER_X1 && z >= CHAMBER_Z0 && z <= CHAMBER_Z1;
	}

	public static boolean inPumpHouse(int x, int z) {
		return x >= CWPH_X0 && x <= CWPH_X1 && z >= CWPH_Z0 && z <= CWPH_Z1;
	}

	public static boolean inDiesel(int x, int z) {
		return x >= EDGA_X0 && x <= EDGA_X1 && z >= EDGA_Z0 && z <= EDGA_Z1
			|| x >= EDGB_X0 && x <= EDGB_X1 && z >= EDGB_Z0 && z <= EDGB_Z1;
	}

	public static boolean inSwitchyard(int x, int z) {
		return x >= SY_X0 && x <= SY_X1 && z >= SY_Z0 && z <= SY_Z1 || x >= GSU_X0 && x <= GSU_X1 && z >= GSU_Z0 && z <= GSU_Z1;
	}

	public static boolean inControlRoom(int x, int z) {
		return x >= CB_X0 && x <= CB_X1 && z >= CB_Z0 && z <= CB_Z1;
	}
}
