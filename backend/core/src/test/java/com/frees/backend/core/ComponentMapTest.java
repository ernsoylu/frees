package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Map-driven components: a string parameter naming a TABLE/FUNCTION is baked into
 * the call site during expansion, so a component body call {@code map$(x)}
 * resolves to the globally-declared table of that name. Both tests are
 * CoolProp-free (pure algebra + table interpolation).
 */
class ComponentMapTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void fanMapReadsPressureRiseFromTabulatedCurve() {
        // The std-library FanMap computes Q = mdot/rho then dP = map$(Q). With
        // rho = 1.2 and mdot = 0.06, Q = 0.05 lands exactly on a table node → 180.
        String src = """
                TABLE fanCurve(Q [m^3/s]) [Pa]
                  0.00   250
                  0.05   180
                  0.10    60
                END
                FanMap F1(rho=1.2, map$=fanCurve)
                F1.in.mdot = 0.06
                F1.in.P    = 101325
                F1.in.h    = 300000
                F1.out.h   = 300000
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(0.06, v.get("f1.out.mdot"), 1e-9);
        // out.P = in.P + map(Q) = 101325 + 180.
        assertEquals(101505.0, v.get("f1.out.p"), 1e-6);
    }

    @Test
    void stringParamBakesAsTableCallName() {
        // A generic component whose body calls curve$(k): the string param value
        // (dbl) becomes the call name, so curve$(2) resolves to dbl(2) = 4.
        String src = """
                COMPONENT Mapped(in, out)
                  PARAM k, curve$
                  out.mdot = in.mdot
                  out.P    = in.P
                  out.h    = in.h * curve$(k)
                END
                TABLE dbl(x)
                  1   2
                  2   4
                  3   6
                END
                Mapped M1(k=2, curve$=dbl)
                M1.in.mdot = 1
                M1.in.P    = 100
                M1.in.h    = 10
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // out.h = in.h * dbl(2) = 10 * 4 = 40.
        assertEquals(40.0, v.get("m1.out.h"), 1e-9);
    }
}
