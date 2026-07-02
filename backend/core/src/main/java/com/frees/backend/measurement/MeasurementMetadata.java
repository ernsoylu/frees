package com.frees.backend.measurement;

import java.util.List;

/**
 * Parsed structure of a measurement file: channel groups (recordings with a
 * shared time base) and their channels. This is what the signal browser
 * shows; sample data is extracted lazily per channel (MDA's on-the-fly
 * indexing pattern).
 */
public record MeasurementMetadata(List<GroupInfo> groups) {

    /** One channel group: a shared raster of {@code records} samples. */
    public record GroupInfo(int index, String name, long records, List<ChannelInfo> channels) {
    }

    /**
     * One channel. {@code kind} mirrors the frontend ChannelKind contract:
     * "analog" | "boolean" | "string" (string channels are listed but
     * unplottable, design contract §2.5d).
     */
    public record ChannelInfo(String name, String unit, boolean timeMaster, String kind) {
    }
}
