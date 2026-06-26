package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase 1 milestone: a thermodynamic cycle built from the standard component
 * library (Pump/Boiler/Turbine/Condenser) instead of hand-written equations
 * must solve end-to-end and reproduce the canonical hand-written cycle's
 * numbers, with zero unit warnings. This proves the component layer flows real
 * CoolProp physics through the existing Newton/Tarjan solver unchanged.
 */
class ComponentCyclesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /**
     * Ideal-ish Rankine cycle as an open component chain (the standard way to
     * avoid the structural mass-balance redundancy of a closed loop): the pump
     * inlet state is specified directly and equals the condenser outlet state by
     * the physics. Mirrors the validated hand-written RANKINE example
     * (P_hi = 8 MPa, P_lo = 10 kPa, T3 = 480 C, eta_t = 0.85, eta_p = 0.80).
     */
    static final String RANKINE_COMPONENTS = """
            // Rankine Cycle — built from standard components
            P_hi = 8000000 [Pa]
            P_lo = 10000 [Pa]
            T_hot = 753.15 [K]

            Pump      P1(s1, s2, eta=0.80, fluid$=Water)
            Boiler    B1(s2, s3)
            Turbine   T1(s3, s4, eta=0.85, fluid$=Water)
            Condenser C1(s4, s5)

            s1.P    = P_lo
            s1.h    = Enthalpy(Water, P=P_lo, x=0)   { saturated liquid into the pump }
            s1.mdot = 1 [kg/s]
            s2.P    = P_hi
            s3.h    = Enthalpy(Water, P=P_hi, T=T_hot) { superheated steam into the turbine }
            s4.P    = P_lo
            s5.h    = Enthalpy(Water, P=P_lo, x=0)

            eta_th = (T1.W - P1.W) / B1.Q
            """;

    @Test
    void rankineComponentsDeriveUnitsCleanly() {
        List<String> warnings = solver.checkUnits(RANKINE_COMPONENTS, Map.of());
        assertTrue(warnings.isEmpty(), "expected zero unit warnings, got: " + warnings);
    }

    @Test
    void rankineComponentsSolve() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        EquationSystemSolver.Result r = solver.solve(RANKINE_COMPONENTS);
        Map<String, Double> v = r.variables();

        // Thermal efficiency matches the hand-written Rankine example (~0.35).
        double eta = v.get("eta_th");
        assertTrue(eta > 0.30 && eta < 0.45, "Rankine thermal efficiency ~0.35, got " + eta);

        // Mass flow is conserved through the whole chain.
        for (String s : List.of("s1", "s2", "s3", "s4", "s5")) {
            assertEquals(1.0, v.get(s + ".mdot"), 1e-9, s + " mass flow");
        }
        // Boiler heat input and net work are positive and physically ordered.
        assertTrue(v.get("b1.q") > 0, "boiler duty positive");
        assertTrue(v.get("t1.w") > v.get("p1.w"), "turbine work exceeds pump work");
    }
}
