package com.frees.backend.api;

import com.frees.backend.compute.ComputeDispatcher;
import com.frees.backend.compute.ComputeTask;
import com.frees.backend.props.CoolProp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Pre-warms the JVM, Jackson, EquationParser, EquationSystemSolver, and CoolProp
 * on startup so the first user request is fast.
 */
@Component
public class WarmupListener {
    private static final Logger log = LoggerFactory.getLogger(WarmupListener.class);

    private final SolveController solveController;
    private final ComputeDispatcher computeDispatcher;

    public WarmupListener(SolveController solveController, ObjectProvider<ComputeDispatcher> dispatcherProvider) {
        this.solveController = solveController;
        this.computeDispatcher = dispatcherProvider.getIfAvailable();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void warmup() {
        log.info("Starting JVM warmup...");
        long start = System.currentTimeMillis();
        try {
            // Warm up CoolProp via native load
            if (CoolProp.isAvailable()) {
                CoolProp.props1SI("Water", "Tcrit");
            }

            // Warm up the solver pipeline
            String text = "x = 10\ny = 2 * x";
            SolveController.SolveRequest request = new SolveController.SolveRequest(
                text, null, List.of(), false, "SI", false, List.of(), List.of()
            );
            solveController.computeSolve(request, "warmup");

            // Warm up the RabbitMQ connection lazily established in ComputeDispatcher
            // by enqueueing a WARMUP task the listener acknowledges and drops.
            if (computeDispatcher != null) {
                computeDispatcher.dispatch(ComputeTask.WARMUP, "warmup", request);
            }

            log.info("JVM warmup completed in {} ms", System.currentTimeMillis() - start);
        } catch (Exception e) {
            log.warn("JVM warmup failed: {}", e.getMessage());
        }
    }
}
