package dev.timeskip.sim.blockentity;

import dev.timeskip.core.SkipStats.Stat;
import dev.timeskip.mixin.AbstractFurnaceBlockEntityAccessor;
import dev.timeskip.mixin.BrewingStandBlockEntityAccessor;
import dev.timeskip.mixin.CampfireBlockEntityAccessor;
import dev.timeskip.mixin.HopperBlockEntityAccessor;
import dev.timeskip.mixin.ItemEntityAccessor;
import dev.timeskip.scheduler.TickBudget;
import dev.timeskip.sim.LevelInfo;
import dev.timeskip.sim.SimContext;
import java.util.ArrayList;
import java.util.List;
import net.minecraft.core.BlockPos;
import net.minecraft.core.NonNullList;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.CampfireCookingRecipe;
import net.minecraft.world.item.crafting.RecipeManager;
import net.minecraft.world.item.crafting.RecipeType;
import net.minecraft.world.item.crafting.SingleRecipeInput;
import net.minecraft.world.level.block.CampfireBlock;
import net.minecraft.world.level.block.entity.AbstractFurnaceBlockEntity;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BrewingStandBlockEntity;
import net.minecraft.world.level.block.entity.CampfireBlockEntity;
import net.minecraft.world.level.block.entity.HopperBlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.chunk.LevelChunk;

/**
 * Furnaces, smokers, blast furnaces, brewing stands, campfires and hoppers.
 *
 * <p>Machines are <em>macro-stepped through vanilla's own tick</em>: we run one real
 * {@code serverTick}, look at what it did, then jump the timers forward to the tick before the next
 * event (item finished, fuel used up, brew done) and let vanilla run that tick too. The game
 * therefore handles recipes, fuel remainders, {@code COOKING_FUEL} speed multipliers, the
 * wet-sponge bucket and recipe XP, while a stack of 64 costs ~130 calls instead of 12,800 ticks.
 *
 * <p>Hoppers feeding machines are settled by alternating passes (hoppers, machines, hoppers, ...),
 * each hopper limited to one transfer cycle per 8 ticks of skipped time. Locked hoppers stay put.
 */
public final class BlockEntitySimulator {
    private static final int ITEM_LIFETIME = 6000;
    private static final int HOPPER_COOLDOWN = 8;
    private static final int MAX_HOPPER_CYCLES_PER_PASS = 64 * 5;
    private static final int MAX_MACHINE_ITERATIONS = 20_000;

    private sealed interface Target permits Machine, Hopper, Campfire {
        LevelInfo info();

        BlockPos pos();
    }

    private static final class Machine implements Target {
        final LevelInfo info;
        final BlockPos pos;
        final boolean brewing;
        long remaining;

        Machine(LevelInfo info, BlockPos pos, boolean brewing, long remaining) {
            this.info = info;
            this.pos = pos;
            this.brewing = brewing;
            this.remaining = remaining;
        }

        @Override
        public LevelInfo info() {
            return info;
        }

        @Override
        public BlockPos pos() {
            return pos;
        }
    }

    private static final class Hopper implements Target {
        final LevelInfo info;
        final BlockPos pos;
        long cycles;

        Hopper(LevelInfo info, BlockPos pos, long cycles) {
            this.info = info;
            this.pos = pos;
            this.cycles = cycles;
        }

        @Override
        public LevelInfo info() {
            return info;
        }

        @Override
        public BlockPos pos() {
            return pos;
        }
    }

    private record Campfire(LevelInfo info, BlockPos pos) implements Target {
    }

    private final SimContext sim;
    private final List<Machine> machines = new ArrayList<>();
    private final List<Hopper> hoppers = new ArrayList<>();
    private final List<Campfire> campfires = new ArrayList<>();
    private final RecipeManager.CachedCheck<SingleRecipeInput, CampfireCookingRecipe> campfireRecipes =
            RecipeManager.createCheck(RecipeType.CAMPFIRE_COOKING);
    private List<Target> schedule;
    private int cursor;

    public BlockEntitySimulator(SimContext sim) {
        this.sim = sim;
    }

    /** Remembers the interesting block entities of a chunk that was just aged (main thread). */
    public void collect(LevelInfo info, LevelChunk chunk) {
        for (BlockEntity blockEntity : chunk.getBlockEntities().values()) {
            BlockPos pos = blockEntity.getBlockPos();
            if (blockEntity instanceof AbstractFurnaceBlockEntity) {
                machines.add(new Machine(info, pos, false, info.ticks));
            } else if (blockEntity instanceof BrewingStandBlockEntity) {
                machines.add(new Machine(info, pos, true, info.ticks));
            } else if (blockEntity instanceof HopperBlockEntity) {
                hoppers.add(new Hopper(info, pos, info.ticks / HOPPER_COOLDOWN));
            } else if (blockEntity instanceof CampfireBlockEntity) {
                campfires.add(new Campfire(info, pos));
            }
        }
    }

