package com.frees.backend.compute;

/**
 * The state of one compute job, persisted in Redis under {@code job:<jobId>}.
 *
 * <p>{@code status} is one of {@link #PENDING}, {@link #COMPLETED} or
 * {@link #FAILED}. {@code result} holds the serialised solver response DTO when
 * completed (a {@code SolveResponse}/{@code OptimizeResponse}/
 * {@code CurveFitResponse}); {@code error} holds the failure message when
 * failed. Both are {@code null} while pending.
 *
 * <p>{@code result} is typed {@link Object} so that, when round-tripped through
 * Redis as JSON, it deserialises to a JSON object tree that the API node can
 * hand straight back to the polling client.
 */
public record JobState(String jobId,
                       String status,
                       String error,
                       Object result) {

    public static final String PENDING = "PENDING";
    public static final String COMPLETED = "COMPLETED";
    public static final String FAILED = "FAILED";

    public static JobState pending(String jobId) {
        return new JobState(jobId, PENDING, null, null);
    }

    public static JobState completed(String jobId, Object result) {
        return new JobState(jobId, COMPLETED, null, result);
    }

    public static JobState failed(String jobId, String error) {
        return new JobState(jobId, FAILED, error, null);
    }
}
