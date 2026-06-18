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
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Calculate > Min/Max: optimization of an objective variable
 * by manipulating one or more independent variables inside given bounds.
 * Supports:
 * - 1-D Brent's method (univariate)
 * - Multi-dimensional Nelder-Mead Simplex (derivative-free)
 * - Multi-dimensional BOBYQA (bound-constrained quadratic approximation)
 * - Constrained optimization via log-barrier (inequality) and
 *   augmented Lagrangian (equality) methods
 */
public final class Optimizer {

    private static final double PENALTY = 1e100;
    private static final int MAX_EVALUATIONS = 500;
    // Each evaluation is a full system solve; multivariate searches (and the
    // penalized sub-problems of constrained runs) need a larger budget than
    // 1-D Brent before they converge.
    private static final int MULTIVARIATE_MAX_EVALUATIONS = 2000;
    // Weight of the quadratic out-of-bounds penalty used to keep the
    // bounds-unaware Nelder-Mead simplex inside the box.
    private static final double BOUNDS_PENALTY_WEIGHT = 1e8;
    private static final int CONSTRAINED_MAX_OUTER_ITERATIONS = 15;
    private static final double BARRIER_MU_INITIAL = 1.0;
    private static final double BARRIER_MU_FACTOR = 0.1;
    private static final double BARRIER_MU_MIN = 1e-10;
    private static final double LAGRANGIAN_RHO_INITIAL = 1.0;
    private static final double LAGRANGIAN_RHO_FACTOR = 10.0;
    private static final double LAGRANGIAN_RHO_MAX = 1e6;
    private static final double CONSTRAINT_TOLERANCE = 1e-6;

    private final EquationSystemSolver solver;

    public Optimizer(EquationSystemSolver solver) {
        this.solver = solver;
    }

    // ── Problem record ──────────────────────────────────────────────────

