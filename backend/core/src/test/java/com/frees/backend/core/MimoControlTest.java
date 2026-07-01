package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tier 2.1 MIMO control: {@code CALL ss2tfij} extracts the transfer function of
 * any input→output channel of a multivariable state space. Verified on a
 * decoupled 2-input/2-output system whose channel transfer functions are known.
 *
 * <p>A = diag(-1,-2), B = C = I, D = 0. The shared denominator is
 * (s+1)(s+2) = s²+3s+2. Channel (1,1) is 1/(s+1) = (s+2)/den; channel (2,2) is
 * 1/(s+2) = (s+1)/den; the cross channels (1,2) and (2,1) are exactly zero.
 * Coefficients are descending powers, length n+1 = 3.
 */
class MimoControlTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static final String SYS =
            "A = [-1, 0; 0, -2]\nB = [1, 0; 0, 1]\nC = [1, 0; 0, 1]\nD = [0, 0; 0, 0]\n";

    private static double v(EquationSystemSolver.Result r, String key) {
        Double d = r.variables().get(key);
        if (d == null) {
            throw new AssertionError("missing variable " + key + " in " + r.variables().keySet());
        }
        return d;
    }

    private void assertDen(EquationSystemSolver.Result r, String name) {
        assertEquals(1.0, v(r, name + "[1]"), 1e-9);
        assertEquals(3.0, v(r, name + "[2]"), 1e-9);
        assertEquals(2.0, v(r, name + "[3]"), 1e-9);
    }

    @Test
    void channel11Is1OverSplus1() {
        EquationSystemSolver.Result r = solver.solve(SYS
                + "CALL ss2tfij(A, B, C, D, 1, 1 : num, den)\n");
        assertEquals(0.0, v(r, "num[1]"), 1e-9);
        assertEquals(1.0, v(r, "num[2]"), 1e-9);
        assertEquals(2.0, v(r, "num[3]"), 1e-9); // (s+2)/((s+1)(s+2)) = 1/(s+1)
        assertDen(r, "den");
    }

    @Test
    void channel22Is1OverSplus2() {
        EquationSystemSolver.Result r = solver.solve(SYS
                + "CALL ss2tfij(A, B, C, D, 2, 2 : num, den)\n");
        assertEquals(0.0, v(r, "num[1]"), 1e-9);
        assertEquals(1.0, v(r, "num[2]"), 1e-9);
        assertEquals(1.0, v(r, "num[3]"), 1e-9); // (s+1)/((s+1)(s+2)) = 1/(s+2)
        assertDen(r, "den");
    }

    @Test
    void crossChannel12IsZero() {
        EquationSystemSolver.Result r = solver.solve(SYS
                + "CALL ss2tfij(A, B, C, D, 1, 2 : num, den)\n");
        assertEquals(0.0, v(r, "num[1]"), 1e-9);
        assertEquals(0.0, v(r, "num[2]"), 1e-9);
        assertEquals(0.0, v(r, "num[3]"), 1e-9);
    }
}
