package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tier 1.4 statistics: descriptive functions (mean/median/variance/stdev/
 * percentile), the normal distribution, and the LinFit / PolyFit regressions.
 */
class StatisticsFunctionsTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static double v(EquationSystemSolver.Result r, String key) {
        Double d = r.variables().get(key);
        if (d == null) {
            throw new AssertionError("missing variable " + key + " in " + r.variables().keySet());
        }
        return d;
    }

    /** Classic data set [2,4,4,4,5,5,7,9]: mean 5, median 4.5, sample variance 32/7. */
    @Test
    void descriptiveStatistics() {
        String data = "v = [2, 4, 4, 4, 5, 5, 7, 9]\n";
        String src = data
                + "m = Mean(v[1:8])\n"
                + "md = Median(v[1:8])\n"
                + "vr = Variance(v[1:8])\n"
                + "sd = StdDev(v[1:8])\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(5.0, v(r, "m"), 1e-12);
        assertEquals(4.5, v(r, "md"), 1e-12);
        assertEquals(32.0 / 7.0, v(r, "vr"), 1e-9);
        assertEquals(Math.sqrt(32.0 / 7.0), v(r, "sd"), 1e-9);
    }

    @Test
    void percentiles() {
        String data = "v = [2, 4, 4, 4, 5, 5, 7, 9]\n";
        EquationSystemSolver.Result r = solver.solve(data
                + "p50 = Percentile(50, v[1:8])\n"
                + "p25 = Percentile(25, v[1:8])\n");
        assertEquals(4.5, v(r, "p50"), 1e-9);
        assertEquals(4.0, v(r, "p25"), 1e-9);
    }

    @Test
    void normalDistribution() {
        String src = "a = normalCDF(0)\n"
                + "b = normalCDF(1.96)\n"
                + "c = normalInvCDF(0.975)\n"
                + "d = normalPDF(0)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(0.5, v(r, "a"), 1e-12);
        assertEquals(0.975, v(r, "b"), 1e-3);
        assertEquals(1.959963985, v(r, "c"), 1e-6);
        assertEquals(1.0 / Math.sqrt(2.0 * Math.PI), v(r, "d"), 1e-9);
    }

    /** Perfect line y = 2x: slope 2, intercept 0, R² = 1. */
    @Test
    void linearRegression() {
        String src = "x = [1, 2, 3, 4]\ny = [2, 4, 6, 8]\n"
                + "CALL LinFit(x, y : slope, intercept, r2)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(2.0, v(r, "slope"), 1e-9);
        assertEquals(0.0, v(r, "intercept"), 1e-9);
        assertEquals(1.0, v(r, "r2"), 1e-12);
    }

    /** Quadratic fit to y = x²: ascending coefficients [0, 0, 1]. */
    @Test
    void polynomialRegression() {
        String src = "x = [-1, 0, 1, 2]\ny = [1, 0, 1, 4]\n"
                + "CALL PolyFit(x, y, 2 : c)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(0.0, v(r, "c[1]"), 1e-7);
        assertEquals(0.0, v(r, "c[2]"), 1e-7);
        assertEquals(1.0, v(r, "c[3]"), 1e-7);
    }
}
