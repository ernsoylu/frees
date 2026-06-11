package com.frees.backend.props;

import com.sun.jna.Library;
import com.sun.jna.Native;

/**
 * Minimal JNA binding to the CoolProp shared library's high-level interface.
 * The library path comes from the COOLPROP_LIBRARY environment variable
 * (explicit file path), falling back to normal system lookup of "CoolProp".
 * PropsSI works entirely in SI, which matches frEES's all-SI calculations.
 */
public final class CoolProp {

    private interface Lib extends Library {
        @SuppressWarnings({"java:S100", "java:S117"}) // CoolProp's exported C names
        double PropsSI(String output, String name1, double prop1,
                       String name2, double prop2, String fluid);

        @SuppressWarnings({"java:S100", "java:S117"}) // CoolProp's exported C names
        double Props1SI(String fluid, String output);

        @SuppressWarnings({"java:S100", "java:S117"}) // CoolProp's exported C names
        double HAPropsSI(String output, String name1, double prop1,
                         String name2, double prop2, String name3, double prop3);

        int get_global_param_string(String param, byte[] output, int n);
    }

    /** CoolProp signals failure by returning ±_HUGE. */
    private static final double FAILURE_THRESHOLD = 1e90;

    private static final Lib LIB = load();

    private record CacheKey(String output, String name1, double prop1, String name2, double prop2, String fluid) {}
    private static final java.util.Map<CacheKey, Double> PROPS_CACHE = new java.util.concurrent.ConcurrentHashMap<>();

    private CoolProp() {}

    private static Lib load() {
        try {
            String path = System.getenv("COOLPROP_LIBRARY");
            if (path != null && !path.isBlank()) {
                return Native.load(path, Lib.class);
            }
            return Native.load("CoolProp", Lib.class);
        } catch (UnsatisfiedLinkError e) {
            return null;
        }
    }

    public static boolean isAvailable() {
        return LIB != null;
    }

    /** PropsSI with CoolProp's error string surfaced on failure. */
    public static synchronized double propsSI(String output, String name1, double prop1,
                                              String name2, double prop2, String fluid) {
        requireLibrary();
        double value = LIB.PropsSI(output, name1, prop1, name2, prop2, fluid);
        if (!Double.isFinite(value) || Math.abs(value) > FAILURE_THRESHOLD) {
            throw new PropertyEvaluationException("CoolProp: " + lastError());
        }
        return value;
    }

    /** PropsSI returning NaN instead of throwing; for diagram curve sweeps. */
    public static synchronized double propsSIOrNaN(String output, String name1, double prop1,
                                                   String name2, double prop2, String fluid) {
        if (LIB == null) {
            return Double.NaN;
        }
        CacheKey key = new CacheKey(output, name1, prop1, name2, prop2, fluid);
        Double cached = PROPS_CACHE.get(key);
        if (cached != null) {
            return cached;
        }
        double value = LIB.PropsSI(output, name1, prop1, name2, prop2, fluid);
        double result = Math.abs(value) > FAILURE_THRESHOLD ? Double.NaN : value;
        PROPS_CACHE.put(key, result);
        return result;
    }

    /** Trivial (state-independent) fluid constants, e.g. Tcrit, pcrit, Ttriple. */
    public static synchronized double props1SI(String fluid, String output) {
        requireLibrary();
        double value = LIB.Props1SI(fluid, output);
        if (!Double.isFinite(value) || Math.abs(value) > FAILURE_THRESHOLD) {
            throw new PropertyEvaluationException("CoolProp: " + lastError());
        }
        return value;
    }

    /** Humid air properties (HAPropsSI), all SI; requires three input pairs. */
    public static synchronized double haPropsSI(String output, String name1, double prop1,
                                                String name2, double prop2,
                                                String name3, double prop3) {
        requireLibrary();
        double value = LIB.HAPropsSI(output, name1, prop1, name2, prop2, name3, prop3);
        if (!Double.isFinite(value) || Math.abs(value) > FAILURE_THRESHOLD) {
            throw new PropertyEvaluationException("CoolProp: " + lastError());
        }
        return value;
    }

    /** HAPropsSI returning NaN instead of throwing; for chart curve sweeps. */
    public static synchronized double haPropsSIOrNaN(String output, String name1, double prop1,
                                                     String name2, double prop2,
                                                     String name3, double prop3) {
        if (LIB == null) {
            return Double.NaN;
        }
        double value = LIB.HAPropsSI(output, name1, prop1, name2, prop2, name3, prop3);
        return Math.abs(value) > FAILURE_THRESHOLD ? Double.NaN : value;
    }

    private static void requireLibrary() {
        if (LIB == null) {
            throw new IllegalStateException(
                    "The CoolProp native library is not available. Set the "
                            + "COOLPROP_LIBRARY environment variable to the path of "
                            + "libCoolProp.so to enable fluid property functions.");
        }
    }

    private static String lastError() {
        byte[] buffer = new byte[4000];
        LIB.get_global_param_string("errstring", buffer, buffer.length);
        String message = Native.toString(buffer);
        return message.isBlank() ? "property evaluation failed" : message;
    }
}
