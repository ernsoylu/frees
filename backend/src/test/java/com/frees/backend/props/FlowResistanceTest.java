package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Validates the Phase 0 flow-resistance functions against the Moody chart and
 * textbook hydraulics (Çengel & Cimbala, White).
 */
class FlowResistanceTest {

    @Test
    void laminarFrictionFactorIsExact() {
        // f = 64/Re below the transition.
        assertEquals(0.064, FlowResistance.frictionFactor(1000.0, 0.0), 1e-9);
        assertEquals(64.0 / 2000.0, FlowResistance.frictionFactor(2000.0, 0.05), 1e-9);
    }

    @Test
    void turbulentSmoothPipeMatchesMoody() {
        // Smooth pipe, Re = 1e5: Moody/Colebrook f ~ 0.0180.
        assertEquals(0.0180, FlowResistance.frictionFactor(1e5, 0.0), 5e-4);
        // Smooth pipe, Re = 1e6: f ~ 0.0116.
        assertEquals(0.0116, FlowResistance.frictionFactor(1e6, 0.0), 5e-4);
    }

    @Test
    void turbulentRoughPipeMatchesMoody() {
        // Re = 1e5, eps/D = 0.001: f ~ 0.0221 (Moody chart).
        assertEquals(0.0221, FlowResistance.frictionFactor(1e5, 0.001), 6e-4);
        // Fully rough limit, eps/D = 0.05, high Re: f ~ 0.0716 (von Karman).
        assertEquals(0.0716, FlowResistance.frictionFactor(1e8, 0.05), 1.5e-3);
    }

    @Test
    void frictionFactorIsContinuousAcrossTransition() {
        double justLaminar = FlowResistance.frictionFactor(2299.0, 0.001);
        double justTurbBlend = FlowResistance.frictionFactor(2301.0, 0.001);
        assertTrue(Math.abs(justLaminar - justTurbBlend) < 5e-3,
                "friction factor should be continuous through the transition");
    }

    @Test
    void reynoldsNumber() {
        // Water-like: rho=998, V=2 m/s, D=0.05 m, mu=1.0e-3 -> Re ~ 99800.
        assertEquals(99800.0, FlowResistance.reynolds(998.0, 2.0, 0.05, 1.0e-3), 1.0);
        // Reversed flow uses |V|.
        assertEquals(99800.0, FlowResistance.reynolds(998.0, -2.0, 0.05, 1.0e-3), 1.0);
    }

    @Test
    void minorLoss() {
        // K=1.5 (e.g. a sharp elbow pair), rho=1.2 (air), V=10 m/s -> 90 Pa.
        assertEquals(1.5 * 0.5 * 1.2 * 100.0, FlowResistance.minorLoss(1.5, 1.2, 10.0), 1e-9);
    }
}
