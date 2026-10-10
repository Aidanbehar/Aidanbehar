package dev.aidanbehar.nuclearstation.assets;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/**
 * Cross-checks the registration code against the generated resources without starting the
 * game: every block has a block state, item model definition, translation and (unless it
 * is meant to drop nothing) a loot table; every item has a model and a name; every
 * translation key used in code exists; every sound, loot table and placed feature named in
 * code exists as a resource.
 */
class AssetConsistencyTest {
	private static final Path SRC = Path.of("src/main/java/dev/aidanbehar/nuclearstation");
	private static final Path CLIENT = Path.of("src/client/java/dev/aidanbehar/nuclearstation");
	private static final Path ASSETS = Path.of("src/main/resources/assets/nuclearstation");
	private static final Path DATA = Path.of("src/main/resources/data/nuclearstation");

	private static String read(Path p) {
		try {
			return Files.readString(p);
		} catch (IOException e) {
			throw new RuntimeException(e);
		}
	}

	private static Set<String> matches(String text, String regex) {
		Set<String> out = new LinkedHashSet<>();
		Matcher m = Pattern.compile(regex).matcher(text);
		while (m.find()) {
			out.add(m.group(1));
		}
		return out;
	}

	private static String allJava() throws IOException {
		StringBuilder sb = new StringBuilder();
		for (Path root : List.of(SRC, CLIENT)) {
			try (Stream<Path> s = Files.walk(root)) {
				for (Path p : s.filter(f -> f.toString().endsWith(".java")).toList()) {
					sb.append(read(p)).append('\n');
				}
			}
		}
		return sb.toString();
	}

	private static Set<String> blockIds() {
		return matches(read(SRC.resolve("registry/ModBlocks.java")), "(?:register|ore)\\(\"([a-z0-9_]+)\"");
	}

	private static Set<String> itemIds() {
		Set<String> ids = matches(read(SRC.resolve("registry/ModItems.java")), "(?:register|material)\\(\"([a-z0-9_]+)\"");
		ids.addAll(matches(read(SRC.resolve("sim/SparePart.java")), "\\(\"([a-z0-9_]+)\""));
		return ids;
	}

	@Test
	void everyBlockHasResources() {
		String lang = read(ASSETS.resolve("lang/en_us.json"));
		List<String> missing = new ArrayList<>();
		for (String id : blockIds()) {
			if (!Files.exists(ASSETS.resolve("blockstates/" + id + ".json"))) {
				missing.add("blockstate " + id);
			}
			if (!Files.exists(ASSETS.resolve("items/" + id + ".json"))) {
				missing.add("item model definition " + id);
			}
			if (!lang.contains("\"block.nuclearstation." + id + "\"")) {
				missing.add("name " + id);
			}
			if (!id.equals("cherenkov_glow") && !Files.exists(DATA.resolve("loot_table/blocks/" + id + ".json"))) {
				missing.add("loot table " + id);
			}
		}
		assertTrue(missing.isEmpty(), "Missing block resources: " + missing);
		assertTrue(blockIds().size() > 80, "block id parsing failed");
	}

	@Test
	void everyItemHasResources() {
		String lang = read(ASSETS.resolve("lang/en_us.json"));
		List<String> missing = new ArrayList<>();
		for (String id : itemIds()) {
			if (!Files.exists(ASSETS.resolve("items/" + id + ".json"))) {
				missing.add("item model definition " + id);
			}
			if (!Files.exists(ASSETS.resolve("textures/item/" + id + ".png"))) {
				missing.add("texture " + id);
			}
			if (!lang.contains("\"item.nuclearstation." + id + "\"")) {
				missing.add("name " + id);
			}
		}
		assertTrue(missing.isEmpty(), "Missing item resources: " + missing);
		assertTrue(itemIds().size() > 40, "item id parsing failed");
	}

