package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Subsystem / hierarchy (Phase 6) — a {@code COMPONENT} built from sub-instances
 * and internal {@code connect}s. The expander flattens the subsystem into leaf
 * instances (namespaced {@code outer.sub}) before solving, so a reusable assembly
 * composes exactly like a hand-wired network.
 */
class ComponentHierarchyTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void subsystemOfTwoHeatersInSeriesComposes() {
        String src = """
                COMPONENT Heater(in, out)
                  PARAM Q
                  out.mdot = in.mdot
                  out.P    = in.P
                  out.h    = in.h + Q / in.mdot
                END
                COMPONENT DoubleHeater(in, out)
                  Heater H1(Q=1000)
                  Heater H2(Q=2000)
                  connect(in, H1.in)
                  connect(H1.out, H2.in)
                  connect(H2.out, out)
                END
                DoubleHeater DH(s1, s2)
                s1.P    = 100000
                s1.mdot = 2
                s1.h    = 0
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Enthalpy accumulates through both internal heaters: 0 + 1000/2 + 2000/2.
        assertEquals(1500.0, v.get("s2.h"), 1e-6);
        assertEquals(2.0, v.get("s2.mdot"), 1e-9);
        assertEquals(100000.0, v.get("s2.p"), 1e-6);
        // The internal sub-instance state is addressable too (namespaced).
        assertEquals(500.0, v.get("dh.h1.out.h"), 1e-6);
    }

    @Test
    void nestedSubsystemFlattensRecursively() {
        // A subsystem containing a subsystem — two DoubleHeaters in series = four
        // heaters: 0 + (1+2+1+2)·1000/2 = 3000.
        String src = """
                COMPONENT Heater(in, out)
                  PARAM Q
                  out.mdot = in.mdot
                  out.P    = in.P
                  out.h    = in.h + Q / in.mdot
                END
                COMPONENT DoubleHeater(in, out)
                  Heater H1(Q=1000)
                  Heater H2(Q=2000)
                  connect(in, H1.in)
                  connect(H1.out, H2.in)
                  connect(H2.out, out)
                END
                COMPONENT QuadHeater(in, out)
                  DoubleHeater D1()
                  DoubleHeater D2()
                  connect(in, D1.in)
                  connect(D1.out, D2.in)
                  connect(D2.out, out)
                END
                QuadHeater QH(s1, s2)
                s1.P    = 100000
                s1.mdot = 2
                s1.h    = 0
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(3000.0, v.get("s2.h"), 1e-6);
    }
}
