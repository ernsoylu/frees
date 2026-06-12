package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Story 9.7: Levenberg-Marquardt curve fitting. */
class CurveFitterTest {

    private final CurveFitter fitter = new CurveFitter();

    // ── Linear model: y = a*x + b ────────────────────────────────────────────

    @Test
    void fitsLinearModel() {
        // y = 2*x + 3 exactly
        List<Double> xData = List.of(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> yData = List.of(5.0, 7.0, 9.0, 11.0, 13.0);

        CurveFitter.FitResult result = fitter.fit(
                "y = a * x + b", "y", "x",
                List.of("a", "b"),
                xData, yData,
                List.of(1.0, 1.0),
                null, null);

        assertEquals(2.0, result.fittedParameters()[0], 1e-6, "slope a");
        assertEquals(3.0, result.fittedParameters()[1], 1e-6, "intercept b");
        assertTrue(result.rSquared() > 0.9999, "R² should be ~1.0 for perfect fit");
        assertEquals(0.0, result.rmse(), 1e-8, "RMSE should be ~0 for perfect fit");
    }

    @Test
    void linearModelRSquaredNearOne() {
        // Noisy linear data: y ≈ 3*x + 1
        List<Double> xData = List.of(0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0);
        List<Double> yData = List.of(1.1, 3.9, 7.1, 9.8, 13.2, 15.9, 19.1, 22.0, 25.1, 27.9);

        CurveFitter.FitResult result = fitter.fit(
                "y = a * x + b", "y", "x",
                List.of("a", "b"),
                xData, yData,
                List.of(1.0, 0.0),
                null, null);

        // Slope should be close to 3, intercept close to 1
        assertEquals(3.0, result.fittedParameters()[0], 0.2);
        assertEquals(1.0, result.fittedParameters()[1], 0.5);
        assertTrue(result.rSquared() > 0.999, "R² should be very high: " + result.rSquared());
    }

    // ── Exponential model: y = a * exp(-b * x) ──────────────────────────────

    @Test
    void fitsExponentialModel() {
        // y = 5 * exp(-0.3 * x)
        double trueA = 5.0;
        double trueB = 0.3;
        List<Double> xData = List.of(0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 10.0);
        List<Double> yData = xData.stream()
                .map(x -> trueA * Math.exp(-trueB * x))
                .toList();

        CurveFitter.FitResult result = fitter.fit(
                "y = a * exp(-b * x)", "y", "x",
                List.of("a", "b"),
                xData, yData,
                List.of(1.0, 1.0),
                null, null);

        assertEquals(trueA, result.fittedParameters()[0], 1e-4, "amplitude a");
        assertEquals(trueB, result.fittedParameters()[1], 1e-4, "decay rate b");
        assertTrue(result.rSquared() > 0.9999, "R² for perfect exponential");
        assertEquals(0.0, result.rmse(), 1e-6);
    }

    // ── Three-parameter model: y = a * exp(-b * x) + c ──────────────────────

    @Test
    void fitsExponentialWithOffset() {
        // y = 4 * exp(-0.5 * x) + 2
        double trueA = 4.0, trueB = 0.5, trueC = 2.0;
        List<Double> xData = List.of(0.0, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 7.0, 10.0);
        List<Double> yData = xData.stream()
                .map(x -> trueA * Math.exp(-trueB * x) + trueC)
                .toList();

        CurveFitter.FitResult result = fitter.fit(
                "y = a * exp(-b * x) + c", "y", "x",
                List.of("a", "b", "c"),
                xData, yData,
                List.of(1.0, 1.0, 1.0),
                null, null);

        assertEquals(trueA, result.fittedParameters()[0], 1e-3, "a");
        assertEquals(trueB, result.fittedParameters()[1], 1e-3, "b");
        assertEquals(trueC, result.fittedParameters()[2], 1e-3, "c");
        assertTrue(result.rSquared() > 0.9999);
    }

    // ── Residuals and fitted values ──────────────────────────────────────────

    @Test
    void residualsAndFittedValuesAreCorrect() {
        List<Double> xData = List.of(1.0, 2.0, 3.0);
        List<Double> yData = List.of(5.0, 7.0, 9.0);

        CurveFitter.FitResult result = fitter.fit(
                "y = a * x + b", "y", "x",
                List.of("a", "b"),
                xData, yData,
                List.of(1.0, 1.0),
                null, null);

        assertEquals(3, result.residuals().length);
        assertEquals(3, result.fittedValues().length);

        // For a perfect fit, residuals should be ~0
        for (int i = 0; i < 3; i++) {
            assertEquals(0.0, result.residuals()[i], 1e-8,
                    "residual[" + i + "] should be ~0");
            assertEquals(yData.get(i), result.fittedValues()[i], 1e-8,
                    "fittedValue[" + i + "] should match yData");
        }
    }

    // ── Parameter names returned in lowercase ────────────────────────────────

    @Test
    void parameterNamesAreLowercase() {
        List<Double> xData = List.of(1.0, 2.0, 3.0);
        List<Double> yData = List.of(3.0, 5.0, 7.0);

        CurveFitter.FitResult result = fitter.fit(
                "y = A * x + B", "y", "x",
                List.of("A", "B"),
                xData, yData,
                null, null, null);

        assertEquals(List.of("a", "b"), result.parameterNames());
    }

    // ── Error handling ───────────────────────────────────────────────────────

    @Test
    void rejectsMismatchedDataSizes() {
        SolverException e = assertThrows(SolverException.class,
                () -> fitter.fit(
                        "y = a * x", "y", "x",
                        List.of("a"),
                        List.of(1.0, 2.0, 3.0),
                        List.of(1.0, 2.0),  // mismatched!
                        null, null, null));
        assertTrue(e.getMessage().contains("same length"), e.getMessage());
    }

    @Test
    void rejectsEmptyData() {
        SolverException e = assertThrows(SolverException.class,
                () -> fitter.fit(
                        "y = a * x", "y", "x",
                        List.of("a"),
                        List.of(), List.of(),
                        null, null, null));
        assertTrue(e.getMessage().contains("required"), e.getMessage());
    }

    @Test
    void rejectsBlankModel() {
        SolverException e = assertThrows(SolverException.class,
                () -> fitter.fit(
                        "  ", "y", "x",
                        List.of("a"),
                        List.of(1.0), List.of(1.0),
                        null, null, null));
        assertTrue(e.getMessage().contains("required"), e.getMessage());
    }

    @Test
    void rejectsNoParameters() {
        SolverException e = assertThrows(SolverException.class,
                () -> fitter.fit(
                        "y = a * x", "y", "x",
                        List.of(),
                        List.of(1.0), List.of(1.0),
                        null, null, null));
        assertTrue(e.getMessage().contains("parameter"), e.getMessage());
    }

    @Test
    void rejectsMissingYVariable() {
        SolverException e = assertThrows(SolverException.class,
                () -> fitter.fit(
                        "z = a * x", "y", "x",
                        List.of("a"),
                        List.of(1.0), List.of(1.0),
                        null, null, null));
        assertTrue(e.getMessage().contains("y"), e.getMessage());
    }

    // ── Default initial guess ────────────────────────────────────────────────

    @Test
    void worksWithDefaultInitialGuess() {
        // y = 2*x + 1 — should converge even with default guess of 1.0
        List<Double> xData = List.of(0.0, 1.0, 2.0, 3.0, 4.0);
        List<Double> yData = List.of(1.0, 3.0, 5.0, 7.0, 9.0);

        CurveFitter.FitResult result = fitter.fit(
                "y = a * x + b", "y", "x",
                List.of("a", "b"),
                xData, yData,
                null, null, null);  // no initial guess

        assertEquals(2.0, result.fittedParameters()[0], 1e-5);
        assertEquals(1.0, result.fittedParameters()[1], 1e-5);
    }

    // ── Power-law model: y = a * x^n ─────────────────────────────────────────

    @Test
    void fitsPowerLawModel() {
        // y = 3 * x^2
        double trueA = 3.0, trueN = 2.0;
        List<Double> xData = List.of(1.0, 2.0, 3.0, 4.0, 5.0);
        List<Double> yData = xData.stream()
                .map(x -> trueA * Math.pow(x, trueN))
                .toList();

        CurveFitter.FitResult result = fitter.fit(
                "y = a * x^n", "y", "x",
                List.of("a", "n"),
                xData, yData,
                List.of(1.0, 1.0),
                null, null);

        assertEquals(trueA, result.fittedParameters()[0], 1e-3, "coefficient a");
        assertEquals(trueN, result.fittedParameters()[1], 1e-3, "exponent n");
        assertTrue(result.rSquared() > 0.9999);
    }
}