	@Test
	void describedItemsHaveDescriptions() {
		String items = read(SRC.resolve("registry/ModItems.java"));
		String lang = read(ASSETS.resolve("lang/en_us.json"));
		Set<String> described = matches(items, "material\\(\"([a-z0-9_]+)\"");
		described.addAll(matches(items, "register\\(\"([a-z0-9_]+)\", (?:p -> new DescribedItem|GeigerCounterItem|DosimeterItem|SurveyMeterItem|DeconKitItem)"));
		List<String> missing = described.stream().filter(id -> !lang.contains("\"item.nuclearstation." + id + ".desc\"")).toList();
		assertTrue(missing.isEmpty(), "Missing descriptions: " + missing);
	}

	@Test
	void translationKeysUsedInCodeExist() throws IOException {
		String lang = read(ASSETS.resolve("lang/en_us.json"));
		Set<String> keys = matches(allJava(), "\"((?:message|tooltip|screen|itemGroup)\\.nuclearstation\\.[a-z0-9_.]+)\"");
		List<String> missing = keys.stream().filter(k -> !lang.contains("\"" + k + "\"")).toList();
		assertTrue(missing.isEmpty(), "Missing translations: " + missing);
	}

	@Test
	void soundsLootAndWorldgenExist() throws IOException {
		String sounds = read(ASSETS.resolve("sounds.json"));
		List<String> missing = new ArrayList<>();
		for (String s : matches(read(SRC.resolve("registry/ModSounds.java")), "register\\(\"([a-z0-9_.]+)\"")) {
			if (!sounds.contains("\"" + s + "\"")) {
				missing.add("sound event " + s);
			}
			if (!Files.exists(ASSETS.resolve("sounds/" + s.replace('.', '/') + ".ogg"))) {
				missing.add("sound file " + s);
			}
		}
		for (String loot : matches(allJava(), "loot\\(\"([a-z0-9_/]+)\"")) {
			if (!Files.exists(DATA.resolve("loot_table/" + loot + ".json"))) {
				missing.add("loot table " + loot);
			}
		}
		for (String feature : matches(read(SRC.resolve("geology/Geology.java")), "ore\\([a-zA-Z]+, \"([a-z0-9_]+)\"\\)")) {
			if (!Files.exists(DATA.resolve("worldgen/placed_feature/" + feature + ".json"))) {
				missing.add("placed feature " + feature);
			}
			if (!Files.exists(DATA.resolve("worldgen/feature/" + feature + ".json"))) {
				missing.add("configured feature " + feature);
			}
		}
		for (String eq : List.of("hazmat", "respirator", "lead_apron")) {
			if (!Files.exists(ASSETS.resolve("equipment/" + eq + ".json"))) {
				missing.add("equipment asset " + eq);
			}
		}
		if (!Files.exists(DATA.resolve("damage_type/radiation_sickness.json"))) {
			missing.add("damage type");
		}
		assertTrue(missing.isEmpty(), "Missing resources: " + missing);
	}

	@Test
	void blockStateModelsExist() throws IOException {
		List<String> missing = new ArrayList<>();
		try (Stream<Path> s = Files.list(ASSETS.resolve("blockstates"))) {
			for (Path p : s.toList()) {
				for (String model : matches(read(p), "\"model\": \"nuclearstation:([a-z0-9_/]+)\"")) {
					if (!Files.exists(ASSETS.resolve("models/" + model + ".json"))) {
						missing.add(p.getFileName() + " -> " + model);
					}
				}
			}
		}
		try (Stream<Path> s = Files.walk(ASSETS.resolve("models"))) {
			for (Path p : s.filter(f -> f.toString().endsWith(".json")).toList()) {
				for (String tex : matches(read(p), "\"nuclearstation:((?:block|item)/[a-z0-9_]+)\"")) {
					if (!Files.exists(ASSETS.resolve("textures/" + tex + ".png")) && !Files.exists(ASSETS.resolve("models/" + tex + ".json"))) {
						missing.add(p.getFileName() + " -> " + tex);
					}
				}
			}
		}
		assertTrue(missing.isEmpty(), "Dangling model/texture references: " + missing);
	}
}
