package com.frees.backend.core.ode;

import java.util.List;

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
    public record EventRecord(String name, double time, double[] state) {}

    public int dimension() {
        return states.length == 0 ? 0 : states[0].length;
    }
}
