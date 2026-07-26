package com.frees.backend.core;

import com.frees.backend.core.dae.SparseSteadyKlu;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * The sparse steady path: colored finite-difference Jacobian above the block
 * size threshold, and the KLU sparse linear stage when the native toolchain
 * is present (dense fallback otherwise — the chain test passes either way).
 */
class SparseSteadyPathTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** KLU solves a small fixed CSC system exactly. */
    @Test
    void kluSolvesKnownSystem() {
        assumeTrue(SparseSteadyKlu.available(), "KLU native toolchain not available");
        // A = [[4,1,0],[1,3,0],[0,0,2]] in CSC (column -> ascending rows).
        List<List<Integer>> pattern = List.of(List.of(0, 1), List.of(0, 1), List.of(2));
        try (SparseSteadyKlu klu = SparseSteadyKlu.create(pattern)) {
            assertNotNull(klu, "creation must succeed when available");
            double[] values = {4, 1, 1, 3, 2};
            double[] x = klu.solve(values, new double[] {1, 2, 3});
            assertNotNull(x, "solve must succeed");
            assertEquals(1.0 / 11.0, x[0], 1e-12);
            assertEquals(7.0 / 11.0, x[1], 1e-12);
            assertEquals(1.5, x[2], 1e-12);
            // Refill with new values: the factorization must refresh.
            double[] x2 = klu.solve(new double[] {2, 0, 0, 2, 4}, new double[] {2, 2, 8});
            assertNotNull(x2);
            assertEquals(1.0, x2[0], 1e-12);
            assertEquals(1.0, x2[1], 1e-12);
            assertEquals(2.0, x2[2], 1e-12);
        }
    }

    /**
     * A 300-unknown nonlinear tridiagonal chain — one coupled block far above
     * the sparse threshold. min() has no symbolic derivative, so the whole
     * block takes the numerical-Jacobian path: colored FD needs ~4 residual
     * sweeps per iteration instead of 300. Self-validating: the returned
     * values are plugged back into every equation.
     */
    @Test
    void largeTridiagonalChainSolvesOnTheSparsePath() {
        int n = 300;
        StringBuilder sb = new StringBuilder();
        sb.append("v1 = 1 + 0.001*v2^2\n");
        for (int i = 2; i < n; i++) {
            sb.append("v").append(i - 1).append(" - 2*v").append(i).append(" + v").append(i + 1)
              .append(" = 0.001*min(v").append(i).append("^2, 1e9) - 0.01\n");
        }
        sb.append("v").append(n).append(" = 2 + 0.001*v").append(n - 1).append("^2\n");

        long start = System.nanoTime();
        Map<String, Double> v = solver.solve(sb.toString()).variables();
        long ms = (System.nanoTime() - start) / 1_000_000;
        System.out.println("[sparse-steady] " + n + "-unknown chain solved in " + ms
                + " ms (klu=" + SparseSteadyKlu.available() + ")");

        double r1 = v.get("v1") - (1 + 0.001 * Math.pow(v.get("v2"), 2));
        assertEquals(0.0, r1, 1e-6, "boundary residual v1");
        for (int i = 2; i < n; i++) {
            double vi = v.get("v" + i);
            double r = v.get("v" + (i - 1)) - 2 * vi + v.get("v" + (i + 1))
                    - (0.001 * Math.min(vi * vi, 1e9) - 0.01);
            assertEquals(0.0, r, 1e-6, "interior residual at " + i);
        }
        double rn = v.get("v" + n) - (2 + 0.001 * Math.pow(v.get("v" + (n - 1)), 2));
        assertEquals(0.0, rn, 1e-6, "boundary residual vn");
        assertTrue(v.get("v" + (n / 2)) > 0.0, "chain interior stays physical");
    }
}
