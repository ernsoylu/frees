package com.frees.backend.measurement;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Seam for measurement-file parsers (todo.md Phase 3). The fallback ladder
 * behind this interface: mdf4j → minimal in-house uncompressed-DT reader →
 * asammdf Python sidecar (remote implementation) → CSV-upload-only. Keeping
 * the interface this small (two stateless calls over a file on disk) is what
 * makes the sidecar rung possible without touching callers.
 */
public interface MeasurementParser {

    /** Cheap structural parse: groups + channels, no sample data. */
    MeasurementMetadata parseMetadata(Path file) throws IOException, MeasurementParseException;

    /**
     * Extract one channel (plus its group's time base) at full resolution.
     * Lazy per-channel extraction keeps a 100 MB file from ever being fully
     * materialized on the heap.
     */
    ChannelData extractChannel(Path file, int groupIndex, String channelName)
            throws IOException, MeasurementParseException;
}
