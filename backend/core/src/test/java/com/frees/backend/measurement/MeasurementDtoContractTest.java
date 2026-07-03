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
        assertNotEquals(a, null);
        assertEquals("ChannelData[n=3]", a.toString());
    }

    @Test
    void channelWindowDtoEqualityIsByContent() {
        ChannelWindowDto a = ChannelWindowDto.raw(T.clone(), V.clone(), 3, "m/s", "analog");
        ChannelWindowDto b = ChannelWindowDto.raw(T.clone(), V.clone(), 3, "m/s", "analog");
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, ChannelWindowDto.raw(T.clone(), V.clone(), 3, "kPa", "analog"));
        assertNotEquals(a, ChannelWindowDto.raw(T.clone(), new double[]{0, 0, 0}, 3, "m/s", "analog"));
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
        assertNotEquals(a, new EnvelopeDecimator.Envelope(T.clone(), V.clone(), new double[]{7, 7, 7}));
        assertEquals("Envelope[buckets=3]", a.toString());
    }

    @Test
    void sampledSeriesEqualityIsByContent() {
        SampledSeries a = new SampledSeries(T.clone(), V.clone(), SampledSeries.Interp.LINEAR);
        SampledSeries b = new SampledSeries(T.clone(), V.clone(), SampledSeries.Interp.LINEAR);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, new SampledSeries(T.clone(), V.clone(), SampledSeries.Interp.STEP));
        assertEquals("SampledSeries[n=3, interp=LINEAR]", a.toString());
    }
}
