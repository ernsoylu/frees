package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * End-to-end check of series, parallel, and feedback connections flowing through the solver.
 */
class ControlSystemInterconnectionTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void seriesConnectionOfTwoSystems() {
        // G1 = 1/(s+1) -> num1 = [0, 1], den1 = [1, 1]
        // G2 = 2/(s+3) -> num2 = [0, 2], den2 = [1, 3]
        // G_series = G1 * G2 = 2/(s^2 + 4s + 3) -> num_out = [0, 0, 2], den_out = [1, 4, 3]
        EquationSystemSolver.Result result = solver.solve(
                "num1 = [0, 1]\n"
                        + "den1 = [1, 1]\n"
                        + "num2 = [0, 2]\n"
                        + "den2 = [1, 3]\n"
                        + "CALL series(num1, den1, num2, den2 : num_out[1:3], den_out[1:3])");

        assertEquals(0.0, result.variables().get("num_out[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("num_out[2]"), 1e-8);
        assertEquals(2.0, result.variables().get("num_out[3]"), 1e-8);

        assertEquals(1.0, result.variables().get("den_out[1]"), 1e-8);
        assertEquals(4.0, result.variables().get("den_out[2]"), 1e-8);
        assertEquals(3.0, result.variables().get("den_out[3]"), 1e-8);
    }

    @Test
    void parallelConnectionOfTwoSystems() {
        // G1 = 1/(s+1) -> num1 = [0, 1], den1 = [1, 1]
        // G2 = 2/(s+3) -> num2 = [0, 2], den2 = [1, 3]
        // G_parallel = G1 + G2 = (3s+5)/(s^2 + 4s + 3) -> num_out = [0, 3, 5], den_out = [1, 4, 3]
        EquationSystemSolver.Result result = solver.solve(
                "num1 = [0, 1]\n"
                        + "den1 = [1, 1]\n"
                        + "num2 = [0, 2]\n"
                        + "den2 = [1, 3]\n"
                        + "CALL parallel(num1, den1, num2, den2 : num_out[1:3], den_out[1:3])");

        assertEquals(0.0, result.variables().get("num_out[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("num_out[2]"), 1e-8);
        assertEquals(5.0, result.variables().get("num_out[3]"), 1e-8);

        assertEquals(1.0, result.variables().get("den_out[1]"), 1e-8);
        assertEquals(4.0, result.variables().get("den_out[2]"), 1e-8);
        assertEquals(3.0, result.variables().get("den_out[3]"), 1e-8);
    }

    @Test
    void feedbackConnectionNegative() {
        // G = 1/(s+1) -> num1 = [0, 1], den1 = [1, 1]
        // H = 1/1 -> num2 = [1], den2 = [1]
        // sign = 1.0 (negative feedback)
        // G_feedback = G/(1 + G*H) = 1/(s+2) -> num_out = [0, 1], den_out = [1, 2]
        EquationSystemSolver.Result result = solver.solve(
                "num1 = [0, 1]\n"
                        + "den1 = [1, 1]\n"
                        + "num2 = [1]\n"
                        + "den2 = [1]\n"
                        + "CALL feedback(num1, den1, num2, den2, 1.0 : num_out[1:2], den_out[1:2])");

        assertEquals(0.0, result.variables().get("num_out[1]"), 1e-8);
        assertEquals(1.0, result.variables().get("num_out[2]"), 1e-8);

        assertEquals(1.0, result.variables().get("den_out[1]"), 1e-8);
        assertEquals(2.0, result.variables().get("den_out[2]"), 1e-8);
    }

    @Test
    void feedbackConnectionPositive() {
        // G = 1/(s+2) -> num1 = [0, 1], den1 = [1, 2]
        // H = 1/1 -> num2 = [1], den2 = [1]
        // sign = -1.0 (positive feedback)
        // G_feedback = G/(1 - G*H) = 1/(s+1) -> num_out = [0, 1], den_out = [1, 1]
        EquationSystemSolver.Result result = solver.solve(
                "num1 = [0, 1]\n"
                        + "den1 = [1, 2]\n"
                        + "num2 = [1]\n"
                        + "den2 = [1]\n"
                        + "CALL feedback(num1, den1, num2, den2, -1.0 : num_out[1:2], den_out[1:2])");

        assertEquals(0.0, result.variables().get("num_out[1]"), 1e-8);
        assertEquals(1.0, result.variables().get("num_out[2]"), 1e-8);

        assertEquals(1.0, result.variables().get("den_out[1]"), 1e-8);
        assertEquals(1.0, result.variables().get("den_out[2]"), 1e-8);
    }

    @Test
    void feedbackConnectionDefaultNegative() {
        // G = 1/(s+1) -> num1 = [0, 1], den1 = [1, 1]
        // H = 1/1 -> num2 = [1], den2 = [1]
        // Without sign parameter, defaults to negative feedback (sign = 1.0)
        // G_feedback = G/(1 + G*H) = 1/(s+2) -> num_out = [0, 1], den_out = [1, 2]
        EquationSystemSolver.Result result = solver.solve(
                "num1 = [0, 1]\n"
                        + "den1 = [1, 1]\n"
                        + "num2 = [1]\n"
                        + "den2 = [1]\n"
                        + "CALL feedback(num1, den1, num2, den2 : num_out[1:2], den_out[1:2])");

        assertEquals(0.0, result.variables().get("num_out[1]"), 1e-8);
        assertEquals(1.0, result.variables().get("num_out[2]"), 1e-8);

        assertEquals(1.0, result.variables().get("den_out[1]"), 1e-8);
        assertEquals(2.0, result.variables().get("den_out[2]"), 1e-8);
    }
}
