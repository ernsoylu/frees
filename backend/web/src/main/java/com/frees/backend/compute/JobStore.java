package com.frees.backend.compute;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Redis-backed store of {@link JobState}. Each job lives under
 * {@code job:<jobId>} as a JSON document written and read through the
 * {@link StringRedisTemplate}.
 *
 * <p>Active only under the {@code api} and {@code compute} profiles: the
 * synchronous default-profile path never enqueues jobs and so never needs it.
 */
@Component
@Profile({"api", "compute"})
public class JobStore {

    private static final String KEY_PREFIX = "job:";
    private static final long TTL_SECONDS = 60L * 60L; // 1 hour

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    public JobStore(StringRedisTemplate redis, ObjectMapper objectMapper) {
        this.redis = redis;
        this.objectMapper = objectMapper;
    }

    public void savePending(String jobId) {
        put(JobState.pending(jobId));
    }

    public void saveCompleted(String jobId, Object result) {
        put(JobState.completed(jobId, result));
    }

    public void saveFailed(String jobId, String error) {
        put(JobState.failed(jobId, error != null ? error : "Job failed"));
    }

    /** Marks a parent table job as awaiting {@code chunkCount} chunk results. */
    public void savePendingChunked(String jobId, int chunkCount) {
        savePending(jobId);
        redis.opsForValue().set(key(jobId) + ":chunks", Integer.toString(chunkCount),
                java.time.Duration.ofSeconds(TTL_SECONDS));
    }

    /**
     * Records one chunk's result and returns every chunk's JSON in chunk order
     * once ALL chunks have reported — exactly one caller (whichever lands
     * last) gets the full list and assembles the parent; everyone else gets
     * {@code null}. Write-then-count: the payload is stored before the shared
     * counter moves, so the assembling caller always reads complete data. A
     * parent already in a terminal state (a sibling chunk failed) is never
     * resurrected: the assembly probe re-checks it and stands down.
     */
    public java.util.List<String> saveChunkResult(String jobId, int chunkIndex, Object result) {
        try {
            String json = objectMapper.writeValueAsString(result);
            redis.opsForValue().set(key(jobId) + ":chunk:" + chunkIndex, json,
                    java.time.Duration.ofSeconds(TTL_SECONDS));
            Long done = redis.opsForValue().increment(key(jobId) + ":chunks-done");
            String countStr = redis.opsForValue().get(key(jobId) + ":chunks");
            if (countStr == null || done == null || done < Long.parseLong(countStr)) {
                return null;
            }
            JobState current = get(jobId);
            if (current == null || !"PENDING".equals(current.status())) {
                return null; // a sibling already failed the parent — stand down
            }
            int count = Integer.parseInt(countStr);
            java.util.List<String> all = new java.util.ArrayList<>(count);
            for (int i = 0; i < count; i++) {
                String chunk = redis.opsForValue().get(key(jobId) + ":chunk:" + i);
                if (chunk == null) {
                    return null; // expired or missing — the parent will time out
                }
                all.add(chunk);
            }
            return all;
        } catch (Exception e) {
            throw new RuntimeException("Failed to persist chunk state to Redis", e);
        }
    }

    /** The current state of {@code jobId}, or {@code null} if no such job exists. */
    public JobState get(String jobId) {
        String json = redis.opsForValue().get(key(jobId));
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, JobState.class);
        } catch (Exception e) {
            // Corrupt entry — treat as absent rather than poisoning the poller.
            return null;
        }
    }

    private void put(JobState state) {
        try {
            String json = objectMapper.writeValueAsString(state);
            redis.opsForValue().set(key(state.jobId()), json, java.time.Duration.ofSeconds(TTL_SECONDS));
            if (!"PENDING".equals(state.status())) {
                redis.convertAndSend("job-events", json);
            }
        } catch (Exception e) {
            // Redis is the job store of record; if it is unavailable we cannot
            // honour the async contract. Fail loudly so the producer does not
            // hand out a jobId the poller can never resolve.
            throw new RuntimeException("Failed to persist job state to Redis", e);
        }
    }

    private static String key(String jobId) {
        return KEY_PREFIX + jobId;
    }
}
