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

        int get_global_param_string(String param, byte[] output, int n);
    }

    /** CoolProp signals failure by returning ±_HUGE. */
    private static final double FAILURE_THRESHOLD = 1e90;

    private static final Lib LIB = load();

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
        if (LIB == null) {
            throw new IllegalStateException(
                    "The CoolProp native library is not available. Set the "
                            + "COOLPROP_LIBRARY environment variable to the path of "
                            + "libCoolProp.so to enable fluid property functions.");
        }
        double value = LIB.PropsSI(output, name1, prop1, name2, prop2, fluid);
        if (!Double.isFinite(value) || Math.abs(value) > FAILURE_THRESHOLD) {
            throw new IllegalStateException("CoolProp: " + lastError());
        }
        return value;
    }

    private static String lastError() {
        byte[] buffer = new byte[4000];
        LIB.get_global_param_string("errstring", buffer, buffer.length);
        String message = Native.toString(buffer);
        return message.isBlank() ? "property evaluation failed" : message;
    }
}
