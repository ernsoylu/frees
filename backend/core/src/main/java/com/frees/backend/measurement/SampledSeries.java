package com.frees.backend.measurement;

/**
 * One calculated-signal input: a sampled series plus its interpolation mode
 * (todo.md Phase 4). STEP (hold last sample) is the honest default for
 * boolean/enum/ECU-state inputs; LINEAR is the default for continuous analog
 * inputs feeding nonlinear property functions — step-holding T/P into
 * CoolProp manufactures artificial derivative spikes. Linear-interp
 * precedent: core/ode/OdeAccessors.valueAtTime.
 */
public record SampledSeries(double[] t, double[] v, Interp interp) {

    public enum Interp { STEP, LINEAR }

    @Override
    public boolean equals(Object o) {
        return o instanceof SampledSeries other
                && interp == other.interp
                && java.util.Arrays.equals(t, other.t)
                && java.util.Arrays.equals(v, other.v);
    }

    @Override
    public int hashCode() {
        int h = interp == null ? 0 : interp.hashCode();
        h = 31 * h + java.util.Arrays.hashCode(t);
        h = 31 * h + java.util.Arrays.hashCode(v);
        return h;
    }

    @Override
    public String toString() {
        return "SampledSeries[n=" + t.length + ", interp=" + interp + "]";
    }

    /** Value at time x; NaN before the first sample (nothing to hold). */
    public double at(double x) {
        int n = t.length;
        if (n == 0) {
            return Double.NaN;
        }
        int lb = EnvelopeDecimator.lowerBound(t, x);
        if (lb < n && t[lb] == x) {
            return v[lb];
        }
        int i = lb - 1; // last sample strictly before x
        if (i < 0) {
            return Double.NaN;
        }
        if (interp == Interp.STEP || lb >= n) {
            return v[i];
        }
        double t0 = t[i];
        double t1 = t[lb];
        double v0 = v[i];
        double v1 = v[lb];
        if (Double.isNaN(v0) || Double.isNaN(v1)) {
            return Double.NaN; // gaps stay gaps; never bridged by interpolation
        }
        return v0 + (v1 - v0) * (x - t0) / (t1 - t0);
    }

    /** Materialize this series on an output raster (one array, reused downstream). */
    public double[] sampleOn(double[] raster) {
        double[] out = new double[raster.length];
        for (int i = 0; i < raster.length; i++) {
            out[i] = at(raster[i]);
        }
        return out;
    }
}
