package com.frees.backend.config;

import com.frees.backend.api.CyclePathResolver;
import com.frees.backend.core.EquationSystemSolver;
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
}
