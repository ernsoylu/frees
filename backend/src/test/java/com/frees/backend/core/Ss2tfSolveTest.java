package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * End-to-end check of the symbolic state-space -> transfer-function conversion
 * (CALL ss2tf) flowing through the solver.
 */
class Ss2tfSolveTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void ss2tfRecoversSecondOrderTransferFunction() {
        // Controllable canonical form of 1/(s^2 + 3s + 2).
        EquationSystemSolver.Result result = solver.solve(
                "A = [0, 1; -2, -3]\n"
                        + "B = [0; 1]\n"
                        + "C = [1, 0]\n"
                        + "D = [0]\n"
                        + "CALL ss2tf(A, B, C, D : num[1:3], den[1:3])");

        // den = s^2 + 3s + 2  ->  [1, 3, 2]
        assertEquals(1.0, result.variables().get("den[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("den[2]"), 1e-8);
        assertEquals(2.0, result.variables().get("den[3]"), 1e-8);
        // num = 1  ->  [0, 0, 1]
        assertEquals(0.0, result.variables().get("num[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("num[2]"), 1e-8);
        assertEquals(1.0, result.variables().get("num[3]"), 1e-8);
    }

    @Test
    void ss2tfRecoversSecondOrderTransferFunctionWithManualSlices() {
        // Controllable canonical form of 1/(s^2 + 3s + 2) using manual 1D slices.
        EquationSystemSolver.Result result = solver.solve(
                "A = [0, 1; -2, -3]\n"
                        + "B = [0; 1]\n"
                        + "C = [1, 0]\n"
                        + "D = [0]\n"
                        + "CALL ss2tf(A[1:2,1:2], B[1:2], C[1:2], D[1] : num[1:3], den[1:3])");

        assertEquals(1.0, result.variables().get("den[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("den[2]"), 1e-8);
        assertEquals(2.0, result.variables().get("den[3]"), 1e-8);
        assertEquals(0.0, result.variables().get("num[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("num[2]"), 1e-8);
        assertEquals(1.0, result.variables().get("num[3]"), 1e-8);
    }

    @Test
    void ss2tfRecoversSecondOrderTransferFunctionWithManual2DSlices() {
        // Controllable canonical form of 1/(s^2 + 3s + 2) using manual 2D slices.
        EquationSystemSolver.Result result = solver.solve(
                "A[1,1] = 0\n"
                        + "A[1,2] = 1\n"
                        + "A[2,1] = -2\n"
                        + "A[2,2] = -3\n"
                        + "B[1,1] = 0\n"
                        + "B[2,1] = 1\n"
                        + "C[1,1] = 1\n"
                        + "C[1,2] = 0\n"
                        + "D[1,1] = 0\n"
                        + "CALL ss2tf(A[1:2,1:2], B[1:2,1:1], C[1:1,1:2], D[1:1,1:1] : num[1:3], den[1:3])");

        assertEquals(1.0, result.variables().get("den[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("den[2]"), 1e-8);
        assertEquals(2.0, result.variables().get("den[3]"), 1e-8);
        assertEquals(0.0, result.variables().get("num[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("num[2]"), 1e-8);
        assertEquals(1.0, result.variables().get("num[3]"), 1e-8);
    }
}