    public record Problem(String text,
                          SolverSettings settings,
                          Map<String, VariableSpec> specs,
                          String objective,
                          List<String> decisions,
                          List<Double> lowers,
                          List<Double> uppers,
                          String method, // "brent", "simplex", "bobyqa"
                          boolean maximize,
                          List<String> constraints) {

        // Constructor without constraints (multi-variable)
        public Problem(String text, SolverSettings settings, Map<String, VariableSpec> specs,
                       String objective, List<String> decisions, List<Double> lowers,
                       List<Double> uppers, String method, boolean maximize) {
            this(text, settings, specs, objective, decisions, lowers, uppers, method, maximize, List.of());
        }

        // Backwards compatibility constructor for 1-D optimization
        public Problem(String text, SolverSettings settings, Map<String, VariableSpec> specs,
                       String objective, String decision, double lower, double upper, boolean maximize) {
            this(text, settings, specs, objective, List.of(decision), List.of(lower), List.of(upper), "brent", maximize, List.of());
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

        public boolean hasConstraints() {
            return constraints != null && !constraints.isEmpty();
        }
    }

    // ── Parsed constraint representation ────────────────────────────────

    /**
     * A parsed constraint: {@code lhsExpr  op  rhsValue}.
     * Internally normalised to either {@code g(x) <= 0} (inequality)
     * or {@code h(x) = 0} (equality).
     */
    record ParsedConstraint(String lhsExpr, String operator, double rhsValue) {

        /** Returns g(x) in "g(x) <= 0" form for inequalities,
         *  or h(x) in "h(x) = 0" form for equalities.
         *  {@code lhsEval} is the evaluated value of the LHS expression. */
        double normalised(double lhsEval) {
            return switch (operator) {
                case "<=" -> lhsEval - rhsValue;   // lhs <= rhs  ⟹  lhs - rhs <= 0
                case ">=" -> rhsValue - lhsEval;   // lhs >= rhs  ⟹  rhs - lhs <= 0
                case "="  -> lhsEval - rhsValue;   // lhs = rhs   ⟹  lhs - rhs = 0
                default -> throw new SolverException("Unknown constraint operator: " + operator);
            };
        }

        boolean isEquality() {
            return "=".equals(operator);
        }
    }

    private static final Pattern CONSTRAINT_PATTERN =
            Pattern.compile("^(.+?)\\s*(<=|>=|=)\\s*(.+)$");

    static List<ParsedConstraint> parseConstraints(List<String> raw) {
        if (raw == null || raw.isEmpty()) return List.of();
        List<ParsedConstraint> parsed = new ArrayList<>();
        for (String constraint : raw) {
            Matcher m = CONSTRAINT_PATTERN.matcher(constraint.trim());
            if (!m.matches()) {
                throw new SolverException(
                        "Cannot parse constraint: '" + constraint
                        + "'. Expected format: 'expr <= value', 'expr >= value', or 'expr = value'.");
            }
            String lhs = m.group(1).trim();
            String op  = m.group(2);
            String rhs = m.group(3).trim();
            double rhsValue;
            try {
                rhsValue = Double.parseDouble(rhs);
            } catch (NumberFormatException e) {
                throw new SolverException(
                        "Constraint RHS must be a numeric constant, got: '" + rhs
                        + "' in constraint '" + constraint + "'.");
            }
            parsed.add(new ParsedConstraint(lhs, op, rhsValue));
        }
        return parsed;
    }

    // ── Result record ───────────────────────────────────────────────────

    public record OptimizeResult(double[] decisionValues,
                                 double objectiveValue,
                                 int evaluations,
                                 EquationSystemSolver.Result solution,
                                 String warning) {

        public OptimizeResult(double[] decisionValues, double objectiveValue,
                              int evaluations, EquationSystemSolver.Result solution) {
            this(decisionValues, objectiveValue, evaluations, solution, null);
        }

        // Backwards compatibility for single decision
        public double decisionValue() {
            return decisionValues.length > 0 ? decisionValues[0] : 0.0;
        }

        @Override
        public boolean equals(Object o) {
            if (!(o instanceof OptimizeResult other)) {
                return false;
            }
            return Double.compare(objectiveValue, other.objectiveValue) == 0
                    && evaluations == other.evaluations
                    && java.util.Arrays.equals(decisionValues, other.decisionValues)
                    && java.util.Objects.equals(solution, other.solution)
                    && java.util.Objects.equals(warning, other.warning);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(objectiveValue, evaluations, solution, warning,
                    java.util.Arrays.hashCode(decisionValues));
        }

        @Override
        public String toString() {
            return "OptimizeResult[decisionValues=" + java.util.Arrays.toString(decisionValues)
                    + ", objectiveValue=" + objectiveValue + ", evaluations=" + evaluations
                    + ", solution=" + solution + ", warning=" + warning + "]";
        }
    }

    // ── Main entry point ────────────────────────────────────────────────

    public OptimizeResult optimize(Problem problem) {
        validate(problem);

        if (problem.hasConstraints()) {
            return constrainedOptimize(problem);
        }

        return unconstrainedOptimize(problem);
    }

    // ── Unconstrained optimization (existing behaviour) ─────────────────

    private OptimizeResult unconstrainedOptimize(Problem problem) {
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
            return multivariateOptimize(problem, null, 0.0, null, 0.0);
        }
    }

    // ── Constrained optimization ────────────────────────────────────────

