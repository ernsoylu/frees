package com.frees.backend.props;

/**
 * A property call failed for the current state point (e.g. a pressure below
 * the triple point during Newton iteration). The solver treats this as a NaN
 * residual — a bad region to step away from — rather than a fatal error.
 */
public class PropertyEvaluationException extends IllegalStateException {

    public PropertyEvaluationException(String message) {
        super(message);
    }
}
