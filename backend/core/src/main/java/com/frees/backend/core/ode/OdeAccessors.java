package com.frees.backend.core.ode;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.core.SolverException;

import java.util.List;
import java.util.Set;

/**
 * The ODE Table accessor functions — how the <em>analytic</em> system reads
 * cells, end values, extrema and column aggregates out of a solved
 * {@code DYNAMIC} block (mirrors the Parametric/Integral table accessors):
 *
 * <ul>
 *   <li>{@code FinalValue('col')} — last sampled value</li>
 *   <li>{@code MaxValue('col')} / {@code MinValue('col')} — extrema</li>
 *   <li>{@code ODEValue('col', t)} — value at time {@code t} (interpolated)</li>
 *   <li>{@code TimeAt('col', v)} — first time the column crosses {@code v}</li>
 *   <li>{@code ODEAvg/ODESum/ODEStdDev('col')} — column aggregates</li>
 * </ul>
 *
 * <p>These are <em>live</em> during the analytic solve: each evaluates against an
 * ODE table integrated with the current Newton iterate (see
 * {@link DynamicAccessorContext}), so the analytic solver can size an ODE input
 * to hit a transient target (e.g. apogee altitude = 100 km).
 */
public final class OdeAccessors {

    public static final Set<String> NAMES = Set.of(
            "odevalue", "finalvalue", "maxvalue", "minvalue", "timeat",
            "odeavg", "odesum", "odestddev", "odemin", "odemax");

    private OdeAccessors() {}

    public static boolean isAccessor(String function) {
        return NAMES.contains(function.toLowerCase());
    }

    /** Whether any equation references an ODE accessor function. */
    public static boolean containsAccessor(List<Equation> equations) {
        for (Equation eq : equations) {
            if (exprHasAccessor(eq.lhs()) || exprHasAccessor(eq.rhs())) {
                return true;
            }
        }
        return false;
    }

    private static boolean exprHasAccessor(Expr e) {
        return switch (e) {
            case Expr.Call(String fn, List<Expr> args) ->
                    isAccessor(fn) || args.stream().anyMatch(OdeAccessors::exprHasAccessor);
            case Expr.BinOp(char op, Expr l, Expr r) -> exprHasAccessor(l) || exprHasAccessor(r);
            case Expr.Neg(Expr o) -> exprHasAccessor(o);
            case Expr.Compare(String op, Expr l, Expr r) -> exprHasAccessor(l) || exprHasAccessor(r);
            case Expr.Logical(String op, Expr l, Expr r) -> exprHasAccessor(l) || exprHasAccessor(r);
            case Expr.Not(Expr o) -> exprHasAccessor(o);
            default -> false;
        };
    }

    /** Computes one accessor over a solved ODE table. */
    public static double compute(OdeTableResult table, String function, String column, Double arg) {
        int ci = table.columns().indexOf(column.toLowerCase());
        if (ci < 0) {
            throw new SolverException("ODE accessor: column '" + column + "' not found in DYNAMIC '"
                    + table.name() + "'. Available columns: " + table.columns() + ".");
        }
        List<List<Double>> rows = table.rows();
        if (rows.isEmpty()) {
            throw new SolverException("ODE accessor: DYNAMIC '" + table.name() + "' produced no rows.");
        }
        return switch (function.toLowerCase()) {
            case "finalvalue" -> rows.get(rows.size() - 1).get(ci);
            case "maxvalue", "odemax" -> stat(rows, ci, Stat.MAX);
            case "minvalue", "odemin" -> stat(rows, ci, Stat.MIN);
            case "odeavg" -> stat(rows, ci, Stat.AVG);
            case "odesum" -> stat(rows, ci, Stat.SUM);
            case "odestddev" -> stat(rows, ci, Stat.STD);
            case "odevalue" -> valueAtTime(table, ci, requireArg(arg, "ODEValue"));
            case "timeat" -> timeAtCrossing(table, ci, requireArg(arg, "TimeAt"));
            default -> throw new SolverException("Unknown ODE accessor '" + function + "'.");
        };
    }

    private enum Stat { MAX, MIN, AVG, SUM, STD }

    private static double stat(List<List<Double>> rows, int ci, Stat kind) {
        double sum = 0;
        double max = Double.NEGATIVE_INFINITY;
        double min = Double.POSITIVE_INFINITY;
        int n = rows.size();
        for (List<Double> row : rows) {
            double v = row.get(ci);
            sum += v;
            max = Math.max(max, v);
            min = Math.min(min, v);
        }
        double mean = sum / n;
        return switch (kind) {
            case MAX -> max;
            case MIN -> min;
            case SUM -> sum;
            case AVG -> mean;
            case STD -> {
                double sq = 0;
                for (List<Double> row : rows) {
                    double d = row.get(ci) - mean;
                    sq += d * d;
                }
                yield Math.sqrt(sq / n);
            }
        };
    }

    /** Linear interpolation of column {@code ci} at the given time (column 0). */
    private static double valueAtTime(OdeTableResult table, int ci, double time) {
        List<List<Double>> rows = table.rows();
        for (int i = 0; i < rows.size() - 1; i++) {
            double t0 = rows.get(i).get(0);
            double t1 = rows.get(i + 1).get(0);
            if ((time >= t0 && time <= t1) || (time <= t0 && time >= t1)) {
                double f = t1 == t0 ? 0 : (time - t0) / (t1 - t0);
                return rows.get(i).get(ci) + f * (rows.get(i + 1).get(ci) - rows.get(i).get(ci));
            }
        }
        // Clamp to the nearest end.
        return time <= rows.get(0).get(0)
                ? rows.get(0).get(ci)
                : rows.get(rows.size() - 1).get(ci);
    }

    /** First time at which column {@code ci} crosses {@code target} (interpolated). */
    private static double timeAtCrossing(OdeTableResult table, int ci, double target) {
        List<List<Double>> rows = table.rows();
        for (int i = 0; i < rows.size() - 1; i++) {
            double a = rows.get(i).get(ci) - target;
            double b = rows.get(i + 1).get(ci) - target;
            if (a == 0) {
                return rows.get(i).get(0);
            }
            if ((a < 0) != (b < 0)) {
                double f = a / (a - b);
                double t0 = rows.get(i).get(0);
                double t1 = rows.get(i + 1).get(0);
                return t0 + f * (t1 - t0);
            }
        }
        throw new SolverException("TimeAt: column never reaches " + target + " in DYNAMIC '"
                + table.name() + "'.");
    }

    private static double requireArg(Double arg, String fn) {
        if (arg == null) {
            throw new SolverException(fn + " requires a second argument, e.g. " + fn + "('col', value).");
        }
        return arg;
    }
}
