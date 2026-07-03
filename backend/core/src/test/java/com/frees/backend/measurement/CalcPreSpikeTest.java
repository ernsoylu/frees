package com.frees.backend.measurement;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

import com.frees.backend.ast.Expr;
import com.frees.backend.props.CoolProp;
import java.util.Map;
import org.junit.jupiter.api.Test;

/**
 * Phase 4 pre-spike (todo.md): measure evaluator overhead SEPARATELY from
 * CoolProp cost so allocation doesn't masquerade as native-call cost, and
 * measure per-call PropsSI through the JNA binding (global lock included),
 * cached vs uncached. Numbers are printed and recorded in todo.md; the
 * assertions only pin the orders of magnitude the compute policy relies on.
 */
class CalcPreSpikeTest {

    @Test
    void evaluatorThroughputOnAMillionPointRaster() throws Exception {
        int n = 1_000_000;
        double[] raster = new double[n];
        double[] a = new double[n];
        double[] b = new double[n];
        for (int i = 0; i < n; i++) {
            raster[i] = i * 1e-3;
            a[i] = 100 + (i % 1000) * 0.1;
            b[i] = 200 - (i % 777) * 0.05;
        }
        Map<String, SampledSeries> inputs = Map.of(
                "tq", new SampledSeries(raster, a, SampledSeries.Interp.LINEAR),
                "w", new SampledSeries(raster, b, SampledSeries.Interp.LINEAR));
        Expr f = TimeSeriesEvaluator.parseFormula("tq * w / 1000 + tq ^ 0.5");

        TimeSeriesEvaluator.evaluate(f, raster, inputs); // warm-up
        long t0 = System.nanoTime();
        double[] out = TimeSeriesEvaluator.evaluate(f, raster, inputs);
        long ms = (System.nanoTime() - t0) / 1_000_000;
        System.out.printf(
                "PRE-SPIKE evaluator: 1M-point arithmetic formula in %d ms (%.0f ns/pt)%n",
                ms, ms * 1e6 / n);
        assertTrue(Double.isFinite(out[n - 1]));
        // The compiled resolver must keep a 1M-point no-property formula
        // interactive — well under a second on any dev machine.
        assertTrue(ms < 2000, "compiled evaluator too slow: " + ms + " ms");
    }

    @Test
    void coolPropPerCallCostCachedVsUncached() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp native library not present");
        // Uncached: distinct states every call.
        int calls = 2000;
        long t0 = System.nanoTime();
        for (int i = 0; i < calls; i++) {
            CoolProp.propsSI("H", "T", 280 + i * 0.01, "P", 101325, "R134a");
        }
        double uncachedUs = (System.nanoTime() - t0) / 1e3 / calls;
        // Cached: one state hammered.
        t0 = System.nanoTime();
        for (int i = 0; i < calls; i++) {
            CoolProp.propsSI("H", "T", 300, "P", 101325, "R134a");
        }
        double cachedUs = (System.nanoTime() - t0) / 1e3 / calls;
        System.out.printf(
                "PRE-SPIKE CoolProp propsSI: uncached %.1f µs/call, cached %.2f µs/call%n",
                uncachedUs, cachedUs);
        assertTrue(cachedUs < uncachedUs, "LRU should beat the native call");
    }
}
