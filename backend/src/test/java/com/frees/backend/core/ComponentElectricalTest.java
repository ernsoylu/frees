package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 2 — the electrical port {@code (V, I)} and domain-aware {@code connect(...)}.
 * An electrical node equates potential and conserves current as a Kirchhoff
 * balance (Σ I = 0, each I signed into its component) — the same node rule as the
 * heat domain, with {@code (V, I)} in place of {@code (T, Q̇)}. The expander
 * classifies the node from the {@code i}/{@code v} members its streams carry. The
 * standard-library primitives (VoltageSource, Resistor, Ground, Battery R-int ECM)
 * are pure algebra, so these tests are CoolProp-free.
 */
class ComponentElectricalTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void batteryDrivesAResistiveLoadThroughItsInternalResistance() {
        // R-int ECM: terminal V = Voc − I·R0. A 12 V / 0.1 Ω battery feeds a 2 Ω
        // load → I = 12/2.1, terminal V = I·R_load.
        String src = """
                Battery  B(Voc=12, R0=0.1)
                Resistor RL(R=2.0)
                Ground   G()
                connect(B.p, RL.a)
                connect(B.n, RL.b, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double i = 12.0 / 2.1;
        double vTerm = i * 2.0;
        assertEquals(0.0, v.get("g.port.v"), 1e-12);
        assertEquals(vTerm, v.get("b.p.v"), 1e-6);          // terminal voltage (vs ground)
        assertEquals(i, v.get("rl.a.i"), 1e-6);             // load current
        assertEquals(-i, v.get("b.p.i"), 1e-6);             // into + terminal = discharging
        assertEquals(0.0, v.get("b.p.i") + v.get("rl.a.i"), 1e-9);   // node KCL
        assertEquals(vTerm * i, v.get("b.w"), 1e-6);        // delivered electrical power
    }

    @Test
    void seriesResistorsFormAVoltageDivider() {
        // 10 V across 3 Ω + 2 Ω in series → I = 2 A, mid-node = 4 V.
        String src = """
                VoltageSource VS(E=10)
                Resistor R1(R=3)
                Resistor R2(R=2)
                Ground   G()
                connect(VS.p, R1.a)
                connect(R1.b, R2.a)
                connect(R2.b, VS.n, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(10.0, v.get("vs.p.v"), 1e-6);          // source potential vs ground
        assertEquals(2.0, v.get("r1.a.i"), 1e-9);           // series current
        assertEquals(2.0, v.get("r2.a.i"), 1e-9);           // same current through R2
        assertEquals(4.0, v.get("r1.b.v"), 1e-6);           // divider output (mid-node)
        assertEquals(0.0, v.get("r1.b.i") + v.get("r2.a.i"), 1e-9);   // mid-node KCL
    }
}
