package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase T3 — single-phase / boiling / condensing Nusselt correlations and the
 * §4.8 zone-collapse ramp. Pure-Java reference and sanity checks.
 */
class ConvectiveHeatTest {

    @Test
    void dittusBoelterReference() {
        // 0.023 · 10000^0.8 · 4^0.4 ≈ 63.5
        assertEquals(63.5, ConvectiveHeat.dittusBoelter(10000, 4, 0.4), 0.5);
    }

    @Test
    void gnielinskiNearDittusBoelter() {
        double g = ConvectiveHeat.gnielinski(10000, 4);
        assertEquals(64.0, g, 2.0);
        // both correlations agree to within ~15% in their common range
        double db = ConvectiveHeat.dittusBoelter(10000, 4, 0.4);
        assertTrue(Math.abs(g - db) / db < 0.15, "Gnielinski vs Dittus-Boelter: " + g + " vs " + db);
    }

    @Test
    void chenFactors() {
        assertTrue(ConvectiveHeat.chenF(0.1) > 1.0, "convective enhancement at low X_tt");
        assertEquals(1.0, ConvectiveHeat.chenF(20.0), 0.0, "F→1 when 1/X_tt ≤ 0.1");
        double s = ConvectiveHeat.chenS(10000, 5.0);
        assertTrue(s > 0 && s < 1, "suppression factor in (0,1): " + s);
    }

    @Test
    void shahEnhancesLiquidOnly() {
        double reL = 50000;
        double prL = 3;
        double nuL = 0.023 * Math.pow(reL, 0.8) * Math.pow(prL, 0.4);
        double shah = ConvectiveHeat.shah(reL, prL, 0.5, 0.2);
        assertTrue(shah > nuL, "condensing Nu exceeds liquid-only: " + shah + " > " + nuL);
    }

    @Test
    void cavalliniGrowsWithQuality() {
        double lo = ConvectiveHeat.cavalliniZecchin(50000, 3, 0.3, 1100, 40);
        double hi = ConvectiveHeat.cavalliniZecchin(50000, 3, 0.7, 1100, 40);
        assertTrue(hi > lo && lo > 0, "Cavallini Nu grows with vapor quality");
    }

    @Test
    void zoneRampCollapsesSmoothly() {
        assertEquals(0.0, ConvectiveHeat.zoneRamp(0.0, 1e-3), 0.0);
        assertTrue(ConvectiveHeat.zoneRamp(1e-3, 1e-3) > 0.7, "≈tanh(1) at L=ε");
        assertTrue(ConvectiveHeat.zoneRamp(1e-2, 1e-3) > 0.99, "→1 for a healthy zone");
    }
}
