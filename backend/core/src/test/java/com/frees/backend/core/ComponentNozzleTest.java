package com.frees.backend.core;

import com.frees.backend.props.CompressibleFlow;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The standard-library {@code Nozzle} (converging–diverging, ideal-gas
 * isentropic expansion). The component treats its inlet stream as the
 * chamber/stagnation state ({@code in.P} = P0), takes the stagnation
 * temperature {@code T0} and the gas {@code (k, R)} as parameters, and reads
 * the supersonic exit Mach off the area ratio — so it is fully algebraic and
 * needs no CoolProp. Expected values are derived from the same
 * {@link CompressibleFlow} relations the component is built on, so the test
 * pins the wiring (forward evaluation through the stream model), not a
 * re-derivation of the physics.
 */
class ComponentNozzleTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void cdNozzleExpandsAndProducesThrust() {
        double k = 1.4;
        double r = 287.0;
        double areaRatio = 4.0;
        double aThroat = 0.01;
        double aExit = aThroat * areaRatio;
        double p0 = 1_000_000.0;
        double t0 = 500.0;
        double mdot = 2.0;
        double hIn = 300_000.0;

        String src = """
                Nozzle N(s_in, s_out, k=1.4, R=287, A_throat=0.01, A_exit=0.04, P_amb=0, T0=500)
                s_in.P    = 1000000
                s_in.mdot = 2
                s_in.h    = 300000
                """;
        Map<String, Double> v = solver.solve(src).variables();

        double mExit = CompressibleFlow.machFromAOverAstar(areaRatio, k, "supersonic");
        double pExit = p0 / CompressibleFlow.p0OverP(mExit, k);
        double tExit = t0 / CompressibleFlow.t0OverT(mExit, k);
        double vExit = mExit * Math.sqrt(k * r * tExit);
        double thrust = mdot * vExit + (pExit - 0.0) * aExit;

        // Supersonic exit off the area ratio (CD nozzle).
        assertEquals(mExit, v.get("n.m_exit"), 1e-6);
        assertTrue(v.get("n.m_exit") > 1.0, "exit must be supersonic");
        // Static exit state from the isentropic relations.
        assertEquals(pExit, v.get("s_out.p"), 1e-3);
        assertEquals(tExit, v.get("n.t_exit"), 1e-6);
        assertEquals(vExit, v.get("n.v_exit"), 1e-6);
        // Stagnation enthalpy conserved: static h drops by the kinetic energy.
        assertEquals(hIn - vExit * vExit / 2.0, v.get("s_out.h"), 1e-6);
        // Mass passes through; thrust is the momentum + pressure term.
        assertEquals(mdot, v.get("s_out.mdot"), 1e-9);
        assertEquals(thrust, v.get("n.thrust"), 1e-6);
        assertTrue(v.get("n.thrust") > 0.0, "vacuum thrust must be positive");
    }
}
