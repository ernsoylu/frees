package com.frees.backend.config;

import com.frees.backend.compute.ComputeTask;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * RabbitMQ wiring for the asynchronous compute architecture: a durable
 * {@code frees.tasks} queue, a Jackson message converter so {@link ComputeTask}
 * travels as JSON, a {@link RabbitTemplate} that uses it, and — under the
 * {@code compute} profile — a listener container factory with
 * {@code prefetch = 1} for fair dispatch across compute nodes.
 *
 * <p>Loaded only under the {@code api} and {@code compute} profiles. The
 * synchronous default-profile path (legacy unit tests, local dev without a
 * broker) does not instantiate any AMQP beans.
 */
@Configuration
@Profile({"api", "compute"})
public class RabbitConfig {

    public static final int PREFETCH = 1;

    @Bean
    public Queue freesTasksQueue() {
        return QueueBuilder.durable(ComputeTask.QUEUE).build();
    }

    @Bean
    public MessageConverter jacksonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         MessageConverter jacksonMessageConverter,
                                         org.springframework.beans.factory.ObjectProvider<TraceContextInjector> traceInjectorProvider) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jacksonMessageConverter);
        // Inject the W3C trace context into each published message so the
        // compute node's consumer span joins the API request's trace.
        TraceContextInjector injector = traceInjectorProvider.getIfAvailable();
        if (injector != null) {
            template.setBeforePublishPostProcessors(injector);
        }
        return template;
    }

    /**
     * The listener container factory used by {@code @RabbitListener} on the
     * compute node. Pinned to {@code prefetch = 1} so each worker pulls one
     * task at a time and RabbitMQ distributes work fairly across replicas.
     * Defined only under the {@code compute} profile: the API node never
     * consumes from the tasks queue.
     */
    @Bean(name = "rabbitListenerContainerFactory")
    @Profile("compute")
    public SimpleRabbitListenerContainerFactory computeListenerContainerFactory(
            ConnectionFactory connectionFactory,
            MessageConverter jacksonMessageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(jacksonMessageConverter);
        factory.setPrefetchCount(PREFETCH);
        return factory;
    }
}