    /**
     * Constrained optimisation using a combined log-barrier (for inequality
     * constraints) and augmented-Lagrangian (for equality constraints) approach.
     *
     * <p>The algorithm wraps the original objective with penalty terms and
     * iteratively tightens the barrier parameter μ and the Lagrangian
     * penalty weight ρ until constraints are satisfied within tolerance.</p>
     */
    private OptimizeResult constrainedOptimize(Problem problem) {
        List<ParsedConstraint> allConstraints = parseConstraints(problem.constraints());
        List<ParsedConstraint> inequalities = allConstraints.stream()
                .filter(c -> !c.isEquality()).toList();
        List<ParsedConstraint> equalities = allConstraints.stream()
                .filter(ParsedConstraint::isEquality).toList();

        // Augmented-Lagrangian multipliers for equality constraints
        double[] lambda = new double[equalities.size()];
        double rho = equalities.isEmpty() ? 0.0 : LAGRANGIAN_RHO_INITIAL;
        double mu = inequalities.isEmpty() ? 0.0 : BARRIER_MU_INITIAL;

        double[] bestPoint = initialGuess(problem);
        int totalEvaluations = 0;

        for (int outer = 0; outer < CONSTRAINED_MAX_OUTER_ITERATIONS; outer++) {
            // Solve the inner sub-problem with current μ, λ, ρ
            OptimizeResult inner = multivariateOptimize(
                    problem, inequalities.isEmpty() ? null : inequalities, mu,
                    equalities.isEmpty() ? null : equalities, rho, lambda, bestPoint);

            bestPoint = inner.decisionValues();
            totalEvaluations += inner.evaluations();

            boolean allSatisfied = updateAndCheckConstraints(inequalities, equalities, problem, bestPoint, lambda, rho);
            if (allSatisfied) break;

            // Tighten parameters
            if (!inequalities.isEmpty() && mu > BARRIER_MU_MIN) {
                mu *= BARRIER_MU_FACTOR;
            }
            if (!equalities.isEmpty() && rho < LAGRANGIAN_RHO_MAX) {
                rho *= LAGRANGIAN_RHO_FACTOR;
            }
        }

        // Final solve to get clean solution at optimum
        EquationSystemSolver.Result solution = solveWithDecisions(problem, bestPoint);
        Double objectiveValue = solution.variables().get(problem.objective());
        if (objectiveValue == null) {
            throw new SolverException("The objective variable '" + problem.objective()
                    + "' is not part of the solution.");
        }

        // Report any remaining constraint violation honestly instead of
        // presenting a point that silently breaks a constraint as the optimum.
        String warning = buildConstraintWarning(allConstraints, problem, bestPoint);

        return new OptimizeResult(bestPoint, objectiveValue, totalEvaluations, solution, warning);
    }

    /** Checks all constraints at {@code bestPoint}, updating the Lagrange
     *  multipliers for equalities; returns true when every constraint holds. */
    private boolean updateAndCheckConstraints(List<ParsedConstraint> inequalities, List<ParsedConstraint> equalities,
                                              Problem problem, double[] bestPoint, double[] lambda, double rho) {
        boolean allSatisfied = true;
        for (ParsedConstraint c : inequalities) {
            double g = c.normalised(evaluateConstraintExpression(c.lhsExpr(), problem, bestPoint));
            if (g > tolerance(c)) {
                allSatisfied = false;
                break;
            }
        }
        for (int j = 0; j < equalities.size(); j++) {
            ParsedConstraint c = equalities.get(j);
            double h = c.normalised(evaluateConstraintExpression(c.lhsExpr(), problem, bestPoint));
            if (Math.abs(h) > tolerance(c)) {
                allSatisfied = false;
            }
            lambda[j] += rho * h; // λ_j += ρ * h_j(x)
        }
        return allSatisfied;
    }

    /** Builds a human-readable warning listing any constraints still violated at
     *  {@code bestPoint}, or null when all are satisfied. */
    private String buildConstraintWarning(List<ParsedConstraint> allConstraints, Problem problem, double[] bestPoint) {
        StringBuilder warning = null;
        for (ParsedConstraint c : allConstraints) {
            double lhsVal = evaluateConstraintExpression(c.lhsExpr(), problem, bestPoint);
            double v = c.isEquality()
                    ? Math.abs(c.normalised(lhsVal))
                    : Math.max(0, c.normalised(lhsVal));
            if (v > tolerance(c)) {
                if (warning == null) {
                    warning = new StringBuilder("Constraints not satisfied at the returned point: ");
                } else {
                    warning.append("; ");
                }
                warning.append('\'').append(c.lhsExpr()).append(' ').append(c.operator())
                        .append(' ').append(c.rhsValue()).append("' is off by ")
                        .append(String.format("%.4g", v));
            }
        }
        return warning == null ? null : warning.toString();
    }

    /** Constraint tolerance relative to the magnitude of the RHS constant. */
    private static double tolerance(ParsedConstraint c) {
        return CONSTRAINT_TOLERANCE * Math.max(1.0, Math.abs(c.rhsValue()));
    }

