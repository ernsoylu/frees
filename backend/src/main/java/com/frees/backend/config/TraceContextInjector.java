package com.frees.backend.config;

import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.propagation.TextMapPropagator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Producer-side OpenTelemetry propagation for the asynchronous compute
 * pipeline. Injects the W3C {@code traceparent} (and {@code tracestate})
 * header into each {@link ComputeTask} message before it is published, so the
 * compute node's consumer span is a child of the API node's request span and
 * the two join into one distributed trace in Jaeger.
 *
 * <p>Active only under the {@code api} profile (the producer side). The
 * {@code opentelemetry-spring-boot-starter} auto-instruments HTTP and Redis but
 * does not ship a Spring-AMQP module, so RabbitMQ propagation is wired by hand
 * here and mirrored by the extractor in {@link com.frees.backend.compute.ComputeTaskListener}.
 *
 * <p>If no {@link OpenTelemetry} instance is available (e.g. the SDK failed to
 * initialise), the injector is a no-op so the pipeline still works untraced.
 */
@Component
@Profile("api")
public class TraceContextInjector implements MessagePostProcessor {

    private static final Logger log = LoggerFactory.getLogger(TraceContextInjector.class);

    private final OpenTelemetry openTelemetry;

    public TraceContextInjector(ObjectProvider<OpenTelemetry> openTelemetryProvider) {
        this.openTelemetry = openTelemetryProvider.getIfAvailable();
    }

    @Override
    public Message postProcessMessage(Message message) {
        if (openTelemetry == null) {
            return message;
        }
        try {
            TextMapPropagator propagator = openTelemetry.getPropagators()
                    .getTextMapPropagator();
            Context current = Context.current();
            propagator.inject(current, message.getMessageProperties(),
                    (carrier, key, value) -> carrier.setHeader(key, value));
        } catch (RuntimeException e) {
            // Tracing must never break the functional path.
            log.debug("Failed to inject trace context into compute task message", e);
        }
        return message;
    }
}
