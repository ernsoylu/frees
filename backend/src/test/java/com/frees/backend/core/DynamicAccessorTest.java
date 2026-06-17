package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * ODE Table accessors let the analytic system consume transient results. Simple
 * reporting (read a value out of the trajectory) and the loop-closing case
 * (size an ODE input so a transient target is met) both go through the live
 * accessor mechanism + the zero-term dependency augmentation.
 */
class DynamicAccessorTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private double var(EquationSystemSolver.Result r, String name) {
        return r.variables().get(name.toLowerCase());
    }

    @Test
    void finalAndMaxValueReportTransientResults() {
        // Cooling decays from 95; FinalValue at t=100 and MaxValue (= 95 at t=0).
        String src = """
                DYNAMIC cooling (time = 0 .. 100, points = 101, rtol = 1e-8)
                  der(T) = -0.01 * (T - 25)
                  T(0) = 95
                END
                T_final = FinalValue('T')
                T_peak  = MaxValue('T')
                """;
        var r = solver.solve(src);
        assertEquals(25.0 + 70.0 * Math.exp(-1.0), var(r, "t_final"), 1e-3);
        assertEquals(95.0, var(r, "t_peak"), 1e-4);
    }

    @Test
    void sizeInitialVelocitySoApogeeMeetsTarget() {
        // Choose v0 so the apogee height equals h_target. Closed form: v0 = sqrt(2 g0 h).
        String src = """
                g0 = 9.81
                h_target = 500
                v_used = v0
                MaxValue('h') = h_target
                DYNAMIC flight (method = ode45, t = 0 .. 100, points = 400, rtol = 1e-9)
                  der(h) = v
                  der(v) = -g0
                  h(0) = 0
                  v(0) = v0
                  EVENT apogee: v = 0 | falling -> stop
                END
                """;
        var r = solver.solve(src);
        double expected = Math.sqrt(2 * 9.81 * 500);
        assertEquals(expected, var(r, "v0"), 1e-1, "solver should size v0 to hit apogee target");
        // And the apogee table column max indeed equals the target.
        assertEquals(1, r.odeTables().size());
    }

    @Test
    void timeAtAndOdeValueAccessors() {
        // y = t (der(y) = 1), so TimeAt('y', 7) = 7 and ODEValue('y', 3) = 3.
        String src = """
                DYNAMIC ramp (t = 0 .. 10, points = 101)
                  der(y) = 1
                  y(0) = 0
                END
                t7 = TimeAt('y', 7)
                y3 = ODEValue('y', 3)
                """;
        var r = solver.solve(src);
        assertEquals(7.0, var(r, "t7"), 1e-3);
        assertEquals(3.0, var(r, "y3"), 1e-3);
    }
}
