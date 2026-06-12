package com.frees.backend.core;

/**
 * Per-variable solver information, mirroring the Variable Information
 * window: guess value (default 1.0) and lower/upper bounds (default
 * ±infinity).
 */
public record VariableSpec(String name, double guess, double lower, double upper) {

    public static final double DEFAULT_GUESS = 1.0;

    public VariableSpec {
        name = name.toLowerCase();
        if (Double.isNaN(guess) || Double.isNaN(lower) || Double.isNaN(upper)) {
            throw new SolverException("Variable information for " + name + " contains NaN.");
        }
        if (lower > upper) {
            throw new SolverException(
                    "Lower bound exceeds upper bound for variable " + name + ".");
        }
        if (guess < lower || guess > upper) {
            throw new SolverException(String.format(
                    "The guess value %g for variable %s is outside its bounds [%g, %g].",
                    guess, name, lower, upper));
        }
    }

    public static VariableSpec defaults(String name) {
        return new VariableSpec(name, DEFAULT_GUESS,
                Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY);
    }
}
