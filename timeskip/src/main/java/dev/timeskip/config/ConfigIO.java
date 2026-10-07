package dev.timeskip.config;

import java.io.IOException;
import java.io.Reader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Properties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Reads and writes {@code config/timeskip.properties}. The file is always rewritten after
 * loading so new settings appear (with comments) after an update, while the player's values
 * are kept.
 */
public final class ConfigIO {
    private static final Logger LOGGER = LoggerFactory.getLogger("timeskip");

    private ConfigIO() {
    }

    public record LoadResult(TimeSkipConfig config, List<String> problems) {
    }

    public static LoadResult load(Path file) {
        TimeSkipConfig config = new TimeSkipConfig();
        List<String> problems = List.of();
        if (Files.isRegularFile(file)) {
            try (Reader reader = new StringReader(Files.readString(file, StandardCharsets.UTF_8))) {
                Properties properties = new Properties();
                properties.load(reader);
                problems = config.apply(properties);
            } catch (IOException | IllegalArgumentException e) {
                LOGGER.warn("[Time Skip] Could not read {} ({}); using defaults", file, e.toString());
            }
        } else {
            config.sanitize();
        }
        for (String problem : problems) {
            LOGGER.warn("[Time Skip] Config: {}", problem);
        }
        try {
            write(file, config);
        } catch (IOException e) {
            LOGGER.warn("[Time Skip] Could not write {}: {}", file, e.toString());
        }
        return new LoadResult(config, problems);
    }

    public static void write(Path file, TimeSkipConfig config) throws IOException {
        Files.createDirectories(file.getParent());
        Files.writeString(file, render(config), StandardCharsets.UTF_8);
    }

    static String render(TimeSkipConfig config) {
        StringBuilder out = new StringBuilder();
        out.append("# ==========================================================================\n");
        out.append("#  Time Skip configuration\n");
        out.append("#  You do not need to change anything here - the defaults are designed to work.\n");
        out.append("#  Edit a value, save, then run /timeskip reload (or restart the server).\n");
        out.append("# ==========================================================================\n");
        for (TimeSkipConfig.Section section : TimeSkipConfig.layout()) {
            out.append("\n# --- ").append(section.title()).append(" ---\n");
            for (TimeSkipConfig.Entry entry : section.entries()) {
                out.append('\n');
                for (String line : entry.comment().split("\n")) {
                    out.append("# ").append(line).append('\n');
                }
                out.append(entry.key()).append(" = ").append(entry.getter().apply(config)).append('\n');
            }
        }
        return out.toString();
    }
}
