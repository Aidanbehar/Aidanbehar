package com.deepwinter.command;

import com.deepwinter.temperature.BodyTemperature;
import com.deepwinter.temperature.TemperatureBreakdown;
import com.deepwinter.temperature.TemperatureFormat;
import com.mojang.brigadier.builder.LiteralArgumentBuilder;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;

/** /deepwinter temp [entity]: exact numbers, for debugging. */
final class TemperatureCommands {
	private TemperatureCommands() {
	}

	static LiteralArgumentBuilder<CommandSourceStack> temp() {
		return Commands.literal("temp")
			.executes(c -> show(c.getSource(), c.getSource().getEntityOrException()))
			.then(Commands.argument("target", EntityArgument.entity())
				.executes(c -> show(c.getSource(), EntityArgument.getEntity(c, "target"))));
	}

	private static int show(CommandSourceStack source, Entity entity) {
		if (!(entity instanceof LivingEntity living)) {
			source.sendFailure(Component.literal("Not a living entity."));
			return 0;
		}
		TemperatureBreakdown t = BodyTemperature.refresh(living);
		BodyTemperature.State s = BodyTemperature.state(living);
		source.sendSuccess(() -> Component.translatable("commands.deepwinter.temp",
			living.getDisplayName(),
			TemperatureFormat.exact(t.ambient()), TemperatureFormat.exact(t.felt()), TemperatureFormat.exact(s.body()),
			living.getTicksFrozen(), s.freezing() ? "yes" : "no"), false);
		for (Component line : TemperatureFormat.breakdownLines(t)) {
			source.sendSuccess(() -> line, false);
		}
		return Math.round(s.body());
	}
}
