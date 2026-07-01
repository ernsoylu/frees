package com.frees.backend.core;

/**
 * Stop Criteria (Options > Preferences > Stop Crit), plus the complex-mode
 * toggle. frees defaults are tighter than the classic 1e-6/1e-9 (the
 * residual scale floors at 1.0, so 1e-12 behaves like a high-precision
 * absolute tolerance for unit-scale equations).
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
