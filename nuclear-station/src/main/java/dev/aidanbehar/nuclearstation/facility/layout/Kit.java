package dev.aidanbehar.nuclearstation.facility.layout;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.block.PanelStatus;
import dev.aidanbehar.nuclearstation.block.SignKind;
import dev.aidanbehar.nuclearstation.facility.MarkerType;
import dev.aidanbehar.nuclearstation.facility.Painter;
import dev.aidanbehar.nuclearstation.registry.ModBlocks;
import dev.aidanbehar.nuclearstation.sim.EquipmentId;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceKey;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.ChestBlock;
import net.minecraft.world.level.block.CrossCollisionBlock;
import net.minecraft.world.level.block.LadderBlock;
import net.minecraft.world.level.block.LecternBlock;
import net.minecraft.world.level.block.RailBlock;
import net.minecraft.world.level.block.WallSignBlock;
import net.minecraft.world.level.block.entity.ChestBlockEntity;
import net.minecraft.world.level.block.entity.LecternBlockEntity;
import net.minecraft.world.level.block.entity.SignBlockEntity;
import net.minecraft.world.level.block.entity.SignText;
import net.minecraft.world.level.block.entity.SignTextSlot;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.RailShape;
import net.minecraft.world.level.storage.loot.LootTable;

/**
 * Reusable construction and furnishing routines shared by all facility components, so
 * that offices, stairwells, catwalks and signage look the same everywhere on site.
 */
public final class Kit {
	public static final ResourceKey<LootTable> LOOT_PARTS = loot("chests/warehouse_parts");
	public static final ResourceKey<LootTable> LOOT_PPE = loot("chests/ppe_store");
	public static final ResourceKey<LootTable> LOOT_LAB = loot("chests/lab_supplies");
	public static final ResourceKey<LootTable> LOOT_OFFICE = loot("chests/office");
	public static final ResourceKey<LootTable> LOOT_WORKSHOP = loot("chests/workshop");
	public static final ResourceKey<LootTable> LOOT_MINE = loot("chests/mine_store");

	private final Painter p;

	public Kit(Painter p) {
		this.p = p;
	}

	private static ResourceKey<LootTable> loot(String path) {
		return ResourceKey.create(Registries.LOOT_TABLE, NuclearStation.id(path));
	}

	/** Position hash in [0,1): deterministic, independent of painting order. */
	public static double hash(int x, int y, int z, long salt) {
		long h = x * 0x9E3779B97F4A7C15L ^ y * 0xC2B2AE3D27D4EB4FL ^ z * 0x165667B19E3779F9L ^ salt;
		h = (h ^ (h >>> 30)) * 0xBF58476D1CE4E5B9L;
		h = (h ^ (h >>> 27)) * 0x94D049BB133111EBL;
		h ^= h >>> 31;
		return (h >>> 11) * 0x1.0p-53;
	}

	// ------------------------------------------------------------------ lighting

	public void lamp(int x, int y, int z) {
		p.set(x, y, z, Pal.LAMP);
		p.marker(MarkerType.LAMP, x, y, z, 0);
	}

	/** Grid of ceiling lamps hung at height y. */
	public void lamps(int x0, int z0, int x1, int z1, int y, int spacing) {
		int ax = Math.min(x0, x1);
		int bx = Math.max(x0, x1);
		int az = Math.min(z0, z1);
		int bz = Math.max(z0, z1);
		for (int x = ax + spacing / 2; x <= bx; x += spacing) {
			for (int z = az + spacing / 2; z <= bz; z += spacing) {
				lamp(x, y, z);
			}
		}
	}

	public void emergencyLamp(int x, int y, int z) {
		p.set(x, y, z, Pal.EMERGENCY_LAMP);
	}

	public void beacon(int x, int y, int z) {
		p.set(x, y, z, Pal.BEACON);
		p.marker(MarkerType.BEACON, x, y, z, 0);
	}

	// ------------------------------------------------------------------ signage