    // ── Multivariate inner optimisation ─────────────────────────────────

    /** Unconstrained multivariate (no barrier/Lagrangian). */
    private OptimizeResult multivariateOptimize(Problem problem,
                                                List<ParsedConstraint> inequalities, double mu,
                                                List<ParsedConstraint> equalities, double rho) {
        return multivariateOptimize(problem, inequalities, mu, equalities, rho,
                null, null);
    }

    /**
     * Multivariate optimisation with optional barrier and augmented-Lagrangian
     * terms.  When both {@code inequalities} and {@code equalities} are null
     * (or empty), this behaves identically to the original unconstrained path.
     */
    private OptimizeResult multivariateOptimize(Problem problem,
                                                List<ParsedConstraint> inequalities, double mu,
                                                List<ParsedConstraint> equalities, double rho,
                                                double[] lambda,
                                                double[] warmStart) {
        int n = problem.decisions().size();
        AtomicInteger evaluations = new AtomicInteger();

        boolean hasBarrier = inequalities != null && !inequalities.isEmpty();
        boolean hasLagrangian = equalities != null && !equalities.isEmpty();

        MultivariateFunction fn;
        if (hasBarrier || hasLagrangian) {
            final List<ParsedConstraint> ineq = hasBarrier ? inequalities : List.of();
            final List<ParsedConstraint> eq = hasLagrangian ? equalities : List.of();
            final double[] lam = lambda != null ? lambda : new double[eq.size()];
            final double muFinal = mu;
            final double rhoFinal = rho;
            fn = point -> evaluateWithPenalty(problem, point, ineq, muFinal,
                    eq, lam, rhoFinal, evaluations);
        } else {
            fn = point -> evaluateObjectiveMultivariate(problem, point, evaluations);
        }

        double[] initialGuess;
        if (warmStart != null) {
            initialGuess = warmStart.clone();
        } else {
            initialGuess = initialGuess(problem);
        }
        double[] lowerBounds = new double[n];
        double[] upperBounds = new double[n];
        for (int i = 0; i < n; i++) {
            lowerBounds[i] = problem.lowers().get(i);
            upperBounds[i] = problem.uppers().get(i);
            initialGuess[i] = Math.max(lowerBounds[i], Math.min(upperBounds[i], initialGuess[i]));
        }

        // The Nelder-Mead simplex is bounds-unaware: evaluate out-of-box
        // points at their projection onto the box plus a smooth quadratic
        // distance penalty. This keeps the landscape continuous at the
        // bounds (no cliffs to stagnate on) while never rewarding points
        // outside the box. BOBYQA enforces bounds natively and skips this.
        if (problem.method() == null || !problem.method().equalsIgnoreCase("bobyqa")) {
            fn = wrapWithBoundsPenalty(fn, problem, lowerBounds, upperBounds);
        }

        // Track the best point seen so far: when the evaluation budget runs
        // out, Commons Math throws TooManyEvaluationsException without
        // returning its best iterate, so we keep our own copy and degrade
        // gracefully instead of failing the request.
        final double[] trackedPoint = initialGuess.clone();
        final double[] trackedValue = { problem.maximize()
                ? Double.NEGATIVE_INFINITY : Double.POSITIVE_INFINITY };
        final MultivariateFunction inner = fn;
        MultivariateFunction trackedFn = point -> {
            double value = inner.value(point);
            boolean better = problem.maximize()
                    ? value > trackedValue[0] : value < trackedValue[0];
            if (better) {
                trackedValue[0] = value;
                System.arraycopy(point, 0, trackedPoint, 0, n);
            }
            return value;
        };

        double[] bestPoints = runSimplexOrBobyqa(problem, trackedFn, n, lowerBounds, upperBounds, initialGuess, trackedPoint);
        // The simplex is unaware of bounds and the tracked point may stem
        // from an out-of-bounds probe: clamp before the final solve.
        for (int i = 0; i < n; i++) {
            bestPoints[i] = Math.max(lowerBounds[i], Math.min(upperBounds[i], bestPoints[i]));
        }

        EquationSystemSolver.Result solution = solveWithDecisions(problem, bestPoints);
        Double objectiveValue = solution.variables().get(problem.objective());
        if (objectiveValue == null) {
            throw new SolverException("The objective variable '" + problem.objective()
                    + "' is not part of the solution.");
        }
        return new OptimizeResult(bestPoints, objectiveValue, evaluations.get(), solution);
    }

