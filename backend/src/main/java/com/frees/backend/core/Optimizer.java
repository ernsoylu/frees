package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
import org.apache.commons.math3.analysis.UnivariateFunction;
import org.apache.commons.math3.analysis.MultivariateFunction;
import org.apache.commons.math3.optim.MaxEval;
import org.apache.commons.math3.optim.nonlinear.scalar.GoalType;
import org.apache.commons.math3.optim.nonlinear.scalar.ObjectiveFunction;
import org.apache.commons.math3.optim.nonlinear.scalar.noderiv.SimplexOptimizer;
import org.apache.commons.math3.optim.nonlinear.scalar.noderiv.NelderMeadSimplex;
import org.apache.commons.math3.optim.nonlinear.scalar.noderiv.BOBYQAOptimizer;
import org.apache.commons.math3.optim.SimpleBounds;
import org.apache.commons.math3.optim.InitialGuess;
import org.apache.commons.math3.optim.PointValuePair;
import org.apache.commons.math3.optim.univariate.BrentOptimizer;
import org.apache.commons.math3.optim.univariate.SearchInterval;
import org.apache.commons.math3.optim.univariate.UnivariateObjectiveFunction;
import org.apache.commons.math3.optim.univariate.UnivariatePointValuePair;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Calculate > Min/Max: optimization of an objective variable
 * by manipulating one or more independent variables inside given bounds.
 * Supports:
 * - 1-D Brent's method (univariate)
 * - Multi-dimensional Nelder-Mead Simplex (derivative-free)
 * - Multi-dimensional BOBYQA (bound-constrained quadratic approximation)
 */
public final class Optimizer {

    private static final double PENALTY = 1e100;
    private static final int MAX_EVALUATIONS = 500;

    private final EquationSystemSolver solver;

    public Optimizer(EquationSystemSolver solver) {
        this.solver = solver;
    }

    public record Problem(String text,
                          SolverSettings settings,
                          Map<String, VariableSpec> specs,
                          String objective,
                          List<String> decisions,
                          List<Double> lowers,
                          List<Double> uppers,
                          String method, // "brent", "simplex", "bobyqa"
                          boolean maximize) {
        
        // Backwards compatibility constructor for 1-D optimization
        public Problem(String text, SolverSettings settings, Map<String, VariableSpec> specs,
                       String objective, String decision, double lower, double upper, boolean maximize) {
            this(text, settings, specs, objective, List.of(decision), List.of(lower), List.of(upper), "brent", maximize);
        }

        public String decision() {
            return decisions != null && !decisions.isEmpty() ? decisions.get(0) : null;
        }

        public double lower() {
            return lowers != null && !lowers.isEmpty() ? lowers.get(0) : Double.NaN;
        }

        public double upper() {
            return uppers != null && !uppers.isEmpty() ? uppers.get(0) : Double.NaN;
        }
    }

    public record OptimizeResult(double[] decisionValues,
                                 double objectiveValue,
                                 int evaluations,
                                 EquationSystemSolver.Result solution) {
        
        // Backwards compatibility for single decision
        public double decisionValue() {
            return decisionValues.length > 0 ? decisionValues[0] : 0.0;
        }
    }

