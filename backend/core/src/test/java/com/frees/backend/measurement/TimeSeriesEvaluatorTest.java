package com.frees.backend.measurement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.frees.backend.ast.Expr;
import com.frees.backend.props.CoolProp;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Calculated-signal engine tests (todo.md Phase 4 test list). */
class TimeSeriesEvaluatorTest {

    private static double[] ramp(int n, double dt) {
        double[] t = new double[n];
        for (int i = 0; i < n; i++) {
            t[i] = i * dt;
        }
        return t;
    }

    // ------------------------------------------------------------------
    // Raster construction
    // ------------------------------------------------------------------

    @Test
    void unionMergesSortsAndDedupes() throws Exception {
        double[] merged = MergedRaster.union(List.of(
                new double[]{0, 2, 4}, new double[]{1, 2, 3}, new double[]{}), 100);
        assertEquals(List.of(0.0, 1.0, 2.0, 3.0, 4.0),
                java.util.Arrays.stream(merged).boxed().toList());
    }

    @Test
    void overCapCarriesACompliantSuggestedDt() {
        // Two offset 100 kHz-ish bases exceed a 1000-point cap organically.
        double[] a = ramp(5000, 0.001);
        double[] b = ramp(5000, 0.001);
        for (int i = 0; i < b.length; i++) {
            b[i] += 0.0005;
        }
        MergedRaster.RasterCapExceededException e = assertThrows(
                MergedRaster.RasterCapExceededException.class,
                () -> MergedRaster.union(List.of(a, b), 1000));
        assertEquals(10_000, e.actualPoints);
        // The suggestion must VERIFIABLY land under the cap.
        double span = 4.9995;
        long points = (long) Math.floor(span / e.suggestedDt) + 1;
        assertTrue(points <= 1000, "suggested dt yields " + points + " points");
    }

    @Test
    void fixedRasterRespectsDtAndCap() throws Exception {
        double[] r = MergedRaster.fixed(0, 1, 0.25, 100);
        assertEquals(5, r.length);
        assertEquals(0.75, r[3], 1e-12);
        assertThrows(MergedRaster.RasterCapExceededException.class,
                () -> MergedRaster.fixed(0, 10, 1e-4, 1000));
    }

    // ------------------------------------------------------------------
    // Interpolation modes (§ step vs linear edges)
    // ------------------------------------------------------------------

    @Test
    void stepHoldsAndLinearInterpolates() {
        double[] t = {0, 1, 2};
        double[] v = {10, 20, 40};
        SampledSeries step = new SampledSeries(t, v, SampledSeries.Interp.STEP);
        SampledSeries lin = new SampledSeries(t, v, SampledSeries.Interp.LINEAR);
        assertEquals(10, step.at(0.9), 1e-12);
        assertEquals(19, lin.at(0.9), 1e-12);
        assertEquals(20, lin.at(1.0), 1e-12);
        assertEquals(30, lin.at(1.5), 1e-12);
        // Before the first sample: nothing to hold, for either mode.
        assertTrue(Double.isNaN(step.at(-0.1)));
        assertTrue(Double.isNaN(lin.at(-0.1)));
        // Past the end: hold the last sample (both modes).
        assertEquals(40, step.at(99), 1e-12);
        assertEquals(40, lin.at(99), 1e-12);
        // Gaps are never bridged by interpolation.
        SampledSeries gap = new SampledSeries(t, new double[]{10, Double.NaN, 40},
                SampledSeries.Interp.LINEAR);
        assertTrue(Double.isNaN(gap.at(0.5)));
    }

    // ------------------------------------------------------------------
    // Formula evaluation
    // ------------------------------------------------------------------