	public void sign(int x, int y, int z, SignKind kind, Direction facing) {
		p.set(x, y, z, Pal.sign(kind, facing));
	}

	/** Readable wall sign with up to four lines (vanilla sign so text renders). */
	public void label(int x, int y, int z, Direction facing, DyeColor colour, String... lines) {
		p.set(x, y, z, Blocks.SPRUCE_WALL_SIGN.defaultBlockState().setValue(WallSignBlock.FACING, facing));
		p.configure(x, y, z, be -> {
			if (be instanceof SignBlockEntity sign) {
				List<Component> msgs = new ArrayList<>();
				for (int i = 0; i < 4; i++) {
					msgs.add(i < lines.length ? Component.literal(lines[i]) : Component.empty());
				}
				SignText text = new SignText(msgs, msgs, colour, true);
				sign.setText(text, SignTextSlot.FRONT);
				sign.setWaxed(true);
			}
		});
	}

	/** Splits text into at most four sign lines of maxChars characters, breaking on spaces. */
	public static String[] wrap(String text, int maxChars) {
		List<String> lines = new ArrayList<>();
		StringBuilder line = new StringBuilder();
		for (String word : text.split(" ")) {
			if (line.length() > 0 && line.length() + 1 + word.length() > maxChars) {
				lines.add(line.toString());
				line.setLength(0);
			}
			if (line.length() > 0) {
				line.append(' ');
			}
			line.append(word);
		}
		if (line.length() > 0) {
			lines.add(line.toString());
		}
		return lines.subList(0, Math.min(4, lines.size())).toArray(new String[0]);
	}

	public void label(int x, int y, int z, Direction facing, String... lines) {
		label(x, y, z, facing, DyeColor.WHITE, lines);
	}

	// ------------------------------------------------------------------ doors, stairs, ladders

	public void door(int x, int y, int z, Direction facing) {
		p.door(x, y, z, Blocks.COPPER_DOOR.waxed().unaffected(), facing);
	}

	public void woodDoor(int x, int y, int z, Direction facing) {
		p.door(x, y, z, Blocks.SPRUCE_DOOR, facing);
	}

	/** Opening through a wall (2 high) with a door, wall orientation along x when alongX. */
	public void doorway(int x, int y, int z, Direction facing, boolean withDoor) {
		p.fill(x, y, z, x, y + 1, z, Pal.AIR);
		if (withDoor) {
			door(x, y, z, facing);
		}
	}

	public void ladder(int x, int y0, int y1, int z, Direction facing) {
		BlockState l = Blocks.LADDER.defaultBlockState().setValue(LadderBlock.FACING, facing);
		for (int y = y0; y <= y1; y++) {
			p.set(x, y, z, l);
		}
	}

	/**
	 * Enclosed stairwell 4 wide (x) at (x0, z0) serving the given floor levels (y of each
	 * floor surface). The well is long enough for the tallest storey; flights alternate
	 * direction each storey and land at the well ends.
	 */
	public void stairCore(int x0, int z0, int[] floors, BlockState wall) {
		int maxH = 0;
		for (int f = 0; f + 1 < floors.length; f++) {
			maxH = Math.max(maxH, floors[f + 1] - floors[f]);
		}
		int len = maxH + 2;
		int top = floors[floors.length - 1];
		p.walls(x0 - 1, z0 - 1, x0 + 4, z0 + len, floors[0], top + 5, wall);
		p.fill(x0, floors[0] + 1, z0, x0 + 3, top + 4, z0 + len - 1, Pal.AIR);
		for (int f = 0; f + 1 < floors.length; f++) {
			int ya = floors[f];
			int yb = floors[f + 1];
			int h = yb - ya;
			boolean south = f % 2 == 0;
			int lane = south ? x0 : x0 + 2;
			for (int i = 0; i < h; i++) {
				int z = south ? z0 + 1 + i : z0 + len - 2 - i;
				Direction dir = south ? Direction.SOUTH : Direction.NORTH;
				for (int w = 0; w < 2; w++) {
					p.set(lane + w, ya + 1 + i, z, Painter.stairs(Blocks.SMOOTH_QUARTZ_STAIRS, dir, false));
					if (i > 0) {
						p.fill(lane + w, ya + 1, z, lane + w, ya + i, z, wall);
					}
				}
			}
			// landings at both ends of the well on the upper floor
			p.floor(x0, z0, x0 + 3, z0, yb, Pal.CONCRETE);
			p.floor(x0, z0 + len - 1, x0 + 3, z0 + len - 1, yb, Pal.CONCRETE);
			lamp(x0 + 1, Math.min(yb + 4, (f + 2 < floors.length ? floors[f + 2] : yb + 5) - 1), z0 + len / 2);
		}
		p.floor(x0, z0, x0 + 3, z0 + len - 1, floors[0], Pal.CONCRETE);
		lamp(x0 + 1, floors[0] + 4, z0 + len / 2);
	}

