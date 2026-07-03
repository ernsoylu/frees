package com.frees.backend.measurement;

/**
 * The shared window DTO (todo.md §2): raw samples ({@code v}) when the
 * requested range fits the point budget, an M4-style min/max envelope when
 * decimated — exactly the shape the frontend ChannelStore consumes for its
 * own in-memory measurements, so RemoteSource and InMemorySource are
 * interchangeable to every instrument.
 */
public record ChannelWindowDto(
        double[] t,
        double[] v,
        double[] min,
        double[] max,
        boolean decimated,
        long totalSamples,
        String unit,
        String kind) {

    public static ChannelWindowDto raw(
            double[] t, double[] v, long totalSamples, String unit, String kind) {
        return new ChannelWindowDto(t, v, null, null, false, totalSamples, unit, kind);
    }

    public static ChannelWindowDto decimated(
            EnvelopeDecimator.Envelope envelope, long totalSamples, String unit, String kind) {
        return new ChannelWindowDto(
                envelope.t(), null, envelope.min(), envelope.max(), true, totalSamples, unit, kind);
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof ChannelWindowDto other
                && decimated == other.decimated
                && totalSamples == other.totalSamples
                && java.util.Objects.equals(unit, other.unit)
                && java.util.Objects.equals(kind, other.kind)
                && java.util.Arrays.equals(t, other.t)
                && java.util.Arrays.equals(v, other.v)
                && java.util.Arrays.equals(min, other.min)
                && java.util.Arrays.equals(max, other.max);
    }

    @Override
    public int hashCode() {
        int h = java.util.Objects.hash(decimated, totalSamples, unit, kind);
        h = 31 * h + java.util.Arrays.hashCode(t);
        h = 31 * h + java.util.Arrays.hashCode(v);
        h = 31 * h + java.util.Arrays.hashCode(min);
        h = 31 * h + java.util.Arrays.hashCode(max);
        return h;
    }

    @Override
    public String toString() {
        return "ChannelWindowDto[points=" + (t == null ? 0 : t.length)
                + ", decimated=" + decimated + ", totalSamples=" + totalSamples
                + ", unit=" + unit + ", kind=" + kind + "]";
    }
}
