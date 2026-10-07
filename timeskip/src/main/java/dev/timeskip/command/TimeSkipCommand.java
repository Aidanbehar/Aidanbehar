package dev.timeskip.command;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import com.mojang.brigadier.builder.ArgumentBuilder;
import com.mojang.brigadier.builder.RequiredArgumentBuilder;
import com.mojang.brigadier.context.CommandContext;
import dev.timeskip.TimeSkipMod;
import dev.timeskip.core.SkipManager;
import net.minecraft.ChatFormatting;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.Component;

/**
 * {@code /timeskip <amount> <ticks|days|years|thousand_years|million_years>},
 * {@code /timeskip status|cancel|confirm|reload}. Requires permission level 2 (cheats/op).
 */
public final class TimeSkipCommand {
    private TimeSkipCommand() {
    }

    public static void register(CommandDispatcher<CommandSourceStack> dispatcher) {
        RequiredArgumentBuilder<CommandSourceStack, Double> amount =
                Commands.argument("amount", DoubleArgumentType.doubleArg(0.0));
        for (SkipUnit unit : SkipUnit.values()) {
            amount.then(Commands.literal(unit.id).executes(ctx -> withManager(ctx,
                    manager -> manager.request(ctx.getSource(), DoubleArgumentType.getDouble(ctx, "amount"), unit))));
        }
        ArgumentBuilder<CommandSourceStack, ?> root = Commands.literal("timeskip")
                .requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
                .then(Commands.literal("status").executes(ctx -> withManager(ctx, m -> m.status(ctx.getSource()))))
                .then(Commands.literal("cancel").executes(ctx -> withManager(ctx, m -> m.cancel(ctx.getSource()))))
                .then(Commands.literal("confirm").executes(ctx -> withManager(ctx, m -> m.confirm(ctx.getSource()))))
                .then(Commands.literal("reload").executes(TimeSkipCommand::reload))
                .then(amount);
        dispatcher.register((com.mojang.brigadier.builder.LiteralArgumentBuilder<CommandSourceStack>) root);
    }

    private interface ManagerAction {
        int run(SkipManager manager);
    }

    private static int withManager(CommandContext<CommandSourceStack> ctx, ManagerAction action) {
        SkipManager manager = SkipManager.get();
        if (manager == null) {
            ctx.getSource().sendFailure(Component.literal("Time Skip is not ready yet."));
            return 0;
        }
        return action.run(manager);
    }

    private static int reload(CommandContext<CommandSourceStack> ctx) {
        int problems = TimeSkipMod.reloadConfig();
        ctx.getSource().sendSuccess(() -> Component.literal("[Time Skip] Config reloaded"
                + (problems > 0 ? " (" + problems + " invalid values kept their defaults; see the server log)." : "."))
                .withStyle(ChatFormatting.GOLD), true);
        return 1;
    }
}
