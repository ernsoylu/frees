package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AllRootsSolverTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private List<EquationSystemSolver.Solution> solveAll(String text) {
        return solver.solveAll(text, SolverSettings.DEFAULTS, Map.of()).solutions();
    }

    @Test
    void findsBothRootsOfExponentialEquation() {
        List<EquationSystemSolver.Solution> solutions =
                solveAll("4^x - 3 * 2^(x+1) + 8 = 0");

        assertEquals(2, solutions.size());
        assertEquals(1.0, solutions.get(0).variables().get("x"), 1e-6);
        assertEquals(2.0, solutions.get(1).variables().get("x"), 1e-6);
    }

    @Test
    void findsBothRootsOfQuadratic() {
        List<EquationSystemSolver.Solution> solutions = solveAll("x^2 = 4");

        assertEquals(2, solutions.size());
        assertEquals(-2.0, solutions.get(0).variables().get("x"), 1e-6);
        assertEquals(2.0, solutions.get(1).variables().get("x"), 1e-6);
    }

    @Test
    void boundsRestrictTheRootSearch() {
        var result = solver.solveAll("x^2 = 4", SolverSettings.DEFAULTS,
                Map.of("x", new VariableSpec("x", 1.0, 0.0, Double.POSITIVE_INFINITY)));

        assertEquals(1, result.solutions().size());
        assertEquals(2.0, result.solutions().get(0).variables().get("x"), 1e-6);
    }

    @Test
    void branchesAcrossSequentialBlocks() {
        // Block 1: x^2=4 (two roots); block 2: y=x+1 follows each branch.
        List<EquationSystemSolver.Solution> solutions = solveAll("x^2 = 4\ny = x + 1");

        assertEquals(2, solutions.size());
        assertEquals(-2.0, solutions.get(0).variables().get("x"), 1e-6);
        assertEquals(-1.0, solutions.get(0).variables().get("y"), 1e-6);
        assertEquals(2.0, solutions.get(1).variables().get("x"), 1e-6);
        assertEquals(3.0, solutions.get(1).variables().get("y"), 1e-6);
    }

    @Test
    void multiStartFindsAllSolutionsOfCoupledBlock() {
        // x^2+y^2=25, x*y=12 has four solutions: (±3,±4) and (±4,±3).
        List<EquationSystemSolver.Solution> solutions =
                solveAll("x^2 + y^2 = 25\nx * y = 12");

        assertEquals(4, solutions.size(),
                "found: " + solutions.stream().map(s -> s.variables().toString()).toList());
        for (EquationSystemSolver.Solution s : solutions) {
            double x = s.variables().get("x");
            double y = s.variables().get("y");
            assertEquals(25.0, x * x + y * y, 1e-5);
            assertEquals(12.0, x * y, 1e-5);
        }
    }

    @Test
    void singleRootSystemStillReturnsOneSolution() {
        List<EquationSystemSolver.Solution> solutions = solveAll("x + 3 = 10");
        assertEquals(1, solutions.size());
        assertEquals(7.0, solutions.get(0).variables().get("x"), 1e-9);
    }

    @Test
    void milestoneSystemFindsBothCoupledRoots() {
        // The Milestone 1 system reduces to x^2+x-10=0: roots (-1±sqrt(41))/2.
        List<EquationSystemSolver.Solution> solutions =
                solveAll("x+y=3\ny=z-4\nz=x^2-3");

        assertEquals(2, solutions.size());
        double expectedLow = (-1 - Math.sqrt(41)) / 2;
        double expectedHigh = (-1 + Math.sqrt(41)) / 2;
        assertEquals(expectedLow, solutions.get(0).variables().get("x"), 1e-5);
        assertEquals(expectedHigh, solutions.get(1).variables().get("x"), 1e-5);
    }

    @Test
    void residualsReportedPerSolution() {
        for (EquationSystemSolver.Solution s : solveAll("x^2 = 4")) {
            assertTrue(s.maxResidual() < 1e-6);
            assertEquals(1, s.residuals().size());
        }
    }
}
