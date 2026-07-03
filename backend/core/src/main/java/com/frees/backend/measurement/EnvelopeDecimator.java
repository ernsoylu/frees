package com.frees.backend.measurement;

/**
 * Java twin of the frontend's decimate.ts (design contract §2.5d): index-
 * uniform per-bucket min/max envelope, NaN gaps preserved. For boolean/enum
 * channels the min/max pair IS the transition flag — a bucket containing a
 * pulse spans both levels, so no pulse ever disappears at any zoom level.
 * Kept in core (no Spring) so any consumer of the measurement package can
 * decimate the same way the browser does.
 */
public final class EnvelopeDecimator {

    private EnvelopeDecimator() {
    }

    /** Envelope triple; arrays are aligned by bucket. */
    public record Envelope(double[] t, double[] min, double[] max) {

        @Override
        public boolean equals(Object o) {
            return o instanceof Envelope other
                    && java.util.Arrays.equals(t, other.t)
                    && java.util.Arrays.equals(min, other.min)
                    && java.util.Arrays.equals(max, other.max);
        }

        @Override
        public int hashCode() {
            int h = java.util.Arrays.hashCode(t);
            h = 31 * h + java.util.Arrays.hashCode(min);
            h = 31 * h + java.util.Arrays.hashCode(max);
            return h;
        }

        @Override
        public String toString() {
            return "Envelope[buckets=" + t.length + "]";
        }
    }

    /** First index i in [0, a.length) with a[i] >= x (a ascending). */
    public static int lowerBound(double[] a, double x) {
        int lo = 0;
        int hi = a.length;
        while (lo < hi) {
            int mid = (lo + hi) >>> 1;
            if (a[mid] < x) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }
        return lo;
    }

    /**
     * Min/max envelope of v over the inclusive index range [i0, i1], reduced
     * to at most {@code buckets} buckets. All-NaN buckets yield NaN (a gap).
     */
    public static Envelope minMax(double[] t, double[] v, int i0, int i1, int buckets) {
        int n = i1 - i0 + 1;
        int m = Math.max(1, Math.min(buckets, n));
        double[] outT = new double[m];
        double[] outMin = new double[m];
        double[] outMax = new double[m];
        for (int b = 0; b < m; b++) {
            int start = i0 + (int) ((long) b * n / m);
            int end = i0 + (int) ((long) (b + 1) * n / m) - 1;
            double mn = Double.POSITIVE_INFINITY;
            double mx = Double.NEGATIVE_INFINITY;
            for (int i = start; i <= end; i++) {
                double x = v[i];
                if (Double.isNaN(x)) {
                    continue;
                }
                if (x < mn) {
                    mn = x;
                }
                if (x > mx) {
                    mx = x;
                }
            }
            outT[b] = t[start + ((end - start) >>> 1)];
            if (mn == Double.POSITIVE_INFINITY) {
                outMin[b] = Double.NaN;
                outMax[b] = Double.NaN;
            } else {
                outMin[b] = mn;
                outMax[b] = mx;
            }
        }
        return new Envelope(outT, outMin, outMax);
    }
}
