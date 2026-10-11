package dev.aidanbehar.nuclearstation.network;

import dev.aidanbehar.nuclearstation.experimental.ExperimentalSystems;
import dev.aidanbehar.nuclearstation.facility.FacilityManager;
import dev.aidanbehar.nuclearstation.facility.layout.Blueprint;
import dev.aidanbehar.nuclearstation.plant.PlantData;
import dev.aidanbehar.nuclearstation.plant.PlantService;
import dev.aidanbehar.nuclearstation.radiation.PlayerRadiation;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import dev.aidanbehar.nuclearstation.sim.AlarmId;
import dev.aidanbehar.nuclearstation.sim.Bus;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import dev.aidanbehar.nuclearstation.sim.PlantCommand;
import dev.aidanbehar.nuclearstation.sim.PlantModel;
import dev.aidanbehar.nuclearstation.sim.PlantSnapshot;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.WeakHashMap;
import net.fabricmc.fabric.api.networking.v1.PayloadTypeRegistry;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.fabricmc.fabric.api.networking.v1.ServerPlayNetworking;
import net.minecraft.core.BlockPos;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;

/**
 * Server side of the mod's networking. Snapshots go only to players with the control
 * room interface open (and still near a console); the compact status goes once a
 * second to players near the site; radiation readings go to each player.
 */
public final class ModNetwork {
	private static final Map<MinecraftServer, Set<UUID>> VIEWERS = new WeakHashMap<>();

	private ModNetwork() {
	}

	public static void register() {
		PayloadTypeRegistry.clientboundPlay().register(Payloads.Snapshot.TYPE, Payloads.Snapshot.CODEC);
		PayloadTypeRegistry.clientboundPlay().register(Payloads.OpenScreen.TYPE, Payloads.OpenScreen.CODEC);
		PayloadTypeRegistry.clientboundPlay().register(Payloads.Radiation.TYPE, Payloads.Radiation.CODEC);
		PayloadTypeRegistry.clientboundPlay().register(Payloads.Status.TYPE, Payloads.Status.CODEC);
		PayloadTypeRegistry.clientboundPlay().register(Payloads.CommandResult.TYPE, Payloads.CommandResult.CODEC);
		PayloadTypeRegistry.serverboundPlay().register(Payloads.Command.TYPE, Payloads.Command.CODEC);
		PayloadTypeRegistry.serverboundPlay().register(Payloads.CloseScreen.TYPE, Payloads.CloseScreen.CODEC);

		ServerPlayNetworking.registerGlobalReceiver(Payloads.Command.TYPE, (payload, context) -> {
			ServerPlayer player = context.player();
			PlantCommand[] all = PlantCommand.values();
			if (payload.command() < 0 || payload.command() >= all.length) {
				return;
			}
			PlantService.handleCommand(player, all[payload.command()], payload.index(), payload.value());
		});
		ServerPlayNetworking.registerGlobalReceiver(Payloads.CloseScreen.TYPE, (payload, context) -> viewers(context.player().level().getServer()).remove(context.player().getUUID()));
		ServerPlayConnectionEvents.DISCONNECT.register((handler, server) -> viewers(server).remove(handler.player.getUUID()));
	}

	private static Set<UUID> viewers(MinecraftServer server) {
		synchronized (VIEWERS) {
			return VIEWERS.computeIfAbsent(server, s -> new HashSet<>());
		}
	}

	public static List<ServerPlayer> controlRoomViewers(MinecraftServer server) {
		Set<UUID> ids = viewers(server);
		if (ids.isEmpty()) {
			return List.of();
		}
		List<ServerPlayer> out = new ArrayList<>();
		var ctx = FacilityManager.context(server).orElse(null);
		ids.removeIf(id -> {
			ServerPlayer p = server.getPlayerList().getPlayer(id);
			if (p == null || ctx == null) {
				return true;
			}
			boolean near = p.permissions().hasPermission(net.minecraft.server.permissions.Permissions.COMMANDS_GAMEMASTER);
			for (BlockPos c : ctx.markers.consoles()) {
				if (c.distToCenterSqr(p.position()) < PlantService.CONSOLE_REACH * PlantService.CONSOLE_REACH * 4) {
					near = true;
					break;
				}
			}
			if (near) {
				out.add(p);
			}
			return !near;
		});
		return out;
	}

