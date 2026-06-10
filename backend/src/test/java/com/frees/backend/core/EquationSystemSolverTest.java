package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EquationSystemSolverTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void solvesMilestoneOneSystem() {
        // Milestone 1 from ARCHITECTURE_AND_REQUIREMENTS.md.
        EquationSystemSolver.Result result = solver.solve("x+y=3\ny=z-4\nz=x^2-3");

        double x = result.variables().get("x");
        double y = result.variables().get("y");
        double z = result.variables().get("z");

        assertEquals(3.0, x + y, 1e-8);
        assertEquals(z - 4.0, y, 1e-8);
        assertEquals(x * x - 3.0, z, 1e-8);
        // Starting from guess 1.0, Newton lands on the positive root (-1+sqrt(41))/2.
        assertEquals((-1 + Math.sqrt(41)) / 2, x, 1e-8);
    }

    @Test
    void solvesClaudeMdReferenceSystem() {
        // Reference verification system from CLAUDE.md.
        EquationSystemSolver.Result result = solver.solve("x^2 + y^3 = 77\nx / y = 1.23456");

        double x = result.variables().get("x");
        double y = result.variables().get("y");

        assertEquals(77.0, x * x + y * y * y, 1e-7);
        assertEquals(1.23456, x / y, 1e-9);
    }

    @Test
    void solvesSequentialSystemViaBlocks() {
        EquationSystemSolver.Result result = solver.solve("a = 10\nb = a * 2\nc = a + b");

        assertEquals(3, result.blocks().size());
        assertEquals(10.0, result.variables().get("a"), 1e-12);
        assertEquals(20.0, result.variables().get("b"), 1e-12);
        assertEquals(30.0, result.variables().get("c"), 1e-12);
    }

    @Test
    void residualsAreReportedPerEquation() {
        EquationSystemSolver.Result result = solver.solve("x = 5\ny = x + 2");
        assertEquals(2, result.residuals().size());
        for (EquationSystemSolver.EquationResidual r : result.residuals()) {
            assertTrue(Math.abs(r.residual()) < 1e-9, "residual too large for " + r.equation());
        }
    }

    @Test
    void equationsMaySpanCommentsAndMixedCase() {
        EquationSystemSolver.Result result = solver.solve(
                "{ inlet } TEMP = 300\npressure = Temp * 2 \"ideal-ish\"");
        assertEquals(600.0, result.variables().get("pressure"), 1e-12);
    }

    @Test
    void underdeterminedSystemFailsWithClearMessage() {
        SolverException e = assertThrows(SolverException.class,
                () -> solver.solve("x + y = 3"));
        assertTrue(e.getMessage().contains("underspecified"));
    }

    @Test
    void checkReportsSolvableSystem() {
        EquationSystemSolver.CheckResult check = solver.check("x+y=3\ny=z-4\nz=x^2-3");
        assertTrue(check.solvable());
        assertEquals(3, check.equationCount());
        assertEquals(3, check.unknownCount());
        assertTrue(check.message().contains("3 equations and 3 variables"));
    }

    @Test
    void checkReportsUnderspecifiedSystem() {
        EquationSystemSolver.CheckResult check = solver.check("x + y = 3");
        assertTrue(!check.solvable());
        assertEquals(1, check.equationCount());
        assertEquals(2, check.unknownCount());
        assertTrue(check.message().contains("underspecified"));
    }

    @Test
    void checkReportsOverspecifiedSystem() {
        EquationSystemSolver.CheckResult check = solver.check("x = 1\nx = 2");
        assertTrue(!check.solvable());
        assertTrue(check.message().contains("overspecified"));
    }

    @Test
    void checkReportsStructurallySingularSystem() {
        // 3 equations, 3 variables, but a and only a appears in two equations
        // that can each determine nothing else: no complete assignment exists.
        EquationSystemSolver.CheckResult check = solver.check("a = 1\na = 2\nb + c = 3");
        assertTrue(!check.solvable());
        assertTrue(check.message().contains("structurally singular"));
    }
}
