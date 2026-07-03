package com.frees.backend.measurement;

import java.util.Arrays;

/**
 * One extracted channel: the group's time base (seconds) and the channel's
 * physical values, aligned by index. Invalid samples are NaN.
 */
public record ChannelData(double[] time, double[] values) {

    @Override
    public boolean equals(Object o) {
        return o instanceof ChannelData(double[] otherTime, double[] otherValues)
                && Arrays.equals(time, otherTime)
                && Arrays.equals(values, otherValues);
    }

    @Override
    public int hashCode() {
        return 31 * Arrays.hashCode(time) + Arrays.hashCode(values);
    }

    @Override
    public String toString() {
        return "ChannelData[n=" + time.length + "]";
    }
}