	public static void openControlRoom(ServerPlayer player, BlockPos console) {
		MinecraftServer server = player.level().getServer();
		var ctx = FacilityManager.context(server).orElse(null);
		if (ctx == null || player.level() != ctx.level || !ctx.markers.consoles().contains(console)) {
			player.sendOverlayMessage(net.minecraft.network.chat.Component.translatable("message.nuclearstation.console_unconnected"));
			return;
		}
		viewers(server).add(player.getUUID());
		ServerPlayNetworking.send(player, new Payloads.OpenScreen(0, List.of()));
		sendSnapshot(player, PlantSnapshot.capture(PlantService.model(server)));
	}

	public static void openExperimentalConsole(ServerPlayer player) {
		ServerPlayNetworking.send(player, new Payloads.OpenScreen(1, ExperimentalSystems.statusLines()));
	}

	public static void sendSnapshot(ServerPlayer player, PlantSnapshot snapshot) {
		ServerPlayNetworking.send(player, new Payloads.Snapshot(snapshot.encode()));
	}

	public static void sendCommandResult(ServerPlayer player, PlantCommand.Result result) {
		ServerPlayNetworking.send(player, new Payloads.CommandResult(result.accepted(), result.message()));
	}

	public static void sendRadiation(ServerPlayer player, PlayerRadiation rad, RadiationManager.Reading reading) {
		ServerPlayNetworking.send(player, new Payloads.Radiation((float) reading.doseRate(), (float) rad.lifetimeDose(),
			(float) rad.acuteDose(), (float) rad.contamination(), (float) reading.groundContamination()));
	}

	public static void broadcastStatus(MinecraftServer server, FacilityManager.Context ctx, PlantModel m) {
		BlockPos centre = ctx.centre();
		double range = Blueprint.SIZE * 1.5;
		Payloads.Status status = null;
		for (ServerPlayer p : ctx.level.players()) {
			if (p.blockPosition().distSqr(centre) > range * range) {
				continue;
			}
			if (status == null) {
				status = status(ctx, m);
			}
			ServerPlayNetworking.send(p, status);
		}
	}

	private static Payloads.Status status(FacilityManager.Context ctx, PlantModel m) {
		int flags = 0;
		flags |= m.hornActive() ? Payloads.Status.F_HORN : 0;
		boolean lighting = m.busLive(Bus.NS1) || m.busLive(Bus.NS2) || m.busLive(Bus.SA) || m.busLive(Bus.SB);
		flags |= lighting ? Payloads.Status.F_LIGHTING : 0;
		flags |= m.equipment(EquipmentId.EDG_A).running ? Payloads.Status.F_EDG_A : 0;
		flags |= m.equipment(EquipmentId.EDG_B).running ? Payloads.Status.F_EDG_B : 0;
		flags |= m.reactorTripped() ? Payloads.Status.F_TRIPPED : 0;
		flags |= m.coreDamage() > 0.01 ? Payloads.Status.F_CORE_DAMAGE : 0;
		flags |= m.containmentIntegrity() < 0.5 ? Payloads.Status.F_BREACH : 0;
		flags |= m.alarms().active(AlarmId.SFP_TEMP_HIGH) && m.sfpLevel() < 1 ? Payloads.Status.F_SFP_BOILING : 0;
		flags |= m.alarms().active(AlarmId.OFFSITE_RELEASE) ? Payloads.Status.F_RELEASE : 0;
		flags |= m.towersInService() > 0 ? Payloads.Status.F_TOWERS : 0;
		return new Payloads.Status(ctx.data.originX(), ctx.data.originZ(), ctx.data.grade(), ctx.data.sea(),
			(float) m.turbineSpeed(), (float) (m.thermalPowerMW() / PlantModel.P_NOM), (float) m.towerHeatRejection(),
			(float) m.steamAdvFlow(), (float) m.cwFlow(), flags, m.alarms().worstActivePriority(),
			(float) PlantService.data(ctx.level.getServer()).severity());
	}

	/** True if a player currently has the control-room interface open. */
	public static boolean isViewing(ServerPlayer player) {
		return viewers(player.level().getServer()).contains(player.getUUID());
	}

	static PlantData plant(MinecraftServer server) {
		return PlantService.data(server);
	}
}
