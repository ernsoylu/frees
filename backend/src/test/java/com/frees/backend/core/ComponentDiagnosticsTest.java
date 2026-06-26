package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * §14.1 source-mapped diagnostics — a structurally unsolvable component network
 * reports the variables involved in their dotted display form, so the gap
 * localises to a component/stream rather than a bare equation/variable count.
 */
class ComponentDiagnosticsTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void underspecifiedComponentNetworkListsTheInvolvedStreamMembers() {
        // A boiler with no inlet state specified is under-determined.
        String src = """
                Boiler B(s1, s2)
                B.Q = 1000
                """;
        SolverException ex = assertThrows(SolverException.class, () -> solver.solve(src));
        assertTrue(ex.getMessage().contains("underspecified"), ex.getMessage());
        // Names the streams (s1.* / s2.*) rather than only a count.
        assertTrue(ex.getMessage().contains("s1.") || ex.getMessage().contains("s2."),
                ex.getMessage());
    }
}
