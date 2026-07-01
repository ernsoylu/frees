package com.frees.backend.compute;

import com.frees.backend.api.OptimizeController;
import com.frees.backend.api.SolveController;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.messaging.handler.annotation.Headers;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Consumer side of the asynchronous compute pipeline. Runs under the
 * {@code compute} profile: pulls {@link ComputeTask}s off the
 * {@code frees.tasks} queue, dispatches each to the matching solver path on the
 * existing controllers, and writes the {@link JobState} (COMPLETED with the
 * response DTO, or FAILED with the error message) back to Redis via
 * {@link JobStore}.
 *
 * <p>Heavy lifting (Newton solves, optimization sweeps, least-squares fits) is
 * executed here, off the API thread. Failures of any kind — parse errors that
 * slipped past the producer's synchronous validation, singular systems,
 * numerical failures — are captured and reported as FAILED rather than
 * requeued, so a bad job never blocks the queue.
 */
@Component
@Profile("compute")
public class ComputeTaskListener {

    private static final Logger log = LoggerFactory.getLogger(ComputeTaskListener.class);

    private final SolveController solveController;
    private final OptimizeController optimizeController;
    private final JobStore jobStore;
    private final ObjectMapper objectMapper;
    private final OpenTelemetry openTelemetry;
    private final Tracer tracer;
    private final boolean dropRedelivered;

    public ComputeTaskListener(SolveController solveController,
                               OptimizeController optimizeController,
                               JobStore jobStore,
                               ObjectMapper objectMapper,
                               ObjectProvider<OpenTelemetry> openTelemetryProvider,
                               @Value("${frees.compute.drop-redelivered:true}") boolean dropRedelivered) {
        this.solveController = solveController;
        this.optimizeController = optimizeController;
        this.jobStore = jobStore;
        this.objectMapper = objectMapper;
        this.openTelemetry = openTelemetryProvider.getIfAvailable();
        this.tracer = this.openTelemetry != null
                ? this.openTelemetry.getTracer("frees.compute") : null;
        this.dropRedelivered = dropRedelivered;
    }

    @RabbitListener(queues = ComputeTask.QUEUE)
    public void onTask(ComputeTask task, @Headers Map<String, Object> headers) {
        // Poison-message guard. The listener catches every *thrown* solver failure
        // and records it as FAILED (see handle/dispatch), so a normal return always
        // acks. A redelivery therefore means the previous consumer DIED without
        // acking — a native crash (e.g. a JNI/SUNDIALS abort), an OOM kill, or a
        // hard shutdown mid-message. Re-running such a task just kills the next
        // worker, and because RabbitMQ keeps redelivering an unacked message it
        // takes down the whole tier (the SUNDIALS incident). Drop it once instead:
        // mark the job FAILED and ack, so one bad task can't crash-loop the workers.
        if (dropRedelivered && Boolean.TRUE.equals(headers.get(AmqpHeaders.REDELIVERED))
                && !ComputeTask.WARMUP.equals(task.taskType())) {
            log.error("Dropping redelivered task {} ({}): a previous worker died processing it; "
                    + "marking the job FAILED to protect the compute tier from a crash loop.",
                    task.jobId(), task.taskType());
            jobStore.saveFailed(task.jobId(),
                    "This job crashed a compute worker and was dropped to protect the workers "
                    + "from a repeated crash. Please retry; if it recurs the model may be "
                    + "triggering a native fault.");
            return;
        }

        // Extract the producer's trace context from the message headers and
        // start a consumer span as its child, so the two join into one
        // distributed trace (HTTP request → RabbitMQ publish → compute).
        if (openTelemetry == null || tracer == null) {
            dispatch(task);
            return;
        }
        Context extracted;
        try {
            extracted = openTelemetry.getPropagators().getTextMapPropagator()
                    .extract(Context.current(), headers, HEADER_GETTER);
        } catch (RuntimeException e) {
            log.debug("Failed to extract trace context for task {}", task.jobId(), e);
            extracted = Context.current();
        }
        Span span = tracer.spanBuilder("compute-task")
                .setParent(extracted)
                .setSpanKind(SpanKind.CONSUMER)
                .setAttribute("task.type", task.taskType())
                .setAttribute("job.id", task.jobId())
                .startSpan();
        try (Scope ignored = span.makeCurrent()) {
            dispatch(task);
        } catch (RuntimeException e) {
            span.recordException(e);
            throw e;
        } finally {
            span.end();
        }
    }

    /** Reads W3C trace-context headers (traceparent/tracestate) out of the
     *  RabbitMQ message's headers map for the consumer-side context extract. */
    private static final TextMapGetter<Map<String, Object>> HEADER_GETTER =
            new TextMapGetter<>() {
                @Override
                public Iterable<String> keys(Map<String, Object> carrier) {
                    return carrier.keySet();
                }

                @Override
                public String get(Map<String, Object> carrier, String key) {
                    Object v = carrier.get(key);
                    return v == null ? null : v.toString();
                }
            };

    private void dispatch(ComputeTask task) {
        try {
            switch (task.taskType()) {
                case ComputeTask.SOLVE -> handle(task, "Solve", SolveController.SolveRequest.class,
                        req -> solveController.computeSolve(req, task.sessionId()));
                case ComputeTask.SOLVE_TABLE -> handle(task, "Solve-table", SolveController.SolveTableRequest.class,
                        solveController::computeSolveTable);
                case ComputeTask.OPTIMIZE -> handle(task, "Optimize", OptimizeController.OptimizeRequest.class,
                        optimizeController::computeOptimize);
                case ComputeTask.OPTIMIZE_MULTI -> handle(task, "Multi-objective", OptimizeController.MultiObjectiveRequest.class,
                        optimizeController::computeOptimizeMulti);
                case ComputeTask.CURVE_FIT -> handle(task, "Curve-fit", OptimizeController.CurveFitRequest.class,
                        optimizeController::computeCurveFit);
                case ComputeTask.WARMUP -> log.info("Received WARMUP task, acknowledging and dropping.");
                default -> jobStore.saveFailed(task.jobId(),
                        "Unknown task type: " + task.taskType());
            }
        } catch (RuntimeException e) {
            // A failure inside the dispatch wiring itself (not the solver).
            log.error("Unhandled error processing compute task {}", task.jobId(), e);
            jobStore.saveFailed(task.jobId(), errorMessage(e));
        }
    }

    /**
     * Deserialises {@code task.requestJson()} into {@code requestType}, runs the
     * solver {@code computation}, and records the outcome in Redis: COMPLETED with
     * the response, or FAILED with the error message. A solver that throws fails
     * only its own job — it never propagates out to break the listener.
     */
    private <Q, R> void handle(ComputeTask task, String label, Class<Q> requestType,
                               SolverCall<Q, R> computation) {
        try {
            Q request = objectMapper.readValue(task.requestJson(), requestType);
            R response = computation.apply(request);
            jobStore.saveCompleted(task.jobId(), response);
        } catch (Exception e) {
            log.warn("{} job {} failed: {}", label, task.jobId(), e.getMessage());
            jobStore.saveFailed(task.jobId(), errorMessage(e));
        }
    }

    /** A solver invocation that may throw checked exceptions (parse/solver failures). */
    @FunctionalInterface
    private interface SolverCall<Q, R> {
        R apply(Q request) throws Exception;
    }

    private static String errorMessage(Throwable e) {
        String message = e.getMessage();
        return (message != null && !message.isBlank()) ? message : e.toString();
    }
}