    public OptimizeResult optimize(Problem problem) {
        validate(problem);
        int n = problem.decisions().size();

        if (n == 1 && (problem.method() == null || problem.method().equalsIgnoreCase("brent"))) {
            // Univariate Brent optimization
            AtomicInteger evaluations = new AtomicInteger();
            UnivariateFunction fn = x -> evaluateObjective(problem, x, evaluations);
            BrentOptimizer brent = new BrentOptimizer(1e-10, 1e-12);
            UnivariatePointValuePair best = brent.optimize(
                    new MaxEval(MAX_EVALUATIONS),
                    new UnivariateObjectiveFunction(fn),
                    problem.maximize() ? GoalType.MAXIMIZE : GoalType.MINIMIZE,
                    new SearchInterval(problem.lowers().get(0), problem.uppers().get(0)));

            double[] decVals = new double[]{ best.getPoint() };
            EquationSystemSolver.Result solution = solveWithDecisions(problem, decVals);
            Double objectiveValue = solution.variables().get(problem.objective());
            if (objectiveValue == null) {
                throw new SolverException("The objective variable '" + problem.objective()
                        + "' is not part of the solution.");
            }
            return new OptimizeResult(decVals, objectiveValue, evaluations.get(), solution);
        } else {
            // Multivariate optimization: Simplex or BOBYQA
            AtomicInteger evaluations = new AtomicInteger();
            MultivariateFunction fn = point -> evaluateObjectiveMultivariate(problem, point, evaluations);

            double[] initialGuess = new double[n];
            double[] lowerBounds = new double[n];
            double[] upperBounds = new double[n];
            for (int i = 0; i < n; i++) {
                String dec = problem.decisions().get(i);
                lowerBounds[i] = problem.lowers().get(i);
                upperBounds[i] = problem.uppers().get(i);
                VariableSpec spec = problem.specs().get(dec);
                if (spec != null) {
                    initialGuess[i] = spec.guess();
                } else {
                    initialGuess[i] = (lowerBounds[i] + upperBounds[i]) / 2.0;
                }
                // Clamp initial guess to bounds
                initialGuess[i] = Math.max(lowerBounds[i], Math.min(upperBounds[i], initialGuess[i]));
            }

            double[] bestPoints;
            if (problem.method() != null && problem.method().equalsIgnoreCase("bobyqa")) {
                int numInterpolationPoints = 2 * n + 1;
                BOBYQAOptimizer bobyqa = new BOBYQAOptimizer(numInterpolationPoints);
                PointValuePair best = bobyqa.optimize(
                        new MaxEval(MAX_EVALUATIONS),
                        new ObjectiveFunction(fn),
                        problem.maximize() ? GoalType.MAXIMIZE : GoalType.MINIMIZE,
                        new SimpleBounds(lowerBounds, upperBounds),
                        new InitialGuess(initialGuess)
                );
                bestPoints = best.getPoint();
            } else {
                // Nelder-Mead Simplex
                SimplexOptimizer simplex = new SimplexOptimizer(1e-10, 1e-12);
                PointValuePair best = simplex.optimize(
                        new MaxEval(MAX_EVALUATIONS),
                        new ObjectiveFunction(fn),
                        problem.maximize() ? GoalType.MAXIMIZE : GoalType.MINIMIZE,
                        new NelderMeadSimplex(n),
                        new InitialGuess(initialGuess)
                );
                bestPoints = best.getPoint();
            }

            EquationSystemSolver.Result solution = solveWithDecisions(problem, bestPoints);
            Double objectiveValue = solution.variables().get(problem.objective());
            if (objectiveValue == null) {
                throw new SolverException("The objective variable '" + problem.objective()
                        + "' is not part of the solution.");
            }
            return new OptimizeResult(bestPoints, objectiveValue, evaluations.get(), solution);
        }
    }

    private static void validate(Problem problem) {
        if (isBlank(problem.objective()) || problem.decisions() == null || problem.decisions().isEmpty()) {
            throw new SolverException(
                    "Choose both an objective variable and at least one independent variable.");
        }
        for (String dec : problem.decisions()) {
            if (isBlank(dec)) {
                throw new SolverException("Independent variables cannot be blank.");
            }
            if (problem.objective().equalsIgnoreCase(dec)) {
                throw new SolverException(
                        "The objective and the independent variables must differ.");
            }
        }
        if (problem.lowers() == null || problem.uppers() == null
                || problem.lowers().size() != problem.decisions().size()
                || problem.uppers().size() != problem.decisions().size()) {
            throw new SolverException(
                    "Each independent variable requires lower and upper bounds.");
        }
        for (int i = 0; i < problem.decisions().size(); i++) {
            double lo = problem.lowers().get(i);
            double hi = problem.uppers().get(i);
            if (!Double.isFinite(lo) || !Double.isFinite(hi) || lo >= hi) {
                throw new SolverException(
                        "Optimization requires finite bounds with lower < upper for variable "
                        + problem.decisions().get(i));
            }
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
            return problem.maximize() ? -PENALTY : PENALTY;
        }
        Double value = result.variables().get(problem.objective());
        if (value == null) {
            throw new SolverException("The objective variable '" + problem.objective()
                    + "' is not part of the system.");
        }
        return value;
    }

    private double evaluateObjectiveMultivariate(Problem problem, double[] point,
                                                 AtomicInteger evaluations) {
        evaluations.incrementAndGet();
        EquationSystemSolver.Result result;
        try {
            result = solveWithDecisions(problem, point);
        } catch (EquationParser.ParseException | SolverException e) {
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

    private EquationSystemSolver.Result solveWithDecisions(Problem problem, double[] values) {
        StringBuilder augmented = new StringBuilder(problem.text());
        for (int i = 0; i < problem.decisions().size(); i++) {
            augmented.append("\n").append(problem.decisions().get(i)).append(" = ")
                    .append(BigDecimal.valueOf(values[i]).toPlainString());
        }
        return solver.solve(augmented.toString(), problem.settings(), problem.specs());
    }
}
