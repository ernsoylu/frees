package com.frees.backend.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frees.backend.compute.JobState;
import com.frees.backend.compute.JobStore;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

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

    private static final long SSE_TIMEOUT_MILLIS = 60_000L;

    private final JobStore jobStore;
    private final ObjectMapper objectMapper;
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public JobController(JobStore jobStore, ObjectMapper objectMapper) {
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
    public SseEmitter streamJob(@PathVariable String jobId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        if (sendIfTerminal(emitter, jobStore.get(jobId))) {
            return emitter;
        }

        emitters.computeIfAbsent(jobId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> removeEmitter(jobId, emitter));
        emitter.onTimeout(() -> removeEmitter(jobId, emitter));
        emitter.onError(e -> removeEmitter(jobId, emitter));

        // Re-check after registering: a completion published on `job-events`
        // between the first read and the registration above would otherwise be
        // missed, leaving the client to wait out the SSE timeout.
        if (sendIfTerminal(emitter, jobStore.get(jobId))) {
            removeEmitter(jobId, emitter);
        }
        return emitter;
    }

    /** Pushes a terminal (non-PENDING) state to the emitter and completes it.
     *  Returns {@code true} when the state was terminal and the emitter closed. */
    private boolean sendIfTerminal(SseEmitter emitter, JobState state) {
        if (state == null || "PENDING".equals(state.status())) {
            return false;
        }
        try {
            emitter.send(state);
            emitter.complete();
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
        return true;
    }

    private void removeEmitter(String jobId, SseEmitter emitter) {
        List<SseEmitter> list = emitters.get(jobId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emitters.remove(jobId);
            }
        }
    }

    /** Redis pub/sub callback (channel {@code job-events}): fans a terminal
     *  job state out to any emitters waiting on that job. */
    public void onMessage(String message) {
        try {
            JobState state = objectMapper.readValue(message, JobState.class);
            List<SseEmitter> list = emitters.remove(state.jobId());
            if (list != null) {
                for (SseEmitter emitter : list) {
                    sendIfTerminal(emitter, state);
                }
            }
        } catch (Exception e) {
            // Malformed pub/sub message — nothing to deliver.
        }
    }
}
