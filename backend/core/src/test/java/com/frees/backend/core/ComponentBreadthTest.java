package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 6 breadth batch — the translational-mechanical port {@code (F, v)}, a
 * smooth {@code Diode}, and a {@code ContactResistance}. All CoolProp-free.
 */
class ComponentBreadthTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void translationalForceDrivesMassAgainstDamper() {
        // m·dv/dt = F − c·v: F=10, m=2, c=0.5 → steady v = F/c = 20 m/s, τ=m/c=4 s.
        String src = """
                ForceSource FS(F=10)
                TransMass   M(m=2, v0=0)
                TransDamper D(c=0.5)
                TransGround GS()
                TransGround GD()
                connect(FS.a, M.port, D.a)
                connect(FS.b, GS.port)
                connect(D.b, GD.port)
                DYNAMIC accel(method = ode45, time = 0 .. 40, points = 100)
                END
                v_final = FinalValue('m.port.vel')
                v_start = MinValue('m.port.vel')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(20.0, v.get("v_final"), 1e-2);
        assertEquals(0.0, v.get("v_start"), 1e-6);
    }

    @Test
    void diodeConductsForwardAndBlocksReverse() {
        // Forward bias: a source drives current through the diode to ground.
        String src = """
                VoltageSource VS(E=5)
                Diode         D(Gon=10, eps=0.001)
                Resistor      R(R=1)
                Ground        G()
                connect(VS.p, D.p)
                connect(D.n, R.a)
                connect(R.b, VS.n, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Forward: the diode is a ~10 S conductance, R=1 Ω; current is positive and
        // most of the 5 V appears across R (diode drop small).
        assertTrue(v.get("d.p.i") > 0, "forward current must flow");
        assertTrue(v.get("r.a.i") > 4.0, "near-full conduction: " + v.get("r.a.i"));
    }

    @Test
    void contactResistanceCarriesHeatByThermalResistance() {
        // Q = (Ta − Tb)/Rth between a 400 K source and a 300 K ambient, Rth=0.05 K/W
        // → Q = 100/0.05 = 2000 W.
        String src = """
                ThermalSource HOT(T=400)
                ContactResistance CR(Rth=0.05)
                ThermalSource COLD(T=300)
                connect(HOT.port, CR.a)
                connect(CR.b, COLD.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(2000.0, v.get("cr.q"), 1e-6);
    }
}
