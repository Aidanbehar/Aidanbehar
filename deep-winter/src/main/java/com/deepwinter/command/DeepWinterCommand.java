package com.deepwinter.command;

import com.deepwinter.config.DeepWinterConfig;
import com.deepwinter.snow.SnowClimate;
import com.deepwinter.snow.SnowColumn;
import com.deepwinter.storm.StormFlags;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.DoubleArgumentType;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.core.BlockPos;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.biome.Biome;

/** Debug/testing commands: /deepwinter speed, /deepwinter snow, /deepwinter temp (added by the temperature system). */
public final class DeepWinterCommand {
	private DeepWinterCommand() {
	}

	public static void register(CommandDispatcher<CommandSourceStack> dispatcher) {
		dispatcher.register(Commands.literal("deepwinter")
			.requires(Commands.hasPermission(Commands.LEVEL_GAMEMASTERS))
			.then(Commands.literal("speed")
				.executes(c -> {
					double v = DeepWinterConfig.get().debugSpeedMultiplier;
					c.getSource().sendSuccess(() -> Component.translatable("commands.deepwinter.speed.get", v), false);
					return 1;
				})
				.then(Commands.argument("multiplier", DoubleArgumentType.doubleArg(0, 1000))
					.executes(c -> {
						double v = DoubleArgumentType.getDouble(c, "multiplier");
						DeepWinterConfig.get().debugSpeedMultiplier = v;
						DeepWinterConfig.save();
						c.getSource().sendSuccess(() -> Component.translatable("commands.deepwinter.speed.set", v), true);
						return 1;
					})))
			.then(Commands.literal("snow").executes(c -> snowInfo(c.getSource())))
			.then(TemperatureCommands.temp()));
	}

	private static int snowInfo(CommandSourceStack source) {
		ServerLevel level = source.getLevel();
		BlockPos pos = BlockPos.containing(source.getPosition());
		SnowColumn column = SnowColumn.scan(level, pos.getX(), pos.getZ());
		if (column == null) {
			source.sendFailure(Component.literal("No snow can settle in this column."));
			return 0;
		}
		BlockPos top = new BlockPos(pos.getX(), column.topY(), pos.getZ());
		Biome biome = level.getBiome(top).value();
		source.sendSuccess(() -> Component.literal(String.format(
			"Snow: %d layers (%.2f blocks) on %s [%s] at y=%d in %s (T=%.2f), clear max %d, storm max %d, storm here: %s",
			column.depth, column.depth / 8.0, column.support.getBlock().getName().getString(), column.kind, column.baseY,
			level.getBiome(top).unwrapKey().map(k -> k.identifier().toString()).orElse("?"), SnowClimate.adjustedTemperature(biome, top),
			column.capFor(SnowClimate.clearMaxLayers(biome, top)), column.capFor(SnowClimate.stormMaxLayers(biome, top)),
			StormFlags.appliesTo(biome))), false);
		return column.depth;
	}
}
