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

    /**
     * Air-standard Brayton cycle from components, flowing real air properties
     * (CoolProp) through compressor → combustor (Boiler) → turbine.
     * r_p = 10, T1 = 300 K, T3 = 1400 K, eta_c = 0.82, eta_t = 0.85.
     */
    static final String BRAYTON_COMPONENTS = """
            // Brayton Cycle — built from standard components
            P1 = 100000 [Pa]
            P2 = 1000000 [Pa]
            T_in  = 300 [K]
            T_fire = 1400 [K]

            Compressor C1(s1, s2, eta=0.82, fluid$=Air)
            Boiler     B1(s2, s3)
            Turbine    T1(s3, s4, eta=0.85, fluid$=Air)

            s1.P    = P1
            s1.h    = Enthalpy(Air, T=T_in, P=P1)
            s1.mdot = 1 [kg/s]
            s2.P    = P2
            s3.h    = Enthalpy(Air, T=T_fire, P=P2)
            s4.P    = P1

            eta_th = (T1.W - C1.W) / B1.Q
            """;

    /**
     * Vapor-compression refrigeration (R134a) from components: an open chain
     * evaporator-outlet → compressor → condenser → throttle. T_evap = -10 C,
     * T_cond = 40 C, eta_comp = 0.80.
     */
    static final String REFRIGERATION_COMPONENTS = """
            // Vapor-Compression Refrigeration — built from standard components
            T_evap = 263.15 [K]
            T_cond = 313.15 [K]

            Compressor K1(s1, s2, eta=0.80, fluid$=R134a)
            Condenser  C1(s2, s3)
            Throttle   V1(s3, s4)

            P_lo = P_sat(R134a, T=T_evap)
            P_hi = P_sat(R134a, T=T_cond)

            s1.P    = P_lo
            s1.h    = Enthalpy(R134a, T=T_evap, x=1)   { saturated vapor leaving evaporator }
            s1.mdot = 1 [kg/s]
            s2.P    = P_hi
            s3.h    = Enthalpy(R134a, P=P_hi, x=0)     { saturated liquid leaving condenser }
            s4.P    = P_lo

            q_L = s1.h - s4.h            { refrigeration effect }
            COP = q_L / K1.W
            """;

    /**
     * Same Rankine, but the inlet/turbine states are given as <em>derived</em>
     * properties (quality x, temperature T) instead of explicit Enthalpy(...)
     * calls — the expander rewrites s.x / s.T to CoolProp calls on the stream's
     * (P, h), and the solver inverts them. The stream's fluid is inferred from
     * the attached components.
     */
    static final String RANKINE_DERIVED = """
            // Rankine — states given as derived properties (s.x, s.T)
            P_hi = 8000000 [Pa]
            P_lo = 10000 [Pa]

            Pump      P1(s1, s2, eta=0.80, fluid$=Water)
            Boiler    B1(s2, s3)
            Turbine   T1(s3, s4, eta=0.85, fluid$=Water)
            Condenser C1(s4, s5)

            s1.P    = P_lo
            s1.x    = 0              { saturated liquid — derived property }
            s1.mdot = 1 [kg/s]
            s2.P    = P_hi
            s3.T    = 753.15 [K]     { superheated steam — derived property }
            s4.P    = P_lo
            s5.x    = 0

            eta_th = (T1.W - P1.W) / B1.Q
            """;

    @Test
    void rankineWithDerivedPropertyBoundariesSolves() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        List<String> warnings = solver.checkUnits(RANKINE_DERIVED, Map.of());
        assertTrue(warnings.isEmpty(), "expected zero unit warnings, got: " + warnings);

        // Derived-property boundaries (s.x, s.T) make each stream enthalpy an
        // *implicit* unknown the solver finds by inverting Quality/Temperature.
        // This no longer needs a manual seed: §8.5/§8.7 solver work — property-
        // argument seeding (valid base point) + the prop$-scoped univariate
        // bracketing fallback (crosses the two-phase dome where dT/dh≈0) —
        // resolves every per-stream inversion from a plain default guess, even
        // for s1/s5 (saturated liquid, on the dome) and s3 (superheated, above
        // it). The whole coupled cycle solves seed-free.
        double eta = solver.solve(RANKINE_DERIVED).variables().get("eta_th");
        assertTrue(eta > 0.30 && eta < 0.45, "Rankine thermal efficiency ~0.35, got " + eta);
    }

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

    @Test
    void braytonComponentsDeriveUnitsCleanly() {
        List<String> warnings = solver.checkUnits(BRAYTON_COMPONENTS, Map.of());
        assertTrue(warnings.isEmpty(), "expected zero unit warnings, got: " + warnings);
    }

    @Test
    void braytonComponentsSolve() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        EquationSystemSolver.Result r = solver.solve(BRAYTON_COMPONENTS);
        double eta = r.variables().get("eta_th");
        assertTrue(eta > 0.20 && eta < 0.45, "Brayton thermal efficiency, got " + eta);
        assertTrue(r.variables().get("t1.w") > r.variables().get("c1.w"),
                "turbine work exceeds compressor work");
    }

    @Test
    void refrigerationComponentsDeriveUnitsCleanly() {
        List<String> warnings = solver.checkUnits(REFRIGERATION_COMPONENTS, Map.of());
        assertTrue(warnings.isEmpty(), "expected zero unit warnings, got: " + warnings);
    }

    @Test
    void refrigerationComponentsSolve() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        EquationSystemSolver.Result r = solver.solve(REFRIGERATION_COMPONENTS);
        double cop = r.variables().get("COP");
        assertTrue(cop > 2.0 && cop < 7.0, "VCR COP in a sane range, got " + cop);
        assertTrue(r.variables().get("q_L") > 0, "refrigeration effect positive");
    }
}
