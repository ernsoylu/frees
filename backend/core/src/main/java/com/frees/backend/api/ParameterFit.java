package com.frees.backend.api;

import com.frees.backend.ast.ProcDef;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.core.VariableSpec;
import com.frees.backend.measurement.SampledSeries;
import com.frees.backend.parser.EquationParser;
import org.apache.commons.math3.analysis.MultivariateFunction;
import org.apache.commons.math3.exception.TooManyEvaluationsException;
import org.apache.commons.math3.optim.InitialGuess;
import org.apache.commons.math3.optim.MaxEval;
import org.apache.commons.math3.optim.SimpleBounds;
import org.apache.commons.math3.optim.nonlinear.scalar.GoalType;
import org.apache.commons.math3.optim.nonlinear.scalar.ObjectiveFunction;
import org.apache.commons.math3.optim.nonlinear.scalar.noderiv.BOBYQAOptimizer;
import org.apache.commons.math3.optim.univariate.BrentOptimizer;
import org.apache.commons.math3.optim.univariate.SearchInterval;
import org.apache.commons.math3.optim.univariate.UnivariateObjectiveFunction;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Parameter estimation against measured data (calibration): fit chosen model
 * parameters so a solved transient column matches a measured (t, y) series.
 *
 * <p>Each objective evaluation replaces the parameters' defining assignments
 * (the terminal's override mechanism — replace, never append) and runs a
 * strict solve; the named DYNAMIC block's column is linearly resampled onto
 * the measured raster and reduced to a sum of squared residuals, skipping
 * pairs outside the model's own time span (the compare view's semantics).
 * The optimizer works on parameters normalized to the unit box — that keeps
 * the trust-region geometry sane for arbitrarily scaled physical bounds —
 * with a bound-constrained quadratic-model optimizer for 2+ parameters and a
 * bracketing line search for one. A failed solve scores a flat penalty, so
 * the starting point is validated first and reported clearly if infeasible.
 */
public final class ParameterFit {

    private static final double PENALTY = 1.0e100;
    /** Trust-region sizes on the normalized unit box. */
    private static final double INITIAL_RADIUS = 0.2;
    private static final double STOPPING_RADIUS = 1.0e-6;

    /** A (t, v) series pair. equals/hashCode/toString consider array contents
     *  (java:S6218). */
    public record Series(double[] t, double[] v) {
        @Override
        public boolean equals(Object o) {
            return o instanceof Series other
                    && java.util.Arrays.equals(t, other.t) && java.util.Arrays.equals(v, other.v);
        }

        @Override
        public int hashCode() {
            return 31 * java.util.Arrays.hashCode(t) + java.util.Arrays.hashCode(v);
        }

        @Override
        public String toString() {
            return "Series[" + t.length + " samples]";
        }
    }

    public record Outcome(List<String> parameters, double[] fitted, double rmse,
                          double initialRmse, int evaluations, boolean truncated,
                          Series fittedSeries) {
        @Override
        public boolean equals(Object o) {
            return o instanceof Outcome other
                    && parameters.equals(other.parameters)
                    && java.util.Arrays.equals(fitted, other.fitted)
                    && rmse == other.rmse && initialRmse == other.initialRmse
                    && evaluations == other.evaluations && truncated == other.truncated
                    && java.util.Objects.equals(fittedSeries, other.fittedSeries);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(parameters, java.util.Arrays.hashCode(fitted),
                    rmse, initialRmse, evaluations, truncated, fittedSeries);
        }

        @Override
        public String toString() {
            return "Outcome[params=" + parameters + ", fitted=" + java.util.Arrays.toString(fitted)
                    + ", rmse=" + rmse + ", evaluations=" + evaluations + "]";
        }
    }

    /** Signals a deadline strike inside the objective; caught internally. */
    private static final class BudgetExhausted extends RuntimeException {
        BudgetExhausted() {
            super(null, null, false, false);
        }
    }

    private ParameterFit() {}

