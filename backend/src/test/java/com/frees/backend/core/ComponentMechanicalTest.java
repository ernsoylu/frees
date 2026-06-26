package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 2 — the rotational-mechanical port {@code (ω, τ)} and domain-aware
 * {@code connect(...)}. A mechanical node equates angular velocity and conserves
 * torque as a Kirchhoff balance (Σ τ = 0, each τ signed into its component) — the
 * same node rule as the heat and electrical domains, with {@code (ω, τ)} as the
 * across/flow pair. The expander classifies the node from the {@code tau}/{@code w}
 * members its streams carry. The library primitives (TorqueSource, RotationalDamper,
 * MechGround, Gear) are pure algebra, so these tests are CoolProp-free.
 */
class ComponentMechanicalTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void torqueDrivenDamperReachesSteadySpeed() {
        // A constant torque against a rotational damper to ground → ω = T/c.
        String src = """
                TorqueSource     TS(T=10)
                RotationalDamper D(c=0.5)
                MechGround       G()
                connect(TS.a, D.a)
                connect(TS.b, D.b, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(20.0, v.get("d.a.w"), 1e-9);      // ω = T/c = 10/0.5
        assertEquals(10.0, v.get("d.a.tau"), 1e-9);    // transmitted torque
        assertEquals(-10.0, v.get("ts.a.tau"), 1e-9);  // source torque (into source = −T)
        assertEquals(0.0, v.get("ts.a.tau") + v.get("d.a.tau"), 1e-9);   // node Στ=0
        assertEquals(20.0, v.get("ts.a.w"), 1e-9);     // common shaft speed
    }

    @Test
    void gearTradesSpeedForTorqueAndConservesPower() {
        // A 2:1 reduction gear: output spins half as fast, twice the torque; the
        // mechanical power through the gear is conserved.
        String src = """
                TorqueSource     TS(T=10)
                Gear             G(ratio=2)
                RotationalDamper D(c=0.5)
                MechGround       M1()
                MechGround       M2()
                connect(TS.a, G.in)
                connect(TS.b, M1.port)
                connect(G.out, D.a)
                connect(D.b, M2.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(80.0, v.get("g.in.w"), 1e-9);     // input shaft speed
        assertEquals(40.0, v.get("g.out.w"), 1e-9);    // output = input / ratio
        assertEquals(10.0, v.get("g.in.tau"), 1e-9);   // input torque
        assertEquals(20.0, v.get("d.a.tau"), 1e-9);    // output torque amplified ×ratio
        // Power conserved through the ideal gear: τ_in·ω_in = τ_out·ω_out.
        assertEquals(v.get("g.in.tau") * v.get("g.in.w"),
                     v.get("d.a.tau") * v.get("d.a.w"), 1e-6);
    }
}
