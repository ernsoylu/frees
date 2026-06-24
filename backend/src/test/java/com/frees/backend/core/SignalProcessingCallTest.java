package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tier 1.2 signal-processing intrinsics: FFT, IFFT and Convolve, checked against
 * hand-computed DFT values and a known convolution.
 */
class SignalProcessingCallTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static double v(EquationSystemSolver.Result r, String key) {
        Double d = r.variables().get(key);
        if (d == null) {
            throw new AssertionError("missing variable " + key + " in " + r.variables().keySet());
        }
        return d;
    }

    /** DFT of [1,2,3,4]: X = [10, -2+2i, -2, -2-2i]. */
    @Test
    void fftOfRamp() {
        String src = "re = [1, 2, 3, 4]\nim = [0, 0, 0, 0]\n"
                + "CALL FFT(re, im : outRe, outIm)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        double[] expRe = {10, -2, -2, -2};
        double[] expIm = {0, 2, 0, -2};
        for (int k = 0; k < 4; k++) {
            assertEquals(expRe[k], v(r, "outre[" + (k + 1) + "]"), 1e-9, "Re k=" + k);
            assertEquals(expIm[k], v(r, "outim[" + (k + 1) + "]"), 1e-9, "Im k=" + k);
        }
    }

    /** IFFT of the spectrum above recovers the original real ramp [1,2,3,4]. */
    @Test
    void ifftRecoversSignal() {
        String src = "xr = [10, -2, -2, -2]\nxi = [0, 2, 0, -2]\n"
                + "CALL IFFT(xr, xi : yr, yi)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        double[] exp = {1, 2, 3, 4};
        for (int k = 0; k < 4; k++) {
            assertEquals(exp[k], v(r, "yr[" + (k + 1) + "]"), 1e-9, "Re k=" + k);
            assertEquals(0.0, v(r, "yi[" + (k + 1) + "]"), 1e-9, "Im k=" + k);
        }
    }

    /** Linear convolution of [1,2,3] with [0,1,0.5]. */
    @Test
    void convolve() {
        String src = "a = [1, 2, 3]\nb = [0, 1, 0.5]\nCALL Convolve(a, b : c)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        double[] exp = {0, 1, 2.5, 4, 1.5};
        for (int k = 0; k < 5; k++) {
            assertEquals(exp[k], v(r, "c[" + (k + 1) + "]"), 1e-9, "c k=" + k);
        }
    }
}
