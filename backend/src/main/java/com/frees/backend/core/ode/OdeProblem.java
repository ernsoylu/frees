package com.frees.backend.core.ode;

import java.util.List;

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
}
