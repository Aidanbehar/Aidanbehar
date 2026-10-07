package dev.timeskip.testmod;

import com.mojang.authlib.GameProfile;
import com.mojang.brigadier.arguments.StringArgumentType;
import io.netty.channel.embedded.EmbeddedChannel;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import net.fabricmc.api.ModInitializer;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.Connection;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.PacketFlow;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.network.CommonListenerCookie;

/**
 * TEST-ONLY helper (never shipped): {@code /fakeplayer <name>} adds a server-side player with no
 * real client, the same way vanilla's game-test framework makes mock players. Natural mob
 * spawning, chunk loading, boss bars and chunk re-sending all need a player to exist.
 */
public final class FakePlayerMod implements ModInitializer {
    private static final List<ServerPlayer> PLAYERS = new ArrayList<>();

    @Override
    public void onInitialize() {
        // A real client answers a teleport with a move packet, which makes the server update the
        // player's chunk tracking; a fake one never does, so update it every tick instead.
        ServerTickEvents.END_SERVER_TICK.register(server -> {
            PLAYERS.removeIf(ServerPlayer::isRemoved);
            for (ServerPlayer player : PLAYERS) {
                player.level().getChunkSource().move(player);
            }
        });
        CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) ->
                dispatcher.register(Commands.literal("fakeplayer")
                        .requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
                        .then(Commands.argument("name", StringArgumentType.word())
                                .executes(ctx -> spawn(ctx.getSource(), StringArgumentType.getString(ctx, "name"))))));
    }

    private static int spawn(CommandSourceStack source, String name) {
        MinecraftServer server = source.getServer();
        UUID id = UUID.nameUUIDFromBytes(("fake:" + name).getBytes(StandardCharsets.UTF_8));
        CommonListenerCookie cookie = CommonListenerCookie.createInitial(new GameProfile(id, name), false);
        ServerPlayer player = new ServerPlayer(server, source.getLevel(), cookie.gameProfile(), cookie.clientInformation());
        Connection connection = new Connection(PacketFlow.SERVERBOUND);
        new EmbeddedChannel(connection);
        server.getPlayerList().placeNewPlayer(connection, player, cookie);
        PLAYERS.add(player);
        source.sendSuccess(() -> Component.literal("Fake player " + name + " joined"), false);
        return 1;
    }
}
