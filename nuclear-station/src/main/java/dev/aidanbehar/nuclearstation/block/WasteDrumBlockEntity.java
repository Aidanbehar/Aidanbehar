package dev.aidanbehar.nuclearstation.block;

import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.storage.ValueInput;
import net.minecraft.world.level.storage.ValueOutput;

/** Holds the number of items sealed in a waste drum and their total unshielded activity. */
public class WasteDrumBlockEntity extends BlockEntity {
	private int items;
	private float activity;

	public WasteDrumBlockEntity(BlockPos pos, BlockState state) {
		super(ModBlocks.WASTE_DRUM_ENTITY, pos, state);
	}

	public int items() {
		return items;
	}

	public float activity() {
		return activity;
	}

	public void add(int count, float addedActivity) {
		items += count;
		activity += addedActivity;
		setChanged();
	}

	@Override
	protected void loadAdditional(ValueInput input) {
		super.loadAdditional(input);
		items = input.getIntOr("items", 0);
		activity = input.getFloatOr("activity", 0f);
	}

	@Override
	protected void saveAdditional(ValueOutput output) {
		super.saveAdditional(output);
		output.putInt("items", items);
		output.putFloat("activity", activity);
	}
}
