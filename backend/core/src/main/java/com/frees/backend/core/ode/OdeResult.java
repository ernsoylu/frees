package com.frees.backend.core.ode;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * The outcome of an ODE solve: the state trajectory sampled at evenly spaced
 * output times (using each method's dense interpolant), plus any recorded
 * events. {@code endTime} is {@code tf} unless a {@code stop} event fired
 * earlier, in which case {@code stopped} is true and the trajectory ends at the
 * crossing.
 *
 * @param times          sampled output times, length = number of samples
 * @param states         {@code states[i]} is the state vector at {@code times[i]}
 * @param events         recorded event hits in time order
 * @param stopped        whether a stop-event terminated the integration early
 * @param endTime        the final time reached
 * @param acceptedSteps  accepted internal steps (diagnostics)
 * @param rejectedSteps  rejected internal steps (diagnostics)
 */
public record OdeResult(
        double[] times,
        double[][] states,
        List<EventRecord> events,
        boolean stopped,
        double endTime,
        int acceptedSteps,
        int rejectedSteps) {

    /** A single event firing: its name, the crossing time, and the state there. */
    public record EventRecord(String name, double time, double[] state) {
        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            return o instanceof EventRecord other
                    && Double.compare(time, other.time) == 0
                    && Objects.equals(name, other.name)
                    && Arrays.equals(state, other.state);
        }

        @Override
        public int hashCode() {
            return 31 * Objects.hash(name, time) + Arrays.hashCode(state);
        }

        @Override
        public String toString() {
            return "EventRecord[name=" + name + ", time=" + time
                    + ", state=" + Arrays.toString(state) + "]";
        }
    }

    public int dimension() {
        return states.length == 0 ? 0 : states[0].length;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        return o instanceof OdeResult other
                && stopped == other.stopped
                && Double.compare(endTime, other.endTime) == 0
                && acceptedSteps == other.acceptedSteps
                && rejectedSteps == other.rejectedSteps
                && Arrays.equals(times, other.times)
                && Arrays.deepEquals(states, other.states)
                && Objects.equals(events, other.events);
    }

    @Override
    public int hashCode() {
        int result = Objects.hash(events, stopped, endTime, acceptedSteps, rejectedSteps);
        result = 31 * result + Arrays.hashCode(times);
        result = 31 * result + Arrays.deepHashCode(states);
        return result;
    }

    @Override
    public String toString() {
        return "OdeResult[times=" + Arrays.toString(times)
                + ", states=" + Arrays.deepToString(states)
                + ", events=" + events
                + ", stopped=" + stopped
                + ", endTime=" + endTime
                + ", acceptedSteps=" + acceptedSteps
                + ", rejectedSteps=" + rejectedSteps + "]";
    }
}
