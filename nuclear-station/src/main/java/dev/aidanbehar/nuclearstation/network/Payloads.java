package dev.aidanbehar.nuclearstation.network;

import dev.aidanbehar.nuclearstation.NuclearStation;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;

/** All network payloads of the mod. */
public final class Payloads {
	private Payloads() {
	}

	private static <T extends CustomPacketPayload> CustomPacketPayload.Type<T> payloadType(String path) {
		return new CustomPacketPayload.Type<>(NuclearStation.id(path));
	}

	/** S2C: full plant snapshot for an open control-room screen (encoded by the simulation). */
	public record Snapshot(byte[] data) implements CustomPacketPayload {
		public static final Type<Snapshot> TYPE = payloadType("snapshot");
		public static final StreamCodec<FriendlyByteBuf, Snapshot> CODEC = CustomPacketPayload.codec(
			(p, buf) -> buf.writeByteArray(p.data), buf -> new Snapshot(buf.readByteArray(1 << 20)));

		@Override
		public Type<Snapshot> type() {
			return TYPE;
		}
	}

	/** S2C: open a screen. kind 0 = control room, 1 = experimental chamber console. */
	public record OpenScreen(int kind, List<String> lines) implements CustomPacketPayload {
		public static final Type<OpenScreen> TYPE = payloadType("open_screen");
		public static final StreamCodec<FriendlyByteBuf, OpenScreen> CODEC = CustomPacketPayload.codec(
			(p, buf) -> {
				buf.writeVarInt(p.kind);
				buf.writeVarInt(p.lines.size());
				for (String s : p.lines) {
					buf.writeUtf(s, 512);
				}
			},
			buf -> {
				int kind = buf.readVarInt();
				int n = Math.min(64, buf.readVarInt());
				List<String> lines = new ArrayList<>(n);
				for (int i = 0; i < n; i++) {
					lines.add(buf.readUtf(512));
				}
				return new OpenScreen(kind, lines);
			});

		@Override
		public Type<OpenScreen> type() {
			return TYPE;
		}
	}

	/** S2C: personal radiation reading, every half second. */
	public record Radiation(float doseRate, float lifetime, float acute, float contamination, float ground) implements CustomPacketPayload {
		public static final Type<Radiation> TYPE = payloadType("radiation");
		public static final StreamCodec<FriendlyByteBuf, Radiation> CODEC = CustomPacketPayload.codec(
			(p, buf) -> {
				buf.writeFloat(p.doseRate);
				buf.writeFloat(p.lifetime);
				buf.writeFloat(p.acute);
				buf.writeFloat(p.contamination);
				buf.writeFloat(p.ground);
			},
			buf -> new Radiation(buf.readFloat(), buf.readFloat(), buf.readFloat(), buf.readFloat(), buf.readFloat()));

		@Override
		public Type<Radiation> type() {
			return TYPE;
		}
	}

	/**
	 * S2C: compact plant status for ambience and effects (sent once a second to players
	 * near the site). Contains the site origin so the client can tell where it is.
	 */
	public record Status(int originX, int originZ, int grade, int sea, float turbineRpm, float power, float towerHeat,
			float steamVent, float cwFlow, int flags, int alarmPriority) implements CustomPacketPayload {
		public static final Type<Status> TYPE = payloadType("status");
		public static final int F_HORN = 1;
		public static final int F_LIGHTING = 1 << 1;
		public static final int F_EDG_A = 1 << 2;
		public static final int F_EDG_B = 1 << 3;
		public static final int F_TRIPPED = 1 << 4;
		public static final int F_CORE_DAMAGE = 1 << 5;
		public static final int F_BREACH = 1 << 6;
		public static final int F_SFP_BOILING = 1 << 7;
		public static final int F_RELEASE = 1 << 8;
		public static final int F_TOWERS = 1 << 9;
		public static final StreamCodec<FriendlyByteBuf, Status> CODEC = CustomPacketPayload.codec(
			(p, buf) -> {
				buf.writeInt(p.originX);
				buf.writeInt(p.originZ);
				buf.writeVarInt(p.grade);
				buf.writeVarInt(p.sea);
				buf.writeFloat(p.turbineRpm);
				buf.writeFloat(p.power);
				buf.writeFloat(p.towerHeat);
				buf.writeFloat(p.steamVent);
				buf.writeFloat(p.cwFlow);
				buf.writeVarInt(p.flags);
				buf.writeVarInt(p.alarmPriority);
			},
			buf -> new Status(buf.readInt(), buf.readInt(), buf.readVarInt(), buf.readVarInt(), buf.readFloat(), buf.readFloat(),
				buf.readFloat(), buf.readFloat(), buf.readFloat(), buf.readVarInt(), buf.readVarInt()));

		public boolean flag(int f) {
			return (flags & f) != 0;
		}

		@Override
		public Type<Status> type() {
			return TYPE;
		}
	}

	/** S2C: result of an operator command (accepted, or why it was blocked). */
	public record CommandResult(boolean accepted, String message) implements CustomPacketPayload {
		public static final Type<CommandResult> TYPE = payloadType("command_result");
		public static final StreamCodec<FriendlyByteBuf, CommandResult> CODEC = CustomPacketPayload.codec(
			(p, buf) -> {
				buf.writeBoolean(p.accepted);
				buf.writeUtf(p.message, 256);
			},
			buf -> new CommandResult(buf.readBoolean(), buf.readUtf(256)));

		@Override
		public Type<CommandResult> type() {
			return TYPE;
		}
	}

	/** C2S: operator command from the control-room screen. */
	public record Command(int command, int index, double value) implements CustomPacketPayload {
		public static final Type<Command> TYPE = payloadType("command");
		public static final StreamCodec<FriendlyByteBuf, Command> CODEC = CustomPacketPayload.codec(
			(p, buf) -> {
				buf.writeVarInt(p.command);
				buf.writeVarInt(p.index);
				buf.writeDouble(p.value);
			},
			buf -> new Command(buf.readVarInt(), buf.readVarInt(), buf.readDouble()));

		@Override
		public Type<Command> type() {
			return TYPE;
		}
	}

	/** C2S: the control-room screen was closed; stop sending snapshots. */
	public record CloseScreen() implements CustomPacketPayload {
		public static final Type<CloseScreen> TYPE = payloadType("close_screen");
		public static final StreamCodec<FriendlyByteBuf, CloseScreen> CODEC = CustomPacketPayload.codec((p, buf) -> {
		}, buf -> new CloseScreen());

		@Override
		public Type<CloseScreen> type() {
			return TYPE;
		}
	}
}
