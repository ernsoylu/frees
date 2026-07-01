package com.frees.backend.compute;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Producer side of the asynchronous compute pipeline. The API controllers
 * (under the {@code api} profile) hand a request JSON + task type here; this
 * mints a {@code jobId}, writes a {@link JobState#PENDING} entry to Redis via
 * {@link JobStore}, publishes a {@link ComputeTask} onto the
 * {@code frees.tasks} queue, and returns the {@link JobTicket} to the caller.
 *
 * <p>Active only under the {@code api} profile.
 */
@Component
@Profile("api")
public class ComputeDispatcher {

    private static final Logger log = LoggerFactory.getLogger(ComputeDispatcher.class);

    private final RabbitTemplate rabbitTemplate;
    private final JobStore jobStore;
    private final ObjectMapper objectMapper;

    public ComputeDispatcher(RabbitTemplate rabbitTemplate, JobStore jobStore,
                             ObjectMapper objectMapper) {
        this.rabbitTemplate = rabbitTemplate;
        this.jobStore = jobStore;
        this.objectMapper = objectMapper;
    }

    /**
     * Enqueues a compute job and returns its ticket.
     *
     * @param taskType one of {@link ComputeTask#SOLVE}/
     *                 {@link ComputeTask#OPTIMIZE}/{@link ComputeTask#CURVE_FIT}
     * @param sessionId the request's session id (may be {@code null}); solve
     *                  results are cached against it for the REPL
     * @param request the original request DTO; serialised to JSON for the worker
     */
    public JobTicket dispatch(String taskType, String sessionId, Object request) {
        String jobId = UUID.randomUUID().toString();
        // WARMUP is a fire-and-forget primer that just opens the lazily-established
        // RabbitMQ connection at startup; the listener drops it and nothing ever
        // polls its jobId, so it skips the job store entirely rather than leaving
        // an unresolved PENDING entry in Redis until its TTL.
        boolean warmup = ComputeTask.WARMUP.equals(taskType);
        String requestJson;
        try {
            requestJson = objectMapper.writeValueAsString(request);
        } catch (JsonProcessingException e) {
            // The request could not be serialised — there is nothing to enqueue.
            log.error("Failed to serialise compute task request", e);
            if (!warmup) {
                jobStore.saveFailed(jobId, "Failed to serialise request: " + e.getMessage());
            }
            return JobTicket.pending(jobId);
        }
        if (!warmup) {
            jobStore.savePending(jobId);
        }
        ComputeTask task = new ComputeTask(jobId, taskType, sessionId, requestJson);
        try {
            rabbitTemplate.convertAndSend(ComputeTask.QUEUE, task);
        } catch (RuntimeException e) {
            // The PENDING entry has already been persisted; mark the job failed
            // so the poller gets a terminal state rather than waiting forever.
            log.error("Failed to publish compute task {}", jobId, e);
            if (!warmup) {
                jobStore.saveFailed(jobId, "Failed to enqueue job: " + e.getMessage());
            }
        }
        return JobTicket.pending(jobId);
    }
}
