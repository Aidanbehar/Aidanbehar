package com.deepwinter.network;

import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.Identifier;

/** Server -> client: current snowstorm state. */
public record StormSyncPayload(boolean active, boolean forced) implements CustomPacketPayload {
	public static final CustomPacketPayload.Type<StormSyncPayload> TYPE =
		new CustomPacketPayload.Type<>(Identifier.fromNamespaceAndPath("deepwinter", "storm_sync"));
	public static final StreamCodec<RegistryFriendlyByteBuf, StormSyncPayload> CODEC = StreamCodec.composite(
		ByteBufCodecs.BOOL, StormSyncPayload::active,
		ByteBufCodecs.BOOL, StormSyncPayload::forced,
		StormSyncPayload::new
	);

	@Override
	public Type<? extends CustomPacketPayload> type() {
		return TYPE;
	}
}
