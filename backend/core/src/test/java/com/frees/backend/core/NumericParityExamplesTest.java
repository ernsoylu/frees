package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * End-to-end worked examples grounded in external references, validating the
 * Tier-1 capability additions against independently published / hand-computed
 * answers (the kind of analysis numerical computing tools are used for).
 */
class NumericParityExamplesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static double v(EquationSystemSolver.Result r, String key) {
        Double d = r.variables().get(key);
        if (d == null) {
            throw new AssertionError("missing variable " + key + " in " + r.variables().keySet());
        }
        return d;
    }

    /**
     * a standard reference, Table 2-1 thermal-conductivity curve fit.
     * A 2nd-order polynomial fit of k(T) over T = 200..550 K reproduces the
     * coefficients printed in the book: a0 = 7.295357, a1 = -0.02812857,
     * a2 = 7.723810e-5 (R² = 99.44%). frees PolyFit returns ascending-power
     * coefficients c[1]=a0, c[2]=a1, c[3]=a2.
     */
    @Test
    void polyFitConductivityMatchesReference() {
        String src = "T = [200, 250, 300, 350, 400, 450, 500, 550]\n"
                + "k = [4.53, 5.21, 6.05, 7.02, 8.48, 10.00, 12.11, 15.58]\n"
                + "CALL PolyFit(T, k, 2 : a)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(7.295357, v(r, "a[1]"), 5e-5);
        assertEquals(-0.02812857, v(r, "a[2]"), 5e-7);
        assertEquals(7.723810e-5, v(r, "a[3]"), 5e-9);
    }

    /**
     * Combined sensor-calibration example exercising several new functions in one
     * document: a linear fit (gain/offset/R²) plus descriptive statistics on the
     * measured channel. Expected values computed independently.
     */
    @Test
    void sensorCalibrationCombined() {
        String src = "x = [0, 1, 2, 3, 4]\n"
                + "y = [1.1, 2.9, 5.2, 6.8, 9.1]\n"
                + "CALL LinFit(x, y : gain, offset, r2)\n"
                + "ybar = Mean(y[1:5])\n"
                + "ymed = Median(y[1:5])\n"
                + "ysd = StdDev(y[1:5])\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(1.99, v(r, "gain"), 1e-9);
        assertEquals(1.04, v(r, "offset"), 1e-9);
        assertEquals(0.997306, v(r, "r2"), 1e-5);
        assertEquals(5.02, v(r, "ybar"), 1e-12);
        assertEquals(5.2, v(r, "ymed"), 1e-12);
        // Sample (n−1) standard deviation of y: sqrt(Σ(y−ȳ)² / 4) = sqrt(39.708/4).
        assertEquals(Math.sqrt(39.708 / 4.0), v(r, "ysd"), 1e-9);
    }
}