    public static Outcome run(EquationSystemSolver solver, String text,
                              SolverSettings settings, Map<String, VariableSpec> specs,
                              Map<String, ProcDef> defs, List<String> parameters,
                              double[] initial, double[] lower, double[] upper,
                              String odeBlock, String column,
                              double[] measT, double[] measV,
                              int maxEvaluations, long deadlineNanos) {
        int n = parameters.size();
        if (n == 0 || initial.length != n || lower.length != n || upper.length != n) {
            throw new SolverException("Parameter estimation needs at least one parameter, "
                    + "each with an initial value and finite lower/upper bounds.");
        }
        for (int i = 0; i < n; i++) {
            if (!Double.isFinite(lower[i]) || !Double.isFinite(upper[i]) || lower[i] >= upper[i]) {
                throw new SolverException("Bounds for " + parameters.get(i)
                        + " must be finite with lower < upper.");
            }
            if (initial[i] < lower[i] || initial[i] > upper[i]) {
                throw new SolverException("The initial value of " + parameters.get(i)
                        + " lies outside its bounds.");
            }
        }
        if (measT.length < 2 || measT.length != measV.length) {
            throw new SolverException("The measured series needs at least two (t, y) samples.");
        }

        // Specs without uncertainties: evaluations must not pay for RSS passes.
        Map<String, VariableSpec> evalSpecs = new HashMap<>();
        for (Map.Entry<String, VariableSpec> e : specs.entrySet()) {
            VariableSpec s = e.getValue();
            evalSpecs.put(e.getKey(), new VariableSpec(s.name(), s.guess(), s.lower(), s.upper()));
        }

        int[] evaluations = {0};
        double[] bestPoint = initial.clone();
        double[] bestSse = {Double.POSITIVE_INFINITY};
        int[] bestPairs = {0};
        boolean[] truncated = {false};

        MultivariateFunction normalized = unit -> {
            if (System.nanoTime() > deadlineNanos) {
                throw new BudgetExhausted();
            }
            double[] p = new double[n];
            for (int i = 0; i < n; i++) {
                double u = Math.clamp(unit[i], 0.0, 1.0);
                p[i] = lower[i] + u * (upper[i] - lower[i]);
            }
            evaluations[0]++;
            SseResult r = evaluate(solver, text, settings, evalSpecs, defs,
                    parameters, p, odeBlock, column, measT, measV);
            if (r == null) {
                return PENALTY;
            }
            if (r.sse() < bestSse[0]) {
                bestSse[0] = r.sse();
                bestPairs[0] = r.pairs();
                System.arraycopy(p, 0, bestPoint, 0, n);
            }
            return r.sse();
        };

        // Validate the starting point before handing the landscape to the
        // optimizer: from an infeasible start every direction scores the same
        // flat penalty and the fit would silently return the initial guess.
        double[] unit0 = new double[n];
        for (int i = 0; i < n; i++) {
            unit0[i] = (initial[i] - lower[i]) / (upper[i] - lower[i]);
        }
        double sse0 = normalized.value(unit0);
        if (sse0 >= PENALTY) {
            throw new SolverException("The model does not solve (or the target column has no "
                    + "overlap with the measurement) at the initial parameter values. Fix the "
                    + "starting point first — a fit cannot navigate out of an infeasible start.");
        }
        double initialRmse = Math.sqrt(sse0 / Math.max(bestPairs[0], 1));

        try {
            if (n == 1) {
                BrentOptimizer brent = new BrentOptimizer(1.0e-8, 1.0e-10);
                brent.optimize(
                        new MaxEval(maxEvaluations),
                        new UnivariateObjectiveFunction(x -> normalized.value(new double[] {x})),
                        GoalType.MINIMIZE,
                        new SearchInterval(0.0, 1.0, unit0[0]));
            } else {
                BOBYQAOptimizer bobyqa = new BOBYQAOptimizer(2 * n + 1, INITIAL_RADIUS, STOPPING_RADIUS);
                double[] lo = new double[n];
                double[] hi = new double[n];
                java.util.Arrays.fill(hi, 1.0);
                bobyqa.optimize(
                        new MaxEval(maxEvaluations),
                        new ObjectiveFunction(normalized),
                        GoalType.MINIMIZE,
                        new SimpleBounds(lo, hi),
                        new InitialGuess(unit0));
            }
        } catch (TooManyEvaluationsException e) {
            // The budget is the point; the best tracked iterate stands.
        } catch (BudgetExhausted e) {
            truncated[0] = true;
        }

        // Confirming solve at the best point: the fitted series on the
        // measured raster, for overlay and honest reporting.
        SseResult confirm = evaluate(solver, text, settings, evalSpecs, defs,
                parameters, bestPoint, odeBlock, column, measT, measV);
        if (confirm == null) {
            throw new SolverException("The fitted point no longer solves — this indicates a "
                    + "sensitive model; tighten the bounds around a feasible region.");
        }
        double rmse = Math.sqrt(confirm.sse() / Math.max(confirm.pairs(), 1));
        return new Outcome(List.copyOf(parameters), bestPoint, rmse, initialRmse,
                evaluations[0], truncated[0],
                new Series(measT.clone(), confirm.model().sampleOn(measT)));
    }

