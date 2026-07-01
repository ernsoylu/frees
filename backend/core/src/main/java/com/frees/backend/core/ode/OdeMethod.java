package com.frees.backend.core.ode;

import java.util.Arrays;

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
    record StepResult(boolean accepted, double[] yNew, double[] fNew, double hNext) {
        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            return o instanceof StepResult other
                    && accepted == other.accepted
                    && Double.compare(hNext, other.hNext) == 0
                    && Arrays.equals(yNew, other.yNew)
                    && Arrays.equals(fNew, other.fNew);
        }

        @Override
        public int hashCode() {
            int result = Boolean.hashCode(accepted);
            result = 31 * result + Double.hashCode(hNext);
            result = 31 * result + Arrays.hashCode(yNew);
            result = 31 * result + Arrays.hashCode(fNew);
            return result;
        }

        @Override
        public String toString() {
            return "StepResult[accepted=" + accepted
                    + ", yNew=" + Arrays.toString(yNew)
                    + ", fNew=" + Arrays.toString(fNew)
                    + ", hNext=" + hNext + "]";
        }
    }
}
