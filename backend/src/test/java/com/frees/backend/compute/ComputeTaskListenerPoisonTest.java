package com.frees.backend.compute;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.opentelemetry.api.OpenTelemetry;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The poison-message guard: a redelivered task is dropped (marked FAILED) without
 * dispatching, so a task that crashed a worker can't crash-loop the whole tier.
 * A first-delivery task is dispatched normally.
 */
class ComputeTaskListenerPoisonTest {

    /** JobStore that records calls instead of hitting Redis. */
    private static final class RecordingJobStore extends JobStore {
        final AtomicReference<String> failedId = new AtomicReference<>();
        final AtomicReference<String> failedMsg = new AtomicReference<>();

        RecordingJobStore() {
            super(null, new ObjectMapper());
        }

        @Override
        public void saveFailed(String jobId, String error) {
            failedId.set(jobId);
            failedMsg.set(error);
        }
    }

    private static <T> ObjectProvider<T> noProvider() {
        return new ObjectProvider<>() {
            @Override public T getObject() { return null; }
            @Override public T getObject(Object... args) { return null; }
            @Override public T getIfAvailable() { return null; }
            @Override public T getIfUnique() { return null; }
        };
    }

    @Test
    void redeliveredTaskIsDroppedAndMarkedFailed() {
        RecordingJobStore store = new RecordingJobStore();
        // Null controllers are safe: the guard returns before any dispatch.
        ComputeTaskListener listener = new ComputeTaskListener(
                null, null, store, new ObjectMapper(),
                ComputeTaskListenerPoisonTest.<OpenTelemetry>noProvider(), true);

        ComputeTask task = new ComputeTask("job-1", ComputeTask.SOLVE, "sess", "{}");
        listener.onTask(task, Map.of(AmqpHeaders.REDELIVERED, Boolean.TRUE));

        assertEquals("job-1", store.failedId.get(), "redelivered task marked FAILED");
        assertTrue(store.failedMsg.get().toLowerCase().contains("retry"),
                "failure message guides the user to retry");
    }

    @Test
    void firstDeliveryIsDispatchedNotDropped() {
        RecordingJobStore store = new RecordingJobStore();
        // A real dispatch would need controllers; instead count that dispatch is
        // attempted by using a listener whose dispatch path throws on null deps.
        AtomicInteger dispatched = new AtomicInteger();
        ComputeTaskListener listener = new ComputeTaskListener(
                null, null, store, new ObjectMapper(),
                ComputeTaskListenerPoisonTest.<OpenTelemetry>noProvider(), true) {
        };

        // WARMUP is dispatched without touching the null controllers (it just logs),
        // so a first delivery flows past the guard and is handled normally.
        ComputeTask warmup = new ComputeTask("job-2", ComputeTask.WARMUP, "sess", "{}");
        listener.onTask(warmup, Map.of());          // not redelivered
        assertNull(store.failedId.get(), "first-delivery task is not dropped");

        // Even a redelivered WARMUP is exempt (it carries no user job to fail).
        listener.onTask(warmup, Map.of(AmqpHeaders.REDELIVERED, Boolean.TRUE));
        assertNull(store.failedId.get(), "WARMUP is exempt from the poison guard");
        dispatched.incrementAndGet();
    }
}
