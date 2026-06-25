package com.frees.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides a Jackson 2 {@link ObjectMapper} bean for the application's internal
 * serialization paths (job state and sessions to Redis, compute tasks over
 * RabbitMQ — see {@code JobStore}, {@code SolveContextCache},
 * {@code ComputeDispatcher}, {@code ComputeTaskListener}).
 *
 * <p>Spring Boot 4 makes Jackson 3 ({@code tools.jackson}) the default JSON
 * mapper and auto-configures only a {@code tools.jackson.databind.ObjectMapper}
 * for the HTTP layer; it no longer registers a Jackson 2
 * {@code com.fasterxml.jackson.databind.ObjectMapper} bean. The above components
 * inject the Jackson 2 mapper, so we declare it here to keep their on-the-wire
 * format byte-identical to the pre-upgrade behavior. The {@code jackson-annotations}
 * package is shared between Jackson 2 and 3, so DTO annotations (e.g. @JsonIgnore)
 * behave the same on both mappers.
 *
 * <p>{@code findAndAddModules()} mirrors Boot's old default by registering every
 * Jackson 2 module on the classpath (jsr310, parameter-names, jdk8) via the
 * service loader. This bean is distinct in type from the auto-configured Jackson 3
 * mapper, so it does not interfere with HTTP message conversion.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
                .findAndAddModules()
                .build();
    }
}
