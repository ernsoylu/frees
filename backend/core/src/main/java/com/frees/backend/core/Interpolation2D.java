package com.frees.backend.core;

import org.apache.commons.math3.analysis.interpolation.PiecewiseBicubicSplineInterpolatingFunction;

/**
 * Regular-grid 2-D interpolation, z = f(x, y), exposed as the {@code Interp2}
 * CALL intrinsic. Uses a piecewise-bicubic spline when the grid is large enough
 * (≥ 5 nodes per axis, the Commons Math requirement) and falls back to bilinear
 * interpolation for smaller grids. Queries outside the grid are clamped to the
 * boundary (no extrapolation), matching the 1-D {@code CurveInterpolator}.
 */
public final class Interpolation2D {

    private Interpolation2D() {}

    /**
     * Interpolates the grid {@code z[i][j] = f(x[i], y[j])} at {@code (xq, yq)}.
     * {@code x} (length m) and {@code y} (length n) must be strictly increasing.
     */
    public static double interpolate(double[] x, double[] y, double[][] z, double xq, double yq) {
        int m = x.length;
        int n = y.length;
        if (m < 2 || n < 2) {
            throw new IllegalArgumentException("Interp2 requires at least a 2x2 grid.");
        }
        double cx = clamp(xq, x[0], x[m - 1]);
        double cy = clamp(yq, y[0], y[n - 1]);
        if (m >= 5 && n >= 5) {
            return new PiecewiseBicubicSplineInterpolatingFunction(x, y, z).value(cx, cy);
        }
        return bilinear(x, y, z, cx, cy);
    }

    private static double bilinear(double[] x, double[] y, double[][] z, double xq, double yq) {
        int i = upperIndex(x, xq);
        int j = upperIndex(y, yq);
        double x0 = x[i - 1];
        double x1 = x[i];
        double y0 = y[j - 1];
        double y1 = y[j];
        double tx = x1 == x0 ? 0.0 : (xq - x0) / (x1 - x0);
        double ty = y1 == y0 ? 0.0 : (yq - y0) / (y1 - y0);
        double z00 = z[i - 1][j - 1];
        double z10 = z[i][j - 1];
        double z01 = z[i - 1][j];
        double z11 = z[i][j];
        double zx0 = z00 + tx * (z10 - z00);
        double zx1 = z01 + tx * (z11 - z01);
        return zx0 + ty * (zx1 - zx0);
    }

    /** First index k (>=1) with {@code grid[k] >= q}, so the bracket is [k-1, k]. */
    private static int upperIndex(double[] grid, double q) {
        for (int k = 1; k < grid.length; k++) {
            if (q <= grid[k]) {
                return k;
            }
        }
        return grid.length - 1;
    }

    private static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }
}
