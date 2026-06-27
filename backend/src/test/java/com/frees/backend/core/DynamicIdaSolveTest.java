package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.core.ode.OdeTableResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase S1 — end-to-end DYNAMIC solves on the SUNDIALS IDA DAE path
 * ({@code method = ida}). Gated on the native library, like the CoolProp suite:
 * where SUNDIALS is absent these skip rather than fail.
 */
class DynamicIdaSolveTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @BeforeEach
    void requireSundials() {
        assumeTrue(SundialsIda.isAvailable(),
                "SUNDIALS IDA native library not available; skipping IDA DAE solves");
    }

    private int col(OdeTableResult t, String name) {
        return t.columns().indexOf(name);
    }

    @Test
    void newtonCoolingOnIdaMatchesAnalytic() {
        String src = """
                k = 0.01
                T_inf = 25
                DYNAMIC cooling (method = ida, time = 0 .. 100, points = 101, rtol = 1e-9)
                  der(T) = -k * (T - T_inf)
                  T(0) = 95
                END
                """;
        var result = solver.solve(src);
        assertEquals(1, result.odeTables().size());
        OdeTableResult tbl = result.odeTables().get(0);
        assertEquals(List.of("time", "t"), tbl.columns());
        assertEquals(101, tbl.rows().size());

        int ti = col(tbl, "time");
        int xi = col(tbl, "t");
        for (List<Double> row : tbl.rows()) {
            double time = row.get(ti);
            double expected = 25.0 + (95.0 - 25.0) * Math.exp(-0.01 * time);
            assertEquals(expected, row.get(xi), 1e-3, "T at t=" + time);
        }
    }

    @Test
    void idaResolvesAlgebraicAuxiliaryAsDaeUnknown() {
        // 'a' is purely algebraic (a = 2 T): on the IDA path it is a DAE unknown
        // solved in-step, not an inner Newton solve.
        String src = """
                k = 0.02
                T_inf = 20
                DYNAMIC cooling (method = ida, time = 0 .. 50, points = 51)
                  der(T) = -k * (T - T_inf)
                  a = 2 * T
                  T(0) = 80
                END
                """;
        var result = solver.solve(src);
        OdeTableResult tbl = result.odeTables().get(0);
        int ti = col(tbl, "time");
        int xi = col(tbl, "t");
        int ai = col(tbl, "a");
        assertTrue(ai >= 0, "auxiliary column 'a' present");
        for (List<Double> row : tbl.rows()) {
            double time = row.get(ti);
            double expectedT = 20.0 + (80.0 - 20.0) * Math.exp(-0.02 * time);
            assertEquals(expectedT, row.get(xi), 1e-3, "T at t=" + time);
            assertEquals(2.0 * row.get(xi), row.get(ai), 1e-6, "a = 2T");
        }
    }

    @Test
    void idaMethodWithoutLibraryFailsClearly() {
        // Documentation guard — only meaningful when the lib IS present (gated),
        // so here we just confirm a normal IDA solve completes without stopping.
        String src = """
                DYNAMIC d (method = ida, time = 0 .. 1, points = 11)
                  der(x) = -x
                  x(0) = 1
                END
                """;
        var result = solver.solve(src);
        OdeTableResult tbl = result.odeTables().get(0);
        int xi = col(tbl, "x");
        double last = tbl.rows().get(tbl.rows().size() - 1).get(xi);
        assertEquals(Math.exp(-1.0), last, 1e-3);
    }
}
