package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Tabular (P,h) acceleration: dispatch-level accuracy against direct calls,
 * the outside-box bypass, and the throughput gain that justifies the table.
 */
class PhTableRegistryTest {

    /** Dispatch answers within the validation gate of the direct call across
     *  the subcritical band, on and off the dome. */
    @Test
    void dispatchMatchesDirectInsideTheBox() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Random random = new Random(7);
        for (int k = 0; k < 50; k++) {
            double p = 1e5 + random.nextDouble() * 1.5e7;      // 1 bar .. 150 bar (< 0.95 pcrit)
            double h = 2e5 + random.nextDouble() * 2.4e6;      // liquid .. superheated
            double viaDispatch = PropertyFunctions.evaluate(
                    "prop$temperature$water$p$h", List.of(p, h));
            double direct = CoolProp.propsSI("T", "P", p, "Hmass", h, "Water");
            assertEquals(direct, viaDispatch, Math.max(Math.abs(direct) * 6e-4, 1e-9),
                    "T(P=" + p + ", h=" + h + ")");
        }
    }

    /** Outside the table's box (supercritical pressure) the dispatch must be
     *  the direct call exactly — no extrapolation ever. */
    @Test
    void outsideTheBoxIsTheDirectCallExactly() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        double p = 3.0e7; // ~1.36 pcrit for water
        double h = 2.0e6;
        double viaDispatch = PropertyFunctions.evaluate(
                "prop$temperature$water$p$h", List.of(p, h));
        double direct = CoolProp.propsSI("T", "P", p, "Hmass", h, "Water");
        assertEquals(direct, viaDispatch, 0.0, "supercritical points bypass the table");
    }

    /** Quality is piecewise and must never be tabulated: exact equality with
     *  the direct call everywhere. */
    @Test
    void qualityStaysDirect() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        double p = 5e5;
        double h = 1.5e6; // inside the dome at 5 bar
        double viaDispatch = PropertyFunctions.evaluate("prop$quality$water$p$h", List.of(p, h));
        double direct = CoolProp.propsSI("Q", "P", p, "Hmass", h, "Water");
        assertEquals(direct, viaDispatch, 0.0);
    }

    /** The point of the table: novel (non-repeating) state points served from
     *  the registry beat the uncached native flash by a wide margin. Measured
     *  registry-vs-native directly so suite parallelism cannot skew it; the
     *  3x bar is far under the observed ratio. */
    @Test
    void novelPointSweepIsAtLeastThreeTimesFaster() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        assumeTrue(PhTableRegistry.lookup("T", "P", 5e5, "Hmass", 1e6, "Water") != null,
                "water tables must pass the gate"); // also builds them

        int sweeps = 4000;
        double p0 = 2e5;
        double h0 = 3e5;
        long tableStart = System.nanoTime();
        int served = 0;
        for (int k = 0; k < sweeps; k++) {
            Double v = PhTableRegistry.lookup("T", "P", p0 + k * 700.0, "Hmass", h0 + k * 310.0, "Water");
            if (v != null) {
                served++;
            }
        }
        long tableNs = System.nanoTime() - tableStart;

        long directStart = System.nanoTime();
        for (int k = 0; k < sweeps; k++) {
            // distinct points, offset from the sweep above so neither loop
            // benefits from the exact-repeat LRU
            CoolProp.propsSI("T", "P", p0 + k * 700.0 + 17.0, "Hmass", h0 + k * 310.0 + 13.0, "Water");
        }
        long directNs = System.nanoTime() - directStart;

        double speedup = (double) directNs / Math.max(tableNs, 1);
        System.out.println("[ph-table] " + sweeps + " novel flash lookups (" + served
                + " table-served): direct " + directNs / 1_000_000 + " ms, table "
                + tableNs / 1_000_000 + " ms ("
                + String.format(java.util.Locale.ROOT, "%.1f", speedup) + "x)");
        assertTrue(served > sweeps / 2, "most sweep points must be table-served, got " + served);
        assertTrue(speedup >= 3.0, "table path must beat uncached flash 3x, got " + speedup + "x");
    }
}
