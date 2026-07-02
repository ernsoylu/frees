package com.frees.backend.measurement;

import java.io.IOException;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The fallback ladder (todo.md Phase 3) as a parser: try the primary
 * (in-process mdf4j — fast path, covers uncompressed files) and, when it
 * reports a PARSE failure, retry through the fallback (the asammdf sidecar,
 * which covers DZ-compressed OEM files). IOExceptions — unreadable file,
 * sidecar unreachable — are not retried across rungs: they signal
 * environment problems, not format gaps.
 */
public final class FallbackMeasurementParser implements MeasurementParser {

    private static final Logger log = LoggerFactory.getLogger(FallbackMeasurementParser.class);

    private final MeasurementParser primary;
    private final MeasurementParser fallback;

    public FallbackMeasurementParser(MeasurementParser primary, MeasurementParser fallback) {
        this.primary = primary;
        this.fallback = fallback;
    }

    @Override
    public MeasurementMetadata parseMetadata(Path file) throws IOException, MeasurementParseException {
        try {
            return primary.parseMetadata(file);
        } catch (MeasurementParseException primaryFailure) {
            log.info("Primary MDF parser failed ({}); retrying via sidecar", primaryFailure.getMessage());
            return retry(primaryFailure, () -> fallback.parseMetadata(file));
        }
    }

    @Override
    public ChannelData extractChannel(Path file, int groupIndex, String channelName)
            throws IOException, MeasurementParseException {
        try {
            return primary.extractChannel(file, groupIndex, channelName);
        } catch (MeasurementParseException primaryFailure) {
            log.info("Primary MDF extraction failed ({}); retrying via sidecar", primaryFailure.getMessage());
            return retry(primaryFailure, () -> fallback.extractChannel(file, groupIndex, channelName));
        }
    }

    @FunctionalInterface
    private interface Attempt<T> {
        T run() throws IOException, MeasurementParseException;
    }

    private static <T> T retry(MeasurementParseException primaryFailure, Attempt<T> attempt)
            throws IOException, MeasurementParseException {
        try {
            return attempt.run();
        } catch (MeasurementParseException fallbackFailure) {
            // Both rungs judged the CONTENT unparseable — the sidecar (the
            // reference implementation) has the authoritative message.
            fallbackFailure.addSuppressed(primaryFailure);
            throw fallbackFailure;
        }
    }
}
