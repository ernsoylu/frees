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
