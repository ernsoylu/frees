package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 3 (first slice) — a component network with storage runs transiently.
 * A {@code ThermalMass} declares a state with {@code der(port.T)=port.Qdot/C} and
 * its initial value with {@code init(port.T)=T0}; the parser routes the whole
 * component network into the document's {@code DYNAMIC} block, where the ODE
 * engine integrates the state while its per-step algebraic solve resolves the
 * surrounding conduction/ambient network at each instant. The same components
 * that solve a steady operating point (Phase 2) thus also run a transient — here
 * the lumped-capacitance relaxation of a hot mass toward ambient. The transient
 * state is addressed by its natural dotted display name ({@code 'm.port.t'}) in
 * the ODE accessors. Pure algebra, so CoolProp-free.
 */
class ComponentTransientTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void thermalMassRelaxesTowardAmbient() {
        // C = 5000 J/K mass at 400 K loses heat through k·A/L = 20 W/K to a 300 K
        // ambient → first-order decay with τ = C/(kA/L) = 250 s.
        String src = """
                ThermalMass   M(C=5000, T0=400)
                ThermalSource amb(T=300)
                Conduction    wall(k=2, area=1, L=0.1)
                connect(M.port, wall.a)
                connect(wall.b, amb.port)
                DYNAMIC warmup(method = ode45, time = 0 .. 2000, points = 100)
                END
                T_final = FinalValue('m.port.t')
                T_peak  = MaxValue('m.port.t')
                t_half  = TimeAt('m.port.t', 350)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Relaxes to ambient: 300 + 100·e^(−2000/250) ≈ 300.03 K (steady limit =
        // the Phase-2 operating point, ambient temperature).
        assertEquals(300.0 + 100.0 * Math.exp(-2000.0 / 250.0), v.get("t_final"), 1e-2);
        // Starts at the initial condition.
        assertEquals(400.0, v.get("t_peak"), 1e-6);
        // Crosses the half-way temperature 350 K at t = τ·ln2 = 250·ln2 ≈ 173 s.
        assertEquals(250.0 * Math.log(2.0), v.get("t_half"), 1.0);
    }
}
