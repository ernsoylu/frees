package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** ISO 6358 pneumatic restriction flow law (choked / subsonic / no-flow regimes). */
class PneumaticsTest {

    private static final double C = 1.0e-8;   // sonic conductance [m^3/(s·Pa)]
    private static final double B = 0.3;      // critical pressure ratio
    private static final double P_UP = 600_000.0;
    private static final double T_UP = 293.15; // == T_ANR, so √(T_ANR/T_up) = 1

    @Test
    void chokedFlowAtLowDownstreamPressure() {
        // pr = 100k/600k = 0.167 < b → fully choked: ṁ = C·ρ_ANR·P_up.
        double choked = C * 1.185 * P_UP;
        assertEquals(choked, Pneumatics.iso6358(C, B, P_UP, T_UP, 100_000.0), 1e-9);
    }

    @Test
    void subsonicFlowIsBetweenZeroAndChoked() {
        double choked = Pneumatics.iso6358(C, B, P_UP, T_UP, 100_000.0);
        double sub = Pneumatics.iso6358(C, B, P_UP, T_UP, 480_000.0); // pr = 0.8
        assertTrue(sub > 0.0 && sub < choked, "subsonic flow should be 0 < ṁ < choked, was " + sub);
    }

    @Test
    void noForwardFlowWhenDownstreamGreaterOrEqualUpstream() {
        assertEquals(0.0, Pneumatics.iso6358(C, B, P_UP, T_UP, P_UP), 1e-12);
        assertEquals(0.0, Pneumatics.iso6358(C, B, P_UP, T_UP, P_UP + 1000.0), 1e-12);
    }

    @Test
    void nonPhysicalUpstreamReturnsZeroRatherThanThrow() {
        assertEquals(0.0, Pneumatics.iso6358(C, B, -1.0, T_UP, 100_000.0), 1e-12);
        assertEquals(0.0, Pneumatics.iso6358(C, B, P_UP, 0.0, 100_000.0), 1e-12);
    }

    @Test
    void invalidParametersThrow() {
        assertThrows(PropertyEvaluationException.class,
                () -> Pneumatics.iso6358(-1.0, B, P_UP, T_UP, 100_000.0));
        assertThrows(PropertyEvaluationException.class,
                () -> Pneumatics.iso6358(C, -0.1, P_UP, T_UP, 100_000.0));
        assertThrows(PropertyEvaluationException.class,
                () -> Pneumatics.iso6358(C, 1.0, P_UP, T_UP, 100_000.0));
    }
}
