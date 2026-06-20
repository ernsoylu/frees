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

    @Test
    void routhReportsStableSystem() {
        // (s+1)(s+2)(s+3) = s^3 + 6s^2 + 11s + 6 -> stable, 0 RHP poles
        EquationSystemSolver.Result result = solver.solve(
                "den = [1, 6, 11, 6]\n"
                        + "CALL routh(den[1:4] : nRHP, stable)");

        assertEquals(0.0, result.variables().get("nRHP"), 1e-9);
        assertEquals(1.0, result.variables().get("stable"), 1e-9);
    }

    @Test
    void routhCountsUnstableRightHalfPlanePoles() {
        // s^3 + s^2 + 2s + 8 -> 2 RHP poles (unstable)
        EquationSystemSolver.Result result = solver.solve(
                "den = [1, 1, 2, 8]\n"
                        + "CALL routh(den[1:4] : nRHP, stable)");

        assertEquals(2.0, result.variables().get("nRHP"), 1e-9);
        assertEquals(0.0, result.variables().get("stable"), 1e-9);
    }

    @Test
    void c2dTustinDiscretizesIntegrator() {
        // 1/s with Tustin at Ts = 0.1 -> (0.05 z + 0.05) / (z - 1)
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1]\n"
                        + "den = [1, 0]\n"
                        + "Ts = 0.1\n"
                        + "CALL c2d(num[1:2], den[1:2], Ts, 'tustin' : numz[1:2], denz[1:2])");

        assertEquals(0.05, result.variables().get("numz[1]"), 1e-9);
        assertEquals(0.05, result.variables().get("numz[2]"), 1e-9);
        assertEquals(1.0, result.variables().get("denz[1]"), 1e-9);
        assertEquals(-1.0, result.variables().get("denz[2]"), 1e-9);
    }

    @Test
    void c2dZohDiscretizesFirstOrderPlant() {
        // 2/(s+2) with ZOH at Ts = 0.1: pole maps to e^{-0.2}, dc gain preserved
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 2]\n"
                        + "den = [1, 2]\n"
                        + "Ts = 0.1\n"
                        + "CALL c2d(num[1:2], den[1:2], Ts, 'zoh' : numz[1:2], denz[1:2])");

        double pole = Math.exp(-0.2);
        assertEquals(1.0, result.variables().get("denz[1]"), 1e-6);
        assertEquals(-pole, result.variables().get("denz[2]"), 1e-6);
        assertEquals(1.0 - pole, result.variables().get("numz[2]"), 1e-6);
    }

    @Test
    void residueComputesInverseLaplaceResidues() {
        // (s+3)/(s^2+3s+2) = 2/(s+1) - 1/(s+2); poles sorted ascending: -2, -1
        EquationSystemSolver.Result result = solver.solve(
                "num = [1, 3]\n"
                        + "den = [1, 3, 2]\n"
                        + "CALL residue(num[1:2], den[1:3] : r_r[1:2], r_i[1:2], p_r[1:2], p_i[1:2], k)");

        assertEquals(-2.0, result.variables().get("p_r[1]"), 1e-6);
        assertEquals(-1.0, result.variables().get("r_r[1]"), 1e-6);
        assertEquals(-1.0, result.variables().get("p_r[2]"), 1e-6);
        assertEquals(2.0, result.variables().get("r_r[2]"), 1e-6);
        assertEquals(0.0, result.variables().get("k"), 1e-9);
    }

    @Test
    void nicholsMatchesBodeData() {
        // G(s) = 1/(s+1). At w = 1: magnitude -3.0103 dB, phase -45 deg.
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 1]\n"
                        + "den = [1, 1]\n"
                        + "omega = [1.0]\n"
                        + "CALL nichols(num[1:2], den[1:2], omega[1:1] : mag[1:1], phase[1:1])");

        assertEquals(-3.0102999566, result.variables().get("mag[1]"), 1e-5);
        assertEquals(-45.0, result.variables().get("phase[1]"), 1e-5);
    }

    @Test
    void errorConstantsForType0OpenLoop() {
        // G(s) = 20/((s+1)(s+5)) = 20/(s^2+6s+5): type 0 -> Kp = 4, Kv = 0, Ka = 0
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 0, 20]\n"
                        + "den = [1, 6, 5]\n"
                        + "CALL errorconst(num[1:3], den[1:3] : Kp, Kv, Ka)");

        assertEquals(4.0, result.variables().get("Kp"), 1e-9);
        assertEquals(0.0, result.variables().get("Kv"), 1e-9);
        assertEquals(0.0, result.variables().get("Ka"), 1e-9);
    }

    @Test
    void masonSignalFlowGraph() {
        // Single forward path (gain 6) with one feedback loop (gain 1.5):
        // T = 6 / (1 - 1.5) = -12
        EquationSystemSolver.Result result = solver.solve(
                "G = [0, 2, 0; 0, 0, 3; 0, 0.5, 0]\n"
                        + "CALL mason(G[1:3,1:3], 1, 3 : T)");

        assertEquals(-12.0, result.variables().get("T"), 1e-9);
    }
}
