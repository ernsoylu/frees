package com.frees.backend.api;

import com.frees.backend.compute.JobState;
import com.frees.backend.compute.JobStore;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Polling endpoint for asynchronous compute jobs:
 * {@code GET /api/jobs/{jobId}} returns the current {@link JobState} (PENDING,
 * COMPLETED with a {@code result}, or FAILED with an {@code error}), or
 * {@code 404} when no such job is known.
 *
 * <p>Active only under the {@code api} profile, where the solve/optimize/
 * curve-fit endpoints enqueue jobs instead of solving synchronously.
 */
@RestController
@RequestMapping("/api/jobs")
@Profile("api")
public class JobController {

    private final JobStore jobStore;

    public JobController(JobStore jobStore) {
        this.jobStore = jobStore;
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<JobState> getJob(@PathVariable String jobId) {
        JobState state = jobStore.get(jobId);
        if (state == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(state);
    }
}
