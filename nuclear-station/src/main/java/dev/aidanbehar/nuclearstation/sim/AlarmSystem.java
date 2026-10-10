package dev.aidanbehar.nuclearstation.sim;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Annunciator logic. An alarm is driven by a condition each step. New alarms flash
 * (unacknowledged) and sound the horn; acknowledged alarms stay lit while the
 * condition is present; cleared-but-unacknowledged alarms remain "ringback" until
 * reset. Every state change is written to the event log.
 */
public final class AlarmSystem {
	public static final int LOG_CAPACITY = 120;

	public enum State {
		/** Window dark. */
		CLEAR,
		/** Condition present, not yet acknowledged (flashing). */
		NEW,
		/** Condition present, acknowledged (steady). */
		ACKNOWLEDGED,
		/** Condition gone but operator has not reset the window. */
		RINGBACK
	}

	public record LogEntry(double time, int priority, String text) {
	}

	/** Seconds a condition must persist before the window changes state (debounce). */
	static final double ON_DELAY = 1.0;
	static final double OFF_DELAY = 4.0;

	private final Map<AlarmId, State> states = new EnumMap<>(AlarmId.class);
	private final Map<AlarmId, Double> conditionSince = new EnumMap<>(AlarmId.class);
	private final Map<AlarmId, Boolean> lastCondition = new EnumMap<>(AlarmId.class);
	private final Deque<LogEntry> log = new ArrayDeque<>();
	private boolean hornSilenced;

	public AlarmSystem() {
		for (AlarmId id : AlarmId.values()) {
			states.put(id, State.CLEAR);
		}
	}

	public void update(AlarmId id, boolean rawCondition, double time) {
		Boolean previous = lastCondition.get(id);
		if (previous == null || previous != rawCondition) {
			lastCondition.put(id, rawCondition);
			conditionSince.put(id, time);
		}
		double held = time - conditionSince.getOrDefault(id, time);
		State s = states.get(id);
		boolean lit = s == State.NEW || s == State.ACKNOWLEDGED;
		boolean condition;
		if (rawCondition) {
			condition = lit || held >= ON_DELAY || id.priority == 1 && id.category == AlarmId.Category.PROTECTION;
		} else {
			condition = lit && held < OFF_DELAY;
		}
		if (condition) {
			if (s == State.CLEAR || s == State.RINGBACK) {
				states.put(id, State.NEW);
				hornSilenced = false;
				log(time, id.priority, "ALARM  " + id.text);
			}
		} else if (s == State.NEW || s == State.ACKNOWLEDGED) {
			states.put(id, State.RINGBACK);
			log(time, 3, "CLEAR  " + id.text);
		}
	}

	public void acknowledgeAll() {
		for (Map.Entry<AlarmId, State> e : states.entrySet()) {
			if (e.getValue() == State.NEW) {
				e.setValue(State.ACKNOWLEDGED);
			}
		}
		hornSilenced = true;
	}

	public void resetCleared() {
		for (Map.Entry<AlarmId, State> e : states.entrySet()) {
			if (e.getValue() == State.RINGBACK) {
				e.setValue(State.CLEAR);
			}
		}
	}

	public void silenceHorn() {
		hornSilenced = true;
	}

	public boolean hornActive() {
		if (hornSilenced) {
			return false;
		}
		for (Map.Entry<AlarmId, State> e : states.entrySet()) {
			if (e.getValue() == State.NEW && e.getKey().priority <= 2) {
				return true;
			}
		}
		return false;
	}

	public State state(AlarmId id) {
		return states.get(id);
	}

	public boolean active(AlarmId id) {
		State s = states.get(id);
		return s == State.NEW || s == State.ACKNOWLEDGED;
	}

	/** Highest priority (lowest number) of any active alarm, or 4 if none. */
	public int worstActivePriority() {
		int worst = 4;
		for (Map.Entry<AlarmId, State> e : states.entrySet()) {
			if ((e.getValue() == State.NEW || e.getValue() == State.ACKNOWLEDGED) && e.getKey().priority < worst) {
				worst = e.getKey().priority;
			}
		}
		return worst;
	}

	public void log(double time, int priority, String text) {
		log.addLast(new LogEntry(time, priority, text));
		while (log.size() > LOG_CAPACITY) {
			log.removeFirst();
		}
	}

	public List<LogEntry> recentLog(int max) {
		List<LogEntry> all = new ArrayList<>(log);
		int from = Math.max(0, all.size() - max);
		return all.subList(from, all.size());
	}

	void save(StateIO.Writer w) {
		StateIO.Writer s = w.child("states");
		for (Map.Entry<AlarmId, State> e : states.entrySet()) {
			if (e.getValue() != State.CLEAR) {
				s.putString(e.getKey().name(), e.getValue().name());
			}
		}
		w.putBoolean("silenced", hornSilenced);
		StateIO.Writer l = w.child("log");
		int i = 0;
		for (LogEntry entry : log) {
			StateIO.Writer e = l.child(Integer.toString(i++));
			e.putDouble("t", entry.time());
			e.putInt("p", entry.priority());
			e.putString("m", entry.text());
		}
		l.putInt("size", i);
	}

	void load(StateIO.Reader r) {
		StateIO.Reader s = r.child("states");
		for (AlarmId id : AlarmId.values()) {
			String v = s.getString(id.name(), "CLEAR");
			try {
				states.put(id, State.valueOf(v));
			} catch (IllegalArgumentException ex) {
				states.put(id, State.CLEAR);
			}
		}
		hornSilenced = r.getBoolean("silenced", false);
		log.clear();
		StateIO.Reader l = r.child("log");
		int size = l.getInt("size", 0);
		for (int i = 0; i < size; i++) {
			StateIO.Reader e = l.child(Integer.toString(i));
			log.addLast(new LogEntry(e.getDouble("t", 0), e.getInt("p", 3), e.getString("m", "")));
		}
	}
}
