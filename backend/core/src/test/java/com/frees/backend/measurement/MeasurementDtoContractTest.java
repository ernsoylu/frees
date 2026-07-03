package com.frees.backend.measurement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * Array-bearing measurement records override equals/hashCode/toString to
 * consider array CONTENT (java:S6218) — two DTOs built from equal data must
 * compare equal, and toString must stay concise (never dump sample arrays).
 */
class MeasurementDtoContractTest {

    private static final double[] T = {0.0, 0.5, 1.0};
    private static final double[] V = {1.0, 2.0, 3.0};

    @Test
    void channelDataEqualityIsByContent() {
        ChannelData a = new ChannelData(T.clone(), V.clone());
        ChannelData b = new ChannelData(T.clone(), V.clone());
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, new ChannelData(T.clone(), new double[]{9, 9, 9}));
        assertNotEquals(a, new ChannelData(new double[]{9, 9, 9}, V.clone()));
        assertNotEquals(null, a);
        assertNotEquals("not a channel", a);
        assertEquals("ChannelData[n=3]", a.toString());
    }

    @Test
    void channelWindowDtoEqualityIsByContent() {
        ChannelWindowDto a = ChannelWindowDto.raw(T.clone(), V.clone(), 3, "m/s", "analog");
        ChannelWindowDto b = ChannelWindowDto.raw(T.clone(), V.clone(), 3, "m/s", "analog");
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        // Every component participates in equality.
        assertNotEquals(a, ChannelWindowDto.raw(new double[]{9, 9, 9}, V.clone(), 3, "m/s", "analog"));
        assertNotEquals(a, ChannelWindowDto.raw(T.clone(), new double[]{0, 0, 0}, 3, "m/s", "analog"));
        assertNotEquals(a, ChannelWindowDto.raw(T.clone(), V.clone(), 99, "m/s", "analog"));
        assertNotEquals(a, ChannelWindowDto.raw(T.clone(), V.clone(), 3, "kPa", "analog"));
        assertNotEquals(a, ChannelWindowDto.raw(T.clone(), V.clone(), 3, "m/s", "boolean"));
        assertNotEquals(a, ChannelWindowDto.raw(T.clone(), V.clone(), 3, null, "analog"));
        assertNotEquals(null, a);
        assertTrue(a.toString().contains("points=3"));

        ChannelWindowDto dec = ChannelWindowDto.decimated(
                new EnvelopeDecimator.Envelope(T.clone(), V.clone(), V.clone()), 100, null, "analog");
        ChannelWindowDto dec2 = ChannelWindowDto.decimated(
                new EnvelopeDecimator.Envelope(T.clone(), V.clone(), V.clone()), 100, null, "analog");
        assertEquals(dec, dec2);
        assertNotEquals(a, dec);
        assertTrue(dec.decimated());
        assertTrue(dec.toString().contains("decimated=true"));
    }

    @Test
    void envelopeEqualityIsByContent() {
        EnvelopeDecimator.Envelope a = new EnvelopeDecimator.Envelope(T.clone(), V.clone(), V.clone());
        EnvelopeDecimator.Envelope b = new EnvelopeDecimator.Envelope(T.clone(), V.clone(), V.clone());
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, new EnvelopeDecimator.Envelope(new double[]{7, 7, 7}, V.clone(), V.clone()));
        assertNotEquals(a, new EnvelopeDecimator.Envelope(T.clone(), new double[]{7, 7, 7}, V.clone()));
        assertNotEquals(a, new EnvelopeDecimator.Envelope(T.clone(), V.clone(), new double[]{7, 7, 7}));
        assertNotEquals(null, a);
        assertEquals("Envelope[buckets=3]", a.toString());
    }

    @Test
    void sampledSeriesEqualityIsByContent() {
        SampledSeries a = new SampledSeries(T.clone(), V.clone(), SampledSeries.Interp.LINEAR);
        SampledSeries b = new SampledSeries(T.clone(), V.clone(), SampledSeries.Interp.LINEAR);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, new SampledSeries(T.clone(), V.clone(), SampledSeries.Interp.STEP));
        assertNotEquals(a, new SampledSeries(new double[]{7, 7, 7}, V.clone(), SampledSeries.Interp.LINEAR));
        assertNotEquals(a, new SampledSeries(T.clone(), new double[]{7, 7, 7}, SampledSeries.Interp.LINEAR));
        assertNotEquals(null, a);
        assertEquals("SampledSeries[n=3, interp=LINEAR]", a.toString());
    }

    @Test
    void sampledSeriesInterpolationEdges() {
        SampledSeries empty = new SampledSeries(new double[0], new double[0], SampledSeries.Interp.STEP);
        assertTrue(Double.isNaN(empty.at(1.0)));

        SampledSeries lin = new SampledSeries(
                new double[]{0, 1, 2}, new double[]{0, 10, Double.NaN}, SampledSeries.Interp.LINEAR);
        assertEquals(10.0, lin.at(1.0), 1e-12);      // exact hit
        assertEquals(5.0, lin.at(0.5), 1e-12);       // interpolated
        assertTrue(Double.isNaN(lin.at(-0.5)));      // before first sample
        assertTrue(Double.isNaN(lin.at(1.5)));       // NaN endpoint never bridged
        assertEquals(Double.NaN, lin.at(3.0));       // past the end holds last (NaN here)

        SampledSeries step = new SampledSeries(
                new double[]{0, 1, 2}, new double[]{0, 10, 20}, SampledSeries.Interp.STEP);
        assertEquals(10.0, step.at(1.5), 1e-12);     // hold-last between samples
        assertEquals(20.0, step.at(9.0), 1e-12);     // hold-last past the end
    }

    @Test
    void mergedRasterEdgeCases() throws Exception {
        // Empty union is legal (no inputs with samples).
        assertEquals(0, MergedRaster.union(java.util.List.of(new double[0]), 10).length);

        // fixed() argument validation is a hard error, not a cap signal.
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> MergedRaster.fixed(0, 1, 0, 100));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
                () -> MergedRaster.fixed(1, 0, 0.1, 100));

        // Zero-span suggestion falls back to 1 ms.
        assertEquals(1e-3, MergedRaster.suggestDt(5, 5, 100), 1e-15);
        // The 1-2-5 ladder rounds up to the next decade when needed.
        double dt = MergedRaster.suggestDt(0, 9.9, 11);
        assertTrue(dt >= 0.99, "dt=" + dt);
    }
}