    /**
     * Wraps an objective so the bounds-unaware Nelder-Mead simplex evaluates
     * out-of-box points at their projection onto the box plus a smooth quadratic
     * distance penalty — keeping the landscape continuous without rewarding
     * infeasible points. (BOBYQA enforces bounds natively and skips this.)
     */
    private MultivariateFunction wrapWithBoundsPenalty(MultivariateFunction unbounded, Problem problem,
                                                       double[] lowerBounds, double[] upperBounds) {
        final double penaltySign = problem.maximize() ? -1.0 : 1.0;
        return point -> {
            double violation = 0;
            double[] projected = point.clone();
            for (int i = 0; i < point.length; i++) {
                if (point[i] < lowerBounds[i]) {
                    double d = lowerBounds[i] - point[i];
                    violation += d * d;
                    projected[i] = lowerBounds[i];
                } else if (point[i] > upperBounds[i]) {
                    double d = point[i] - upperBounds[i];
                    violation += d * d;
                    projected[i] = upperBounds[i];
                }
            }
            return unbounded.value(projected) + penaltySign * BOUNDS_PENALTY_WEIGHT * violation;
        };
    }

    /** Runs the chosen optimizer (BOBYQA or Nelder-Mead simplex), degrading to the
     *  tracked best iterate if the evaluation budget is exhausted. */
    private double[] runSimplexOrBobyqa(Problem problem, MultivariateFunction trackedFn, int n,
                                        double[] lowerBounds, double[] upperBounds,
                                        double[] initialGuess, double[] trackedPoint) {
        try {
            if (problem.method() != null && problem.method().equalsIgnoreCase("bobyqa")) {
                BOBYQAOptimizer bobyqa = new BOBYQAOptimizer(2 * n + 1);
                return bobyqa.optimize(
                        new MaxEval(MULTIVARIATE_MAX_EVALUATIONS),
                        new ObjectiveFunction(trackedFn),
                        problem.maximize() ? GoalType.MAXIMIZE : GoalType.MINIMIZE,
                        new SimpleBounds(lowerBounds, upperBounds),
                        new InitialGuess(initialGuess)
                ).getPoint();
            }
            // Nelder-Mead Simplex (default for multivariate)
            SimplexOptimizer simplex = new SimplexOptimizer(1e-10, 1e-12);
            return simplex.optimize(
                    new MaxEval(MULTIVARIATE_MAX_EVALUATIONS),
                    new ObjectiveFunction(trackedFn),
                    problem.maximize() ? GoalType.MAXIMIZE : GoalType.MINIMIZE,
                    new NelderMeadSimplex(n),
                    new InitialGuess(initialGuess)
            ).getPoint();
        } catch (org.apache.commons.math3.exception.TooManyEvaluationsException e) {
            return trackedPoint.clone();
        }
    }

    // ── Penalty-augmented objective evaluation ──────────────────────────

    /**
     * Evaluates the objective with log-barrier terms for inequality constraints
     * and augmented-Lagrangian terms for equality constraints.
     */
    private double evaluateWithPenalty(Problem problem, double[] point,
                                       List<ParsedConstraint> inequalities, double mu,
                                       List<ParsedConstraint> equalities,
                                       double[] lambda, double rho,
                                       AtomicInteger evals) {
        double obj = evaluateObjectiveMultivariate(problem, point, evals);
        if (obj == PENALTY || obj == -PENALTY) {
            return obj;
        }
        double sign = problem.maximize() ? 1.0 : -1.0;
        obj = applyInequalityPenalties(obj, sign, inequalities, problem, point, mu);
        if (Double.isNaN(obj)) {
            return problem.maximize() ? -PENALTY : PENALTY;
        }
        obj = applyEqualityPenalties(obj, sign, equalities, problem, point, lambda, rho);
        if (Double.isNaN(obj)) {
            return problem.maximize() ? -PENALTY : PENALTY;
        }
        return obj;
    }

