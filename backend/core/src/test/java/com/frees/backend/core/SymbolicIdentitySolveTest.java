package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * End-to-end check that a SYMBOLIC partial-fraction identity flows all the way
 * through the solver and reports the residues as solved variables — mirroring
 * the "Partial Fractions (Laplace)" example document.
 */
class SymbolicIdentitySolveTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void solvesPartialFractionExampleEndToEnd() {
        EquationSystemSolver.Result result = solver.solve(
                "SYMBOLIC s\n"
                        + "tf([1, 3], [1, 3, 2]) = A/(s+1) + B/(s+2)\n"
                        + "y_initial = A + B");

        assertEquals(2.0, result.variables().get("a"), 1e-8);
        assertEquals(-1.0, result.variables().get("b"), 1e-8);
        assertEquals(1.0, result.variables().get("y_initial"), 1e-8);
    }
}
