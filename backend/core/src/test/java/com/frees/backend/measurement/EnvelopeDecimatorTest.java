package com.frees.backend.measurement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

/** Java twin of the frontend decimate.test.ts contracts (§2.5d). */
class EnvelopeDecimatorTest {

    private static double[] ramp(int n, double dt) {
        double[] t = new double[n];
        for (int i = 0; i < n; i++) {
            t[i] = i * dt;
        }
        return t;
    }

    @Test
    void preservesSpikesInAMillionPoints() {
        int n = 1_000_000;
        double[] t = ramp(n, 0.001);
        double[] v = new double[n];
        for (int i = 0; i < n; i++) {
            v[i] = Math.sin(i / 1000.0);
        }
        v[733_211] = 42.5;
        v[211_733] = -37.25;

        EnvelopeDecimator.Envelope env = EnvelopeDecimator.minMax(t, v, 0, n - 1, 1200);
        assertEquals(1200, env.t().length);
        assertEquals(42.5, Arrays.stream(env.max()).max().orElseThrow(), 1e-12);
        assertEquals(-37.25, Arrays.stream(env.min()).min().orElseThrow(), 1e-12);
    }

    @Test
    void neverLosesABooleanPulse() {
        int n = 1_000_000;
        double[] t = ramp(n, 0.001);
        double[] v = new double[n];
        v[481_997] = 1;

        EnvelopeDecimator.Envelope env = EnvelopeDecimator.minMax(t, v, 0, n - 1, 500);
        int pulseBuckets = 0;
        for (int b = 0; b < env.t().length; b++) {
            if (env.max()[b] == 1.0) {
                pulseBuckets++;
                assertEquals(0.0, env.min()[b], 0.0);
            }
        }
        assertEquals(1, pulseBuckets);
    }

    @Test
    void nanGapsStayGaps() {
        int n = 1000;
        double[] t = ramp(n, 0.001);
        double[] v = new double[n];
        for (int i = 0; i < n; i++) {
            v[i] = i < 500 ? Double.NaN : 1.0;
        }
        EnvelopeDecimator.Envelope env = EnvelopeDecimator.minMax(t, v, 0, n - 1, 10);
        assertTrue(Double.isNaN(env.min()[0]));
        assertTrue(Double.isNaN(env.max()[0]));
        assertEquals(1.0, env.min()[9], 0.0);
    }

    @Test
    void lowerBoundFindsFirstAtLeast() {
        double[] a = {0, 1, 2, 3, 4};
        assertEquals(0, EnvelopeDecimator.lowerBound(a, -1));
        assertEquals(2, EnvelopeDecimator.lowerBound(a, 2));
        assertEquals(3, EnvelopeDecimator.lowerBound(a, 2.5));
        assertEquals(5, EnvelopeDecimator.lowerBound(a, 99));
    }
}
