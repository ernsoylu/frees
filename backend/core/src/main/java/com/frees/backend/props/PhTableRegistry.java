package com.frees.backend.props;

import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lazy per-fluid registry of phase-split (P,h) property tables backing the
 * hot flash path ({@link SaturationSplitTable}). A fluid's tables are built
 * once from direct native calls, then validated against the same source at
 * fixed-seed off-grid sample points spanning all three regions; only a fluid
 * whose worst relative error passes the gate is served. Lookups are
 * lock-free reads of immutable arrays — the win over the native flash
 * iteration behind its lock. Anything outside covered territory, any output
 * not tabulated, and any fluid that failed the gate falls through to the
 * direct call, unchanged.
 */
final class PhTableRegistry {

    /** Flash-heavy smooth outputs worth tabulating. Quality is excluded
     * (piecewise; −1 outside the dome breaks interpolation); transport
     * properties are rare enough to stay direct. */
    private static final Set<String> TABLE_OUTPUTS = Set.of("T", "Dmass", "Smass");
    private static final int VALIDATION_SAMPLES = 300;
    private static final int MIN_VALID_SAMPLES = 150;
    private static final double VALIDATION_TOL = 1.0e-4; // relative, worst-case

    private static final ConcurrentHashMap<String, Optional<SaturationSplitTable>> TABLES =
            new ConcurrentHashMap<>();

    private PhTableRegistry() {}

    /**
     * Serves {@code output(fluid, P, h)} from the validated split tables when
     * the point lies in covered territory; {@code null} means "not covered —
     * make the direct call". Inputs may arrive in either order.
     */
    static Double lookup(String outputKey, String key1, double v1,
                         String key2, double v2, String fluid) {
        if (!TABLE_OUTPUTS.contains(outputKey) || !CoolProp.isAvailable()) {
            return null;
        }
        double p;
        double h;
        if ("P".equals(key1) && "Hmass".equals(key2)) {
            p = v1;
            h = v2;
        } else if ("Hmass".equals(key1) && "P".equals(key2)) {
            p = v2;
            h = v1;
        } else {
            return null;
        }
        Optional<SaturationSplitTable> entry = TABLES.computeIfAbsent(fluid, PhTableRegistry::build);
        return entry.map(t -> t.value(outputKey, p, h)).orElse(null);
    }

    /**
     * Builds and gates one fluid's split tables. Any failure to establish the
     * ranges, build the pieces, or pass the off-grid validation gate rejects
     * the fluid for the process lifetime; the direct path serves it as before.
     */
    private static Optional<SaturationSplitTable> build(String fluid) {
        try {
            double tMin = CoolProp.props1SI(fluid, "Tmin");
            double tCrit = CoolProp.props1SI(fluid, "Tcrit");
            double tMax = CoolProp.props1SI(fluid, "Tmax");
            double tLow = tMin + 1.0;
            double tHigh = Math.min(tMax, tCrit * 1.3);
            double pCrit = CoolProp.props1SI(fluid, "pcrit");
            double hTop = CoolProp.propsSIOrNaN("Hmass", "P", pCrit * 0.05, "T", tHigh, fluid);
            if (!Double.isFinite(hTop)) {
                return Optional.empty();
            }
            SaturationSplitTable table = new SaturationSplitTable(fluid, hTop, tLow);
            return validate(table, fluid) ? Optional.of(table) : Optional.empty();
        } catch (RuntimeException e) {
            return Optional.empty(); // no tables for this fluid; direct path serves it
        }
    }

    /** Off-grid check against the direct source at fixed-seed sample points
     *  across the whole (P,h) band — dome, superheat and liquid regions all
     *  get hit; uncovered samples don't count against the gate. */
    private static boolean validate(SaturationSplitTable table, String fluid) {
        Random random = new Random(42);
        int valid = 0;
        double logMin = Math.log(table.pMin());
        double logMax = Math.log(table.pMax());
        for (int k = 0; k < VALIDATION_SAMPLES; k++) {
            double p = Math.exp(logMin + random.nextDouble() * (logMax - logMin));
            double hLo = CoolProp.propsSIOrNaN("Hmass", "P", p, "Q", 0.0, fluid) - 1.5e5;
            double hHi = CoolProp.propsSIOrNaN("Hmass", "P", p, "Q", 1.0, fluid) + 5.0e5;
            if (!Double.isFinite(hLo) || !Double.isFinite(hHi)) {
                continue;
            }
            double h = hLo + random.nextDouble() * (hHi - hLo);
            for (String out : TABLE_OUTPUTS) {
                Double tab = table.value(out, p, h);
                if (tab == null) {
                    continue; // honestly uncovered — the direct path serves it
                }
                double direct = CoolProp.propsSIOrNaN(out, "P", p, "Hmass", h, fluid);
                if (!Double.isFinite(direct)) {
                    continue;
                }
                valid++;
                double err = Math.abs(tab - direct) / Math.max(Math.abs(direct), 1e-6);
                if (err > VALIDATION_TOL) {
                    return false;
                }
            }
        }
        return valid >= MIN_VALID_SAMPLES;
    }

    /** Test hook: forgets every built table so gating can be re-exercised. */
    static void clearForTests() {
        TABLES.clear();
    }
}