    @Test
    void arithmeticFormulaMatchesAnalyticResult() throws Exception {
        Expr f = TimeSeriesEvaluator.parseFormula("tq * w / 1000");
        double[] raster = ramp(1000, 0.01);
        double[] tq = new double[1000];
        double[] w = new double[1000];
        for (int i = 0; i < 1000; i++) {
            tq[i] = 100 + i * 0.1;
            w[i] = 200 - i * 0.05;
        }
        Map<String, SampledSeries> inputs = Map.of(
                "tq", new SampledSeries(raster, tq, SampledSeries.Interp.LINEAR),
                "w", new SampledSeries(raster, w, SampledSeries.Interp.LINEAR));
        double[] out = TimeSeriesEvaluator.evaluate(f, raster, inputs);
        for (int i = 0; i < 1000; i += 137) {
            assertEquals(tq[i] * w[i] / 1000, out[i], 1e-12);
        }
    }

    @Test
    void reservedTimeVariableAndBooleanConditionsWork() throws Exception {
        // Top-level conditions are the boolean calc channels the Event List
        // consumes (Phase 5a): 1.0 / 0.0 per sample.
        Expr f = TimeSeriesEvaluator.parseFormula("time > 0.5 AND x >= 7");
        double[] raster = ramp(101, 0.01);
        double[] x = new double[101];
        java.util.Arrays.fill(x, 7.0);
        double[] out = TimeSeriesEvaluator.evaluate(f, raster,
                Map.of("x", new SampledSeries(raster, x, SampledSeries.Interp.STEP)));
        assertEquals(0.0, out[50], 1e-12); // t = 0.50, not > 0.5
        assertEquals(1.0, out[51], 1e-12);

        // The reserved `time` variable is usable in plain arithmetic too.
        double[] t2 = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("x * time"), raster,
                Map.of("x", new SampledSeries(raster, x, SampledSeries.Interp.STEP)));
        assertEquals(7.0 * 0.25, t2[25], 1e-12);
    }

    @Test
    void unknownVariableIsATypedError() throws Exception {
        Expr f = TimeSeriesEvaluator.parseFormula("a + b");
        assertThrows(MeasurementParseException.class, () ->
                TimeSeriesEvaluator.evaluate(f, ramp(10, 0.1), Map.of(
                        "a", new SampledSeries(ramp(10, 0.1), new double[10], SampledSeries.Interp.STEP))));
    }

    // ------------------------------------------------------------------
    // Time operators vs analytic signals
    // ------------------------------------------------------------------

    @Test
    void deltaIntegralMovavgDelayMatchAnalyticSignals() throws Exception {
        int n = 1001;
        double dt = 0.01;
        double[] raster = ramp(n, dt);
        double[] lin = new double[n]; // x(t) = 3t → delta = 3dt, integral = 1.5t²
        for (int i = 0; i < n; i++) {
            lin[i] = 3 * raster[i];
        }
        Map<String, SampledSeries> inputs = Map.of(
                "x", new SampledSeries(raster, lin, SampledSeries.Interp.LINEAR));

        double[] d = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("delta(x)"), raster, inputs);
        assertEquals(0.0, d[0], 1e-12);
        assertEquals(3 * dt, d[500], 1e-9);

        double[] integ = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("integral(x)"), raster, inputs);
        assertEquals(1.5 * 4.0 * 4.0, integ[400], 1e-6); // ∫3t dt = 1.5 t² at t=4

        double[] ma = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("movavg(x, 1)"), raster, inputs);
        // Trailing 1 s mean of 3t at t=5: mean over [4,5] = 3 * 4.5 = 13.5.
        assertEquals(13.5, ma[500], 0.05);

        double[] del = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("delay(x, 2)"), raster, inputs);
        assertEquals(3 * (5.0 - 2.0), del[500], 1e-9);
        assertTrue(Double.isNaN(del[100])); // t=1: source has nothing at t=-1

        // Time ops compose with arithmetic.
        double[] combo = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("delta(x) / 0.01 - 3"), raster, inputs);
        assertEquals(0.0, combo[700], 1e-6);
    }

    // ------------------------------------------------------------------
    // CoolProp per-sample case (cache-hit assertion via timing)
    // ------------------------------------------------------------------

    @Test
    void coolPropPropertyFormulaOverARamp() throws Exception {
        assumeTrue(CoolProp.isAvailable(), "CoolProp native library not present");
        int n = 2001;
        double[] raster = ramp(n, 0.01);
        double[] tK = new double[n];
        for (int i = 0; i < n; i++) {
            tK[i] = 300 + (i % 50) * 0.5; // bounded sweep → repeated states
        }
        Map<String, SampledSeries> inputs = Map.of(
                "tk", new SampledSeries(raster, tK, SampledSeries.Interp.LINEAR));
        Expr f = TimeSeriesEvaluator.parseFormula("enthalpy('R134a', T=tk, P=350000)");
        assertTrue(TimeSeriesEvaluator.containsCall(f));

        long t0 = System.nanoTime();
        double[] first = TimeSeriesEvaluator.evaluate(f, raster, inputs);
        long firstMs = (System.nanoTime() - t0) / 1_000_000;
        t0 = System.nanoTime();
        double[] second = TimeSeriesEvaluator.evaluate(f, raster, inputs);
        long secondMs = (System.nanoTime() - t0) / 1_000_000;

        assertEquals(first[123], second[123], 0.0);
        assertTrue(Double.isFinite(first[0]) && first[0] > 0);
        // 50 unique states across 2001 points: the second pass (and most of
        // the first) must be pure cache hits — decisively faster than 2001
        // uncached native calls would be.
        System.out.printf("CoolProp calc: first=%dms second=%dms (2001 pts, 50 unique states)%n",
                firstMs, secondMs);
        assertTrue(secondMs <= Math.max(firstMs, 5),
                "cached pass should not be slower: first=" + firstMs + " second=" + secondMs);
    }

    // ------------------------------------------------------------------
    // Formula parsing errors, operator matrix, time-op argument validation
    // ------------------------------------------------------------------

    private static Map<String, SampledSeries> oneInput(double[] raster, double[] v) {
        return Map.of("x", new SampledSeries(raster, v, SampledSeries.Interp.STEP));
    }

    @Test
    void syntaxErrorsAreTypedWithColumn() {
        MeasurementParseException e = assertThrows(MeasurementParseException.class,
                () -> TimeSeriesEvaluator.parseFormula("x + * 2"));
        assertTrue(e.getMessage().startsWith("Formula error:"), e.getMessage());
        assertTrue(e.getMessage().contains("column"), e.getMessage());
    }

    @Test
    void trailingGarbageIsATypedError() {
        MeasurementParseException e = assertThrows(MeasurementParseException.class,
                () -> TimeSeriesEvaluator.parseFormula("x + 1 )"));
        assertTrue(e.getMessage().startsWith("Formula error:"), e.getMessage());
    }

    @Test
    void containsCallRecursesEveryNodeKind() throws Exception {
        assertTrue(TimeSeriesEvaluator.containsCall(
                TimeSeriesEvaluator.parseFormula("1 + abs(x)")));
        assertTrue(TimeSeriesEvaluator.containsCall(
                TimeSeriesEvaluator.parseFormula("-abs(x)")));
        assertTrue(TimeSeriesEvaluator.containsCall(
                TimeSeriesEvaluator.parseFormula("abs(x) > 1")));
        assertTrue(TimeSeriesEvaluator.containsCall(
                TimeSeriesEvaluator.parseFormula("abs(x) > 1 and x < 2")));
        assertTrue(TimeSeriesEvaluator.containsCall(
                TimeSeriesEvaluator.parseFormula("not (abs(x) > 1)")));
        assertFalse(TimeSeriesEvaluator.containsCall(
                TimeSeriesEvaluator.parseFormula("not (x > 1) or x * 2 < -3")));
    }

    @Test
    void comparisonLogicalAndNegationOperatorsEvaluate() throws Exception {
        double[] raster = ramp(5, 1.0); // x = time: 0,1,2,3,4
        Map<String, SampledSeries> in = oneInput(raster, raster.clone());

        record Case(String formula, double[] expected) { }
        List<Case> cases = List.of(
                new Case("x < 2", new double[]{1, 1, 0, 0, 0}),
                new Case("x <= 2", new double[]{1, 1, 1, 0, 0}),
                new Case("x >= 3", new double[]{0, 0, 0, 1, 1}),
                new Case("x = 2", new double[]{0, 0, 1, 0, 0}),
                new Case("x <> 2", new double[]{1, 1, 0, 1, 1}),
                new Case("x > 1 and x < 3", new double[]{0, 0, 1, 0, 0}),
                new Case("x < 1 or x > 3", new double[]{1, 0, 0, 0, 1}),
                new Case("not (x > 0)", new double[]{1, 0, 0, 0, 0}),
                new Case("-x", new double[]{0, -1, -2, -3, -4}));
        for (Case c : cases) {
            double[] out = TimeSeriesEvaluator.evaluate(
                    TimeSeriesEvaluator.parseFormula(c.formula()), raster, in);
            for (int i = 0; i < raster.length; i++) {
                assertEquals(c.expected()[i], out[i], 1e-12, c.formula() + " @ i=" + i);
            }
        }
    }

    @Test
    void timeOpArgumentValidationIsTyped() {
        double[] raster = ramp(10, 0.1);
        Map<String, SampledSeries> in = oneInput(raster, new double[10]);

        // First argument must be an input variable, and a KNOWN one.
        assertThrows(MeasurementParseException.class, () -> TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("delta(1 + 2)"), raster, in));
        MeasurementParseException unknown = assertThrows(MeasurementParseException.class,
                () -> TimeSeriesEvaluator.evaluate(
                        TimeSeriesEvaluator.parseFormula("integral(zzz)"), raster, in));
        assertTrue(unknown.getMessage().contains("zzz"), unknown.getMessage());

        // The window/delay parameter must be a positive numeric constant.
        assertThrows(MeasurementParseException.class, () -> TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("movavg(x, x)"), raster, in));
        MeasurementParseException nonPositive = assertThrows(MeasurementParseException.class,
                () -> TimeSeriesEvaluator.evaluate(
                        TimeSeriesEvaluator.parseFormula("movavg(x, 0)"), raster, in));
        assertTrue(nonPositive.getMessage().contains("> 0"), nonPositive.getMessage());
    }

    @Test
    void timeOpsNestInsideNegationComparisonAndCalls() throws Exception {
        double[] raster = ramp(11, 0.1);
        double[] lin = new double[11];
        for (int i = 0; i < 11; i++) {
            lin[i] = 2 * raster[i]; // x = 2t → delta = 0.2/point
        }
        Map<String, SampledSeries> in = Map.of(
                "x", new SampledSeries(raster, lin, SampledSeries.Interp.LINEAR));

        // Neg + rewrite path.
        double[] neg = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("-delta(x)"), raster, in);
        assertEquals(-0.2, neg[5], 1e-12);

        // Not + Compare + rewrite path.
        double[] flag = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("not (delta(x) > 0.1)"), raster, in);
        assertEquals(0.0, flag[5], 1e-12);

        // Call-argument rewrite path (abs of a synthetic series).
        double[] call = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("abs(-delta(x))"), raster, in);
        assertEquals(0.2, call[5], 1e-9);

        // delay() with an uppercase-named input exercises original-key lookup.
        Map<String, SampledSeries> upper = Map.of(
                "X", new SampledSeries(raster, lin, SampledSeries.Interp.LINEAR));
        double[] delayed = TimeSeriesEvaluator.evaluate(
                TimeSeriesEvaluator.parseFormula("delay(x, 0.2)"), raster, upper);
        assertEquals(lin[3], delayed[5], 1e-12);
    }

    @Test
    void runtimeFailureInsideACallIsWrappedWithTheTimestamp() {
        double[] raster = ramp(3, 0.5);
        Map<String, SampledSeries> in = oneInput(raster, new double[]{1, 2, 3});
        MeasurementParseException e = assertThrows(MeasurementParseException.class,
                () -> TimeSeriesEvaluator.evaluate(
                        TimeSeriesEvaluator.parseFormula("nosuchfunction(x)"), raster, in));
        assertTrue(e.getMessage().contains("Formula failed at t = 0.0"), e.getMessage());
    }
}
