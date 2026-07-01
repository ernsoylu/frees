package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
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

    @Test
    void rigidlyCoupledStorageIsRejectedAsHighIndex() {
        // Two thermal masses tied to one node force their (both-integrated)
        // temperatures equal → index-2 DAE; the guard rejects it with guidance.
        String src = """
                ThermalMass   M1(C=5000, T0=400)
                ThermalMass   M2(C=3000, T0=300)
                connect(M1.port, M2.port)
                DYNAMIC d(method = ode45, time = 0 .. 10)
                END
                """;
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> solver.solve(src));
        assertTrue(ex.getMessage().contains("High-index") || ex.getMessage().contains("rigidly coupled"),
                ex.getMessage());
    }
}
