package com.frees.backend.measurement;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * The fallback ladder contract: PARSE failures fall through to the sidecar
 * rung, IOExceptions do not (environment problems are not format gaps), and
 * a double failure surfaces the sidecar's message with the primary failure
 * suppressed.
 */
class FallbackMeasurementParserTest {

    private static final Path FILE = Path.of("whatever.mf4");

    private static final MeasurementMetadata META =
            new MeasurementMetadata(List.of());
    private static final ChannelData DATA =
            new ChannelData(new double[]{0, 1}, new double[]{5, 6});

    /** Scriptable stub: each call either returns or throws what it is given. */
    private record Stub(MeasurementMetadata meta, ChannelData data, Exception failure)
            implements MeasurementParser {
        @Override
        public MeasurementMetadata parseMetadata(Path file)
                throws IOException, MeasurementParseException {
            throwIfSet();
            return meta;
        }

        @Override
        public ChannelData extractChannel(Path file, int groupIndex, String channelName)
                throws IOException, MeasurementParseException {
            throwIfSet();
            return data;
        }

        private void throwIfSet() throws IOException, MeasurementParseException {
            switch (failure) {
                case MeasurementParseException e -> throw e;
                case IOException e -> throw e;
                case null, default -> {
                    // no scripted failure — fall through to the stubbed result
                }
            }
        }
    }

    @Test
    void primarySuccessNeverTouchesTheFallback() throws Exception {
        FallbackMeasurementParser parser = new FallbackMeasurementParser(
                new Stub(META, DATA, null),
                new Stub(null, null, new IOException("fallback must not be called")));
        assertSame(META, parser.parseMetadata(FILE));
        assertSame(DATA, parser.extractChannel(FILE, 0, "speed"));
    }

    @Test
    void parseFailureFallsThroughToTheSidecarRung() throws Exception {
        FallbackMeasurementParser parser = new FallbackMeasurementParser(
                new Stub(null, null, new MeasurementParseException("DZ block unsupported")),
                new Stub(META, DATA, null));
        assertSame(META, parser.parseMetadata(FILE));
        assertArrayEquals(DATA.values(), parser.extractChannel(FILE, 0, "speed").values());
    }

    @Test
    void doubleParseFailureKeepsTheSidecarMessageAndSuppressesThePrimary() {
        MeasurementParseException primary = new MeasurementParseException("mdf4j: bad block");
        MeasurementParseException sidecar = new MeasurementParseException("asammdf: corrupt DZ");
        FallbackMeasurementParser parser = new FallbackMeasurementParser(
                new Stub(null, null, primary), new Stub(null, null, sidecar));
        MeasurementParseException thrown = assertThrows(MeasurementParseException.class,
                () -> parser.parseMetadata(FILE));
        assertEquals("asammdf: corrupt DZ", thrown.getMessage());
        assertSame(primary, thrown.getSuppressed()[0]);
    }

    @Test
    void ioExceptionsAreNotRetriedAcrossRungs() {
        FallbackMeasurementParser parser = new FallbackMeasurementParser(
                new Stub(null, null, new IOException("disk gone")),
                new Stub(META, DATA, null));
        assertThrows(IOException.class, () -> parser.parseMetadata(FILE));
        assertThrows(IOException.class, () -> parser.extractChannel(FILE, 0, "speed"));
    }

    @Test
    void fallbackIoExceptionPropagatesFromTheRetry() {
        FallbackMeasurementParser parser = new FallbackMeasurementParser(
                new Stub(null, null, new MeasurementParseException("primary parse")),
                new Stub(null, null, new IOException("sidecar unreachable")));
        assertThrows(IOException.class, () -> parser.extractChannel(FILE, 0, "speed"));
    }

    @Test
    void parseExceptionCarriesMessageAndCause() {
        MeasurementParseException plain = new MeasurementParseException("just a message");
        assertEquals("just a message", plain.getMessage());
        IllegalStateException cause = new IllegalStateException("root");
        MeasurementParseException wrapped = new MeasurementParseException("wrapped", cause);
        assertSame(cause, wrapped.getCause());
    }
}
