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
    void minimizesWithInequalityConstraintBarrier() {
        // min (x-3)^2 + (y-2)^2 s.t. x + y <= 4.
        // The unconstrained optimum (3, 2) is infeasible; the constrained
        // optimum lies on x + y = 4 at (2.5, 1.5) with f = 0.5.
        Optimizer.OptimizeResult result = optimizer.optimize(new Optimizer.Problem(
                "f = (x - 3)^2 + (y - 2)^2",
                SolverSettings.DEFAULTS,
                Map.of(),
                "f",
                java.util.List.of("x", "y"),
                java.util.List.of(0.0, 0.0),
                java.util.List.of(10.0, 10.0),
                "simplex",
                false,
                java.util.List.of("x + y <= 4")
        ));
        assertEquals(2.5, result.decisionValues()[0], 1e-2);
        assertEquals(1.5, result.decisionValues()[1], 1e-2);
        assertEquals(0.5, result.objectiveValue(), 1e-2);
    }

    @Test
    void maximizesWithEqualityConstraintAugmentedLagrangian() {
        // max x * y s.t. x + y = 10 -> x = y = 5, f = 25.
        Optimizer.OptimizeResult result = optimizer.optimize(new Optimizer.Problem(
                "f = x * y",
                SolverSettings.DEFAULTS,
                Map.of(),
                "f",
                java.util.List.of("x", "y"),
                java.util.List.of(0.0, 0.0),
                java.util.List.of(10.0, 10.0),
                "simplex",
                true,
                java.util.List.of("x + y = 10")
        ));
        assertEquals(5.0, result.decisionValues()[0], 1e-2);
        assertEquals(5.0, result.decisionValues()[1], 1e-2);
        assertEquals(25.0, result.objectiveValue(), 1e-1);
    }

    @Test
    void constrainedBobyqaSurvivesEvaluationBudget() {
        // Help-page Example 1: min cylinder surface area s.t. V = 1000.
        // BOBYQA tends to exhaust the inner evaluation budget under the
        // equality penalty; the optimizer must degrade to its best iterate
        // instead of letting TooManyEvaluationsException escape.
        Optimizer.OptimizeResult result = optimizer.optimize(new Optimizer.Problem(
                "V = pi * r^2 * h\nA = 2 * pi * r^2 + 2 * pi * r * h",
                SolverSettings.DEFAULTS,
                Map.of(),
                "A",
                java.util.List.of("r", "h"),
                java.util.List.of(1.0, 1.0),
                java.util.List.of(20.0, 20.0),
                "bobyqa",
                false,
                java.util.List.of("V = 1000")
        ));
        assertEquals(5.4193, result.decisionValues()[0], 0.05);
        assertEquals(10.8385, result.decisionValues()[1], 0.1);
        assertEquals(553.58, result.objectiveValue(), 1.0);
    }

    @Test
    void rejectsMalformedConstraint() {
        SolverException e = assertThrows(SolverException.class,
                () -> optimizer.optimize(new Optimizer.Problem(
                        "f = x^2",
                        SolverSettings.DEFAULTS,
                        Map.of(),
                        "f",
                        java.util.List.of("x"),
                        java.util.List.of(-1.0),
                        java.util.List.of(1.0),
                        "simplex",
                        false,
                        java.util.List.of("x + y"))));
        assertTrue(e.getMessage().contains("Cannot parse constraint"), e.getMessage());
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
