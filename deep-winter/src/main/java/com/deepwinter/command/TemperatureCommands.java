package com.deepwinter.command;

import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;

final class TemperatureCommands {
	private TemperatureCommands() {
	}

	static LiteralArgumentBuilder<CommandSourceStack> temp() {
		return Commands.literal("temp").executes(c -> 0);
	}
}
