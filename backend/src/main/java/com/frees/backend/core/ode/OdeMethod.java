package com.frees.backend.core.ode;

/**
 * One integration scheme. The generic driver in {@link OdeIntegrator} owns the
 * time loop, event detection and output sampling; a method only knows how to
 * attempt a single step. For adaptive methods a step may be rejected, in which
 * case {@link StepResult#accepted()} is false and {@link StepResult#hNext()}
 * carries the reduced step to retry with.
 */
public interface OdeMethod {

    String name();

    boolean adaptive();

    /** The order of the method's primary solution (used for initial step sizing). */
    int order();

    /**
     * Attempt one step of size {@code h} from {@code (t, y)} given the already
     * known derivative {@code f0 = f(t, y)}.
     *
     * @return the step outcome (new state, new derivative, suggested next step)
     */
    StepResult step(OdeRhs f, double t, double[] y, double[] f0, double h, OdeProblem problem);

    /** Outcome of one attempted step. On rejection yNew/fNew are null. */
    record StepResult(boolean accepted, double[] yNew, double[] fNew, double hNext) {}
}
