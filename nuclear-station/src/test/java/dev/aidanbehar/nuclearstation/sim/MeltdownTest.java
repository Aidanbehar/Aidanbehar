package dev.aidanbehar.nuclearstation.sim;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** The meltdown scenario must progress through every severe-accident stage on its own. */
class MeltdownTest {
	@Test
	void extendedBlackoutMeltsTheCoreAndFailsTheVessel() {
		PlantModel m = new PlantModel();
		PlantEnvironment env = PlantModelTest.calm();
		DevHooks.meltdown(m);
		double t = 0;
		double damageAt = -1;
		double meltAt = -1;
		double vesselAt = -1;
		while (t < 24 * 3600 && !m.vesselFailed()) {
			m.step(10, env);
			t += 10;
			if (damageAt < 0 && m.coreDamage() > 0.02) {
				damageAt = t;
			}
			if (meltAt < 0 && m.coreMelt() > 0.1) {
				meltAt = t;
			}
		}
		vesselAt = m.vesselFailed() ? t : -1;
		System.out.printf("meltdown: core damage %.1f h, melt %.1f h, vessel failure %.1f h, H2 %.1f%%%n",
			damageAt / 3600, meltAt / 3600, vesselAt / 3600, m.hydrogenFraction() * 100);
		assertTrue(damageAt > 0, "core damage expected");
		assertTrue(meltAt >= damageAt, "core melt follows damage");
		assertTrue(vesselAt > meltAt, "vessel failure follows melt");
		assertTrue(m.reactorTripped(), "reactor tripped");
		// carry on: concrete attack and containment loading continue after vessel failure
		double releaseBefore = m.totalEnvironmentalRelease();
		for (int i = 0; i < 24 * 360 && !m.basematMeltThrough() && m.containmentIntegrity() > 0.5; i++) {
			m.step(10, env);
		}
		System.out.printf("after vessel failure: integrity %.2f, melt-through %b, release %.3g%n",
			m.containmentIntegrity(), m.basematMeltThrough(), m.totalEnvironmentalRelease());
		assertTrue(m.basematMeltThrough() || m.containmentIntegrity() <= 0.5 || m.totalEnvironmentalRelease() > releaseBefore,
			"the accident keeps progressing after vessel failure");
		// two more days: the spent fuel pool boils dry, but releases stay physically bounded
		for (int i = 0; i < 48 * 360; i++) {
			m.step(10, env);
		}
		System.out.printf("two days later: release %.3g of a core inventory, SFP damage %.2f%n", m.totalEnvironmentalRelease(), m.sfpDamage());
		assertTrue(m.totalEnvironmentalRelease() < 0.7, "release cannot exceed the inventory");
	}
}
