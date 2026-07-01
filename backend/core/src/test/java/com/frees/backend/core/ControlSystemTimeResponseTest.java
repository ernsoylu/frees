package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * End-to-end integration tests for the time-domain response solvers
 * (step, impulse, lsim), checked against closed-form analytic responses.
 */
class ControlSystemTimeResponseTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    // Shared time grid t = [0, 0.5, 1, 2, 3, 4, 5] (N = 7).
    private static final String T_GRID =
            "t[1] = 0; t[2] = 0.5; t[3] = 1; t[4] = 2; t[5] = 3; t[6] = 4; t[7] = 5\n";

    @Test
    void firstOrderStepResponse() {
        // G(s) = 1/(s+1): step response y(t) = 1 - e^{-t}
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1]\n"
                        + "den = [1, 1]\n"
                        + T_GRID
                        + "CALL step(num[1:2], den[1:2], t[1:7] : y[1:7])");

        assertEquals(0.0, result.variables().get("y[1]"), 1e-4);          // t=0
        assertEquals(1.0 - Math.exp(-1.0), result.variables().get("y[3]"), 1e-4); // t=1
        assertEquals(1.0 - Math.exp(-5.0), result.variables().get("y[7]"), 1e-4); // t=5
    }

    @Test
    void firstOrderImpulseResponse() {
        // G(s) = 1/(s+1): impulse response y(t) = e^{-t}
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1]\n"
                        + "den = [1, 1]\n"
                        + T_GRID
                        + "CALL impulse(num[1:2], den[1:2], t[1:7] : y[1:7])");

        assertEquals(1.0, result.variables().get("y[1]"), 1e-4);          // t=0
        assertEquals(Math.exp(-1.0), result.variables().get("y[3]"), 1e-4); // t=1
        assertEquals(Math.exp(-5.0), result.variables().get("y[7]"), 1e-4); // t=5
    }

    @Test
    void stateSpaceStepMatchesTransferFunction() {
        // A = [-1], B = [1], C = [1], D = 0  ==  G(s) = 1/(s+1)
        EquationSystemSolver.Result result = solver.solve(
                "A[1,1] = -1\n"
                        + "B[1] = 1\n"
                        + "C[1] = 1\n"
                        + "D = 0\n"
                        + T_GRID
                        + "CALL step(A[1:1,1:1], B[1:1], C[1:1], D, t[1:7] : y[1:7])");

        assertEquals(1.0 - Math.exp(-1.0), result.variables().get("y[3]"), 1e-4);
        assertEquals(1.0 - Math.exp(-5.0), result.variables().get("y[7]"), 1e-4);
    }

    @Test
    void pureGainStepIsConstant() {
        // G(s) = 5 (no dynamics): step response is the constant 5.
        EquationSystemSolver.Result result = solver.solve(
                "num = [5]\n"
                        + "den = [1]\n"
                        + T_GRID
                        + "CALL step(num[1:1], den[1:1], t[1:7] : y[1:7])");

        assertEquals(5.0, result.variables().get("y[1]"), 1e-9);
        assertEquals(5.0, result.variables().get("y[7]"), 1e-9);
    }

    @Test
    void secondOrderStepOvershoot() {
        // G(s) = wn^2 / (s^2 + 2*zeta*wn*s + wn^2) with zeta=0.5, wn=1.
        // Peak overshoot Mp = exp(-zeta*pi/sqrt(1-zeta^2)) ~ 0.163, so the
        // response near the peak time tp = pi/(wn*sqrt(1-zeta^2)) ~ 3.63 exceeds 1.
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 0, 1]\n"
                        + "den = [1, 1, 1]\n"
                        + T_GRID
                        + "CALL step(num[1:3], den[1:3], t[1:7] : y[1:7])");

        // At t=4 (just past the peak) the underdamped response is above unity.
        double yPeakRegion = result.variables().get("y[6]"); // t=4
        org.junit.jupiter.api.Assertions.assertTrue(yPeakRegion > 1.0,
                "underdamped step response should overshoot past 1.0 near the peak, got " + yPeakRegion);
        // Final value tends to the DC gain of 1.
        assertEquals(1.0, result.variables().get("y[7]"), 0.1); // t=5, still settling
    }

    @Test
    void lsimConstantInputMatchesStep() {
        // Driving G(s) = 1/(s+1) with u(t) = 1 reproduces the step response.
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1]\n"
                        + "den = [1, 1]\n"
                        + T_GRID
                        + "u[1] = 1; u[2] = 1; u[3] = 1; u[4] = 1; u[5] = 1; u[6] = 1; u[7] = 1\n"
                        + "CALL lsim(num[1:2], den[1:2], u[1:7], t[1:7] : y[1:7])");

        assertEquals(1.0 - Math.exp(-1.0), result.variables().get("y[3]"), 1e-3);
        assertEquals(1.0 - Math.exp(-5.0), result.variables().get("y[7]"), 1e-3);
    }

    @Test
    void lsimRampInputOnFirstOrderSystem() {
        // G(s) = 1/(s+1) driven by u(t) = t gives y(t) = t - 1 + e^{-t}.
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1]\n"
                        + "den = [1, 1]\n"
                        + T_GRID
                        + "u[1] = 0; u[2] = 0.5; u[3] = 1; u[4] = 2; u[5] = 3; u[6] = 4; u[7] = 5\n"
                        + "CALL lsim(num[1:2], den[1:2], u[1:7], t[1:7] : y[1:7])");

        // Linear interpolation of u between coarse samples adds a little error,
        // so use a looser tolerance than the analytic step/impulse cases.
        assertEquals(1.0 - 1.0 + Math.exp(-1.0), result.variables().get("y[3]"), 2e-2); // t=1
        assertEquals(5.0 - 1.0 + Math.exp(-5.0), result.variables().get("y[7]"), 2e-2); // t=5
    }
}
