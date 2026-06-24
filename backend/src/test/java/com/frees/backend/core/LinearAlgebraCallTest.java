package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tier 1.1 dense linear-algebra intrinsics: QR, Cholesky, matrix exponential,
 * singular values, trace and Frobenius norm. Each case solves a small document
 * and checks the result against a hand- or textbook-verified answer.
 */
class LinearAlgebraCallTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static double v(EquationSystemSolver.Result r, String key) {
        Double d = r.variables().get(key);
        if (d == null) {
            throw new AssertionError("missing variable " + key + " in " + r.variables().keySet());
        }
        return d;
    }

    /** QR of a 3×3 matrix: Q·R must reconstruct A, and R must be upper-triangular. */
    @Test
    void qrReconstructsAndIsTriangular() {
        String src = "A = [12, -51, 4; 6, 167, -68; -4, 24, -41]\n"
                + "CALL QR(A : Q, R)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        double[][] a = {{12, -51, 4}, {6, 167, -68}, {-4, 24, -41}};
        double[][] q = new double[3][3];
        double[][] rr = new double[3][3];
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                q[i][j] = v(r, "q[" + (i + 1) + "," + (j + 1) + "]");
                rr[i][j] = v(r, "r[" + (i + 1) + "," + (j + 1) + "]");
            }
        }
        // R upper-triangular
        assertEquals(0.0, rr[1][0], 1e-9);
        assertEquals(0.0, rr[2][0], 1e-9);
        assertEquals(0.0, rr[2][1], 1e-9);
        // Q·R == A
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                double acc = 0.0;
                for (int k = 0; k < 3; k++) {
                    acc += q[i][k] * rr[k][j];
                }
                assertEquals(a[i][j], acc, 1e-6, "Q*R mismatch at " + i + "," + j);
            }
        }
    }

    /** Cholesky of a known SPD matrix: A = L·Lᵀ with the textbook L. */
    @Test
    void choleskyKnownFactor() {
        String src = "A = [4, 12, -16; 12, 37, -43; -16, -43, 98]\n"
                + "CALL Cholesky(A : L)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(2.0, v(r, "l[1,1]"), 1e-9);
        assertEquals(6.0, v(r, "l[2,1]"), 1e-9);
        assertEquals(1.0, v(r, "l[2,2]"), 1e-9);
        assertEquals(-8.0, v(r, "l[3,1]"), 1e-9);
        assertEquals(5.0, v(r, "l[3,2]"), 1e-9);
        assertEquals(3.0, v(r, "l[3,3]"), 1e-9);
        assertEquals(0.0, v(r, "l[1,2]"), 1e-9); // upper triangle is zero
    }

    /** e^A for a nilpotent matrix has the exact closed form I + A. */
    @Test
    void matExpNilpotent() {
        String src = "A = [0, 1; 0, 0]\nCALL MatExp(A : E)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(1.0, v(r, "e[1,1]"), 1e-10);
        assertEquals(1.0, v(r, "e[1,2]"), 1e-10);
        assertEquals(0.0, v(r, "e[2,1]"), 1e-10);
        assertEquals(1.0, v(r, "e[2,2]"), 1e-10);
    }

    /** e^A for the rotation generator [[0,1],[-1,0]] is the rotation matrix R(1 rad). */
    @Test
    void matExpRotationGenerator() {
        String src = "A = [0, 1; -1, 0]\nCALL MatExp(A : E)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(Math.cos(1.0), v(r, "e[1,1]"), 1e-8);
        assertEquals(Math.sin(1.0), v(r, "e[1,2]"), 1e-8);
        assertEquals(-Math.sin(1.0), v(r, "e[2,1]"), 1e-8);
        assertEquals(Math.cos(1.0), v(r, "e[2,2]"), 1e-8);
    }

    /** Singular values of a diagonal matrix are |diagonal| in non-increasing order. */
    @Test
    void singularValuesOfDiagonal() {
        String src = "A = [2, 0; 0, 3]\nCALL SingularValues(A : s)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(3.0, v(r, "s[1]"), 1e-9);
        assertEquals(2.0, v(r, "s[2]"), 1e-9);
    }

    /** Trace and Frobenius norm as scalar expression functions. */
    @Test
    void traceAndFrobeniusNorm() {
        String src = "A = [1, 2; 3, 4]\nt = Trace(A)\nf = MatrixNorm(A)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(5.0, v(r, "t"), 1e-12);
        assertEquals(Math.sqrt(30.0), v(r, "f"), 1e-9);
    }
}
