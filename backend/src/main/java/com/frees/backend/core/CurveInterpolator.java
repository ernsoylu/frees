package com.frees.backend.core;

import com.frees.backend.ast.ProcDef;

import java.util.Comparator;
import java.util.List;

/**
 * Evaluates a Curve Table function (Epic 8): piecewise-linear interpolation
 * along each curve, computed in log10 space for log-scaled axes (a straight
 * segment on log paper is a power law, which is what engineering charts
 * encode). For a curve family, the two curves bracketing the parameter are
 * evaluated and blended linearly in the parameter. Arguments outside the
 * tabulated range clamp to the nearest edge — empirical charts carry no
 * information beyond their plotted range, and clamping keeps Newton
 * residuals finite instead of blowing up the solve.
 */
public final class CurveInterpolator {

    private CurveInterpolator() {}

    public static double evaluate(ProcDef.FunctionTableDef def, double x, Double param) {
        List<ProcDef.Curve> curves = def.curves();
        if (curves.isEmpty()) {
            throw new SolverException("Function table '" + def.name() + "' has no curves.");
        }
        if (param == null || curves.size() == 1) {
            return interpolate(curves.get(0), x, def);
        }
        List<ProcDef.Curve> sorted = curves.stream()
                .sorted(Comparator.comparingDouble(c -> c.param() != null ? c.param() : 0.0))
                .toList();
        ProcDef.Curve first = sorted.get(0);
        ProcDef.Curve last = sorted.get(sorted.size() - 1);
        if (first.param() == null || last.param() == null) {
            throw new SolverException("Function table '" + def.name()
                    + "' is called with two arguments but its curves have no parameter values.");
        }
        if (param <= first.param()) {
            return interpolate(first, x, def);
        }
        if (param >= last.param()) {
            return interpolate(last, x, def);
        }
        for (int i = 1; i < sorted.size(); i++) {
            ProcDef.Curve hi = sorted.get(i);
            if (param <= hi.param()) {
                ProcDef.Curve lo = sorted.get(i - 1);
                double yLo = interpolate(lo, x, def);
                double yHi = interpolate(hi, x, def);
                double t = (param - lo.param()) / (hi.param() - lo.param());
                return yLo + t * (yHi - yLo);
            }
        }
        return interpolate(last, x, def);
    }

    /** Number of data rows (length of the longest curve). */
    public static int rowCount(ProcDef.FunctionTableDef def) {
        int n = 0;
        for (ProcDef.Curve c : def.curves()) {
            n = Math.max(n, c.xs().length);
        }
        return n;
    }

    /** A whole 1-based column: column 1 is the x axis, columns 2.. are the curves' y values. */
    public static double[] column(ProcDef.FunctionTableDef def, int col) {
        List<ProcDef.Curve> curves = def.curves();
        int nCols = 1 + curves.size();
        if (col < 1 || col > nCols) {
            throw new SolverException("Table '" + def.name() + "': column " + col
                    + " out of range 1.." + nCols + ".");
        }
        ProcDef.Curve ref = curves.get(col == 1 ? 0 : col - 2);
        return (col == 1 ? ref.xs() : ref.ys()).clone();
    }

    /** 1-based cell value at (row, col). */
    public static double cell(ProcDef.FunctionTableDef def, int row, int col) {
        double[] data = column(def, col);
        if (row < 1 || row > data.length) {
            throw new SolverException("Table '" + def.name() + "': row " + row
                    + " out of range 1.." + data.length + ".");
        }
        return data[row - 1];
    }

    /** Fractional 1-based row where column {@code col} crosses {@code val} (linear). */
    public static double lookupRow(ProcDef.FunctionTableDef def, int col, double val) {
        double[] data = column(def, col);
        for (int i = 0; i < data.length; i++) {
            if (data[i] == val) {
                return i + 1.0;
            }
        }
        for (int i = 1; i < data.length; i++) {
            double a = data[i - 1];
            double b = data[i];
            if ((val >= a && val <= b) || (val <= a && val >= b)) {
                double t = b == a ? 0.0 : (val - a) / (b - a);
                return i + t;
            }
        }
        throw new SolverException("LookupRow: value " + val + " not found in column "
                + col + " of table '" + def.name() + "'.");
    }

