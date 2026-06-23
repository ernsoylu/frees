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
import org.springframework.beans.factory.ObjectProvider;
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

    public ComputeTaskListener(SolveController solveController,
                               OptimizeController optimizeController,
                               JobStore jobStore,
                               ObjectMapper objectMapper,
                               ObjectProvider<OpenTelemetry> openTelemetryProvider) {
        this.solveController = solveController;
        this.optimizeController = optimizeController;
        this.jobStore = jobStore;
        this.objectMapper = objectMapper;
        this.openTelemetry = openTelemetryProvider.getIfAvailable();
        this.tracer = this.openTelemetry != null
                ? this.openTelemetry.getTracer("frees.compute") : null;
    }

    @RabbitListener(queues = ComputeTask.QUEUE)
    public void onTask(ComputeTask task, @Headers Map<String, Object> headers) {
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

    private void dispatch(ComputeTask task) {        try {
            switch (task.taskType()) {
                case ComputeTask.SOLVE -> handleSolve(task);
                case ComputeTask.SOLVE_TABLE -> handleSolveTable(task);
                case ComputeTask.OPTIMIZE -> handleOptimize(task);
                case ComputeTask.OPTIMIZE_MULTI -> handleOptimizeMulti(task);
                case ComputeTask.CURVE_FIT -> handleCurveFit(task);
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

    private void handleSolve(ComputeTask task) {
        try {
            SolveController.SolveRequest request =
                    objectMapper.readValue(task.requestJson(), SolveController.SolveRequest.class);
            SolveController.SolveResponse response =
                    solveController.computeSolve(request, task.sessionId());
            jobStore.saveCompleted(task.jobId(), response);
        } catch (Exception e) {
            log.warn("Solve job {} failed: {}", task.jobId(), e.getMessage());
            jobStore.saveFailed(task.jobId(), errorMessage(e));
        }
    }

    private void handleSolveTable(ComputeTask task) {
        try {
            SolveController.SolveTableRequest request =
                    objectMapper.readValue(task.requestJson(), SolveController.SolveTableRequest.class);
            SolveController.SolveTableResponse response =
                    solveController.computeSolveTable(request);
            jobStore.saveCompleted(task.jobId(), response);
        } catch (Exception e) {
            log.warn("Solve-table job {} failed: {}", task.jobId(), e.getMessage());
            jobStore.saveFailed(task.jobId(), errorMessage(e));
        }
    }

    private void handleOptimize(ComputeTask task) {
        try {
            OptimizeController.OptimizeRequest request =
                    objectMapper.readValue(task.requestJson(), OptimizeController.OptimizeRequest.class);
            OptimizeController.OptimizeResponse response =
                    optimizeController.computeOptimize(request);
            jobStore.saveCompleted(task.jobId(), response);
        } catch (Exception e) {
            log.warn("Optimize job {} failed: {}", task.jobId(), e.getMessage());
            jobStore.saveFailed(task.jobId(), errorMessage(e));
        }
    }

    private void handleOptimizeMulti(ComputeTask task) {
        try {
            OptimizeController.MultiObjectiveRequest request =
                    objectMapper.readValue(task.requestJson(), OptimizeController.MultiObjectiveRequest.class);
            OptimizeController.ParetoResponse response =
                    optimizeController.computeOptimizeMulti(request);
            jobStore.saveCompleted(task.jobId(), response);
        } catch (Exception e) {
            log.warn("Multi-objective job {} failed: {}", task.jobId(), e.getMessage());
            jobStore.saveFailed(task.jobId(), errorMessage(e));
        }
    }

    private void handleCurveFit(ComputeTask task) {
        try {
            OptimizeController.CurveFitRequest request =
                    objectMapper.readValue(task.requestJson(), OptimizeController.CurveFitRequest.class);
            OptimizeController.CurveFitResponse response =
                    optimizeController.computeCurveFit(request);
            jobStore.saveCompleted(task.jobId(), response);
        } catch (Exception e) {
            log.warn("Curve-fit job {} failed: {}", task.jobId(), e.getMessage());
            jobStore.saveFailed(task.jobId(), errorMessage(e));
        }
    }

    private static String errorMessage(Throwable e) {
        String message = e.getMessage();
        return (message != null && !message.isBlank()) ? message : e.toString();
    }
}
