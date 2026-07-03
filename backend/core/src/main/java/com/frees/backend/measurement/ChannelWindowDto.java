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
}
