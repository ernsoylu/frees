package com.frees.backend.core;

import java.util.List;
import java.util.Map;

/**
 * Thread-bound bridge that makes Parametric-Table accessor functions
 * ({@code TableSum}, {@code TableValue}, {@code IntegralValue}, …) resolve
 * against the whole table while a single row is being solved. The
 * {@link com.frees.backend.api.SolveController} solves the parametric table in
 * passes: an initial pass with no table data (accessors return 0), then further
 * passes with the columns collected from the previous pass installed here, until
 * the column values stabilise. This Gauss–Seidel fixed point lets an equation in
 * one row legitimately depend on an aggregate of every row.
 *
 * <p>{@code columns} maps a (lower-cased) variable name to its solved value in
 * each run; {@code varOrder} is the parametric table's declared column order so
 * {@code TableValue(run, col)} can address a cell by 1-based column index.
 */
public final class ParametricAccessorContext {

    private static final ThreadLocal<ParametricAccessorContext> CURRENT = new ThreadLocal<>();

    private final int currentRun;   // 1-based
    private final int totalRuns;
    private final Map<String, double[]> columns;
    private final List<String> varOrder;

    private ParametricAccessorContext(int currentRun, int totalRuns,
                                      Map<String, double[]> columns, List<String> varOrder) {
        this.currentRun = currentRun;
        this.totalRuns = totalRuns;
        this.columns = columns;
        this.varOrder = varOrder;
    }

    public static void install(int currentRun, int totalRuns,
                               Map<String, double[]> columns, List<String> varOrder) {
        CURRENT.set(new ParametricAccessorContext(currentRun, totalRuns, columns, varOrder));
    }

    public static void clear() {
        CURRENT.remove();
    }

    /** True when a parametric solve is active (so accessors are meaningful). */
    public static boolean isActive() {
        return CURRENT.get() != null;
    }

    /** Current 1-based run index ({@code TableRun#}); 1 outside a parametric solve. */
    public static double currentRun() {
        ParametricAccessorContext ctx = CURRENT.get();
        return ctx == null ? 1.0 : ctx.currentRun;
    }

    /** Number of parametric runs ({@code NParametricRuns}); 0 outside a parametric solve. */
    public static double runCount() {
        ParametricAccessorContext ctx = CURRENT.get();
        return ctx == null ? 0.0 : ctx.totalRuns;
    }

    /** {@code TableValue(run, col)} — cell by 1-based run and column index. */
    public static double cell(int run, int col) {
        ParametricAccessorContext ctx = CURRENT.get();
        if (ctx == null) {
            return 0.0;
        }
        if (col < 1 || col > ctx.varOrder.size()) {
            throw new SolverException("TableValue: column " + col + " out of range 1.."
                    + ctx.varOrder.size() + ".");
        }
        return ctx.valueAt(ctx.varOrder.get(col - 1), run);
    }

    /** Column aggregate ({@code sum|avg|min|max|stddev}) over a named column. */
    public static double aggregate(String op, String column) {
        ParametricAccessorContext ctx = CURRENT.get();
        if (ctx == null) {
            return 0.0;
        }
        double[] data = ctx.finiteColumn(column);
        if (data.length == 0) {
            return 0.0;
        }
        return switch (op) {
            case "sum" -> java.util.Arrays.stream(data).sum();
            case "avg" -> java.util.Arrays.stream(data).average().orElse(0.0);
            case "min" -> java.util.Arrays.stream(data).min().orElse(0.0);
            case "max" -> java.util.Arrays.stream(data).max().orElse(0.0);
            case "stddev" -> stdDev(data);
            default -> 0.0;
        };
    }

    /** {@code IntegralValue(y, x)} — trapezoid integral of column y w.r.t. column x. */
    public static double integral(String yColumn, String xColumn) {
        ParametricAccessorContext ctx = CURRENT.get();
        if (ctx == null) {
            return 0.0;
        }
        double[] ys = ctx.column(yColumn);
        double[] xs = ctx.column(xColumn);
        double total = 0.0;
        for (int i = 1; i < xs.length; i++) {
            if (isFinite(xs[i]) && isFinite(xs[i - 1]) && isFinite(ys[i]) && isFinite(ys[i - 1])) {
                total += 0.5 * (xs[i] - xs[i - 1]) * (ys[i] + ys[i - 1]);
            }
        }
        return total;
    }

    private double valueAt(String column, int run) {
        double[] data = column(column);
        if (run < 1 || run > data.length) {
            return 0.0;
        }
        double v = data[run - 1];
        return isFinite(v) ? v : 0.0;
    }

    private double[] column(String column) {
        double[] data = columns.get(column.toLowerCase());
        return data != null ? data : new double[0];
    }

    /** A column with the non-finite (unsolved) entries removed. */
    private double[] finiteColumn(String column) {
        double[] data = column(column);
        int n = 0;
        for (double v : data) {
            if (isFinite(v)) {
                n++;
            }
        }
        double[] out = new double[n];
        int j = 0;
        for (double v : data) {
            if (isFinite(v)) {
                out[j++] = v;
            }
        }
        return out;
    }

    private static boolean isFinite(double v) {
        return !Double.isNaN(v) && !Double.isInfinite(v);
    }

    private static double stdDev(double[] data) {
        double mean = java.util.Arrays.stream(data).average().orElse(0.0);
        double sumSq = 0.0;
        for (double v : data) {
            double d = v - mean;
            sumSq += d * d;
        }
        return Math.sqrt(sumSq / data.length);
    }
}