    /** dy/dx at {@code xVal} from columns (xCol, yCol); cubic uses a spline derivative. */
    public static double differentiate(ProcDef.FunctionTableDef def, int yCol, int xCol, double xVal, boolean cubic) {
        double[] xs = column(def, xCol);
        double[] ys = column(def, yCol);
        Integer[] order = new Integer[xs.length];
        for (int i = 0; i < order.length; i++) {
            order[i] = i;
        }
        java.util.Arrays.sort(order, java.util.Comparator.comparingDouble(i -> xs[i]));
        double[] sx = new double[xs.length];
        double[] sy = new double[ys.length];
        for (int i = 0; i < order.length; i++) {
            sx[i] = xs[order[i]];
            sy[i] = ys[order[i]];
        }
        if (cubic && sx.length >= 3) {
            double clamped = Math.max(sx[0], Math.min(sx[sx.length - 1], xVal));
            return new org.apache.commons.math3.analysis.interpolation.SplineInterpolator()
                    .interpolate(sx, sy).polynomialSplineDerivative().value(clamped);
        }
        int hi = 1;
        while (hi < sx.length - 1 && sx[hi] < xVal) {
            hi++;
        }
        double dx = sx[hi] - sx[hi - 1];
        return dx == 0.0 ? 0.0 : (sy[hi] - sy[hi - 1]) / dx;
    }

    /**
     * Cubic-spline interpolation of the table's first curve (1-D). Falls back to
     * piecewise-linear when there are fewer than three points. Arguments outside
     * the tabulated range clamp to the nearest edge, matching {@link #evaluate}.
     */
    public static double cubicEvaluate(ProcDef.FunctionTableDef def, double x) {
        List<ProcDef.Curve> curves = def.curves();
        if (curves.isEmpty()) {
            throw new SolverException("Function table '" + def.name() + "' has no curves.");
        }
        ProcDef.Curve curve = curves.get(0);
        double[] xs = curve.xs();
        double[] ys = curve.ys();
        if (xs.length < 3) {
            return interpolate(curve, x, def);
        }
        if (x <= xs[0]) {
            return ys[0];
        }
        if (x >= xs[xs.length - 1]) {
            return ys[ys.length - 1];
        }
        org.apache.commons.math3.analysis.polynomials.PolynomialSplineFunction spline =
                new org.apache.commons.math3.analysis.interpolation.SplineInterpolator().interpolate(xs, ys);
        return spline.value(x);
    }

    private static double interpolate(ProcDef.Curve curve, double x, ProcDef.FunctionTableDef def) {
        double[] xs = curve.xs();
        double[] ys = curve.ys();
        if (xs.length == 0) {
            throw new SolverException("Function table '" + def.name() + "' has an empty curve.");
        }
        if (xs.length == 1 || x <= xs[0]) {
            return ys[0];
        }
        if (x >= xs[xs.length - 1]) {
            return ys[ys.length - 1];
        }
        int hi = 1;
        while (xs[hi] < x) {
            hi++;
        }
        double x0 = scale(xs[hi - 1], def.xLog());
        double x1 = scale(xs[hi], def.xLog());
        double y0 = scale(ys[hi - 1], def.yLog());
        double y1 = scale(ys[hi], def.yLog());
        double t = x1 == x0 ? 0.0 : (scale(x, def.xLog()) - x0) / (x1 - x0);
        return unscale(y0 + t * (y1 - y0), def.yLog());
    }

    private static double scale(double v, boolean log) {
        return log ? Math.log10(v) : v;
    }

    private static double unscale(double v, boolean log) {
        return log ? Math.pow(10, v) : v;
    }
}
