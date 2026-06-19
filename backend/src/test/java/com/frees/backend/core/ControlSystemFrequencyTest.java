package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * End-to-end integration tests for pole, zero, bode, nyquist, and margin solvers.
 */
class ControlSystemFrequencyTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void poleTfCalculatesCorrectly() {
        // G(s) = 1 / (s^2 + 3s + 2) has poles at -1 and -2
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 0, 1]\n"
                        + "den = [1, 3, 2]\n"
                        + "CALL pole(num[1:3], den[1:3] : pr[1:2], pi[1:2])");

        // Solvers sort poles: real part first, then imaginary.
        // So pr[1] = -2.0, pr[2] = -1.0.
        assertEquals(-2.0, result.variables().get("pr[1]"), 1e-6);
        assertEquals(0.0, result.variables().get("pi[1]"), 1e-6);
        assertEquals(-1.0, result.variables().get("pr[2]"), 1e-6);
        assertEquals(0.0, result.variables().get("pi[2]"), 1e-6);
    }

    @Test
    void poleSsCalculatesCorrectly() {
        // A = [0, 1; -2, -3] has eigenvalues (poles) at -1 and -2
        EquationSystemSolver.Result result = solver.solve(
                "A[1,1] = 0; A[1,2] = 1\n"
                        + "A[2,1] = -2; A[2,2] = -3\n"
                        + "CALL pole(A[1:2,1:2] : pr[1:2], pi[1:2])");

        assertEquals(-2.0, result.variables().get("pr[1]"), 1e-6);
        assertEquals(0.0, result.variables().get("pi[1]"), 1e-6);
        assertEquals(-1.0, result.variables().get("pr[2]"), 1e-6);
        assertEquals(0.0, result.variables().get("pi[2]"), 1e-6);
    }

    @Test
    void zeroTfCalculatesCorrectly() {
        // G(s) = (s + 3) / (s^2 + 3s + 2) has zero at -3
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1, 3]\n"
                        + "den = [1, 3, 2]\n"
                        + "CALL zero(num[1:3], den[1:3] : zr[1:1], zi[1:1])");

        assertEquals(-3.0, result.variables().get("zr[1]"), 1e-6);
        assertEquals(0.0, result.variables().get("zi[1]"), 1e-6);
    }

    @Test
    void zeroSsCalculatesCorrectly() {
        // G(s) with A = [0, 1; -2, -3], B = [0; 1], C = [3, 1], D = 0
        // C(sI-A)^-1 B + D = (s + 3) / (s^2 + 3s + 2) which has a zero at -3
        EquationSystemSolver.Result result = solver.solve(
                "A[1,1] = 0; A[1,2] = 1\n"
                        + "A[2,1] = -2; A[2,2] = -3\n"
                        + "B[1] = 0; B[2] = 1\n"
                        + "C[1] = 3; C[2] = 1\n"
                        + "D = 0.0\n"
                        + "CALL zero(A[1:2,1:2], B[1:2], C[1:2], D : zr[1:1], zi[1:1])");

        assertEquals(-3.0, result.variables().get("zr[1]"), 1e-6);
        assertEquals(0.0, result.variables().get("zi[1]"), 1e-6);
    }

    @Test
    void bodeTfCalculatesCorrectly() {
        // G(s) = 1 / (s + 1). At w = 1, magnitude is -3.0103 dB, phase is -45 deg.
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1]\n"
                        + "den = [1, 1]\n"
                        + "omega = [1.0]\n"
                        + "CALL bode(num[1:2], den[1:2], omega[1:1] : mag[1:1], phase[1:1])");

        assertEquals(-3.0102999566, result.variables().get("mag[1]"), 1e-5);
        assertEquals(-45.0, result.variables().get("phase[1]"), 1e-5);
    }

    @Test
    void nyquistTfCalculatesCorrectly() {
        // G(s) = 1 / (s + 1). At w = 1, real is 0.5, imag is -0.5.
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1]\n"
                        + "den = [1, 1]\n"
                        + "omega = [1.0]\n"
                        + "CALL nyquist(num[1:2], den[1:2], omega[1:1] : real[1:1], imag[1:1])");

        assertEquals(0.5, result.variables().get("real[1]"), 1e-6);
        assertEquals(-0.5, result.variables().get("imag[1]"), 1e-6);
    }

    @Test
    void marginTfCalculatesCorrectly() {
        // G(s) = 2 / (s^3 + 3s^2 + 2s)
        EquationSystemSolver.Result result = solver.solve(
                "num = [0.0, 0.0, 0.0, 2.0]\n"
                        + "den = [1.0, 3.0, 2.0, 0.0]\n"
                        + "CALL margin(num[1:4], den[1:4] : gm, pm, w_cg, w_cp)");

        assertEquals(20.0 * Math.log10(3.0), result.variables().get("gm"), 1e-2);
        assertEquals(Math.sqrt(2.0), result.variables().get("w_cp"), 1e-2);
        assertEquals(0.75, result.variables().get("w_cg"), 1e-2);
    }
}
