package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * End-to-end check of tf2ss, zp2tf, and tf2zp conversions flowing through the solver.
 */
class ControlSystemConversionsTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void tf2ssConvertsSecondOrderSystemCorrectly() {
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 0, 1]\n"
                        + "den = [1, 3, 2]\n"
                        + "CALL tf2ss(num, den : A[1:2,1:2], B[1:2], C[1:2], D)");

        // A = [-3, -2; 1, 0]
        assertEquals(-3.0, result.variables().get("a[1,1]"), 1e-8);
        assertEquals(-2.0, result.variables().get("a[1,2]"), 1e-8);
        assertEquals(1.0, result.variables().get("a[2,1]"), 1e-8);
        assertEquals(0.0, result.variables().get("a[2,2]"), 1e-8);

        // B = [1; 0]
        assertEquals(1.0, result.variables().get("b[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("b[2]"), 1e-8);

        // C = [0, 1]
        assertEquals(0.0, result.variables().get("c[1]"), 1e-8);
        assertEquals(1.0, result.variables().get("c[2]"), 1e-8);

        // D = 0
        assertEquals(0.0, result.variables().get("d"), 1e-8);
    }

    @Test
    void zp2tfConvertsCorrectly() {
        EquationSystemSolver.Result result = solver.solve(
                "zr = [-3.0]\n"
                        + "zi = [0.0]\n"
                        + "pr = [-1.0, -2.0]\n"
                        + "pi = [0.0, 0.0]\n"
                        + "k = 2.0\n"
                        + "CALL zp2tf(zr, zi, pr, pi, k : num[1:3], den[1:3])");

        // num = 2*(s + 3) = [0, 2, 6]
        assertEquals(0.0, result.variables().get("num[1]"), 1e-8);
        assertEquals(2.0, result.variables().get("num[2]"), 1e-8);
        assertEquals(6.0, result.variables().get("num[3]"), 1e-8);

        // den = (s + 1)*(s + 2) = [1, 3, 2]
        assertEquals(1.0, result.variables().get("den[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("den[2]"), 1e-8);
        assertEquals(2.0, result.variables().get("den[3]"), 1e-8);
    }

    @Test
    void tf2zpConvertsCorrectly() {
        EquationSystemSolver.Result result = solver.solve(
                "num = [0, 2, 6]\n"
                        + "den = [1, 3, 2]\n"
                        + "CALL tf2zp(num, den : zr[1:1], zi[1:1], pr[1:2], pi[1:2], k)");

        // z = -3
        assertEquals(-3.0, result.variables().get("zr[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("zi[1]"), 1e-8);

        // poles sorted: -2, -1
        assertEquals(-2.0, result.variables().get("pr[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("pi[1]"), 1e-8);
        assertEquals(-1.0, result.variables().get("pr[2]"), 1e-8);
        assertEquals(0.0, result.variables().get("pi[2]"), 1e-8);

        // k = 2
        assertEquals(2.0, result.variables().get("k"), 1e-8);
    }

    @Test
    void roundTripTf2ssAndSs2tf() {
        EquationSystemSolver.Result result = solver.solve(
                "num1 = [0, 0, 1]\n"
                        + "den1 = [1, 3, 2]\n"
                        + "CALL tf2ss(num1, den1 : A[1:2,1:2], B[1:2], C[1:2], D)\n"
                        + "CALL ss2tf(A, B, C, D : num2[1:3], den2[1:3])");

        assertEquals(0.0, result.variables().get("num2[1]"), 1e-8);
        assertEquals(0.0, result.variables().get("num2[2]"), 1e-8);
        assertEquals(1.0, result.variables().get("num2[3]"), 1e-8);

        assertEquals(1.0, result.variables().get("den2[1]"), 1e-8);
        assertEquals(3.0, result.variables().get("den2[2]"), 1e-8);
        assertEquals(2.0, result.variables().get("den2[3]"), 1e-8);
    }
}
