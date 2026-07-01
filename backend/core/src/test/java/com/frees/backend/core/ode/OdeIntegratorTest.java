package com.frees.backend.core.ode;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Numerical verification of the ODE engine against problems with known
 * closed-form solutions, plus event detection and stiff cases.
 */
class OdeIntegratorTest {

    private final OdeIntegrator integrator = new OdeIntegrator();

    private long deadline() {
        return System.nanoTime() + 20_000_000_000L;
    }

    private OdeProblem decay(String method, Integer points, Double fixedStep) {
        // dy/dt = -y, y(0) = 1  ->  y(t) = exp(-t)
        OdeRhs rhs = (t, y) -> new double[]{-y[0]};
        return new OdeProblem(method, 0.0, 5.0, new double[]{1.0}, rhs,
                points, fixedStep, 1e-8, 1e-10, null, List.of(), deadline());
    }

    @Test
    void allMethodsIntegrateExponentialDecay() {
        double exact = Math.exp(-5.0);
        // Adaptive + stiff: tight tolerance.
        for (String m : List.of("ode45", "ode23", "ode23s", "ode15s")) {
            OdeResult r = integrator.integrate(decay(m, 200, null));
            double end = r.states()[r.states().length - 1][0];
            assertEquals(exact, end, 1e-5, "method " + m);
        }
        // Fixed-step: enough steps for the order.
        for (String m : List.of("ode1", "ode2", "ode3", "ode4", "ode5")) {
            OdeResult r = integrator.integrate(decay(m, 2000, null));
            double end = r.states()[r.states().length - 1][0];
            assertEquals(exact, end, 1e-3, "method " + m);
        }
    }

    @Test
    void higherOrderIsMoreAccurateForSameStepCount() {
        double exact = Math.exp(-5.0);
        double e1 = Math.abs(integrator.integrate(decay("ode1", 50, null))
                .states()[49][0] - exact);
        double e4 = Math.abs(integrator.integrate(decay("ode4", 50, null))
                .states()[49][0] - exact);
        assertTrue(e4 < e1, "RK4 should beat Euler at equal step count: e1=" + e1 + " e4=" + e4);
    }

    @Test
    void harmonicOscillatorTwoState() {
        // y1' = y2, y2' = -y1, y(0) = (1, 0)  ->  y1 = cos t, y2 = -sin t
        OdeRhs rhs = (t, y) -> new double[]{y[1], -y[0]};
        OdeProblem p = new OdeProblem("ode45", 0.0, 2 * Math.PI, new double[]{1.0, 0.0},
                rhs, 200, null, 1e-9, 1e-11, null, List.of(), deadline());
        OdeResult r = integrator.integrate(p);
        double[] last = r.states()[r.states().length - 1];
        assertEquals(1.0, last[0], 1e-5, "cos(2π)");
        assertEquals(0.0, last[1], 1e-5, "-sin(2π)");
        // Mid sample at t = π: y1 = -1, y2 = 0.
        int mid = r.times().length / 2;
        assertEquals(Math.cos(r.times()[mid]), r.states()[mid][0], 1e-4);
    }

    @Test
    void stopEventDetectsApogee() {
        // h' = v, v' = -g, y(0) = (0, v0). Apogee at v = 0 -> t = v0/g, h = v0^2/2g.
        double g = 9.81;
        double v0 = 100.0;
        OdeRhs rhs = (t, y) -> new double[]{y[1], -g};
        OdeEvent apogee = new OdeEvent("apogee", (t, y) -> y[1], -1, true);
        OdeProblem p = new OdeProblem("ode45", 0.0, 100.0, new double[]{0.0, v0},
                rhs, 200, null, 1e-9, 1e-11, null, List.of(apogee), deadline());
        OdeResult r = integrator.integrate(p);
        assertTrue(r.stopped(), "integration should stop at apogee");
        assertEquals(v0 / g, r.endTime(), 1e-4, "apogee time");
        assertEquals(1, r.events().size());
        assertEquals(v0 * v0 / (2 * g), r.events().get(0).state()[0], 1e-2, "apogee height");
    }

    @Test
    void recordEventDoesNotStop() {
        OdeRhs rhs = (t, y) -> new double[]{1.0}; // y = t
        OdeEvent cross = new OdeEvent("five", (t, y) -> y[0] - 5.0, 1, false);
        OdeProblem p = new OdeProblem("ode4", 0.0, 10.0, new double[]{0.0},
                rhs, 100, null, 1e-9, 1e-11, null, List.of(cross), deadline());
        OdeResult r = integrator.integrate(p);
        assertFalse(r.stopped(), "record event must not stop");
        assertEquals(10.0, r.endTime(), 1e-9);
        assertEquals(1, r.events().size());
        assertEquals(5.0, r.events().get(0).time(), 1e-6, "y = t crosses 5 at t = 5");
    }

    @Test
    void stiffVanDerPolConvergesWithStiffSolvers() {
        // Van der Pol, mu = 1000 (very stiff). y(0) = (2, 0). Just require the
        // stiff solvers to complete and stay bounded over one slow period-ish window.
        double mu = 1000.0;
        OdeRhs rhs = (t, y) -> new double[]{y[1], mu * ((1 - y[0] * y[0]) * y[1] - y[0])};
        for (String m : List.of("ode23s", "ode15s")) {
            OdeProblem p = new OdeProblem(m, 0.0, 1.0, new double[]{2.0, 0.0},
                    rhs, 100, null, 1e-4, 1e-7, null, List.of(), deadline());
            OdeResult r = integrator.integrate(p);
            double[] last = r.states()[r.states().length - 1];
            // The slow manifold keeps y1 near 2 early in the trajectory.
            assertTrue(Math.abs(last[0]) < 3.0, m + " stayed bounded: " + last[0]);
        }
    }

    @Test
    void robertsonStiffKineticsMassIsConserved() {
        // Robertson: y1'=-0.04 y1 + 1e4 y2 y3 ; y2'=0.04 y1 -1e4 y2 y3 -3e7 y2^2 ;
        // y3'=3e7 y2^2. y1+y2+y3 conserved = 1.
        OdeRhs rhs = (t, y) -> new double[]{
                -0.04 * y[0] + 1.0e4 * y[1] * y[2],
                0.04 * y[0] - 1.0e4 * y[1] * y[2] - 3.0e7 * y[1] * y[1],
                3.0e7 * y[1] * y[1]
        };
        OdeProblem p = new OdeProblem("ode23s", 0.0, 40.0, new double[]{1.0, 0.0, 0.0},
                rhs, 100, null, 1e-6, 1e-10, null, List.of(), deadline());
        OdeResult r = integrator.integrate(p);
        double[] last = r.states()[r.states().length - 1];
        assertEquals(1.0, last[0] + last[1] + last[2], 1e-4, "mass conservation");
        assertTrue(last[0] > 0 && last[0] < 1, "y1 decays");
    }
}
