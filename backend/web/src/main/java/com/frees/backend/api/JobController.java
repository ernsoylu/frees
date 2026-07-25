package com.frees.backend.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frees.backend.compute.JobState;
import com.frees.backend.compute.JobStore;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
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
import java.util.concurrent.atomic.AtomicInteger;

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

    /** Ceiling on concurrently held SSE streams across all jobs. Each is an
     *  async request pinned until it completes or times out; clients turned
     *  away can still poll GET /api/jobs/{jobId}. */
    private static final int MAX_LIVE_EMITTERS = 500;

    private final JobStore jobStore;
    private final ObjectMapper objectMapper;
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final AtomicInteger liveEmitters = new AtomicInteger();

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

    /**
     * Streams a job's terminal state.
     *
     * <p>Registration is refused for a job the store has never heard of. The
     * path segment is caller-controlled, and the emitter map was keyed directly
     * on it, so streaming invented ids used to allocate a map entry plus a held
     * async request each — for the full SSE timeout, without ever naming a real
     * job. {@link ComputeDispatcher} writes the PENDING entry BEFORE publishing
     * the task, so any id a client legitimately holds already resolves here;
     * one that does not is unknown or long expired, and 404 is both the honest
     * answer and the one that costs nothing to hold.
     */
    @GetMapping("/{jobId}/stream")
    public ResponseEntity<SseEmitter> streamJob(@PathVariable String jobId) {
        JobState current = jobStore.get(jobId);
        if (current == null) {
            return ResponseEntity.notFound().build();
        }

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        if (sendIfTerminal(emitter, current)) {
            return ResponseEntity.ok(emitter);
        }

        // Backstop for the pending-job case: even legitimate ids should not be
        // able to pin unbounded async requests, since each is held until it
        // completes or times out.
        if (liveEmitters.incrementAndGet() > MAX_LIVE_EMITTERS) {
            liveEmitters.decrementAndGet();
            emitter.completeWithError(new IllegalStateException(
                    "Too many streaming clients; poll GET /api/jobs/{jobId} instead."));
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(emitter);
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
        return ResponseEntity.ok(emitter);
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
        if (list != null && list.remove(emitter)) {
            // Only decrement when this call is the one that actually removed it:
            // completion, timeout and error callbacks can all fire for the same
            // emitter, and double-counting would leak the budget downwards until
            // no client could stream at all.
            liveEmitters.decrementAndGet();
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
                // Release the budget here, because taking the whole list out of
                // the map means the per-emitter completion callbacks below will
                // no longer find it and so will not release it themselves. Miss
                // this and the counter only ever climbs, until every client is
                // refused a stream on a perfectly healthy server.
                liveEmitters.addAndGet(-list.size());
                for (SseEmitter emitter : list) {
                    sendIfTerminal(emitter, state);
                }
            }
        } catch (Exception e) {
            // Malformed pub/sub message — nothing to deliver.
        }
    }
}
