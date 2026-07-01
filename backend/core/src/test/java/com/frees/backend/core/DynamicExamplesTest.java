package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The DYNAMIC example documents shipped in {@code examples.ts} must solve and
 * raise zero unit warnings (the examples.ts contract). These mirror the example
 * texts so a change that breaks them is caught here.
 */
class DynamicExamplesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private void assertNoUnitWarnings(String src) {
        assertTrue(solver.checkUnits(src, Map.of()).isEmpty(),
                "expected zero unit warnings, got: " + solver.checkUnits(src, Map.of()));
    }

    @Test
    void newtonCoolingTransientExample() {
        String src = """
                k     = 0.012
                T_inf = 22
                DYNAMIC cooling (method = ode45, time = 0 .. 300, points = 200, rtol = 1e-8)
                  der(T) = -k * (T - T_inf)
                  T(0)   = 90
                  rate   = -der(T)
                END
                T_final = FinalValue('T')
                T_peak  = MaxValue('T')
                t_half  = TimeAt('T', 56)
                """;
        var r = solver.solve(src);
        assertEquals(90.0, r.variables().get("t_peak"), 1e-3);
        assertEquals(22.0 + 68.0 * Math.exp(-0.012 * 300), r.variables().get("t_final"), 1e-2);
        assertTrue(r.variables().get("t_half") > 0 && r.variables().get("t_half") < 300);
        assertNoUnitWarnings(src);
    }

    @Test
    void transientHeatRodExample() {
        String src = """
                N = 6
                L = 1
                dx = L / (N - 1)
                alpha = 0.05
                T_left  = 100
                T_right = 0
                T_init  = 0
                DYNAMIC rod (method = ode23s, t = 0 .. 300, points = 150, rtol = 1e-6)
                  FOR i = 2 TO N-1
                    der(T[i]) = alpha / dx^2 * (T[i-1] - 2*T[i] + T[i+1])
                  END
                  T[1] = T_left
                  T[6] = T_right
                  T[2:N-1](0) = T_init
                END
                T_mid_final = FinalValue('t[4]')
                """;
        var r = solver.solve(src);
        // Steady-state node 4: 100*(6-4)/(6-1) = 40.
        assertEquals(40.0, r.variables().get("t_mid_final"), 2.0);
        assertNoUnitWarnings(src);
    }

    @Test
    void dampedOscillatorExample() {
        String src = """
                m = 1.0
                k = 20.0
                c = 0.5
                DYNAMIC oscillator (method = ode45, t = 0 .. 20, points = 400, rtol = 1e-9)
                  der(x) = v
                  der(v) = -(c/m) * v - (k/m) * x
                  energy = 0.5 * m * v*v + 0.5 * k * x*x
                  x(0) = 1.0
                  v(0) = 0.0
                END
                x_settled = FinalValue('x')
                E0        = ODEValue('energy', 0)
                """;
        var r = solver.solve(src);
        // Initial energy = 0.5 k x0^2 = 10.
        assertEquals(10.0, r.variables().get("e0"), 1e-2);
        // Underdamped: settles toward 0.
        assertTrue(Math.abs(r.variables().get("x_settled")) < 0.5);
        assertNoUnitWarnings(src);
    }

    @Test
    void soundingRocketReportsApogeeNear100km() {
        String src = """
                g0     = 9.81
                m0     = 600
                mdot   = 9
                F0     = 28000
                Cd     = 0.3
                A      = 0.03
                rho0   = 1.225
                Hscale = 8000
                t_burn = 27
                DYNAMIC ascent (method = ode45, time = 0 .. 600, points = 500, rtol = 1e-7, atol = 1e-3)
                  thrust = If(time, t_burn, F0, F0, 0)
                  mflow  = If(time, t_burn, mdot, mdot, 0)
                  rho    = rho0 * exp(-h / Hscale)
                  drag   = 0.5 * rho * v * v * Cd * A
                  der(h) = v
                  der(v) = (thrust - drag - m * g0) / m
                  der(m) = -mflow
                  h(0) = 0
                  v(0) = 0
                  m(0) = m0
                  EVENT apogee: v = 0 | falling -> stop
                END
                apogee_km = MaxValue('h') / 1000
                v_burnout = ODEValue('v', t_burn)
                m_final   = FinalValue('m')
                """;
        var r = solver.solve(src);
        // At t_burn = 27 the calibrated vehicle reaches roughly 100 km.
        assertEquals(100.0, r.variables().get("apogee_km"), 15.0);
        assertTrue(r.variables().get("v_burnout") > 0, "burnout speed positive");
        assertEquals(600.0 - 9.0 * 27.0, r.variables().get("m_final"), 1.0, "burnout mass");
        assertNoUnitWarnings(src);
    }
}
