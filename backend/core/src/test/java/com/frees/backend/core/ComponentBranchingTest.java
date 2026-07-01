package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Branching topologies (the node-resolution capability of Phase 1): a Splitter
 * divides one stream into two (common P/h, split ṁ), a Mixer joins two into one
 * (flow-weighted enthalpy balance), and a two-stream HeatExchanger couples two
 * fluid circuits through a shared duty. Splitter/Mixer cases are pure algebra
 * (no CoolProp).
 */
class ComponentBranchingTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void mixerDoesFlowWeightedEnthalpyBalance() {
        String src = """
                Mixer M1(s1, s2, s3)
                s1.P = 200000;   s1.mdot = 2;   s1.h = 100000
                s2.P = 200000;   s2.mdot = 3;   s2.h = 50000
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(5.0, v.get("s3.mdot"), 1e-9);
        assertEquals(200000.0, v.get("s3.p"), 1e-6);
        // (2*100000 + 3*50000) / 5 = 70000
        assertEquals(70000.0, v.get("s3.h"), 1e-6);
    }

    @Test
    void splitterConservesMassAndCarriesState() {
        String src = """
                Splitter SP(s1, s2, s3)
                s1.P = 300000;   s1.mdot = 5;   s1.h = 80000
                s2.mdot = 2
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(3.0, v.get("s3.mdot"), 1e-9);   // 5 - 2
        assertEquals(80000.0, v.get("s2.h"), 1e-6);
        assertEquals(80000.0, v.get("s3.h"), 1e-6);
        assertEquals(300000.0, v.get("s2.p"), 1e-6);
    }

    /** Split a stream into two parallel paths and re-mix them: ṁ and energy close. */
    @Test
    void splitThenMixClosesMassAndEnergy() {
        String src = """
                Splitter SP(s1, s2, s3)
                Mixer    MX(s2, s3, s4)
                s1.P = 100000;   s1.mdot = 4;   s1.h = 60000
                s2.mdot = 1.5
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(4.0, v.get("s4.mdot"), 1e-9);   // 1.5 + 2.5
        assertEquals(60000.0, v.get("s4.h"), 1e-6);  // both branches carry h = 60000
    }

    @Test
    void heatExchangerCouplesTwoCircuits() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                HeatExchanger HX(h_in, h_out, c_in, c_out, UA=5000 [W/K], hot$=Water, cold$=Water, arr$=counterflow)
                h_in.P = 200000 [Pa];   h_in.mdot = 2 [kg/s]
                h_in.h = Enthalpy(Water, T=350 [K], P=200000 [Pa])
                c_in.P = 200000 [Pa];   c_in.mdot = 3 [kg/s]
                c_in.h = Enthalpy(Water, T=290 [K], P=200000 [Pa])
                """;
        List<String> warnings = solver.checkUnits(src, Map.of());
        assertTrue(warnings.isEmpty(), "expected zero unit warnings, got: " + warnings);

        Map<String, Double> v = solver.solve(src).variables();
        double q = v.get("hx.q");
        // ε-NTU hand calc: Cmin≈8.36 kW/K, NTU≈0.6, Cr≈0.67, eps≈0.40 -> Q≈200 kW.
        assertTrue(q > 170000 && q < 230000, "HX duty ~200 kW, got " + q);
        // Hot stream gives up heat, cold stream takes it; energy balances.
        assertTrue(v.get("h_out.h") < v.get("h_in.h"), "hot stream cooled");
        assertTrue(v.get("c_out.h") > v.get("c_in.h"), "cold stream heated");
        assertEquals(2.0 * (v.get("h_in.h") - v.get("h_out.h")),
                3.0 * (v.get("c_out.h") - v.get("c_in.h")), 1.0, "energy balance");
    }
}
