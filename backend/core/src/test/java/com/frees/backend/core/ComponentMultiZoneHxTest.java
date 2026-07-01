package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase 6 — a multi-zone heat exchanger built as a hierarchical subsystem: two
 * ε-NTU cells in counterflow (hot through C1→C2, cold through C2→C1), with the
 * subsystem's UA/fluids passed into each cell. Demonstrates the discretized-HX
 * pattern on the subsystem + parameter-passing machinery. CoolProp-gated.
 */
class ComponentMultiZoneHxTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void twoZoneCounterflowHxTransfersHeatEnergyBalanced() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        // Hot and cold water streams; enthalpies set directly (forward, no
        // inversion) so the cells evaluate cleanly.
        String src = """
                h_hot_in = Enthalpy(Water, P=200000, T=350)
                h_cold_in = Enthalpy(Water, P=200000, T=290)
                TwoZoneHX HX(h1, h2, c1, c2, UA=2000, hot$=Water, cold$=Water, arr$=counterflow)
                h1.P = 200000
                h1.h = h_hot_in
                h1.mdot = 0.5
                c1.P = 200000
                c1.h = h_cold_in
                c1.mdot = 0.5
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double qHot = 0.5 * (v.get("h1.h") - v.get("h2.h"));
        double qCold = 0.5 * (v.get("c2.h") - v.get("c1.h"));
        assertEquals(qHot, qCold, 1.0);                       // energy balance across the HX
        assertTrue(qHot > 0, "hot stream loses heat: " + qHot);
        assertTrue(v.get("h2.h") < v.get("h1.h"), "hot outlet cooler than inlet");
        assertTrue(v.get("c2.h") > v.get("c1.h"), "cold outlet warmer than inlet");
    }
}
