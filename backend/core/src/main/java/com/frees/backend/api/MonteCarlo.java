package com.frees.backend.api;

import com.frees.backend.ast.ProcDef;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.core.VariableSpec;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Monte Carlo uncertainty propagation: the sampling extension of the
 * first-order/RSS engine for systems too nonlinear for a linearization.
 *
 * <p>Semantics match the first-order engine's: the uncertainty sources are
 * the variables with a declared {@code VariableSpec.uncertainty() > 0}, and
 * each source's center is its value in the base solve. Every sample redraws
 * all sources (independent normals, clamped into the declared bounds),
 * replaces their defining assignments via the same override mechanism the
 * terminal uses, and re-solves warm-started from the previous sample. The
 * per-sample specs carry no uncertainties, so no sample wastes time on its
 * own first-order propagation.
 *
 * <p>Budget honesty: when the deadline strikes mid-run the loop stops and
 * returns what it has with {@code truncated = true} — samples are i.i.d., so
 * an early stop shrinks the sample count without biasing the statistics.
 */
public final class MonteCarlo {

    /** Aggregate statistics for one variable across the successful samples;
     *  {@code firstOrderSigma} is the base solve's RSS value for comparison. */
    public record VariableStats(String variable, double mean, double sigma,
                                double p5, double p50, double p95, double firstOrderSigma) {}

    /** One sample: the solved values, or the failure that discarded it. */
    public record Sample(boolean success, Map<String, Double> values, String error) {}

    public record Outcome(List<VariableStats> stats, List<Sample> samples,
                          List<String> sources, int failedSamples, boolean truncated,
                          Map<String, Double> baseValues) {}

    private MonteCarlo() {}

    /**
     * Runs the sampling loop. {@code text} is the document exactly as the
     * solve endpoints receive it; {@code specs} carry the declared
     * uncertainties (converted to SI by the DTO layer); {@code deadlineNanos}
     * is the run's wall-clock budget.
     */
    public static Outcome run(EquationSystemSolver solver, String text,
                              SolverSettings settings, Map<String, VariableSpec> specs,
                              Map<String, ProcDef> defs, int sampleCount, long seed,
                              long deadlineNanos) {
        EquationSystemSolver.Result base = solver.solve(text, settings, specs, defs);

        List<String> sources = specs.values().stream()
                .filter(s -> s.uncertainty() > 0.0)
                .map(VariableSpec::name)
                .filter(base.variables()::containsKey)
                .sorted()
                .toList();
        if (sources.isEmpty()) {
            throw new SolverException("Monte Carlo needs at least one variable with a declared "
                    + "uncertainty (set one in the Variable Information window).");
        }

        // Per-sample specs: same guesses and bounds, no uncertainties.
        Map<String, VariableSpec> sampleSpecs = new HashMap<>();
        for (Map.Entry<String, VariableSpec> e : specs.entrySet()) {
            VariableSpec s = e.getValue();
            sampleSpecs.put(e.getKey(), new VariableSpec(s.name(), s.guess(), s.lower(), s.upper()));
        }

        Random random = new Random(seed);
        List<Sample> samples = new ArrayList<>(sampleCount);
        Map<String, Double> warm = base.variables();
        int failed = 0;
        boolean truncated = false;
        for (int k = 0; k < sampleCount; k++) {
            if (System.nanoTime() > deadlineNanos) {
                truncated = true;
                break;
            }
            List<String> overrides = new ArrayList<>(sources.size());
            for (String v : sources) {
                VariableSpec spec = specs.get(v);
                double draw = base.variables().get(v) + spec.uncertainty() * random.nextGaussian();
                draw = Math.clamp(draw, spec.lower(), spec.upper());
                overrides.add(v + " = " + BigDecimal.valueOf(draw).toPlainString());
            }
            try {
                EquationSystemSolver.Result r = solver.solvePermissive(
                        SolverApiSupport.applyOverrides(text, overrides),
                        settings, sampleSpecs, defs, warm);
                samples.add(new Sample(true, r.variables(), null));
                warm = r.variables();
            } catch (RuntimeException e) {
                failed++;
                samples.add(new Sample(false, Map.of(), e.getMessage()));
            }
        }

        return new Outcome(aggregate(base, samples), samples, sources, failed, truncated,
                base.variables());
    }

    private static List<VariableStats> aggregate(EquationSystemSolver.Result base,
                                                 List<Sample> samples) {
        List<VariableStats> stats = new ArrayList<>();
        for (String variable : base.variables().keySet().stream().sorted().toList()) {
            double[] values = samples.stream()
                    .filter(Sample::success)
                    .map(s -> s.values().get(variable))
                    .filter(v -> v != null && Double.isFinite(v))
                    .mapToDouble(Double::doubleValue)
                    .sorted()
                    .toArray();
            if (values.length < 2) {
                continue;
            }
            double mean = 0.0;
            for (double v : values) {
                mean += v;
            }
            mean /= values.length;
            double ss = 0.0;
            for (double v : values) {
                ss += (v - mean) * (v - mean);
            }
            double sigma = Math.sqrt(ss / (values.length - 1));
            stats.add(new VariableStats(variable, mean, sigma,
                    percentile(values, 0.05), percentile(values, 0.50), percentile(values, 0.95),
                    base.uncertainties().getOrDefault(variable, 0.0)));
        }
        return stats;
    }

    /** Linear-interpolated percentile on a sorted array. */
    private static double percentile(double[] sorted, double q) {
        double rank = q * (sorted.length - 1);
        int lo = (int) Math.floor(rank);
        int hi = (int) Math.ceil(rank);
        if (lo == hi) {
            return sorted[lo];
        }
        return sorted[lo] + (rank - lo) * (sorted[hi] - sorted[lo]);
    }
}
