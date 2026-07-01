package com.frees.backend.props;

import java.util.function.DoubleBinaryOperator;

/**
 * Bicubic {@code (P, h)} property table with <b>analytic</b> first derivatives —
 * Phase&nbsp;S1 of the two-phase / refrigeration re-architecture (see {@code todo.md}).
 *
 * <p>A thermofluid Jacobian needs {@code ρ(P,h)}, {@code T(P,h)} (and friends)
 * <em>and</em> their partials thousands of times per Newton step; calling
 * CoolProp's Helmholtz EOS in that inner loop is both far too slow and, across
 * the saturation lines, only C<sup>0</sup>. This class samples a property on a
 * structured {@code (P, h)} grid once, then serves every later query from a
 * globally C<sup>1</sup> piecewise-bicubic Hermite surface whose value
 * <em>and</em> both partials are evaluated in closed form.
 *
 * <p><b>Why this satisfies the §4.8 Tier-1 smoothing requirement.</b> The dome
 * boundary kink in {@code ρ(P,h)} (where {@code h} crosses {@code h_f}/{@code h_g})
 * is C<sup>0</sup>-but-not-C<sup>1</sup>. Resampling onto a Hermite surface with
 * shared nodal tangents yields an interpolant that is C<sup>1</sup> by
 * construction — the steep-but-smooth region the BDF integrates straight
 * through — and the partials this class returns are the exact derivatives of
 * <em>that</em> smooth surface. The smoothing therefore lives in the same
 * analytic derivative path as the values, never an FD afterthought.
 *
 * <p><b>Four regions, supercritical first-class.</b> The grid spans whatever
 * {@code (P, h)} box the caller asks for, so a transcritical R744 high side
 * (where the trajectory routinely crosses the pseudo-critical line) is just an
 * ordinary part of the surface. CoolProp can return non-physical values right
 * at the critical point; {@link #fromCoolProp} fills any such NaN node from its
 * nearest finite neighbour (the near-critical safe-fallback) so the surface
 * stays smooth across the region.
 *
 * <p>All values are SI, matching the rest of frees.
 */
public final class PhPropertyTable {

    private final double[] pGrid;   // strictly increasing pressures [Pa]
    private final double[] hGrid;   // strictly increasing specific enthalpies [J/kg]
    private final double[][] f;     // nodal values f[i][j] = prop(pGrid[i], hGrid[j])
    private final double[][] fp;    // ∂f/∂P at nodes
    private final double[][] fh;    // ∂f/∂h at nodes
    private final double[][] fph;   // ∂²f/∂P∂h at nodes

    /** A property value with its analytic partials at a query point. */
    public record Value(double value, double dValuedP, double dValuedH) {}

    private PhPropertyTable(double[] pGrid, double[] hGrid, double[][] f,
                            double[][] fp, double[][] fh, double[][] fph) {
        this.pGrid = pGrid;
        this.hGrid = hGrid;
        this.f = f;
        this.fp = fp;
        this.fh = fh;
        this.fph = fph;
    }

    /**
     * Builds a table by sampling {@code sampler.applyAsDouble(P, h)} over the
     * given strictly-increasing grids. Nodal derivatives are estimated by
     * (grid-spacing-aware) finite differences once, at build time, which is what
     * makes the resulting Hermite surface C<sup>1</sup>. Any non-finite sample
     * is back-filled from its nearest finite neighbour.
     */
    public static PhPropertyTable build(double[] pGrid, double[] hGrid, DoubleBinaryOperator sampler) {
        validateGrid(pGrid, "P");
        validateGrid(hGrid, "h");
        int np = pGrid.length;
        int nh = hGrid.length;
        double[][] f = new double[np][nh];
        for (int i = 0; i < np; i++) {
            for (int j = 0; j < nh; j++) {
                f[i][j] = sampler.applyAsDouble(pGrid[i], hGrid[j]);
            }
        }
        fillNonFinite(f);
        double[][] fp = new double[np][nh];
        double[][] fh = new double[np][nh];
        double[][] fph = new double[np][nh];
        for (int i = 0; i < np; i++) {
            for (int j = 0; j < nh; j++) {
                fp[i][j] = partial(f, pGrid, i, j, true);
                fh[i][j] = partial(f, hGrid, i, j, false);
            }
        }
        // Cross derivative as the P-difference of the h-derivative field.
        for (int i = 0; i < np; i++) {
            for (int j = 0; j < nh; j++) {
                fph[i][j] = partial(fh, pGrid, i, j, true);
            }
        }
        return new PhPropertyTable(pGrid.clone(), hGrid.clone(), f, fp, fh, fph);
    }

