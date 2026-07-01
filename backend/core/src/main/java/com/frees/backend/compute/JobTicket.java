package com.frees.backend.compute;

/**
 * The {@code 202 Accepted} body returned when a compute job is submitted:
 * the client polls {@code GET /api/jobs/{jobId}} with {@code jobId}.
 */
public record JobTicket(String jobId, String status) {

    public static JobTicket pending(String jobId) {
        return new JobTicket(jobId, JobState.PENDING);
    }
}
