package com.frees.backend.api;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * §6 cycle plots for the COMPONENT layer — a component-built Rankine cycle's
 * streams (s1.P/s1.h, s2.P/…) are picked up by the CyclePathResolver as cycle
 * state points (indexed by the stream name's digits), so the same property-plot
 * cycle overlay that worked for numbered-state documents now works for component
 * networks. CoolProp-gated.
 */
class CyclePathComponentTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();
    private final CyclePathResolver resolver = new CyclePathResolver();

    @Test
    void componentRankineStreamsProduceACyclePath() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                P_hi = 8000000 [Pa]
                P_lo = 10000 [Pa]
                T_hot = 753.15 [K]
                Pump      P1(s1, s2, eta=0.80, fluid$=Water)
                Boiler    B1(s2, s3)
                Turbine   T1(s3, s4, eta=0.85, fluid$=Water)
                Condenser C1(s4, s5)
                s1.P    = P_lo
                s1.h    = Enthalpy(Water, P=P_lo, x=0)
                s1.mdot = 1 [kg/s]
                s2.P    = P_hi
                s3.h    = Enthalpy(Water, P=P_hi, T=T_hot)
                s4.P    = P_lo
                s5.h    = Enthalpy(Water, P=P_lo, x=0)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        List<Map<String, Double>> path = resolver.generateCyclePath(v, "Water");
        assertFalse(path.isEmpty(), "component streams should plot a cycle overlay");
        // The path carries flashed property points usable on a T-s / P-h plot.
        assertTrue(path.get(0).containsKey("P") || path.get(0).containsKey("T"), path.get(0).toString());
    }
}