    private record SseResult(double sse, int pairs, SampledSeries model) {}

    /** One objective evaluation; null = solve failed or no usable overlap. */
    private static SseResult evaluate(EquationSystemSolver solver, String text,
                                      SolverSettings settings, Map<String, VariableSpec> specs,
                                      Map<String, ProcDef> defs, List<String> parameters,
                                      double[] values, String odeBlock, String column,
                                      double[] measT, double[] measV) {
        List<String> overrides = new ArrayList<>(parameters.size());
        for (int i = 0; i < parameters.size(); i++) {
            overrides.add(parameters.get(i) + " = " + BigDecimal.valueOf(values[i]).toPlainString());
        }
        EquationSystemSolver.Result result;
        try {
            result = solver.solve(SolverApiSupport.applyOverrides(text, overrides),
                    settings, specs, defs);
        } catch (EquationParser.ParseException | SolverException | IllegalStateException e) {
            return null;
        }
        Series series = extractColumn(result, odeBlock, column);
        if (series == null) {
            return null;
        }
        SampledSeries model = new SampledSeries(series.t(), series.v(), SampledSeries.Interp.LINEAR);
        double sse = 0.0;
        int pairs = 0;
        for (int i = 0; i < measT.length; i++) {
            double m = measV[i];
            if (Double.isNaN(m)) {
                continue;
            }
            double s = model.at(measT[i]);
            if (Double.isNaN(s)) {
                continue; // outside the model's span, or a gap — not a comparison
            }
            double e = s - m;
            sse += e * e;
            pairs++;
        }
        if (pairs == 0) {
            return null;
        }
        return new SseResult(sse, pairs, model);
    }

    /** The named DYNAMIC table's column as (t, v); null when absent. */
    private static Series extractColumn(EquationSystemSolver.Result result,
                                        String odeBlock, String column) {
        for (com.frees.backend.core.ode.OdeTableResult table : result.odeTables()) {
            if (!table.name().equalsIgnoreCase(odeBlock)) {
                continue;
            }
            int col = -1;
            for (int i = 0; i < table.columns().size(); i++) {
                if (table.columns().get(i).equalsIgnoreCase(column)) {
                    col = i;
                    break;
                }
            }
            if (col < 0) {
                return null;
            }
            int rows = table.rows().size();
            double[] t = new double[rows];
            double[] v = new double[rows];
            for (int i = 0; i < rows; i++) {
                List<Double> row = table.rows().get(i);
                Double tv = row.get(0);
                Double vv = row.get(col);
                t[i] = tv == null ? Double.NaN : tv;
                v[i] = vv == null ? Double.NaN : vv;
            }
            return new Series(t, v);
        }
        return null;
    }
}
