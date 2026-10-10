package dev.aidanbehar.nuclearstation.client;

import dev.aidanbehar.nuclearstation.network.Payloads;
import dev.aidanbehar.nuclearstation.sim.PlantSnapshot;

/** Latest plant information received from the server. Client-side only. */
public final class ClientPlantState {
	public static PlantSnapshot snapshot;
	public static long snapshotTime;
	public static Payloads.Status status;
	public static long statusTime;
	public static Payloads.Radiation radiation;
	public static String commandMessage = "";
	public static boolean commandAccepted = true;
	public static long commandTime;

	private ClientPlantState() {
	}

	public static boolean statusFresh() {
		return status != null && System.currentTimeMillis() - statusTime < 5000;
	}

	public static void clear() {
		snapshot = null;
		status = null;
		radiation = null;
		commandMessage = "";
	}
}
