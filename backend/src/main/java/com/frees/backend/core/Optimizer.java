package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
import org.apache.commons.math3.analysis.UnivariateFunction;
import org.apache.commons.math3.optim.MaxEval;
import org.apache.commons.math3.optim.nonlinear.scalar.GoalType;
import org.apache.commons.math3.optim.univariate.BrentOptimizer;
import org.apache.commons.math3.optim.univariate.SearchInterval;
import org.apache.commons.math3.optim.univariate.UnivariateObjectiveFunction;
import org.apache.commons.math3.optim.univariate.UnivariatePointValuePair;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * EES Calculate > Min/Max: one-dimensional optimization of an objective
 * variable by manipulating one independent variable inside given bounds.
 * Uses Brent's method (golden-section search with parabolic interpolation);
 * every candidate value fixes the independent variable and solves the
 * remaining system, so the bounded system must have zero degrees of freedom.
 */
public final class Optimizer {

    /** Objective value reported for candidates where the system fails to solve. */
    private static final double PENALTY = 1e100;
    private static final int MAX_EVALUATIONS = 500;

    private final EquationSystemSolver solver;

    public Optimizer(EquationSystemSolver solver) {
        this.solver = solver;
    }

    /** One Min/Max request: the system plus what to optimize and how. */
    public record Problem(String text,
                          SolverSettings settings,
                          Map<String, VariableSpec> specs,
                          String objective,
                          String decision,
                          double lower,
                          double upper,
                          boolean maximize) {}

    public record OptimizeResult(double decisionValue,
                                 double objectiveValue,
                                 int evaluations,
                                 EquationSystemSolver.Result solution) {}

    public OptimizeResult optimize(Problem problem) {
        validate(problem);
        AtomicInteger evaluations = new AtomicInteger();
        UnivariateFunction fn = x -> evaluateObjective(problem, x, evaluations);
        BrentOptimizer brent = new BrentOptimizer(1e-10, 1e-12);
        UnivariatePointValuePair best = brent.optimize(
                new MaxEval(MAX_EVALUATIONS),
                new UnivariateObjectiveFunction(fn),
                problem.maximize() ? GoalType.MAXIMIZE : GoalType.MINIMIZE,
                new SearchInterval(problem.lower(), problem.upper()));

        EquationSystemSolver.Result solution =
                solveWithDecision(problem, best.getPoint());
        Double objectiveValue = solution.variables().get(problem.objective());
        if (objectiveValue == null) {
            throw new SolverException("The objective variable '" + problem.objective()
                    + "' is not part of the solution.");
        }
        return new OptimizeResult(best.getPoint(), objectiveValue,
                evaluations.get(), solution);
    }

    private static void validate(Problem problem) {
        if (isBlank(problem.objective()) || isBlank(problem.decision())) {
            throw new SolverException(
                    "Choose both an objective variable and an independent variable.");
        }
        if (problem.objective().equalsIgnoreCase(problem.decision())) {
            throw new SolverException(
                    "The objective and the independent variable must differ.");
        }
        if (!Double.isFinite(problem.lower()) || !Double.isFinite(problem.upper())
                || problem.lower() >= problem.upper()) {
            throw new SolverException(
                    "Optimization requires finite bounds with lower < upper.");
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private double evaluateObjective(Problem problem, double x,
                                     AtomicInteger evaluations) {
        evaluations.incrementAndGet();
        EquationSystemSolver.Result result;
        try {
            result = solveWithDecision(problem, x);
        } catch (EquationParser.ParseException | SolverException e) {
            // An unsolvable candidate never improves the optimum; the final
            // solve surfaces the real error to the caller if all fail.
            return problem.maximize() ? -PENALTY : PENALTY;
        }
        Double value = result.variables().get(problem.objective());
        if (value == null) {
            throw new SolverException("The objective variable '" + problem.objective()
                    + "' is not part of the system.");
        }
        return value;
    }

    private EquationSystemSolver.Result solveWithDecision(Problem problem, double value) {
        String augmented = problem.text() + "\n" + problem.decision() + " = "
                + BigDecimal.valueOf(value).toPlainString();
        return solver.solve(augmented, problem.settings(), problem.specs());
    }
}
