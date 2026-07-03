package com.frees.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frees.backend.api.CyclePathResolver;
import com.frees.backend.api.SidecarMeasurementParser;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.measurement.FallbackMeasurementParser;
import com.frees.backend.measurement.MeasurementParser;
import com.frees.backend.measurement.Mf4Parser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the plain-Java frees-core classes as Spring beans.
 *
 * <p>{@link EquationSystemSolver} and {@link CyclePathResolver} live in the
 * core module so they're reusable by a non-Spring consumer (e.g. a future
 * desktop client) without pulling in Spring itself; this is the one place the
 * web module bridges them into the application context for constructor
 * injection into the REST controllers.
 */
@Configuration
public class CoreBeansConfig {

    @Bean
    public EquationSystemSolver equationSystemSolver() {
        return new EquationSystemSolver();
    }

    @Bean
    public CyclePathResolver cyclePathResolver() {
        return new CyclePathResolver();
    }

    /**
     * The MeasurementParser seam is where the MF4 fallback ladder lives:
     * in-process mdf4j handles uncompressed files; when a sidecar URL is
     * configured, DZ-compressed OEM files fall through to the asammdf
     * sidecar (todo.md decision 4). Empty URL = mdf4j only.
     */
    @Bean
    public MeasurementParser measurementParser(
            @Value("${frees.measurements.sidecar-url:}") String sidecarUrl,
            ObjectMapper objectMapper) {
        Mf4Parser primary = new Mf4Parser();
        if (sidecarUrl == null || sidecarUrl.isBlank()) {
            return primary;
        }
        return new FallbackMeasurementParser(
                primary, new SidecarMeasurementParser(sidecarUrl, objectMapper));
    }
}