    public int total() {
        return schedule == null ? 0 : schedule.size();
    }

    public int done() {
        return cursor;
    }

    /** Does as much work as the budget allows; returns true when finished. */
    public boolean step(TickBudget budget) {
        if (schedule == null) {
            schedule = new ArrayList<>();
            int passes = hoppers.isEmpty() ? 1 : Math.max(1, sim.config.hopperPasses);
            for (int pass = 0; pass < passes; pass++) {
                schedule.addAll(hoppers);
                schedule.addAll(machines);
            }
            if (!hoppers.isEmpty()) {
                schedule.addAll(hoppers);
            }
            schedule.addAll(campfires);
        }
        while (cursor < schedule.size() && budget.hasTime()) {
            Target target = schedule.get(cursor++);
            ServerLevel level = target.info().level;
            if (!level.isLoaded(target.pos())) {
                continue;
            }
            BlockEntity blockEntity = level.getBlockEntity(target.pos());
            switch (target) {
                case Machine machine when blockEntity instanceof AbstractFurnaceBlockEntity furnace -> runFurnace(level, machine, furnace);
                case Machine machine when blockEntity instanceof BrewingStandBlockEntity stand -> runBrewing(level, machine, stand);
                case Hopper hopper when blockEntity instanceof HopperBlockEntity entity -> runHopper(level, hopper, entity);
                case Campfire campfire when blockEntity instanceof CampfireBlockEntity entity -> runCampfire(level, campfire, entity);
                default -> {
                }
            }
        }
        if (cursor >= schedule.size()) {
            finishIdleFurnaces();
            return true;
        }
        return false;
    }

    // --- Furnaces ------------------------------------------------------------------------------

    private void runFurnace(ServerLevel level, Machine machine, AbstractFurnaceBlockEntity furnace) {
        AbstractFurnaceBlockEntityAccessor acc = (AbstractFurnaceBlockEntityAccessor) furnace;
        NonNullList<ItemStack> items = acc.timeskip$getItems();
        BlockPos pos = machine.pos;
        long produced = 0;
        int iterations = 0;
        while (machine.remaining > 0 && iterations++ < MAX_MACHINE_ITERATIONS) {
            int lit0 = acc.timeskip$getLitTimeRemaining();
            int timer0 = acc.timeskip$getCookingTimer();
            int out0 = items.get(2).getCount();
            ItemStack fuel0 = items.get(1).copy();

            AbstractFurnaceBlockEntity.serverTick(level, pos, level.getBlockState(pos), furnace);
            machine.remaining--;

            int lit = acc.timeskip$getLitTimeRemaining();
            int timer = acc.timeskip$getCookingTimer();
            int out = items.get(2).getCount();
            if (out > out0) {
                produced += out - out0;
            }
            // Cooking advances (or rescales, on ignition with a new fuel speed) the timer, or finishes an item.
            boolean cooking = (timer > 0 && timer != timer0) || out > out0;
            if (lit > 0 && cooking) {
                int total = acc.timeskip$getCookingTotalTime();
                long jump = Math.min(Math.min(total - timer, lit) - 1L, machine.remaining - 1);
                if (jump > 0) {
                    acc.timeskip$setLitTimeRemaining((int) (lit - jump));
                    acc.timeskip$setCookingTimer((int) (timer + jump));
                    machine.remaining -= jump;
                }
            } else if (lit > 0) {
                long jump = Math.min(lit - 1L, machine.remaining - 1);
                if (jump > 0) {
                    acc.timeskip$setLitTimeRemaining((int) (lit - jump));
                    machine.remaining -= jump;
                }
            } else if (lit0 == 0 && ItemStack.matches(fuel0, items.get(1)) && out == out0) {
                // Unlit and could not light: idle until something new arrives (hoppers may refill it).
                machine.remaining++;
                break;
            }
        }
        if (produced > 0) {
            sim.stats.add(Stat.ITEMS_SMELTED, produced);
        }
        furnace.setChanged();
    }

    /** An unlit furnace's progress bar decays two ticks per tick for the idle rest of the skip. */
    private void finishIdleFurnaces() {
        for (Machine machine : machines) {
            if (machine.brewing || machine.remaining <= 0) {
                continue;
            }
            ServerLevel level = machine.info.level;
            if (level.isLoaded(machine.pos) && level.getBlockEntity(machine.pos) instanceof AbstractFurnaceBlockEntity furnace) {
                AbstractFurnaceBlockEntityAccessor acc = (AbstractFurnaceBlockEntityAccessor) furnace;
                int timer = acc.timeskip$getCookingTimer();
                if (acc.timeskip$getLitTimeRemaining() == 0 && timer > 0) {
                    acc.timeskip$setCookingTimer((int) Math.max(0, timer - 2 * Math.min(machine.remaining, Integer.MAX_VALUE)));
                    furnace.setChanged();
                }
            }
        }
    }

