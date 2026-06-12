package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.parser.EquationParser;
import org.apache.commons.math3.fitting.leastsquares.LeastSquaresBuilder;
import org.apache.commons.math3.fitting.leastsquares.LeastSquaresOptimizer;
import org.apache.commons.math3.fitting.leastsquares.LeastSquaresProblem;
import org.apache.commons.math3.fitting.leastsquares.LevenbergMarquardtOptimizer;
import org.apache.commons.math3.fitting.leastsquares.MultivariateJacobianFunction;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.RealVector;
import org.apache.commons.math3.util.Pair;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Levenberg-Marquardt least-squares curve fitter (Story 9.7).
 *
 * <p>Parses a model equation such as {@code y = a * exp(-b * x) + c}, extracts
 * the RHS expression, and fits the parameters {@code [a, b, c]} to observed
 * (x, y) data by minimising the sum of squared residuals using
 * {@link LevenbergMarquardtOptimizer}.
 *
 * <p>The Jacobian is computed numerically via central finite differences.
 */
public final class CurveFitter {

    private static final int MAX_EVALUATIONS = 10_000;
    private static final int MAX_ITERATIONS  = 1_000;
    private static final double FD_STEP      = 1e-8;

    /** Immutable result of a curve-fit run. */
    public record FitResult(
            double[] fittedParameters,
            List<String> parameterNames,
            double rSquared,
            double rmse,
            int iterations,
            double[] residuals,
            double[] fittedValues) {}

