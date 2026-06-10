package com.frees.backend.core;

/**
 * EES Stop Criteria (Options > Preferences > Stop Crit). Defaults match EES:
 * 250 iterations, relative residual 1e-6, change in variables 1e-9, 3600 s.
 */
public record SolverSettings(int maxIterations,
                             double relativeResiduals,
                             double changeInVariables,
                             double elapsedTimeSeconds,
                             boolean complexMode) {

    public static final SolverSettings DEFAULTS = new SolverSettings(250, 1e-12, 1e-15, 3600.0, false);

    public SolverSettings(int maxIterations, double relativeResiduals, double changeInVariables, double elapsedTimeSeconds) {
        this(maxIterations, relativeResiduals, changeInVariables, elapsedTimeSeconds, false);
    }

    public SolverSettings {
        if (maxIterations < 1) {
            throw new SolverException("Number of iterations must be at least 1.");
        }
        if (relativeResiduals <= 0 || changeInVariables <= 0 || elapsedTimeSeconds <= 0) {
            throw new SolverException("Stop criteria values must be positive.");
        }
    }
}
