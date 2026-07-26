package com.frees.backend.core;

import java.util.List;
import java.util.Map;

public class SolverException extends RuntimeException {

    /** Raw state captured where a block solve gave up: enough for the outer
     *  solve to reconstruct which block failed and what the iterate looked
     *  like, without the block loop needing any parse-time context. */
    public record FailureState(List<Block> blocks,
                               Map<String, Double> values,
                               int failedBlockIndex,
                               int iterations) {}

    private final transient FailureState failureState;
    private final transient EquationSystemSolver.Result partialResult;

    public SolverException(String message) {
        this(message, null, null);
    }

    private SolverException(String message, FailureState failureState,
                            EquationSystemSolver.Result partialResult) {
        super(message);
        this.failureState = failureState;
        this.partialResult = partialResult;
    }

    /** The block-loop failure state, or null when the failure predates block
     *  solving (structural checks and other pre-solve rejections). */
    public FailureState failureState() {
        return failureState;
    }

    /** A partial Result carrying the block structure, the residuals at the
     *  point of failure and partial stats — attached by the outer solve so a
     *  failure ships diagnostics, or null when none could be built. */
    public EquationSystemSolver.Result partialResult() {
        return partialResult;
    }

    /** Copy of this exception carrying the block-loop failure state
     *  (stack trace preserved). */
    public SolverException withFailureState(FailureState state) {
        SolverException copy = new SolverException(getMessage(), state, partialResult);
        copy.setStackTrace(getStackTrace());
        return copy;
    }

    /** Copy of this exception carrying the diagnostics partial result
     *  (stack trace preserved). */
    public SolverException withPartialResult(EquationSystemSolver.Result partial) {
        SolverException copy = new SolverException(getMessage(), failureState, partial);
        copy.setStackTrace(getStackTrace());
        return copy;
    }
}
