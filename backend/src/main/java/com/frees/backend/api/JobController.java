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
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final java.util.Map<String, java.util.List<org.springframework.web.servlet.mvc.method.annotation.SseEmitter>> emitters = new java.util.concurrent.ConcurrentHashMap<>();

    public JobController(JobStore jobStore, com.fasterxml.jackson.databind.ObjectMapper objectMapper) {
        this.jobStore = jobStore;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<JobState> getJob(@PathVariable String jobId) {
        JobState state = jobStore.get(jobId);
        if (state == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(state);
    }

    @GetMapping("/{jobId}/stream")
    public org.springframework.web.servlet.mvc.method.annotation.SseEmitter streamJob(@PathVariable String jobId) {
        org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter = new org.springframework.web.servlet.mvc.method.annotation.SseEmitter(60000L); // 60s timeout
        JobState state = jobStore.get(jobId);
        if (state != null && !state.status().equals("PENDING")) {
            try {
                emitter.send(state);
                emitter.complete();
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        emitters.computeIfAbsent(jobId, k -> new java.util.concurrent.CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> removeEmitter(jobId, emitter));
        emitter.onError(e -> removeEmitter(jobId, emitter));

        return emitter;
    }

    private void removeEmitter(String jobId, org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter) {
        java.util.List<org.springframework.web.servlet.mvc.method.annotation.SseEmitter> list = emitters.get(jobId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emitters.remove(jobId);
            }
        }
    }

    public void onMessage(String message) {
        try {
            JobState state = objectMapper.readValue(message, JobState.class);
            java.util.List<org.springframework.web.servlet.mvc.method.annotation.SseEmitter> list = emitters.remove(state.jobId());
            if (list != null) {
                for (org.springframework.web.servlet.mvc.method.annotation.SseEmitter emitter : list) {
                    try {
                        emitter.send(state);
                        emitter.complete();
                    } catch (Exception e) {
                        // ignore, client disconnected
                    }
                }
            }
        } catch (Exception e) {
            // ignore malformed message
        }
    }
}
