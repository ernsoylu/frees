package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase T0 — the two-phase constitutive correlations (void fraction, Friedel
 * multiplier, momentum flux). Pure-Java reference/sanity checks, CoolProp-free.
 */
class TwoPhaseCorrelationsTest {

    @Test
    void homogeneousVoidFraction() {
        // α = 1/(1 + ((1-x)/x)(ρg/ρl)); x=0.5, ρl=1000, ρg=10 → 1/1.01
        assertEquals(1.0 / 1.01, TwoPhase.voidHomogeneous(0.5, 1000, 10), 1e-9);
        assertEquals(0.0, TwoPhase.voidHomogeneous(0.0, 1000, 10), 0.0);
        assertEquals(1.0, TwoPhase.voidHomogeneous(1.0, 1000, 10), 0.0);
    }

    @Test
    void ziviVoidIsBelowHomogeneous() {
        // Zivi slip S=(ρl/ρg)^(1/3) reduces the void fraction vs no-slip.
        double zivi = TwoPhase.voidZivi(0.5, 1000, 10);
        double homo = TwoPhase.voidHomogeneous(0.5, 1000, 10);
        assertEquals(0.955646, zivi, 1e-5);
        assertTrue(zivi < homo, "Zivi void < homogeneous void");
    }

    @Test
    void rouhaniDriftFluxVoidFraction() {
        // Reference hand-calc: x=0.5, ρl=1000, ρg=10, G=200, σ=0.02 → α≈0.928
        double a = TwoPhase.voidRouhani(0.5, 1000, 10, 200, 0.02);
        assertEquals(0.928, a, 0.01);
        assertTrue(a > 0 && a < 1);
        assertEquals(0.0, TwoPhase.voidRouhani(0.0, 1000, 10, 200, 0.02), 0.0);
        assertEquals(1.0, TwoPhase.voidRouhani(1.0, 1000, 10, 200, 0.02), 0.0);
    }

    @Test
    void friedelMultiplierExceedsLiquidOnly() {
        double phi2 = TwoPhase.friedelPhi2(0.3, 1000, 10, 1e-3, 1e-5, 300, 0.01, 0.02);
        assertTrue(phi2 > 1.0, "two-phase drop exceeds the liquid-only drop: " + phi2);
        // more vapor -> larger multiplier (toward mid-quality)
        double phi2More = TwoPhase.friedelPhi2(0.6, 1000, 10, 1e-3, 1e-5, 300, 0.01, 0.02);
        assertTrue(phi2More > phi2, "multiplier grows with quality");
    }

    @Test
    void momentumFluxEndpoints() {
        // all-liquid: G²/ρl ; all-vapor: G²/ρg (≫ liquid). G=200.
        assertEquals(200.0 * 200.0 / 1000.0, TwoPhase.momentumFlux(0.0, 1000, 10, 0.0, 200), 1e-3);
        assertEquals(200.0 * 200.0 / 10.0, TwoPhase.momentumFlux(1.0, 1000, 10, 1.0, 200), 1e-2);
    }
}
