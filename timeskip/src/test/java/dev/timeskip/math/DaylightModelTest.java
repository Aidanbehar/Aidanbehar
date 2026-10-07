package dev.timeskip.math;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class DaylightModelTest {
    @Test
    void darkeningFollowsTheOverworldTimeline() {
        assertEquals(0, DaylightModel.skyDarken(6000));   // noon
        assertEquals(11, DaylightModel.skyDarken(18000)); // midnight: sky light level 4
        assertEquals(0, DaylightModel.skyDarken(133));
        assertTrue(DaylightModel.skyDarken(12850) > 0 && DaylightModel.skyDarken(12850) < 11);
    }

    @Test
    void openSkyPassesLightNineAboutFourSeventhsOfTheDay() {
        // darken = (int)(15 - level) <= 6  <=>  level > 8  <=>  factor > 8/15. The factor falls
        // linearly 1 -> 0.2667 over 11867..13670 and rises over 22330..24133, so the check passes
        // from tick 22986 until tick 13014 the next day: 14028 ticks.
        double fraction = DaylightModel.fractionLit(15, 0, 9, true, 0);
        assertEquals(14_028 / 24_000.0, fraction, 0.0005);
    }

    @Test
    void blockLightAndDarknessEdgeCases() {
        assertEquals(1.0, DaylightModel.fractionLit(0, 9, 9, true, 0));
        assertEquals(0.0, DaylightModel.fractionLit(0, 8, 9, true, 0));
        assertEquals(1.0, DaylightModel.fractionLit(15, 0, 9, false, 0));
        assertEquals(0.0, DaylightModel.fractionLit(15, 0, 9, false, 11));
        assertTrue(DaylightModel.litAt(15, 0, 9, 6000));
        assertTrue(!DaylightModel.litAt(15, 0, 9, 18000));
    }
}
