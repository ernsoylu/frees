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
        // Cold-start seeding for the coupled two-cell block (16 unknowns that
        // otherwise start at the 1.0 default): junction enthalpies in-band with
        // bounds so the line-search clamp keeps every property iterate
        // evaluable, capacity rates near mdot*cp with a positive floor so the
        // effectiveness guard's Cr stays in [0,1], temperatures inside the
        // water table, and effectiveness inside its own range — the
        // explicit-feed-seeding pattern for discretized-HX cold starts.
        Map<String, VariableSpec> seeds = new java.util.HashMap<>();
        for (String h : new String[]{"hx.c1$hot_out$h", "hx.c2$hot_in$h"}) {
            seeds.put(h, new VariableSpec(h, 250e3, 1e3, 1.5e6));
        }
        for (String h : new String[]{"hx.c2$cold_out$h", "hx.c1$cold_in$h"}) {
            seeds.put(h, new VariableSpec(h, 120e3, 1e3, 1.5e6));
        }
        for (String c : new String[]{"hx.c1$c_c", "hx.c2$c_h", "hx.c1$cmin", "hx.c1$cmax", "hx.c2$cmin", "hx.c2$cmax"}) {
            seeds.put(c, new VariableSpec(c, 2093, 1.0, 1e6));
        }
        for (String eps : new String[]{"hx.c1$eps", "hx.c2$eps"}) {
            seeds.put(eps, new VariableSpec(eps, 0.4, 0.0, 1.0));
        }
        seeds.put("hx.c2$th", new VariableSpec("hx.c2$th", 340, 274, 393));
        seeds.put("hx.c1$tc", new VariableSpec("hx.c1$tc", 300, 274, 393));
        for (String q : new String[]{"hx.c1$q", "hx.c2$q"}) {
            seeds.put(q, new VariableSpec(q, 5e4, -1e7, 1e7));
        }
        Map<String, Double> v = solver.solve(src, SolverSettings.DEFAULTS, seeds).variables();
        double qHot = 0.5 * (v.get("h1.h") - v.get("h2.h"));
        double qCold = 0.5 * (v.get("c2.h") - v.get("c1.h"));
        assertEquals(qHot, qCold, 1.0);                       // energy balance across the HX
        assertTrue(qHot > 0, "hot stream loses heat: " + qHot);
        assertTrue(v.get("h2.h") < v.get("h1.h"), "hot outlet cooler than inlet");
        assertTrue(v.get("c2.h") > v.get("c1.h"), "cold outlet warmer than inlet");
    }
}