	/** Length (z extent including walls) of a stair core for these floors. */
	public static int stairCoreLength(int[] floors) {
		int maxH = 0;
		for (int f = 0; f + 1 < floors.length; f++) {
			maxH = Math.max(maxH, floors[f + 1] - floors[f]);
		}
		return maxH + 4;
	}

	// ------------------------------------------------------------------ steelwork

	public static BlockState bars(boolean alongX) {
		BlockState s = Pal.IRON_BARS;
		return alongX ? s.setValue(CrossCollisionBlock.EAST, true).setValue(CrossCollisionBlock.WEST, true)
			: s.setValue(CrossCollisionBlock.NORTH, true).setValue(CrossCollisionBlock.SOUTH, true);
	}

	public static BlockState pane(BlockState pane, boolean alongX) {
		return alongX ? pane.setValue(CrossCollisionBlock.EAST, true).setValue(CrossCollisionBlock.WEST, true)
			: pane.setValue(CrossCollisionBlock.NORTH, true).setValue(CrossCollisionBlock.SOUTH, true);
	}

	/** Handrail of iron bars along a straight line at height y (the walking surface is y-1). */
	public void railing(int x0, int z0, int x1, int z1, int y) {
		boolean alongX = z0 == z1;
		p.fill(x0, y, z0, x1, y, z1, bars(alongX));
	}

	/** Grating walkway with railings on both long sides. */
	public void catwalk(int x0, int z0, int x1, int z1, int y) {
		p.floor(x0, z0, x1, z1, y, Pal.GRATING);
		boolean alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
		if (alongX) {
			railing(x0, z0 - 1, x1, z0 - 1, y + 1);
			railing(x0, z1 + 1, x1, z1 + 1, y + 1);
		} else {
			railing(x0 - 1, z0, x0 - 1, z1, y + 1);
			railing(x1 + 1, z0, x1 + 1, z1, y + 1);
		}
	}

	public void columns(int x0, int z0, int x1, int z1, int y0, int y1, int spacing, BlockState column) {
		for (int x = Math.min(x0, x1); x <= Math.max(x0, x1); x += spacing) {
			for (int z = Math.min(z0, z1); z <= Math.max(z0, z1); z += spacing) {
				p.fill(x, y0, z, x, y1, z, column);
			}
		}
	}

	/** Straight pipe run between two points that differ along one axis. */
	public void pipe(Block pipe, int x0, int y0, int z0, int x1, int y1, int z1) {
		Direction.Axis axis = x0 != x1 ? Direction.Axis.X : (z0 != z1 ? Direction.Axis.Z : Direction.Axis.Y);
		p.fill(x0, y0, z0, x1, y1, z1, Pal.pipe(pipe, axis));
	}

	/** L-shaped pipe: along x at height y from (x0,z0) to (x1,z0), then along z to z1. */
	public void pipeL(Block pipe, int x0, int z0, int x1, int z1, int y) {
		pipe(pipe, x0, y, z0, x1, y, z0);
		pipe(pipe, x1, y, z0, x1, y, z1);
	}

