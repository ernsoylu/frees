package com.frees.backend.api;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Parameter estimation: the roadmap's acceptance case — synthetic data
 * generated from known parameters plus deterministic noise must recover the
 * parameters end-to-end.
 */
class ParameterFitTest {

    private static final String DECAY_MODEL = """
            k = 0.3
            x0 = 5
            DYNAMIC decay(t = 0 .. 5, points = 120)
            der(x) = -k * x
            x(0) = x0
            END
            """;

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static long farDeadline() {
        return System.nanoTime() + 120_000_000_000L;
    }

    /** Synthetic measurement from k_true = 0.7 with small deterministic noise. */
    private static double[][] syntheticDecay(double kTrue, double x0) {
        int n = 60;
        double[] t = new double[n];
        double[] v = new double[n];
        for (int i = 0; i < n; i++) {
            t[i] = 5.0 * i / (n - 1);
            v[i] = x0 * Math.exp(-kTrue * t[i]) + 0.01 * Math.sin(13.0 * i);
        }
        return new double[][] {t, v};
    }

    /** One parameter (the bracketing path): recover the decay constant. */
    @Test
    void recoversDecayConstant() {
        double[][] data = syntheticDecay(0.7, 5.0);
        ParameterFit.Outcome out = ParameterFit.run(solver, DECAY_MODEL,
                SolverSettings.DEFAULTS, Map.of(), Map.of(),
                List.of("k"), new double[] {0.3}, new double[] {0.05}, new double[] {3.0},
                "decay", "x", data[0], data[1], 120, farDeadline());

        assertEquals(0.7, out.fitted()[0], 0.02, "recovered decay constant");
        assertTrue(out.rmse() < out.initialRmse() / 5.0,
                "fit must improve the residual decisively: " + out.initialRmse() + " -> " + out.rmse());
        assertTrue(out.rmse() < 0.05, "final rmse near the noise floor, got " + out.rmse());
        assertEquals(data[0].length, out.fittedSeries().t().length, "fitted series on the measured raster");
    }

    /** Two parameters (the quadratic-model path): recover rate and initial value. */
    @Test
    void recoversTwoParameters() {
        double[][] data = syntheticDecay(0.7, 4.2);
        ParameterFit.Outcome out = ParameterFit.run(solver, DECAY_MODEL,
                SolverSettings.DEFAULTS, Map.of(), Map.of(),
                List.of("k", "x0"), new double[] {0.3, 5.0},
                new double[] {0.05, 1.0}, new double[] {3.0, 10.0},
                "decay", "x", data[0], data[1], 250, farDeadline());

        assertEquals(0.7, out.fitted()[0], 0.03, "recovered decay constant");
        assertEquals(4.2, out.fitted()[1], 0.05, "recovered initial value");
        assertTrue(out.rmse() < 0.05, "final rmse near the noise floor, got " + out.rmse());
    }

    /** A wrong block or column is a clear error at the start, not a flat fit. */
    @Test
    void infeasibleStartIsReportedNotReturned() {
        double[][] data = syntheticDecay(0.7, 5.0);
        SolverException ex = assertThrows(SolverException.class, () -> ParameterFit.run(
                solver, DECAY_MODEL, SolverSettings.DEFAULTS, Map.of(), Map.of(),
                List.of("k"), new double[] {0.3}, new double[] {0.05}, new double[] {3.0},
                "decay", "no_such_column", data[0], data[1], 50, farDeadline()));
        assertTrue(ex.getMessage().contains("initial parameter values"), ex.getMessage());
    }

    /** Bounds validation speaks before any solve runs. */
    @Test
    void rejectsBadBounds() {
        double[][] data = syntheticDecay(0.7, 5.0);
        assertThrows(SolverException.class, () -> ParameterFit.run(
                solver, DECAY_MODEL, SolverSettings.DEFAULTS, Map.of(), Map.of(),
                List.of("k"), new double[] {0.3}, new double[] {2.0}, new double[] {1.0},
                "decay", "x", data[0], data[1], 50, farDeadline()));
    }
}
