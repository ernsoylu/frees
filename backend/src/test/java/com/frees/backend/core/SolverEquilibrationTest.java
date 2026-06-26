package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * §8.5 automatic scaling — the Newton linear solve column-equilibrates the
 * Jacobian, so a coupled block whose unknowns span many orders of magnitude
 * (the multidomain reality: P~10⁵ next to I~10⁻³) is resolved accurately rather
 * than losing the small unknown to round-off in the LU factorization.
 */
class SolverEquilibrationTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void coupledBlockWithTwelveOrdersOfMagnitudeScaleDisparitySolves() {
        // A genuine 2×2 coupled SCC where big ~ 1e6 and small ~ 1e-6 (Jacobian
        // columns differ by ~1e12). Solution: big = 1e6, small = 1e-6.
        String src = """
                big   = 2e6 - 1e12 * small
                small = 1e-6 * sqrt(big / 1e6)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(1.0e6, v.get("big"), 1.0);          // large unknown
        assertEquals(1.0e-6, v.get("small"), 1.0e-12);   // small unknown resolved accurately
    }
}
