package com.frees.backend.measurement;

/**
 * One extracted channel: the group's time base (seconds) and the channel's
 * physical values, aligned by index. Invalid samples are NaN.
 */
public record ChannelData(double[] time, double[] values) {
}