	public void tray(int x0, int z0, int x1, int z1, int y) {
		boolean alongX = z0 == z1;
		p.fill(x0, y, z0, x1, y, z1, Pal.tray(alongX ? Direction.Axis.X : Direction.Axis.Z));
	}

	public void rail(int x0, int z0, int x1, int z1, int y) {
		boolean alongX = z0 == z1;
		BlockState r = Blocks.RAIL.defaultBlockState().setValue(RailBlock.SHAPE, alongX ? RailShape.EAST_WEST : RailShape.NORTH_SOUTH);
		p.fill(x0, y - 1, z0, x1, y - 1, z1, Pal.GRAVEL);
		p.fill(x0, y, z0, x1, y, z1, r);
	}

	// ------------------------------------------------------------------ plant equipment markers

	public void station(int x, int y, int z, Direction facing, EquipmentId equipment) {
		p.set(x, y, z, Painter.facing(ModBlocks.LOCAL_STATION, facing));
		p.marker(MarkerType.STATION, x, y, z, equipment.ordinal());
	}

	public void panel(int x, int y, int z, Direction facing) {
		p.set(x, y, z, Pal.panel(ModBlocks.CONTROL_PANEL, facing, PanelStatus.NORMAL));
		p.marker(MarkerType.PANEL, x, y, z, 0);
	}

	public void annunciator(int x, int y, int z, Direction facing) {
		p.set(x, y, z, Pal.panel(ModBlocks.ANNUNCIATOR_PANEL, facing, PanelStatus.NORMAL));
		p.marker(MarkerType.ANNUNCIATOR, x, y, z, 0);
	}

	public void console(int x, int y, int z, Direction facing) {
		p.set(x, y, z, Painter.facing(ModBlocks.CONTROL_CONSOLE, facing));
		p.marker(MarkerType.CONSOLE, x, y, z, 0);
	}

	public void scram(int x, int y, int z, Direction facing) {
		p.set(x, y, z, Painter.facing(ModBlocks.SCRAM_BUTTON, facing));
		p.marker(MarkerType.SCRAM, x, y, z, 0);
	}

	// ------------------------------------------------------------------ containers

	public void chest(int x, int y, int z, Direction facing, ResourceKey<LootTable> loot) {
		p.set(x, y, z, Blocks.CHEST.defaultBlockState().setValue(ChestBlock.FACING, facing));
		long seed = (long) (hash(x, y, z, 77) * Long.MAX_VALUE);
		p.configure(x, y, z, be -> {
			if (be instanceof ChestBlockEntity chest) {
				chest.setLootTable(loot, seed);
			}
		});
	}

	public void lectern(int x, int y, int z, Direction facing, ItemStack book) {
		p.set(x, y, z, Blocks.LECTERN.defaultBlockState().setValue(LecternBlock.FACING, facing).setValue(LecternBlock.HAS_BOOK, true));
		p.configure(x, y, z, be -> {
			if (be instanceof LecternBlockEntity lectern) {
				lectern.setBook(book.copy());
			}
		});
	}

	// ------------------------------------------------------------------ furniture

	/** Desk (top slab) with a chair (stairs) and a keyboard/monitor. Desk faces direction 'facing'. */
	public void desk(int x, int y, int z, Direction facing) {
		p.set(x, y, z, Pal.slab(Blocks.SMOOTH_STONE_SLAB, true));
		p.set(x, y + 1, z, hash(x, y, z, 3) < 0.5 ? Blocks.CARPET.pick(net.minecraft.world.item.DyeColor.BLACK).defaultBlockState() : Blocks.FLOWER_POT.defaultBlockState());
		int cx = x - facing.getStepX();
		int cz = z - facing.getStepZ();
		p.set(cx, y, cz, Painter.stairs(Blocks.DARK_OAK_STAIRS, facing.getOpposite(), false));
	}