    // --- Brewing stands ------------------------------------------------------------------------

    private void runBrewing(ServerLevel level, Machine machine, BrewingStandBlockEntity stand) {
        BrewingStandBlockEntityAccessor acc = (BrewingStandBlockEntityAccessor) stand;
        BlockPos pos = machine.pos;
        int iterations = 0;
        while (machine.remaining > 0 && iterations++ < MAX_MACHINE_ITERATIONS) {
            int before = acc.timeskip$getBrewTime();
            BrewingStandBlockEntity.serverTick(level, pos, level.getBlockState(pos), stand);
            machine.remaining--;
            int after = acc.timeskip$getBrewTime();
            if (before == 1 && after == 0) {
                sim.stats.inc(Stat.POTIONS_BREWED);
            }
            if (after > 1) {
                long jump = Math.min(after - 1L, machine.remaining - 1);
                if (jump > 0) {
                    acc.timeskip$setBrewTime((int) (after - jump));
                    machine.remaining -= jump;
                }
            } else if (before == 0 && after == 0) {
                machine.remaining++;
                break; // nothing to brew right now
            }
        }
        stand.setChanged();
    }

    // --- Hoppers -------------------------------------------------------------------------------

    private void runHopper(ServerLevel level, Hopper hopper, HopperBlockEntity entity) {
        HopperBlockEntityAccessor acc = (HopperBlockEntityAccessor) entity;
        long cycles = Math.min(hopper.cycles, MAX_HOPPER_CYCLES_PER_PASS);
        long moved = 0;
        for (long i = 0; i < cycles; i++) {
            acc.timeskip$setCooldownTime(0);
            HopperBlockEntity.pushItemsTick(level, hopper.pos, level.getBlockState(hopper.pos), entity);
            if (acc.timeskip$getCooldownTime() != HOPPER_COOLDOWN) {
                break; // nothing moved: chain is settled for now
            }
            moved++;
        }
        hopper.cycles -= moved;
        acc.timeskip$setCooldownTime(0);
        sim.stats.add(Stat.HOPPER_ITEMS, moved);
    }

    // --- Campfires -----------------------------------------------------------------------------

    private void runCampfire(ServerLevel level, Campfire campfire, CampfireBlockEntity entity) {
        CampfireBlockEntityAccessor acc = (CampfireBlockEntityAccessor) entity;
        NonNullList<ItemStack> items = acc.timeskip$getItems();
        int[] progress = acc.timeskip$getCookingProgress();
        int[] cookTime = acc.timeskip$getCookingTime();
        BlockState state = level.getBlockState(campfire.pos);
        boolean lit = state.hasProperty(CampfireBlock.LIT) && state.getValue(CampfireBlock.LIT);
        long ticks = campfire.info.ticks;
        boolean changed = false;
        for (int slot = 0; slot < items.size(); slot++) {
            ItemStack stack = items.get(slot);
            if (stack.isEmpty()) {
                continue;
            }
            if (!lit) {
                progress[slot] = (int) Math.max(0, progress[slot] - 2 * Math.min(ticks, Integer.MAX_VALUE));
                changed = true;
                continue;
            }
            long needed = Math.max(0, cookTime[slot] - progress[slot]);
            if (ticks < needed) {
                progress[slot] += (int) ticks;
                changed = true;
                continue;
            }
            SingleRecipeInput input = new SingleRecipeInput(stack);
            ItemStack result = campfireRecipes.getRecipeFor(input, level).map(r -> r.value().assemble(input)).orElse(stack);
            items.set(slot, ItemStack.EMPTY);
            changed = true;
            sim.stats.inc(Stat.CAMPFIRE_COOKED);
            long sinceDropped = ticks - needed;
            if (sinceDropped >= ITEM_LIFETIME) {
                sim.stats.inc(Stat.ITEMS_DESPAWNED);
                continue;
            }
            ItemEntity drop = new ItemEntity(level, campfire.pos.getX() + 0.5, campfire.pos.getY() + 1.0, campfire.pos.getZ() + 0.5, result);
            ((ItemEntityAccessor) drop).timeskip$setAge((int) sinceDropped);
            sim.markNewborn(drop.getUUID());
            level.addFreshEntity(drop);
        }
        if (changed) {
            entity.setChanged();
            level.sendBlockUpdated(campfire.pos, state, state, 3);
        }
    }
}
