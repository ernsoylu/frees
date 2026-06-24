package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tier 3 orthogonal-polynomial builtins, checked against closed-form values.
 */
class OrthogonalPolynomialsTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static double v(EquationSystemSolver.Result r, String key) {
        Double d = r.variables().get(key);
        if (d == null) {
            throw new AssertionError("missing variable " + key + " in " + r.variables().keySet());
        }
        return d;
    }

    @Test
    void legendre() {
        // P2(x) = (3x²−1)/2, P3(x) = (5x³−3x)/2
        EquationSystemSolver.Result r = solver.solve(
                "a = LegendreP(2, 0.5)\nb = LegendreP(3, 0.5)\nc = LegendreP(0, 9)\n");
        assertEquals(-0.125, v(r, "a"), 1e-12);
        assertEquals(-0.4375, v(r, "b"), 1e-12);
        assertEquals(1.0, v(r, "c"), 1e-12);
    }

    @Test
    void chebyshev() {
        // T3(x) = 4x³−3x, U2(x) = 4x²−1
        EquationSystemSolver.Result r = solver.solve(
                "a = ChebyshevT(3, 0.5)\nb = ChebyshevU(2, 0.5)\nc = ChebyshevU(1, 0.5)\n");
        assertEquals(-1.0, v(r, "a"), 1e-12);
        assertEquals(0.0, v(r, "b"), 1e-12);
        assertEquals(1.0, v(r, "c"), 1e-12);
    }

    @Test
    void hermiteAndLaguerre() {
        // H3(x) = 8x³−12x; L2(x) = (x²−4x+2)/2
        EquationSystemSolver.Result r = solver.solve(
                "a = HermiteH(3, 1)\nb = HermiteH(2, 1)\nc = LaguerreL(2, 1)\nd = LaguerreL(1, 1)\n");
        assertEquals(-4.0, v(r, "a"), 1e-12);
        assertEquals(2.0, v(r, "b"), 1e-12);
        assertEquals(-0.5, v(r, "c"), 1e-12);
        assertEquals(0.0, v(r, "d"), 1e-12);
    }
}
