package com.frees.backend.core.ode;

/**
 * An event whose switching function {@code g(t, y)} is monitored for zero
 * crossings during integration. {@code direction} selects which crossings fire:
 * {@code +1} rising (− to +), {@code −1} falling (+ to −), {@code 0} any. When
 * {@code stop} is true the integration terminates at the crossing (e.g. apogee
 * {@code v = 0}); otherwise the crossing is only recorded.
 */
public record OdeEvent(String name, OdeScalarFn g, int direction, boolean stop) {

    public static int directionFromKeyword(String keyword) {
        return switch (keyword == null ? "any" : keyword.toLowerCase()) {
            case "rising" -> 1;
            case "falling" -> -1;
            default -> 0;
        };
    }

    /** Whether a sign change from gPrev to gNew matches this event's direction. */
    public boolean triggers(double gPrev, double gNew) {
        if (gPrev == 0.0 && gNew == 0.0) {
            return false;
        }
        boolean crossed = (gPrev <= 0 && gNew > 0) || (gPrev >= 0 && gNew < 0)
                || (gPrev < 0 && gNew >= 0) || (gPrev > 0 && gNew <= 0);
        if (!crossed) {
            return false;
        }
        return switch (direction) {
            case 1 -> gNew > gPrev;   // rising through zero
            case -1 -> gNew < gPrev;  // falling through zero
            default -> true;
        };
    }
}
