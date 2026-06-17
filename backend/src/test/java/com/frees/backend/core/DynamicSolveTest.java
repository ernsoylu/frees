package com.frees.backend.core;

import com.frees.backend.core.ode.OdeTableResult;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * End-to-end DYNAMIC solves through the full pipeline: parse → analytic solve →
 * ODE integration → ODE Table. The analytic system supplies the parameters; the
 * dynamic block produces a sampled trajectory verified against closed forms.
 */
class DynamicSolveTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private int col(OdeTableResult t, String name) {
        return t.columns().indexOf(name);
    }

    @Test
    void newtonCoolingMatchesAnalyticSolution() {
        // T(t) = T_inf + (T0 - T_inf) e^{-k t}, with T_inf = 25, T0 = 95, k = 0.01.
        String src = """
                k = 0.01
                T_inf = 25
                DYNAMIC cooling (method = ode45, time = 0 .. 100, points = 101, rtol = 1e-8)
                  der(T) = -k * (T - T_inf)
                  T(0) = 95
                END
                """;
        var result = solver.solve(src);
        assertEquals(1, result.odeTables().size());
        OdeTableResult tbl = result.odeTables().get(0);
        assertEquals("cooling", tbl.name());
        assertEquals(List.of("time", "t"), tbl.columns(), "columns are [time, state T->t]");
        assertEquals(101, tbl.rows().size());

        int ti = col(tbl, "time");
        int xi = col(tbl, "t");
        for (List<Double> row : tbl.rows()) {
            double time = row.get(ti);
            double expected = 25.0 + (95.0 - 25.0) * Math.exp(-0.01 * time);
            assertEquals(expected, row.get(xi), 1e-4, "T at t=" + time);
        }
    }

    @Test
    void auxiliaryColumnAndDerCoupling() {
        // Q = m cp der(T): the auxiliary references der(T), proving der reification
        // and per-step algebraic coupling. der(T) = -k(T - T_inf), so at t=0,
        // Q = m cp (-k (95-25)).
        String src = """
                k = 0.01
                T_inf = 25
                m = 0.5
                cp = 4000
                DYNAMIC cooling (method = ode45, time = 0 .. 100, points = 51)
                  der(T) = -k * (T - T_inf)
                  T(0) = 95
                  Q = m * cp * der(T)
                END
                """;
        OdeTableResult tbl = solver.solve(src).odeTables().get(0);
        assertEquals(List.of("time", "t", "q"), tbl.columns());
        List<Double> first = tbl.rows().get(0);
        double q0 = first.get(col(tbl, "q"));
        assertEquals(0.5 * 4000 * (-0.01 * (95 - 25)), q0, 1e-3, "Q(0)");
    }

    @Test
    void apogeeStopEventEndsIntegration() {
        // Vertical projectile: der(h)=v, der(v)=-g0. Apogee v=0 -> stop at t=v0/g0.
        String src = """
                g0 = 9.81
                v0 = 50
                DYNAMIC flight (method = ode45, t = 0 .. 100, points = 50)
                  der(h) = v
                  der(v) = -g0
                  h(0) = 0
                  v(0) = v0
                  EVENT apogee: v = 0 | falling -> stop
                END
                """;
        OdeTableResult tbl = solver.solve(src).odeTables().get(0);
        assertTrue(tbl.stopped(), "stops at apogee");
        assertEquals(50.0 / 9.81, tbl.endTime(), 1e-3, "apogee time = v0/g0");
        assertEquals(1, tbl.events().size());
        assertEquals("apogee", tbl.events().get(0).name());
        // Peak height v0^2/2g0 is the last h sample.
        List<Double> last = tbl.rows().get(tbl.rows().size() - 1);
        assertEquals(50.0 * 50.0 / (2 * 9.81), last.get(col(tbl, "h")), 1e-1);
    }

    @Test
    void documentWithoutDynamicHasNoOdeTables() {
        var result = solver.solve("x = 3\ny = x + 1");
        assertTrue(result.odeTables().isEmpty());
        assertFalse(result.variables().isEmpty());
    }
}
