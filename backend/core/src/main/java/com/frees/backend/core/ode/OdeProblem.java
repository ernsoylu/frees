package com.frees.backend.core.ode;

import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * A fully specified initial-value problem handed to {@link OdeIntegrator}:
 * the state RHS, the integration window, the chosen method and tolerances, the
 * output sample count, and any events to monitor. Numeric fields are SI.
 *
 * @param method        solver name (ode1–ode5, ode8, ode45, ode23, ode23s, ode15s)
 * @param t0            start time
 * @param tf            end time
 * @param y0            initial state vector
 * @param rhs           dy/dt closure
 * @param points        output sample count (>=2); null uses the default
 * @param fixedStep     fixed step size; null means adaptive (where supported)
 * @param rtol          relative tolerance (adaptive/stiff)
 * @param atol          absolute tolerance (adaptive/stiff)
 * @param maxStep       cap on a single step; null means unbounded
 * @param events        zero-crossing events
 * @param deadlineNanos {@code System.nanoTime()} budget for the whole solve
 */
public record OdeProblem(
        String method,
        double t0,
        double tf,
        double[] y0,
        OdeRhs rhs,
        Integer points,
        Double fixedStep,
        double rtol,
        double atol,
        Double maxStep,
        List<OdeEvent> events,
        long deadlineNanos) {

    public int sampleCount() {
        return points != null && points >= 2 ? points : 200;
    }

    public int dimension() {
        return y0.length;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        return o instanceof OdeProblem other
                && Double.compare(t0, other.t0) == 0
                && Double.compare(tf, other.tf) == 0
                && Double.compare(rtol, other.rtol) == 0
                && Double.compare(atol, other.atol) == 0
                && deadlineNanos == other.deadlineNanos
                && Arrays.equals(y0, other.y0)
                && Objects.equals(method, other.method)
                && Objects.equals(rhs, other.rhs)
                && Objects.equals(points, other.points)
                && Objects.equals(fixedStep, other.fixedStep)
                && Objects.equals(maxStep, other.maxStep)
                && Objects.equals(events, other.events);
    }

    @Override
    public int hashCode() {
        return 31 * Objects.hash(method, t0, tf, rhs, points, fixedStep, rtol, atol, maxStep, events, deadlineNanos)
                + Arrays.hashCode(y0);
    }

    @Override
    public String toString() {
        return "OdeProblem[method=" + method + ", t0=" + t0 + ", tf=" + tf
                + ", y0=" + Arrays.toString(y0) + ", rhs=" + rhs + ", points=" + points
                + ", fixedStep=" + fixedStep + ", rtol=" + rtol + ", atol=" + atol
                + ", maxStep=" + maxStep + ", events=" + events
                + ", deadlineNanos=" + deadlineNanos + "]";
    }
}
