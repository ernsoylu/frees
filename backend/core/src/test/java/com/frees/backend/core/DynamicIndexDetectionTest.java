package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Structural index detection: a DYNAMIC model whose algebraic constraints
 * relate only differentiated states (a rigid coupling) is index-2 and must
 * fail up front with the constraint and the coupled states named — not with
 * an unexplained integrator error at initialization.
 */
class DynamicIndexDetectionTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** Two inertias rigidly coupled by w1 = w2 through an internal torque:
     *  the constraint pairs with no algebraic unknown, so the model is
     *  index-2. The message must name the constraint and both states. */
    @Test
    void rigidTwoInertiaCouplingIsRejectedWithNamedStates() {
        String src = """
                DYNAMIC rigid(t = 0 .. 1)
                der(w1) = (10 - tau_c) / 2
                der(w2) = tau_c / 3
                w1 = w2
                w1(0) = 0
                w2(0) = 0
                END
                """;
        SolverException ex = assertThrows(SolverException.class, () -> solver.solve(src));
        String msg = ex.getMessage();
        assertTrue(msg.contains("index-2"), "names the index: " + msg);
        assertTrue(msg.contains("w1=w2"), "names the constraint: " + msg);
        assertTrue(msg.contains("w1") && msg.contains("w2"), "names the states: " + msg);
        assertTrue(msg.contains("compliance") || msg.contains("differentiate"),
                "suggests the remedy: " + msg);
        assertFalse(msg.contains("IDA"), "no raw integrator internals: " + msg);
    }

    /** Healthy index-1 control: the algebraic equation determines its own
     *  algebraic unknown, so the model integrates normally. */
    @Test
    void healthyIndexOneDaeStillSolves() {
        String src = """
                DYNAMIC ok(t = 0 .. 1)
                der(x) = -x + u
                u = 2 - x
                x(0) = 1
                END
                """;
        assertNotNull(solver.solve(src).odeTables());
    }

    /** An output equation over states is not a constraint — it determines its
     *  own left-hand-side auxiliary and must not be flagged. */
    @Test
    void outputEquationOverStatesIsNotFlagged() {
        String src = """
                DYNAMIC outputs(t = 0 .. 1)
                der(x1) = -x1
                der(x2) = -2*x2
                y = x1 + x2
                x1(0) = 1
                x2(0) = 1
                END
                """;
        assertNotNull(solver.solve(src).odeTables());
    }
}