    /**
     * Builds a table for {@code output} (CoolProp key, e.g. {@code "D"}, {@code "T"})
     * of {@code fluid} over a uniform {@code (P, h)} grid. Requires the CoolProp
     * native library; near-critical NaNs are back-filled (the safe-fallback).
     */
    public static PhPropertyTable fromCoolProp(String output, String fluid,
                                               double pMin, double pMax, int np,
                                               double hMin, double hMax, int nh) {
        double[] pGrid = linspace(pMin, pMax, np);
        double[] hGrid = linspace(hMin, hMax, nh);
        return build(pGrid, hGrid,
                (p, h) -> CoolProp.propsSIOrNaN(output, "P", p, "H", h, fluid));
    }

    /** Evaluates the property and its analytic partials at {@code (P, h)} (clamped to grid). */
    public Value eval(double p, double h) {
        int i = locate(pGrid, p);
        int j = locate(hGrid, h);
        double p0 = pGrid[i];
        double p1 = pGrid[i + 1];
        double h0 = hGrid[j];
        double h1 = hGrid[j + 1];
        double dp = p1 - p0;
        double dh = h1 - h0;
        double u = clamp01((p - p0) / dp);
        double v = clamp01((h - h0) / dh);

        // Hermite basis (value/tangent) and their derivatives in u and v.
        double[] bu = hermite(u);
        double[] bv = hermite(v);
        double[] du = hermiteDeriv(u);
        double[] dv = hermiteDeriv(v);

        double val = 0.0;
        double dValdu = 0.0;
        double dValdv = 0.0;
        // corner a∈{0,1} in P, b∈{0,1} in h
        for (int a = 0; a < 2; a++) {
            for (int b = 0; b < 2; b++) {
                int ci = i + a;
                int cj = j + b;
                double fab = f[ci][cj];
                double fuab = fp[ci][cj] * dp;       // tangent scaled to unit cell
                double fvab = fh[ci][cj] * dh;
                double fuvab = fph[ci][cj] * dp * dh;
                // value-basis index for this corner is a (h00/h01); tangent is a+2 (h10/h11)
                double Bu = bu[a];
                double Tu = bu[a + 2];
                double Bv = bv[b];
                double Tv = bv[b + 2];
                double dBu = du[a];
                double dTu = du[a + 2];
                double dBv = dv[b];
                double dTv = dv[b + 2];

                val += fab * Bu * Bv + fuab * Tu * Bv + fvab * Bu * Tv + fuvab * Tu * Tv;
                dValdu += fab * dBu * Bv + fuab * dTu * Bv + fvab * dBu * Tv + fuvab * dTu * Tv;
                dValdv += fab * Bu * dBv + fuab * Tu * dBv + fvab * Bu * dTv + fuvab * Tu * dTv;
            }
        }
        return new Value(val, dValdu / dp, dValdv / dh);
    }

    /** Convenience: value only. */
    public double value(double p, double h) {
        return eval(p, h).value();
    }

    // --- Hermite basis on [0,1], ordered [h00, h01, h10, h11] -----------------
    // h00 = value at left corner, h01 = value at right corner,
    // h10 = tangent at left corner, h11 = tangent at right corner.