    /**
     * Adds inequality-constraint penalties (normalised to g(x) ≤ 0). Feasible:
     * log-barrier ∓μ·ln(−g) repels the iterate from the boundary. Infeasible: a
     * smooth exterior quadratic penalty (weight 1/μ) keeps a gradient pointing
     * back into the feasible region. Returns NaN if a constraint LHS is NaN.
     */
    private double applyInequalityPenalties(double obj, double sign, List<ParsedConstraint> inequalities,
                                            Problem problem, double[] point, double mu) {
        for (ParsedConstraint c : inequalities) {
            double lhsVal = evaluateConstraintExpressionSafe(c.lhsExpr(), problem, point);
            if (Double.isNaN(lhsVal)) {
                return Double.NaN;
            }
            double g = c.normalised(lhsVal);
            if (g >= 0) {
                double weight = 1.0 / Math.max(mu, BARRIER_MU_MIN);
                obj -= sign * weight * (g * g + g);
            } else {
                obj += sign * mu * Math.log(-g);
            }
        }
        return obj;
    }

    /** Adds augmented-Lagrangian penalties for equality constraints:
     *  {@code λᵀh(x) + (ρ/2)‖h(x)‖²}. Returns NaN if a constraint LHS is NaN. */
    private double applyEqualityPenalties(double obj, double sign, List<ParsedConstraint> equalities,
                                          Problem problem, double[] point, double[] lambda, double rho) {
        for (int j = 0; j < equalities.size(); j++) {
            ParsedConstraint c = equalities.get(j);
            double lhsVal = evaluateConstraintExpressionSafe(c.lhsExpr(), problem, point);
            if (Double.isNaN(lhsVal)) {
                return Double.NaN;
            }
            double h = c.normalised(lhsVal);
            obj -= sign * (lambda[j] * h + (rho / 2.0) * h * h);
        }
        return obj;
    }

    // ── Constraint expression evaluation ────────────────────────────────

    /**
     * Evaluates a constraint LHS expression by injecting the decision-variable
     * values into the equation system and solving for the expression via a
     * temporary equation {@code zz_constraint_lhs_zz = <expr>}.  The name must
     * start with a letter because the grammar's IDENT rule rejects a leading
     * underscore.
     */
    private double evaluateConstraintExpression(String expr, Problem problem, double[] point) {
        StringBuilder augmented = new StringBuilder(problem.text());
        for (int i = 0; i < problem.decisions().size(); i++) {
            augmented.append("\n").append(problem.decisions().get(i)).append(" = ")
                    .append(BigDecimal.valueOf(point[i]).toPlainString());
        }
        String constraintVar = "zz_constraint_lhs_zz";
        augmented.append("\n").append(constraintVar).append(" = ").append(expr);
        EquationSystemSolver.Result result = solver.solve(
                augmented.toString(), problem.settings(), problem.specs());
        Double value = result.variables().get(constraintVar);
        if (value == null) {
            throw new SolverException(
                    "Could not evaluate constraint expression: " + expr);
        }
        return value;
    }

    /** Like {@link #evaluateConstraintExpression} but returns NaN on failure. */
    private double evaluateConstraintExpressionSafe(String expr, Problem problem, double[] point) {
        try {
            return evaluateConstraintExpression(expr, problem, point);
        } catch (Exception e) {
            return Double.NaN;
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private double[] initialGuess(Problem problem) {
        int n = problem.decisions().size();
        double[] guess = new double[n];
        for (int i = 0; i < n; i++) {
            String dec = problem.decisions().get(i);
            double lo = problem.lowers().get(i);
            double hi = problem.uppers().get(i);
            VariableSpec spec = problem.specs().get(dec);
            if (spec != null) {
                guess[i] = spec.guess();
            } else {
                guess[i] = (lo + hi) / 2.0;
            }
            guess[i] = Math.max(lo, Math.min(hi, guess[i]));
        }
        return guess;
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
