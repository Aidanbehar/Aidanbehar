package dev.aidanbehar.nuclearstation.radiation;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;

/**
 * Per-player radiation record, persisted with the player. Lifetime dose is a permanent
 * record; the acute dose drives radiation sickness and recovers slowly (biological
 * repair, accelerated for gameplay). Contamination is radioactive material on skin and
 * clothing that keeps irradiating the player until it is washed off.
 */
public final class PlayerRadiation {
	public static final Codec<PlayerRadiation> CODEC = RecordCodecBuilder.create(i -> i.group(
		Codec.DOUBLE.optionalFieldOf("lifetime", 0.0).forGetter(PlayerRadiation::lifetimeDose),
		Codec.DOUBLE.optionalFieldOf("acute", 0.0).forGetter(PlayerRadiation::acuteDose),
		Codec.DOUBLE.optionalFieldOf("contamination", 0.0).forGetter(PlayerRadiation::contamination)
	).apply(i, PlayerRadiation::new));

	private double lifetimeDose;
	private double acuteDose;
	private double contamination;
	private transient float lastDoseRate;
	private transient float lastGround;

	public PlayerRadiation() {
	}

	public PlayerRadiation(double lifetime, double acute, double contamination) {
		this.lifetimeDose = lifetime;
		this.acuteDose = acute;
		this.contamination = contamination;
	}

	/** Lifetime effective dose, mSv. */
	public double lifetimeDose() {
		return lifetimeDose;
	}

	/** Recent dose driving deterministic effects, mSv. */
	public double acuteDose() {
		return acuteDose;
	}

	/** Surface contamination on skin and clothing, kBq. */
	public double contamination() {
		return contamination;
	}

	public float lastDoseRate() {
		return lastDoseRate;
	}

	public float lastGround() {
		return lastGround;
	}

	void addDose(double mSv) {
		lifetimeDose += mSv;
		acuteDose += mSv;
	}

	void recover(double seconds, double halfLifeSeconds) {
		acuteDose *= Math.exp(-Math.log(2) * seconds / halfLifeSeconds);
	}

	void addContamination(double kBq) {
		contamination = Math.max(0, contamination + kBq);
	}

	void setContamination(double kBq) {
		contamination = Math.max(0, kBq);
	}

	void setLast(float doseRate, float ground) {
		this.lastDoseRate = doseRate;
		this.lastGround = ground;
	}

	void resetAfterDeath() {
		acuteDose = 0;
		contamination = 0;
	}
}
