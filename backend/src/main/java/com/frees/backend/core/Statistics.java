package com.frees.backend.core;

import org.apache.commons.math3.fitting.PolynomialCurveFitter;
import org.apache.commons.math3.fitting.WeightedObservedPoints;
import org.apache.commons.math3.stat.regression.SimpleRegression;

/**
 * Statistical regression kernels exposed to the equation language as CALL
 * intrinsics (LinFit, PolyFit). Descriptive statistics (mean/median/stddev/
 * variance/percentile) and distribution CDFs are evaluated inline in
 * {@code Evaluator} and do not need this helper.
 */
public final class Statistics {

    private Statistics() {}

    /** Ordinary least-squares line fit: {@code {slope, intercept, rSquared}}. */
    public static double[] linFit(double[] x, double[] y) {
        if (x.length != y.length) {
            throw new IllegalArgumentException("LinFit x and y must have equal length.");
        }
        SimpleRegression reg = new SimpleRegression(true);
        for (int i = 0; i < x.length; i++) {
            reg.addData(x[i], y[i]);
        }
        double r2 = reg.getRSquare();
        if (Double.isNaN(r2)) {
            r2 = 0.0; // degenerate (e.g. all-identical x): report 0 rather than NaN
        }
        return new double[] {reg.getSlope(), reg.getIntercept(), r2};
    }

    /**
     * Least-squares polynomial fit of the given degree. Returns the coefficients
     * in ascending power order: {@code c[0] + c[1]·x + … + c[degree]·x^degree}
     * (length degree + 1).
     */
    public static double[] polyFit(double[] x, double[] y, int degree) {
        if (x.length != y.length) {
            throw new IllegalArgumentException("PolyFit x and y must have equal length.");
        }
        WeightedObservedPoints points = new WeightedObservedPoints();
        for (int i = 0; i < x.length; i++) {
            points.add(x[i], y[i]);
        }
        return PolynomialCurveFitter.create(degree).fit(points.toList());
    }
}
