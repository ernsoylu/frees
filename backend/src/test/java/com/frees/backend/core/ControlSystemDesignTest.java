package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * End-to-end integration tests for the Phase 5 controller-design solvers
 * (lqr, place, pidtune) driven through the equation solver.
 */
class ControlSystemDesignTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    // Double-integrator state matrices, shared by the lqr/place cases.
    private static final String DOUBLE_INTEGRATOR =
            "A[1,1] = 0; A[1,2] = 1\n"
                    + "A[2,1] = 0; A[2,2] = 0\n"
                    + "B[1] = 0; B[2] = 1\n";

    @Test
    void placeDoubleIntegrator() {
        // Desired poles -2, -3 -> (s+2)(s+3) = s^2 + 5s + 6.
        // Controllable canonical A-BK char poly is s^2 + K2 s + K1, so K = [6, 5].
        EquationSystemSolver.Result result = solver.solve(
                DOUBLE_INTEGRATOR
                        + "pr[1] = -2; pi[1] = 0\n"
                        + "pr[2] = -3; pi[2] = 0\n"
                        + "CALL place(A[1:2,1:2], B[1:2], pr[1:2], pi[1:2] : K[1:2])");

        assertEquals(6.0, result.variables().get("K[1]"), 1e-6);
        assertEquals(5.0, result.variables().get("K[2]"), 1e-6);
    }

    @Test
    void lqrDoubleIntegrator() {
        // Q = I, R = 1 -> optimal gain K = [1, sqrt(3)].
        EquationSystemSolver.Result result = solver.solve(
                DOUBLE_INTEGRATOR
                        + "Q[1,1] = 1; Q[1,2] = 0\n"
                        + "Q[2,1] = 0; Q[2,2] = 1\n"
                        + "R = 1\n"
                        + "CALL lqr(A[1:2,1:2], B[1:2], Q[1:2,1:2], R : K[1:2])");

        assertEquals(1.0, result.variables().get("K[1]"), 1e-5);
        assertEquals(Math.sqrt(3.0), result.variables().get("K[2]"), 1e-5);
    }

    @Test
    void pidtunePidDesign() {
        // Plant G(s) = 1/(s^2 + s); design a PID with crossover wc = 1 rad/s.
        // Closed-form (60-degree PM target): Kp~1.366, Ki~0.524, Kd~0.890.
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 0, 1]\n"
                        + "den = [1, 1, 0]\n"
                        + "wc = 1\n"
                        + "CALL pidtune(num[1:3], den[1:3], 'PID', wc : Kp, Ki, Kd)");

        assertEquals(1.366, result.variables().get("Kp"), 1e-2);
        assertEquals(0.524, result.variables().get("Ki"), 1e-2);
        assertEquals(0.890, result.variables().get("Kd"), 1e-2);
        // All gains positive => a realizable stabilizing PID.
        assertTrue(result.variables().get("Kp") > 0, "Kp should be positive");
        assertTrue(result.variables().get("Ki") > 0, "Ki should be positive");
        assertTrue(result.variables().get("Kd") > 0, "Kd should be positive");
    }
}
