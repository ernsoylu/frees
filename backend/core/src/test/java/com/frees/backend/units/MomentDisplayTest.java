package com.frees.backend.units;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * A torque written as N-m is dimensionally a joule (kg·m²·s⁻²), but engineers
 * expect the moment spelling preserved — the same intent-preservation already
 * applied to rad/s vs Hz. The explicit-multiply form N*m is read as a product
 * and still reduces to J.
 */
class MomentDisplayTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static final double[] MOMENT = {1, 2, -2, 0, 0, 0, 0};

    @Test
    void newtonMetreSpellingsStayNm() {
        assertEquals("N-m", UnitRegistry.siDisplayName("N-m", MOMENT));
        assertEquals("N-m", UnitRegistry.siDisplayName("N m", MOMENT));
        assertEquals("N-m", UnitRegistry.siDisplayName("newton-meter", MOMENT));
    }

    @Test
    void explicitProductAndPlainJouleStayJoule() {
        // N*m is an explicit product → reduces to J, per the user's distinction.
        assertEquals("J", UnitRegistry.siDisplayName("N*m", MOMENT));
        assertEquals("J", UnitRegistry.siDisplayName("J", MOMENT));
        // A bare derived energy (no annotation) is still J.
        assertEquals("J", UnitRegistry.siName(MOMENT));
    }

    @Test
    void declaredTorqueVariableDisplaysAsNm() {
        // End to end: a declared torque keeps N-m; energy via N*m collapses to J.
        assertEquals("N-m", solver.inferUnits("A = 250 [N-m]").get("A"));
        assertEquals("J", solver.inferUnits("E = 250 [N*m]").get("E"));
    }
}
