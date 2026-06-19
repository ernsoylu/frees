package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

    @Test
    void carCruiseControlExampleSystem() {
        String src = "m = 1000 [kg]\n"
                + "c = 50 [N-s/m]\n"
                + "A = [0, 1; 0, -c/m]\n"
                + "B = [0; 1/m]\n"
                + "C = [0, 1]\n"
                + "D = [0]\n"
                + "CALL ss2tf(A, B, C, D : num_car[1:3], den_car[1:3])\n"
                + "Kp = 800 [N-s/m]\n"
                + "Ki = 40 [N/m]\n"
                + "num_pi = [Kp, Ki]\n"
                + "den_pi = [1, 0]\n"
                + "CALL series(num_pi, den_pi, num_car, den_car : num_ol[1:4], den_ol[1:4])\n"
                + "num_h = [1]\n"
                + "den_h = [1]\n"
                + "CALL feedback(num_ol, den_ol, num_h, den_h : num_cl[1:4], den_cl[1:4])";
        EquationSystemSolver.Result result = solver.solve(src);
        
        // Let's assert the final closed loop transfer function coefficients.
        // num_car = C * adj(sI-A) * B + D = [0, 1] * adj([s, -1; 0, s+0.05]) * [0; 0.001]
        // adj(sI-A) = [s+0.05, 1; 0, s]
        // adj(sI-A) * B = [0.001; 0.001 * s]
        // C * [0.001; 0.001 * s] = 0.001 * s
        // So G(s) = 0.001 * s / (s^2 + 0.05 * s) = 0.001 / (s + 0.05)
        // With length 3: num_car = [0, 0.001, 0], den_car = [1, 0.05, 0] -> wait!
        // G(s) = 0.001 / (s + 0.05). If num_car and den_car are length 3,
        // then num_car = [0, 0.001, 0] and den_car = [1, 0.05, 0].
        // Let's check series of C(s) = (Kp*s + Ki)/s and G(s) = 0.001 / (s + 0.05)
        // L(s) = 0.001 * (Kp*s + Ki) / (s^2 + 0.05*s) = (0.001*Kp*s + 0.001*Ki) / (s^2 + 0.05*s)
        // With Kp = 800, Ki = 40:
        // L(s) = (0.8*s + 0.04) / (s^2 + 0.05*s).
        // Since L1 = 2, L2 = 3, expectedLen = 2 + 3 - 1 = 4.
        // num_ol = [0, 0, 0.8, 0.04], den_ol = [0, 1, 0.05, 0] -> wait!
        // Let's check multiplication:
        // num_pi = [Kp, Ki], den_pi = [1, 0] (length 2)
        // num_car = [0, 0.001, 0], den_car = [1, 0.05, 0] (length 3)
        // num_ol = num_pi * num_car = [Kp, Ki] * [0, 0.001, 0]
        // = [Kp*0, Kp*0.001 + Ki*0, Kp*0 + Ki*0.001, Ki*0]
        // = [0, 0.001*Kp, 0.001*Ki, 0] = [0, 0.8, 0.04, 0]
        // den_ol = den_pi * den_car = [1, 0] * [1, 0.05, 0] = [1, 0.05, 0, 0]
        // So L(s) = (0.8*s^2 + 0.04*s) / (s^3 + 0.05*s^2).
        // That is correct because num_car had trailing zero: [0, 0.001, 0] corresponds to 0.001*s + 0 = 0.001*s!
        // Wait, why did C = [0, 1] make num_car = [0, 0.001, 0]?
        // Let's trace C * adj(sI-A) * B + D:
        // A = [0, 1; 0, -0.05]
        // sI-A = [s, -1; 0, s+0.05]
        // charpoly: s^2 + 0.05*s (den_car = [1, 0.05, 0])
        // adj(sI-A) = [s+0.05, 1; 0, s]
        // B = [0; 0.001]
        // adj(sI-A)*B = [0.001; 0.001*s]
        // C = [0, 1] => C * adj(sI-A)*B = 0.001*s.
        // So the numerator is 0.001*s.
        // In descending powers: 0*s^2 + 0.001*s + 0 = [0, 0.001, 0].
        // But Symja CAS simplifies common factors, reducing to G(s) = 0.001 / (s + 0.05).
        // For degree n=2: num_car = [0, 0, 0.001], den_car = [0, 1, 0.05].
        // Let's check series of C(s) = (Kp*s + Ki)/s and G(s) = 0.001 / (s + 0.05)
        // L(s) = (0.8*s + 0.04) / (s^2 + 0.05*s).
        // Since L1 = 2, L2 = 3, expectedLen = 2 + 3 - 1 = 4.
        // num_ol = num_pi * num_car = [800, 40] * [0, 0, 0.001] = [0, 0, 0.8, 0.04]
        // den_ol = den_pi * den_car = [1, 0] * [0, 1, 0.05] = [0, 1, 0.05, 0]
        // Now, let's trace feedback:
        // feedback(num_ol, den_ol, num_h, den_h) where num_h = [1], den_h = [1]
        // num_cl = num_ol * den_h = [0, 0, 0.8, 0.04]
        // den_cl = den_ol * den_h + num_ol * num_h = [0, 1, 0.05, 0] + [0, 0, 0.8, 0.04] = [0, 1, 0.85, 0.04]
        // Let's assert these:
        assertEquals(0.0, result.variables().get("num_cl[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("num_cl[2]"), 1e-8);
        assertEquals(0.8, result.variables().get("num_cl[3]"), 1e-8);
        assertEquals(0.04, result.variables().get("num_cl[4]"), 1e-8);

        assertEquals(0.0, result.variables().get("den_cl[1]"), 1e-8);
        assertEquals(1.0, result.variables().get("den_cl[2]"), 1e-8);
        assertEquals(0.85, result.variables().get("den_cl[3]"), 1e-8);
        assertEquals(0.04, result.variables().get("den_cl[4]"), 1e-8);

        assertTrue(solver.checkUnits(src, java.util.Map.of()).isEmpty(), "expected zero unit warnings");
    }
}
