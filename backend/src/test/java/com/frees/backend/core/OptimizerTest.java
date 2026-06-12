package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Story 4.3: one-dimensional Min/Max via Brent's method. */
class OptimizerTest {

    private final Optimizer optimizer = new Optimizer(new EquationSystemSolver());

    private Optimizer.OptimizeResult run(String text, String objective,
                                         String decision, double lower,
                                         double upper, boolean maximize) {
        return optimizer.optimize(new Optimizer.Problem(text,
                SolverSettings.DEFAULTS, Map.of(),
                objective, decision, lower, upper, maximize));
    }

    @Test
    void minimizesParabola() {
        Optimizer.OptimizeResult result =
                run("y = (x - 3)^2 + 2", "y", "x", -10, 10, false);
        assertEquals(3.0, result.decisionValue(), 1e-6);
        assertEquals(2.0, result.objectiveValue(), 1e-9);
    }

    @Test
    void maximizesParabola() {
        Optimizer.OptimizeResult result =
                run("y = 5 - (x - 1)^2", "y", "x", -10, 10, true);
        assertEquals(1.0, result.decisionValue(), 1e-6);
        assertEquals(5.0, result.objectiveValue(), 1e-9);
    }

    @Test
    void optimizesThroughMultiEquationSystem() {
        // Fixed perimeter rectangle: w + h = 10, A = w*h -> max at w = 5, A = 25.
        Optimizer.OptimizeResult result =
                run("w + h = 10\nA = w*h", "A", "w", 0, 10, true);
        assertEquals(5.0, result.decisionValue(), 1e-5);
        assertEquals(25.0, result.objectiveValue(), 1e-7);
        // The full solution at the optimum is reported.
        assertEquals(5.0, result.solution().variables().get("h"), 1e-5);
    }

    @Test
    void minimizesRosenbrockSimplex() {
        // Rosenbrock function: f(x, y) = (1 - x)^2 + 100 * (y - x^2)^2
        // Minimum at (1, 1) with value 0
        String equations = "f = (1 - x)^2 + 100 * (y - x^2)^2";
        Optimizer.OptimizeResult result = optimizer.optimize(new Optimizer.Problem(
                equations,
                SolverSettings.DEFAULTS,
                Map.of(),
                "f",
                java.util.List.of("x", "y"),
                java.util.List.of(-5.0, -5.0),
                java.util.List.of(5.0, 5.0),
                "simplex",
                false
        ));
        assertEquals(1.0, result.decisionValues()[0], 1e-4);
        assertEquals(1.0, result.decisionValues()[1], 1e-4);
        assertEquals(0.0, result.objectiveValue(), 1e-6);
    }

    @Test
    void minimizesRosenbrockBobyqa() {
        // Rosenbrock function: f(x, y) = (1 - x)^2 + 100 * (y - x^2)^2
        // Minimum at (1, 1) with value 0
        String equations = "f = (1 - x)^2 + 100 * (y - x^2)^2";
        Optimizer.OptimizeResult result = optimizer.optimize(new Optimizer.Problem(
                equations,
                SolverSettings.DEFAULTS,
                Map.of(),
                "f",
                java.util.List.of("x", "y"),
                java.util.List.of(-5.0, -5.0),
                java.util.List.of(5.0, 5.0),
                "bobyqa",
                false
        ));
        assertEquals(1.0, result.decisionValues()[0], 1e-5);
        assertEquals(1.0, result.decisionValues()[1], 1e-5);
        assertEquals(0.0, result.objectiveValue(), 1e-8);
    }

    @Test
    void rejectsInvalidBounds() {
        SolverException e = assertThrows(SolverException.class,
                () -> run("y = x^2", "y", "x", 5, 5, false));
        assertTrue(e.getMessage().contains("lower < upper"), e.getMessage());
    }

    @Test
    void rejectsUnknownObjective() {
        SolverException e = assertThrows(SolverException.class,
                () -> run("y = x^2", "nope", "x", -1, 1, false));
        assertTrue(e.getMessage().contains("nope"), e.getMessage());
    }

    @Test
    void rejectsSameObjectiveAndDecision() {
        SolverException e = assertThrows(SolverException.class,
                () -> run("y = x^2", "x", "x", -1, 1, false));
        assertTrue(e.getMessage().contains("must differ"), e.getMessage());
    }
}