	/** Open-plan office: rows of desks, filing cabinets along the walls, lamps. Floor at y. */
	public void office(int x0, int z0, int x1, int z1, int y, int ceilingY) {
		p.floor(x0, z0, x1, z1, y, Pal.CARPET);
		for (int x = x0 + 2; x <= x1 - 2; x += 4) {
			for (int z = z0 + 3; z <= z1 - 2; z += 4) {
				desk(x, y + 1, z, Direction.NORTH);
			}
		}
		for (int x = x0; x <= x1; x += 3) {
			p.set(x, y + 1, z0, Blocks.BARREL.defaultBlockState());
		}
		lamps(x0, z0, x1, z1, ceilingY - 1, 6);
	}

	public void breakRoom(int x0, int z0, int x1, int z1, int y) {
		p.floor(x0, z0, x1, z1, y, Pal.TILE);
		p.set(x0, y + 1, z0, Blocks.SMOKER.defaultBlockState());
		p.set(x0 + 1, y + 1, z0, Blocks.WATER_CAULDRON.defaultBlockState());
		p.set(x0 + 2, y + 1, z0, Blocks.BARREL.defaultBlockState());
		p.set(x0 + 3, y + 1, z0, Blocks.CRAFTING_TABLE.defaultBlockState());
		for (int x = x0 + 2; x <= x1 - 2; x += 4) {
			p.set(x, y + 1, (z0 + z1) / 2, Blocks.SPRUCE_FENCE.defaultBlockState());
			p.set(x, y + 2, (z0 + z1) / 2, Blocks.SPRUCE_PRESSURE_PLATE.defaultBlockState());
			p.set(x - 1, y + 1, (z0 + z1) / 2, Painter.stairs(Blocks.SPRUCE_STAIRS, Direction.EAST, false));
			p.set(x + 1, y + 1, (z0 + z1) / 2, Painter.stairs(Blocks.SPRUCE_STAIRS, Direction.WEST, false));
		}
	}

	/** Changing room with lockers along one wall and PPE storage. */
	public void lockerRoom(int x0, int z0, int x1, int z1, int y, Direction lockerFacing) {
		p.floor(x0, z0, x1, z1, y, Pal.RUBBER);
		for (int x = x0; x <= x1; x++) {
			p.set(x, y + 1, z0, Painter.facing(ModBlocks.LOCKER, lockerFacing));
			p.set(x, y + 2, z0, Painter.facing(ModBlocks.LOCKER, lockerFacing));
		}
		for (int x = x0 + 1; x <= x1 - 1; x += 3) {
			p.set(x, y + 1, (z0 + z1) / 2 + 1, Pal.slab(Blocks.SPRUCE_SLAB, false));
		}
		chest(x1, y + 1, z1, Direction.WEST, LOOT_PPE);
	}

	/** Storeroom with barrel racks and a few loot chests. */
	public void store(int x0, int z0, int x1, int z1, int y, ResourceKey<LootTable> loot) {
		for (int x = x0; x <= x1; x += 2) {
			for (int z = z0; z <= z1; z += 4) {
				for (int h = 1; h <= 3; h++) {
					p.set(x, y + h, z, hash(x, h, z, 9) < 0.7 ? Blocks.BARREL.defaultBlockState() : Pal.TANK);
				}
			}
		}
		chest(x0, y + 1, z1, Direction.EAST, loot);
		chest(x1, y + 1, z0, Direction.WEST, loot);
	}

	public void workbenchRow(int x0, int z, int x1, int y) {
		for (int x = x0; x <= x1; x++) {
			Block b = switch ((x - x0) % 6) {
				case 0 -> Blocks.CRAFTING_TABLE;
				case 1 -> Blocks.SMITHING_TABLE;
				case 2 -> Blocks.ANVIL;
				case 3 -> Blocks.GRINDSTONE;
				case 4 -> Blocks.STONECUTTER;
				default -> Blocks.BLAST_FURNACE;
			};
			p.set(x, y + 1, z, b.defaultBlockState());
		}
	}
}
