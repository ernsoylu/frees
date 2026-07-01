package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Two-phase flow correlations: Lockhart–Martinelli/Chisholm, void fractions, Friedel. */
class TwoPhaseTest {

    @Test
    void chisholmMultiplier() {
        // φ_l² = 1 + C/X + 1/X² = 1 + 20/2 + 1/4
        assertEquals(11.25, TwoPhase.lmPhi2(2.0, 20.0), 1e-9);
    }

    @Test
    void chisholmRejectsNonPositiveX() {
        assertThrows(PropertyEvaluationException.class, () -> TwoPhase.lmPhi2(0.0, 20.0));
    }

    @Test
    void martinelliTurbulentTurbulent() {
        // ((1-x)/x)^0.9 · (ρg/ρl)^0.5 · (μl/μg)^0.1
        double xtt = TwoPhase.lmMartinelliTt(0.1, 1000.0, 10.0, 1e-3, 1e-5);
        assertEquals(1.145, xtt, 0.02);
    }

    @Test
    void martinelliValidatesInputs() {
        assertThrows(PropertyEvaluationException.class, () -> TwoPhase.lmMartinelliTt(0.0, 1000, 10, 1e-3, 1e-5));
        assertThrows(PropertyEvaluationException.class, () -> TwoPhase.lmMartinelliTt(1.0, 1000, 10, 1e-3, 1e-5));
        assertThrows(PropertyEvaluationException.class, () -> TwoPhase.lmMartinelliTt(0.1, -1, 10, 1e-3, 1e-5));
    }

    @Test
    void homogeneousVoidFraction() {
        assertEquals(0.990099, TwoPhase.voidHomogeneous(0.5, 1000.0, 10.0), 1e-5);
        assertEquals(0.0, TwoPhase.voidHomogeneous(0.0, 1000.0, 10.0), 0.0);
        assertEquals(1.0, TwoPhase.voidHomogeneous(1.0, 1000.0, 10.0), 0.0);
    }

    @Test
    void ziviVoidFractionIsBelowHomogeneous() {
        double hom = TwoPhase.voidHomogeneous(0.5, 1000.0, 10.0);
        double zivi = TwoPhase.voidZivi(0.5, 1000.0, 10.0);
        assertTrue(zivi < hom && zivi > 0.9, "Zivi void: " + zivi);
        assertEquals(0.0, TwoPhase.voidZivi(-0.1, 1000.0, 10.0), 0.0);
        assertEquals(1.0, TwoPhase.voidZivi(1.0, 1000.0, 10.0), 0.0);
    }

    @Test
    void rouhaniVoidFractionInRange() {
        double a = TwoPhase.voidRouhani(0.5, 1000.0, 10.0, 500.0, 0.02);
        assertTrue(a > 0.85 && a < 0.98, "Rouhani void: " + a);
        assertEquals(0.0, TwoPhase.voidRouhani(0.0, 1000.0, 10.0, 500.0, 0.02), 0.0);
        assertEquals(1.0, TwoPhase.voidRouhani(1.0, 1000.0, 10.0, 500.0, 0.02), 0.0);
    }

    @Test
    void rouhaniValidatesInputs() {
        assertThrows(PropertyEvaluationException.class,
                () -> TwoPhase.voidRouhani(0.5, 1000.0, 10.0, 0.0, 0.02));
        assertThrows(PropertyEvaluationException.class,
                () -> TwoPhase.voidRouhani(0.5, 10.0, 1000.0, 500.0, 0.02)); // ρl <= ρg
    }

    @Test
    void friedelMultiplierIsPositiveAndFinite() {
        double phi2 = TwoPhase.friedelPhi2(0.3, 1000.0, 10.0, 1e-3, 1e-5, 300.0, 0.01, 0.02);
        assertTrue(phi2 > 0.0 && Double.isFinite(phi2), "Friedel φ²: " + phi2);
    }

    @Test
    void friedelValidatesInputs() {
        assertThrows(PropertyEvaluationException.class,
                () -> TwoPhase.friedelPhi2(0.3, 1000.0, 10.0, 1e-3, 1e-5, 300.0, 0.0, 0.02));
    }

    @Test
    void momentumFluxIsPositive() {
        double m = TwoPhase.momentumFlux(0.5, 1000.0, 10.0, 0.9, 200.0);
        assertEquals(1211.1, m, 1.0);
    }
}
