package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MultiObjectiveOptimizerTest {

    private final MultiObjectiveOptimizer optimizer =
            new MultiObjectiveOptimizer(new EquationSystemSolver());

    @Test
    void recoversKnownParetoFrontOfTwoConflictingObjectives() {
        // Classic Schaffer N.1: min f1 = x^2, f2 = (x-2)^2 over x in [-1, 3].
        // The Pareto-optimal decisions are exactly x in [0, 2].
        MultiObjectiveOptimizer.Problem problem = new MultiObjectiveOptimizer.Problem(
                "f1 = x^2\nf2 = (x - 2)^2",
                SolverSettings.DEFAULTS,
                Map.of(),
                List.of("f1", "f2"),
                List.of(false, false),
                List.of("x"),
                List.of(-1.0),
                List.of(3.0),
                40, 40, 42L, java.util.List.of());

        MultiObjectiveOptimizer.Result result = optimizer.optimize(problem);
        List<MultiObjectiveOptimizer.ParetoPoint> front = result.front();
        assertFalse(front.isEmpty(), "Pareto front should not be empty");

        double minX = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        for (MultiObjectiveOptimizer.ParetoPoint pt : front) {
            double x = pt.decisions()[0];
            assertTrue(x > -0.05 && x < 2.05,
                    "Pareto-optimal x must lie in [0, 2], got " + x);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        }
        // The front should span a good part of the optimal region, not collapse to a point.
        assertTrue(minX < 0.5, "front should reach toward x=0, min was " + minX);
        assertTrue(maxX > 1.5, "front should reach toward x=2, max was " + maxX);

        // No point on the returned front may dominate another.
        for (MultiObjectiveOptimizer.ParetoPoint a : front) {
            for (MultiObjectiveOptimizer.ParetoPoint b : front) {
                if (a == b) {
                    continue;
                }
                boolean aDominatesB =
                        a.objectives()[0] <= b.objectives()[0]
                                && a.objectives()[1] <= b.objectives()[1]
                                && (a.objectives()[0] < b.objectives()[0]
                                || a.objectives()[1] < b.objectives()[1]);
                assertFalse(aDominatesB, "front must be mutually non-dominated");
            }
        }
    }

    @Test
    void honorsMaximizeFlagPerObjective() {
        // max f1 = x, min f2 = (x-2)^2 over x in [0, 4] -> trade-off region x in [2, 4].
        MultiObjectiveOptimizer.Problem problem = new MultiObjectiveOptimizer.Problem(
                "f1 = x\nf2 = (x - 2)^2",
                SolverSettings.DEFAULTS,
                Map.of(),
                List.of("f1", "f2"),
                List.of(true, false),
                List.of("x"),
                List.of(0.0),
                List.of(4.0),
                40, 40, 7L, java.util.List.of());

        MultiObjectiveOptimizer.Result result = optimizer.optimize(problem);
        assertFalse(result.front().isEmpty());
        for (MultiObjectiveOptimizer.ParetoPoint pt : result.front()) {
            double x = pt.decisions()[0];
            assertTrue(x > 1.9 && x < 4.05, "trade-off region is x in [2, 4], got " + x);
        }
    }

    @Test
    void respectsConstraint() {
        // Schaffer N.1 with the constraint f2 <= 1, i.e. (x-2)^2 <= 1, restricts
        // the feasible region to x in [1, 3]; the Pareto-optimal part is x in [1, 2].
        MultiObjectiveOptimizer.Problem problem = new MultiObjectiveOptimizer.Problem(
                "f1 = x^2\nf2 = (x - 2)^2",
                SolverSettings.DEFAULTS,
                Map.of(),
                List.of("f1", "f2"),
                List.of(false, false),
                List.of("x"),
                List.of(-1.0),
                List.of(3.0),
                50, 50, 11L,
                List.of("f2 <= 1.0"));

        MultiObjectiveOptimizer.Result result = optimizer.optimize(problem);
        assertFalse(result.front().isEmpty(), "a feasible front should exist");
        for (MultiObjectiveOptimizer.ParetoPoint pt : result.front()) {
            double x = pt.decisions()[0];
            double f2 = pt.objectives()[1];
            assertTrue(f2 <= 1.03, "constraint f2 <= 1 must hold (within tolerance), got f2 = " + f2);
            assertTrue(x > 0.95 && x < 2.05, "feasible Pareto region is x in [1, 2], got x = " + x);
        }
    }
}
