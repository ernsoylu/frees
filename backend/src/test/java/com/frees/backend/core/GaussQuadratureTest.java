package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tier 1.3 Gauss–Legendre quadrature ({@code GaussIntegral}). Checks definite
 * integrals against their closed-form values.
 */
class GaussQuadratureTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static double v(EquationSystemSolver.Result r, String key) {
        Double d = r.variables().get(key);
        if (d == null) {
            throw new AssertionError("missing variable " + key + " in " + r.variables().keySet());
        }
        return d;
    }

    @Test
    void polynomialIntegral() {
        // ∫₀¹ x² dx = 1/3
        EquationSystemSolver.Result r = solver.solve("y = GaussIntegral(x^2, x, 0, 1)\n");
        assertEquals(1.0 / 3.0, v(r, "y"), 1e-9);
    }

    @Test
    void trigIntegral() {
        // ∫₀^π sin(x) dx = 2
        EquationSystemSolver.Result r = solver.solve("y = GaussIntegral(sin(x), x, 0, 3.141592653589793)\n");
        assertEquals(2.0, v(r, "y"), 1e-8);
    }

    @Test
    void exponentialIntegralWithPointCount() {
        // ∫₀¹ e^x dx = e − 1, with an explicit 7-point rule
        EquationSystemSolver.Result r = solver.solve("y = GaussIntegral(exp(x), x, 0, 1, 7)\n");
        assertEquals(Math.E - 1.0, v(r, "y"), 1e-9);
    }
}
