package dev.timeskip;

import dev.timeskip.command.TimeSkipCommand;
import dev.timeskip.config.ConfigIO;
import dev.timeskip.config.TimeSkipConfig;
import dev.timeskip.core.SkipManager;
import java.nio.file.Path;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.level.TicketType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Time Skip: {@code /timeskip <amount> <unit>} fast-forwards the world by up to 100 million years.
 * Everything runs on the server, so vanilla clients can join a server that has it installed.
 */
public final class TimeSkipMod implements ModInitializer {
    public static final String MOD_ID = "timeskip";
    private static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    /**
     * Chunk ticket that keeps chunks loaded while a skip works on them. Ticket types are compared by
     * identity and only "persist" tickets are ever saved, so a private instance needs no registry
     * entry (built-in registries are already frozen when mods initialise).
     */
    private static final TicketType TICKET_TYPE = new TicketType(0L, TicketType.FLAG_LOADING);

    private static volatile TimeSkipConfig config = new TimeSkipConfig();

    @Override
    public void onInitialize() {
        reloadConfig();
        CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) -> TimeSkipCommand.register(dispatcher));
        ServerLifecycleEvents.SERVER_STARTED.register(SkipManager::onServerStarted);
        ServerLifecycleEvents.SERVER_STOPPING.register(SkipManager::onServerStopping);
        ServerTickEvents.END_SERVER_TICK.register(SkipManager::onServerTick);
        LOGGER.info("[Time Skip] Ready. Use /timeskip <amount> <days|years|thousand_years|million_years>.");
    }

    public static TimeSkipConfig config() {
        return config;
    }

    /** Reloads the config file; returns the number of invalid values that kept their defaults. */
    public static int reloadConfig() {
        Path file = FabricLoader.getInstance().getConfigDir().resolve("timeskip.properties");
        ConfigIO.LoadResult result = ConfigIO.load(file);
        config = result.config();
        return result.problems().size();
    }

    public static TicketType ticketType() {
        return TICKET_TYPE;
    }
}
