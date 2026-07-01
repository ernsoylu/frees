package com.frees.backend.core.ode;

/**
 * A scalar function of {@code (t, y)} over the ODE state, used for event
 * switching functions {@code g(t, y)} whose zero crossings are detected during
 * integration.
 */
@FunctionalInterface
public interface OdeScalarFn {
    double eval(double t, double[] y);
}