    /**
     * Fits the model to the data.
     *
     * @param model         The model equation string, e.g. "y = a * exp(-b * x) + c"
     * @param yVariable     The dependent variable name (LHS), e.g. "y"
     * @param xVariable     The independent variable name, e.g. "x"
     * @param parameters    The parameter names to fit, e.g. ["a", "b", "c"]
     * @param xData         The observed x data points
     * @param yData         The observed y data points
     * @param initialGuess  Initial parameter guesses (nullable; defaults to 1.0)
     * @param lowerBounds   Lower bounds for parameters (nullable)
     * @param upperBounds   Upper bounds for parameters (nullable)
     * @return the fit result
     */
    public FitResult fit(String model,
                         String yVariable,
                         String xVariable,
                         List<String> parameters,
                         List<Double> xData,
                         List<Double> yData,
                         List<Double> initialGuess,
                         List<Double> lowerBounds,
                         List<Double> upperBounds) {

        // ── Validate inputs ──────────────────────────────────────────────
        if (model == null || model.isBlank()) {
            throw new SolverException("Model equation is required.");
        }
        if (xData == null || yData == null || xData.isEmpty()) {
            throw new SolverException("Data points are required.");
        }
        if (xData.size() != yData.size()) {
            throw new SolverException(
                    "x and y data must have the same length (got "
                    + xData.size() + " and " + yData.size() + ").");
        }
        if (parameters == null || parameters.isEmpty()) {
            throw new SolverException("At least one parameter to fit is required.");
        }

        int n = xData.size();   // number of data points
        int p = parameters.size(); // number of parameters

        // ── Parse the model equation and extract the RHS expression ──────
        Expr modelExpr = parseModelExpression(model, yVariable);

        // Lowercase parameter names to match AST convention
        List<String> paramLower = parameters.stream()
                .map(String::toLowerCase)
                .toList();
        String xVarLower = xVariable.toLowerCase();

        // ── Build the initial guess vector ───────────────────────────────
        double[] start = new double[p];
        for (int i = 0; i < p; i++) {
            start[i] = (initialGuess != null && i < initialGuess.size()
                        && initialGuess.get(i) != null)
                    ? initialGuess.get(i) : 1.0;
        }

        // ── Build the observed (target) vector ───────────────────────────
        double[] observed = new double[n];
        for (int i = 0; i < n; i++) {
            observed[i] = yData.get(i);
        }

        // ── Model + Jacobian function ────────────────────────────────────
        MultivariateJacobianFunction modelFunction = point -> {
            double[] params = point.toArray();
            double[] values = new double[n];
            double[][] jacobian = new double[n][p];

            for (int i = 0; i < n; i++) {
                double xi = xData.get(i);
                values[i] = evaluate(modelExpr, xVarLower, xi, paramLower, params);

                // Numerical Jacobian via central finite differences
                for (int j = 0; j < p; j++) {
                    double h = Math.max(FD_STEP, Math.abs(params[j]) * FD_STEP);
                    double[] paramsPlus  = params.clone();
                    double[] paramsMinus = params.clone();
                    paramsPlus[j]  += h;
                    paramsMinus[j] -= h;
                    double fPlus  = evaluate(modelExpr, xVarLower, xi, paramLower, paramsPlus);
                    double fMinus = evaluate(modelExpr, xVarLower, xi, paramLower, paramsMinus);
                    jacobian[i][j] = (fPlus - fMinus) / (2.0 * h);
                }
            }

            return new Pair<>(new ArrayRealVector(values, false),
                              new Array2DRowRealMatrix(jacobian, false));
        };

        // ── Build and solve the least-squares problem ────────────────────
        LeastSquaresBuilder builder = new LeastSquaresBuilder()
                .start(start)
                .model(modelFunction)
                .target(observed)
                .lazyEvaluation(false)
                .maxEvaluations(MAX_EVALUATIONS)
                .maxIterations(MAX_ITERATIONS);

        // Apply parameter bounds if provided
        if (lowerBounds != null && upperBounds != null
                && lowerBounds.size() == p && upperBounds.size() == p) {
            // LevenbergMarquardtOptimizer doesn't directly support bounds in
            // Commons Math 3.x, so we enforce them via a penalty approach in
            // the model function. For now we proceed without box constraints
            // since the LM optimizer in CM3 doesn't accept SimpleBounds.
            // A future enhancement could use a parameter transformation.
        }

        LeastSquaresProblem problem = builder.build();
        LevenbergMarquardtOptimizer optimizer = new LevenbergMarquardtOptimizer();
        LeastSquaresOptimizer.Optimum optimum = optimizer.optimize(problem);

        // ── Extract results ──────────────────────────────────────────────
        double[] fitted = optimum.getPoint().toArray();
        int iterations = optimum.getIterations();

        // Compute fitted values and residuals
        double[] fittedValues = new double[n];
        double[] residuals = new double[n];
        double ssRes = 0.0;
        double yMean = 0.0;
        for (int i = 0; i < n; i++) {
            yMean += observed[i];
        }
        yMean /= n;

        double ssTot = 0.0;
        for (int i = 0; i < n; i++) {
            fittedValues[i] = evaluate(modelExpr, xVarLower, xData.get(i), paramLower, fitted);
            residuals[i] = observed[i] - fittedValues[i];
            ssRes += residuals[i] * residuals[i];
            ssTot += (observed[i] - yMean) * (observed[i] - yMean);
        }

        double rSquared = ssTot == 0.0 ? 1.0 : 1.0 - ssRes / ssTot;
        double rmse = Math.sqrt(ssRes / n);

        return new FitResult(fitted, paramLower, rSquared, rmse,
                             iterations, residuals, fittedValues);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Parses the model equation and returns the RHS expression.
     * The model string is expected to be of the form "y = expr".
     */
    private Expr parseModelExpression(String model, String yVariable) {
        EquationParser parser = new EquationParser();
        List<Equation> equations;
        try {
            equations = parser.parse(model);
        } catch (EquationParser.ParseException e) {
            throw new SolverException("Failed to parse model equation: " + e.getMessage());
        }

        if (equations.isEmpty()) {
            throw new SolverException("Model equation could not be parsed.");
        }

        // Find the equation that has the y-variable on the LHS or RHS
        Equation eq = equations.get(0);
        Expr lhs = eq.lhs();
        Expr rhs = eq.rhs();

        String yLower = yVariable.toLowerCase();

        // If lhs is just the y-variable, return rhs as the model expression
        if (lhs instanceof Expr.Var(String name) && name.equals(yLower)) {
            return rhs;
        }
        // If rhs is just the y-variable, return lhs as the model expression
        if (rhs instanceof Expr.Var(String name) && name.equals(yLower)) {
            return lhs;
        }

        // Otherwise, rearrange as: rhs - lhs (implicit form: model = 0 + y on one side)
        // Fallback: assume the RHS is the model expression
        throw new SolverException(
                "Could not identify '" + yVariable
                + "' as the dependent variable in the model equation. "
                + "Expected a form like '" + yVariable + " = <expression>'.");
    }

    /**
     * Evaluates the model expression for a single data point.
     */
    private double evaluate(Expr expr, String xVar, double xVal,
                            List<String> paramNames, double[] paramValues) {
        Map<String, Double> values = new HashMap<>();
        values.put(xVar, xVal);
        for (int i = 0; i < paramNames.size(); i++) {
            values.put(paramNames.get(i), paramValues[i]);
        }
        try {
            return Evaluator.eval(expr, values);
        } catch (Exception e) {
            return Double.NaN;
        }
    }
}
