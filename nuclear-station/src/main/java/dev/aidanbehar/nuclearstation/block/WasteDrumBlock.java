package dev.aidanbehar.nuclearstation.block;

import dev.aidanbehar.nuclearstation.radiation.ItemRadioactivity;
import dev.aidanbehar.nuclearstation.radiation.RadiationManager;
import net.minecraft.ChatFormatting;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.EntityBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.IntegerProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.VoxelShape;

/**
 * Lead-lined radioactive waste drum. Radioactive items (ore, contaminated soil, debris)
 * are sealed inside; the drum's lining attenuates their emission by about 99%.
 * Removing a full drum keeps its contents (it is dropped as an item with its contents).
 */
public class WasteDrumBlock extends Block implements EntityBlock, RadiationSource {
	public static final IntegerProperty FILL = IntegerProperty.create("fill", 0, 4);
	public static final int CAPACITY = 256;
	public static final float SHIELDING = 0.01f;
	private static final VoxelShape SHAPE = Block.box(2, 0, 2, 14, 15, 14);

	public WasteDrumBlock(BlockBehaviour.Properties properties) {
		super(properties);
		registerDefaultState(stateDefinition.any().setValue(FILL, 0));
	}

	@Override
	public BlockEntity newBlockEntity(BlockPos pos, BlockState state) {
		return new WasteDrumBlockEntity(pos, state);
	}

	@Override
	protected VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
		return SHAPE;
	}

	@Override
	public float radiationStrength(Level level, BlockPos pos, BlockState state) {
		return level.getBlockEntity(pos) instanceof WasteDrumBlockEntity drum ? drum.activity() * SHIELDING : 0f;
	}

	@Override
	public boolean constantStrength() {
		return false;
	}

	@Override
	protected InteractionResult useItemOn(ItemStack stack, BlockState state, Level level, BlockPos pos, Player player,
			InteractionHand hand, BlockHitResult hit) {
		float perItem = ItemRadioactivity.activity(stack);
		if (stack.isEmpty() || perItem <= 0) {
			return InteractionResult.TRY_WITH_EMPTY_HAND;
		}
		if (level instanceof ServerLevel server && level.getBlockEntity(pos) instanceof WasteDrumBlockEntity drum) {
			int room = CAPACITY - drum.items();
			if (room <= 0) {
				player.sendOverlayMessage(Component.translatable("message.nuclearstation.drum_full").withStyle(ChatFormatting.YELLOW));
				return InteractionResult.SUCCESS;
			}
			int n = Math.min(room, stack.getCount());
			drum.add(n, perItem * n);
			stack.shrink(n);
			int fill = Math.min(4, (int) Math.ceil(drum.items() * 4.0 / CAPACITY));
			level.setBlock(pos, state.setValue(FILL, fill), Block.UPDATE_ALL);
			RadiationManager.invalidate(server, pos);
			level.playSound(null, pos, SoundEvents.IRON_DOOR_CLOSE, SoundSource.BLOCKS, 0.6f, 0.7f);
			player.sendOverlayMessage(Component.translatable("message.nuclearstation.drum_sealed", n, drum.items(), CAPACITY));
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected InteractionResult useWithoutItem(BlockState state, Level level, BlockPos pos, Player player, BlockHitResult hit) {
		if (!level.isClientSide() && level.getBlockEntity(pos) instanceof WasteDrumBlockEntity drum) {
			player.sendOverlayMessage(Component.translatable("message.nuclearstation.drum_status", drum.items(), CAPACITY,
				String.format("%.1f", drum.activity() * SHIELDING)));
		}
		return InteractionResult.SUCCESS;
	}

	@Override
	protected void affectNeighborsAfterRemoval(BlockState state, ServerLevel level, BlockPos pos, boolean movedByPiston) {
		super.affectNeighborsAfterRemoval(state, level, pos, movedByPiston);
		RadiationManager.invalidate(level, pos);
	}

	@Override
	protected void createBlockStateDefinition(StateDefinition.Builder<Block, BlockState> builder) {
		builder.add(FILL);
	}
}