    private static double[] hermite(double t) {
        double t2 = t * t;
        double t3 = t2 * t;
        return new double[] {
                2 * t3 - 3 * t2 + 1,   // h00
                -2 * t3 + 3 * t2,      // h01
                t3 - 2 * t2 + t,       // h10
                t3 - t2                // h11
        };
    }

    private static double[] hermiteDeriv(double t) {
        double t2 = t * t;
        return new double[] {
                6 * t2 - 6 * t,        // h00'
                -6 * t2 + 6 * t,       // h01'
                3 * t2 - 4 * t + 1,    // h10'
                3 * t2 - 2 * t         // h11'
        };
    }

    /** Grid-spacing-aware central/one-sided finite difference along one axis. */
    private static double partial(double[][] g, double[] axis, int i, int j, boolean alongP) {
        int n = axis.length;
        int k = alongP ? i : j;
        double here = g[i][j];
        if (k == 0) {
            double fwd = alongP ? g[i + 1][j] : g[i][j + 1];
            return (fwd - here) / (axis[1] - axis[0]);
        }
        if (k == n - 1) {
            double back = alongP ? g[i - 1][j] : g[i][j - 1];
            return (here - back) / (axis[n - 1] - axis[n - 2]);
        }
        // Non-uniform central difference.
        double back = alongP ? g[i - 1][j] : g[i][j - 1];
        double fwd = alongP ? g[i + 1][j] : g[i][j + 1];
        double hPrev = axis[k] - axis[k - 1];
        double hNext = axis[k + 1] - axis[k];
        return centralNonUniform(back, here, fwd, hPrev, hNext);
    }

    private static double centralNonUniform(double back, double here, double fwd, double hPrev, double hNext) {
        // Standard second-order non-uniform central difference.
        double a = -hNext / (hPrev * (hPrev + hNext));
        double b = (hNext - hPrev) / (hPrev * hNext);
        double c = hPrev / (hNext * (hPrev + hNext));
        return a * back + b * here + c * fwd;
    }

    private static void fillNonFinite(double[][] f) {
        int np = f.length;
        int nh = f[0].length;
        for (int i = 0; i < np; i++) {
            for (int j = 0; j < nh; j++) {
                if (!Double.isFinite(f[i][j])) {
                    f[i][j] = nearestFinite(f, i, j, np, nh);
                }
            }
        }
    }

    private static double nearestFinite(double[][] f, int i, int j, int np, int nh) {
        for (int r = 1; r < Math.max(np, nh); r++) {
            for (int di = -r; di <= r; di++) {
                for (int dj = -r; dj <= r; dj++) {
                    int ni = i + di;
                    int nj = j + dj;
                    if (ni >= 0 && ni < np && nj >= 0 && nj < nh && Double.isFinite(f[ni][nj])) {
                        return f[ni][nj];
                    }
                }
            }
        }
        return 0.0;
    }

    private static int locate(double[] g, double q) {
        if (q <= g[0]) {
            return 0;
        }
        if (q >= g[g.length - 1]) {
            return g.length - 2;
        }
        int lo = 0;
        int hi = g.length - 1;
        while (hi - lo > 1) {
            int mid = (lo + hi) >>> 1;
            if (g[mid] <= q) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    private static double clamp01(double t) {
        return Math.max(0.0, Math.min(1.0, t));
    }

    private static double[] linspace(double a, double b, int n) {
        if (n < 2) {
            throw new IllegalArgumentException("grid needs at least 2 points");
        }
        double[] g = new double[n];
        for (int i = 0; i < n; i++) {
            g[i] = a + (b - a) * i / (n - 1);
        }
        return g;
    }

    private static void validateGrid(double[] g, String name) {
        if (g.length < 2) {
            throw new IllegalArgumentException(name + " grid needs at least 2 points");
        }
        for (int i = 1; i < g.length; i++) {
            if (g[i] <= g[i - 1]) {
                throw new IllegalArgumentException(name + " grid must be strictly increasing");
            }
        }
    }
}
