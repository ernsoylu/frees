package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 1 acceptance (ii): a fan–duct flow network. The fan raises pressure
 * along a drooping curve dP(Q); the duct drops it back (Darcy–Colebrook); the
 * operating-point flow is the *solve* — the curve intersection engineers draw
 * by hand — found by the existing Newton solver, not specified by the user.
 *
 * <p>The solved case uses the incompressible {@code FanCurve}/{@code Duct}
 * components (constant density), the textbook fan-duct model, which is well
 * conditioned for plain Newton. The real-fluid {@code Fan}/{@code Pipe}
 * components (CoolProp density/viscosity) are exercised for unit-cleanliness;
 * their robust guess-free convergence across the P≈10⁵ / ṁ≈1 / h≈10⁵ scale
 * span awaits the §8.5 automatic variable scaling (deferred Phase R).
 */
class ComponentNetworksTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** Real-fluid fan-duct (CoolProp): used for the unit-cleanliness check. */
    static final String FAN_DUCT_REAL = """
            // Fan–duct (real air properties)
            P_atm = 101325 [Pa]
            Fan  F1(a, b, dP0=500 [Pa], Q0=0.6 [m^3/s], eta=0.6, fluid$=Air)
            Pipe D1(b, c, L=100 [m], D=0.3 [m], rough=0.000045 [m], fluid$=Air)
            a.P = P_atm
            a.h = Enthalpy(Air, T=293 [K], P=P_atm)
            c.P = P_atm
            """;

    /** Incompressible fan-duct: a well-conditioned operating-point solve. */
    static final String FAN_DUCT = """
            // Fan–duct operating point (incompressible flow network)
            P_atm = 101325 [Pa]

            FanCurve F1(a, b, rho=1.2 [kg/m^3], dP0=500 [Pa], Q0=1.5 [m^3/s])
            Duct     D1(b, c, rho=1.2 [kg/m^3], mu=1.8e-5 [Pa-s], L=100 [m], D=0.3 [m], rough=0.000045 [m])

            a.P = P_atm
            c.P = P_atm
            """;

    @Test
    void fanDuctRealPropertiesDeriveUnitsCleanly() {
        List<String> warnings = solver.checkUnits(FAN_DUCT_REAL, Map.of());
        assertTrue(warnings.isEmpty(), "expected zero unit warnings, got: " + warnings);
    }

    @Test
    void fanDuctDerivesUnitsCleanly() {
        List<String> warnings = solver.checkUnits(FAN_DUCT, Map.of());
        assertTrue(warnings.isEmpty(), "expected zero unit warnings, got: " + warnings);
    }

    @Test
    void fanDuctOperatingPointSolves() {
        EquationSystemSolver.Result r = solver.solve(FAN_DUCT);
        Map<String, Double> v = r.variables();

        double mdot = v.get("a.mdot");
        assertTrue(mdot > 0, "operating mass flow must be positive, got " + mdot);
        // Mass is conserved across the fan and the duct.
        assertEquals(mdot, v.get("b.mdot"), 1e-9);
        assertEquals(mdot, v.get("c.mdot"), 1e-9);
        // The fan raises pressure above atmospheric; the duct brings it back.
        assertTrue(v.get("b.p") > v.get("a.p"), "fan must raise pressure");
        assertEquals(101325.0, v.get("c.p"), 1e-3, "duct outlet returns to atmospheric");
        // The fan pressure rise equals the duct loss at the operating point and
        // sits within the fan's shut-off head (0..dP0 = 500 Pa).
        double fanRise = v.get("b.p") - v.get("a.p");
        assertTrue(fanRise > 0 && fanRise < 500.0, "fan rise within shut-off head, got " + fanRise);
        // The flow is turbulent for this duct.
        assertTrue(v.get("d1.re_d") > 4000.0, "duct flow turbulent, Re = " + v.get("d1.re_d"));
    }
}
