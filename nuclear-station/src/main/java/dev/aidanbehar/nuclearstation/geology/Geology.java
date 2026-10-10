package dev.aidanbehar.nuclearstation.geology;

import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.config.ModConfig;
import java.util.function.Predicate;
import net.fabricmc.fabric.api.biome.v1.BiomeModifications;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectionContext;
import net.fabricmc.fabric.api.biome.v1.BiomeSelectors;
import net.minecraft.core.Registry;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.tags.BiomeTags;
import net.minecraft.world.level.biome.Biomes;
import net.minecraft.world.level.levelgen.GenerationStep;
import net.minecraft.world.level.levelgen.placement.PlacedFeature;
import net.minecraft.world.level.levelgen.structure.StructureType;
import net.minecraft.world.level.levelgen.structure.pieces.StructurePieceType;

/**
 * Radioactive and strategic minerals placed where their geology makes sense: uraninite and
 * pitchblende in crystalline rock at depth, monazite in beach placer sands and granite,
 * carnotite in desert sandstones, black shale in sedimentary lowlands, pegmatite minerals
 * in mountains. Ore bodies are data-driven features in data/nuclearstation/worldgen.
 */
public final class Geology {
	public static final StructureType<UraniumMineStructure> URANIUM_MINE = Registry.register(BuiltInRegistries.STRUCTURE_TYPE,
		NuclearStation.id("uranium_mine"), () -> UraniumMineStructure.CODEC);
	public static final StructurePieceType MINE_PIECE = Registry.register(BuiltInRegistries.STRUCTURE_PIECE,
		NuclearStation.id("uranium_mine_piece"), (StructurePieceType.ContextlessType) MinePiece::new);

	private Geology() {
	}

	private static ResourceKey<PlacedFeature> key(String name) {
		return ResourceKey.create(Registries.PLACED_FEATURE, NuclearStation.id(name));
	}

	private static void ore(Predicate<BiomeSelectionContext> where, String name) {
		BiomeModifications.addFeature(where, GenerationStep.Decoration.UNDERGROUND_ORES, key(name));
	}

	public static void register() {
		if (!ModConfig.get().geology.generateOres) {
			NuclearStation.LOG.info("Radioactive ore generation disabled by configuration");
			return;
		}
		Predicate<BiomeSelectionContext> overworld = BiomeSelectors.foundInOverworld();
		Predicate<BiomeSelectionContext> mountains = BiomeSelectors.tag(BiomeTags.IS_MOUNTAIN).or(BiomeSelectors.tag(BiomeTags.IS_HILL));
		Predicate<BiomeSelectionContext> arid = BiomeSelectors.tag(BiomeTags.IS_BADLANDS).or(BiomeSelectors.includeByKey(Biomes.DESERT));
		Predicate<BiomeSelectionContext> beaches = BiomeSelectors.tag(BiomeTags.IS_BEACH);
		Predicate<BiomeSelectionContext> lowlands = BiomeSelectors.includeByKey(Biomes.PLAINS, Biomes.SWAMP, Biomes.FOREST,
			Biomes.TAIGA, Biomes.BIRCH_FOREST, Biomes.DARK_FOREST, Biomes.MEADOW, Biomes.SAVANNA);
		ore(overworld, "ore_uraninite");
		ore(mountains, "ore_uraninite_rich");
		ore(overworld, "ore_pitchblende");
		ore(mountains, "ore_thorianite");
		ore(beaches, "ore_monazite_sand");
		ore(overworld, "ore_monazite");
		ore(arid, "ore_carnotite");
		ore(mountains, "ore_autunite");
		ore(overworld, "ore_radiferous_barite");
		ore(lowlands, "ore_radioactive_shale");
		ore(mountains, "ore_xenotime");
		ore(overworld, "ore_zircon");
		ore(mountains, "ore_beryl");
		ore(arid, "ore_colemanite");
		ore(mountains, "ore_spodumene");
		ore(overworld, "ore_greenockite");
		ore(overworld, "ore_graphite");
		ore(overworld, "ore_galena");
		ore(overworld, "ore_resonite");
		ore(overworld, "ore_voidstone");
	}
}
