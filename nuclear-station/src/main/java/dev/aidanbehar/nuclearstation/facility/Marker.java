package dev.aidanbehar.nuclearstation.facility;

import net.minecraft.core.BlockPos;

/** A typed position recorded while painting the blueprint (world coordinates). */
public record Marker(MarkerType type, BlockPos pos, int data) {
}
