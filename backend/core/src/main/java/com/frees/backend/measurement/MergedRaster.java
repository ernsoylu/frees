package com.frees.backend.measurement;

import java.util.List;

/**
 * Output raster construction for calculated signals (todo.md Phase 4):
 * union of the input time bases ("merge"), a fixed sample interval, or one
 * input's own raster ("sameAs"). The hard point cap is enforced HERE with a
 * typed exception carrying a suggested dt that verifiably lands under the
 * cap — exceeding the cap is a guided path, not a failure (decision 3).
 */
public final class MergedRaster {

    private MergedRaster() {
    }

    /** Typed over-cap signal: actual size + a compliant fixed-dt suggestion. */
    public static final class RasterCapExceededException extends Exception {
        public final long actualPoints;
        public final double suggestedDt;

        public RasterCapExceededException(long actualPoints, double suggestedDt, int cap) {
            super("The merged raster has " + actualPoints + " points, above the "
                    + cap + "-point cap. Use a fixed sample interval of dt = "
                    + suggestedDt + " s (or coarser) instead.");
            this.actualPoints = actualPoints;
            this.suggestedDt = suggestedDt;
        }
    }

    /** Union of sorted time bases, deduplicated; capped. */
    public static double[] union(List<double[]> bases, int cap) throws RasterCapExceededException {
        long total = 0;
        double tMin = Double.POSITIVE_INFINITY;
        double tMax = Double.NEGATIVE_INFINITY;
        for (double[] b : bases) {
            total += b.length;
            if (b.length > 0) {
                tMin = Math.min(tMin, b[0]);
                tMax = Math.max(tMax, b[b.length - 1]);
            }
        }
        double[] all = new double[(int) Math.min(total, Integer.MAX_VALUE - 8)];
        int off = 0;
        for (double[] b : bases) {
            System.arraycopy(b, 0, all, off, b.length);
            off += b.length;
        }
        java.util.Arrays.sort(all);
        int w = all.length > 0 ? 1 : 0;
        for (int i = 1; i < all.length; i++) {
            if (all[i] != all[w - 1]) {
                all[w++] = all[i];
            }
        }
        if (w > cap) {
            throw new RasterCapExceededException(w, suggestDt(tMin, tMax, cap), cap);
        }
        return java.util.Arrays.copyOf(all, w);
    }

    /** Fixed-interval raster over [t0, t1]; capped. */
    public static double[] fixed(double t0, double t1, double dt, int cap)
            throws RasterCapExceededException {
        if (!(dt > 0) || !(t1 >= t0)) {
            throw new IllegalArgumentException("fixed raster needs dt > 0 and t1 >= t0");
        }
        long n = (long) Math.floor((t1 - t0) / dt) + 1;
        if (n > cap) {
            throw new RasterCapExceededException(n, suggestDt(t0, t1, cap), cap);
        }
        double[] out = new double[(int) n];
        for (int i = 0; i < n; i++) {
            out[i] = t0 + i * dt;
        }
        return out;
    }

    /**
     * Smallest 1-2-5 decade step whose fixed raster over [t0, t1] fits the
     * cap: dt = ceil-to-1-2-5 of span/(cap-1), so span/dt + 1 <= cap always.
     */
    public static double suggestDt(double t0, double t1, int cap) {
        double span = Math.max(t1 - t0, 0);
        if (span == 0) {
            return 1e-3;
        }
        double raw = span / (cap - 1);
        double decade = Math.pow(10, Math.floor(Math.log10(raw)));
        for (double m : new double[]{1, 2, 5, 10}) {
            if (m * decade >= raw) {
                return m * decade;
            }
        }
        return 10 * decade;
    }
}
