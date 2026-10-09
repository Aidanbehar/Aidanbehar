package com.deepwinter.command;

import com.deepwinter.storm.StormData;
import com.deepwinter.storm.StormManager;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.TimeArgument;
import net.minecraft.network.chat.Component;

public final class SnowstormCommand {
	/** Default forced storm length: 15 minutes. */
	public static final int DEFAULT_DURATION = 20 * 60 * 15;

	private SnowstormCommand() {
	}

	public static void register(CommandDispatcher<CommandSourceStack> dispatcher) {
		dispatcher.register(Commands.literal("snowstorm")
			.requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
			.then(Commands.literal("start")
				.executes(c -> start(c.getSource(), DEFAULT_DURATION))
				.then(Commands.argument("duration", TimeArgument.time(1))
					.executes(c -> start(c.getSource(), IntegerArgumentType.getInteger(c, "duration")))))
			.then(Commands.literal("stop").executes(c -> stop(c.getSource())))
			.then(Commands.literal("status").executes(c -> status(c.getSource()))));
	}

	private static int start(CommandSourceStack source, int duration) {
		StormManager.forceStart(source.getServer(), duration);
		source.sendSuccess(() -> Component.translatable("commands.deepwinter.snowstorm.start", duration / 20), true);
		return 1;
	}

	private static int stop(CommandSourceStack source) {
		if (StormManager.stop(source.getServer())) {
			source.sendSuccess(() -> Component.translatable("commands.deepwinter.snowstorm.stop"), true);
			return 1;
		}
		source.sendFailure(Component.translatable("commands.deepwinter.snowstorm.none"));
		return 0;
	}

	private static int status(CommandSourceStack source) {
		StormData data = StormManager.data(source.getServer());
		if (!data.isActive()) {
			source.sendSuccess(() -> Component.translatable("commands.deepwinter.snowstorm.status.none",
				source.getServer().getWeatherData().isRaining() ? "rain/snow" : "clear"), false);
		} else {
			String left = data.remainingTicks() > 0 ? (data.remainingTicks() / 20) + "s" : "until the snowfall ends";
			source.sendSuccess(() -> Component.translatable("commands.deepwinter.snowstorm.status.active",
				data.isForced() ? "forced (everywhere)" : "natural (cold biomes)", data.stormTicks() / 20, left), false);
		}
		return data.isActive() ? 1 : 0;
	}
}
