package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * System-level uncertainty (Phase 6 system glue) — the shipped first-order /
 * RSS uncertainty propagation flows through an expanded component network with no
 * extra machinery: a tolerance on a component parameter propagates to the
 * cross-domain KPIs the network computes.
 */
class SystemUncertaintyTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void parameterTolerancePropagatesToComponentNetworkKpis() {
        // A heating resistor (R = 5 ± 0.5 Ω) across 10 V dissipates Q = 100/R = 20 W;
        // dQ/dR = −100/R² = −4, so ΔQ = 4·0.5 = 2 W. The heat conducts to ambient
        // through kA/L = 20 W/K, so the element temperature 301 K carries ΔT = 0.1 K.
        String src = """
                R_val = 5
                UncertaintyOf(R_val) = 0.5
                VoltageSource   VS(E=10)
                HeatingResistor HR(R=R_val)
                Ground          G()
                Conduction      C(k=2, area=1, L=0.1)
                ThermalSource   AMB(T=300)
                connect(VS.p, HR.p)
                connect(VS.n, HR.n, G.port)
                connect(HR.heat, C.a)
                connect(C.b, AMB.port)
                """;
        var result = solver.solve(src);
        assertEquals(20.0, result.variables().get("hr.q"), 1e-6);
        // uncertainties() is keyed by the internal flat name (h r$q) — variables()
        // by the dotted display name. The propagation itself is the point here.
        assertEquals(2.0, result.uncertainties().get("hr$q"), 1e-4);     // ΔQ from ΔR
        assertEquals(301.0, result.variables().get("c.a.t"), 1e-6);
        assertEquals(0.1, result.uncertainties().get("c$a$t"), 1e-5);    // ΔT propagated
    }
}
