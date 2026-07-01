package com.frees.backend.api;

import com.frees.backend.api.SystemHealthService.ComponentHealth;
import com.frees.backend.api.SystemHealthService.HealthReport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Map;
import java.util.function.Function;

import static java.util.stream.Collectors.toMap;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SystemHealthServiceTest {

    /** An ObjectProvider that resolves to nothing — mirrors a tier whose beans
     * are absent under the current profile (default/test). */
    private static <T> ObjectProvider<T> empty() {
        return new ObjectProvider<>() {
            @Override
            public T getObject() {
                throw new NoSuchBeanDefinitionException("none");
            }

            @Override
            public T getObject(Object... args) {
                throw new NoSuchBeanDefinitionException("none");
            }

            @Override
            public T getIfAvailable() {
                return null;
            }

            @Override
            public T getIfUnique() {
                return null;
            }
        };
    }

    private Map<String, ComponentHealth> byName(HealthReport report) {
        return report.components().stream()
                .collect(toMap(ComponentHealth::name, Function.identity()));
    }

    @Test
    void reportsEveryTierWithNoDependencies() {
        SystemHealthService svc = new SystemHealthService(empty(), empty(), "test", "");
        HealthReport report = svc.report();

        assertEquals("frees-api", report.service());
        assertNotNull(report.timestamp());

        Map<String, ComponentHealth> c = byName(report);
        // Every service in the deployment chart is represented.
        assertTrue(c.keySet().containsAll(java.util.List.of(
                "frees-api", "frees-redis", "frees-rabbitmq", "frees-compute", "frees-frontend")),
                "report must cover the whole topology, got: " + c.keySet());

        // This node is always UP; absent dependencies are UNKNOWN, not DOWN.
        assertEquals(SystemHealthService.UP, c.get("frees-api").status());
        assertEquals(SystemHealthService.UNKNOWN, c.get("frees-redis").status());
        assertEquals(SystemHealthService.UNKNOWN, c.get("frees-rabbitmq").status());
        assertEquals(SystemHealthService.UNKNOWN, c.get("frees-frontend").status());

        // UNKNOWN tiers are informational, so the rollup is not DOWN.
        assertTrue(SystemHealthService.UP.equals(report.status())
                        || SystemHealthService.DEGRADED.equals(report.status()),
                "overall should not be DOWN when only-unknown deps: " + report.status());
    }

    @Test
    void frontendProbedWhenUrlConfiguredButUnreachableIsDown() {
        // An unroutable URL must resolve to DOWN within the probe budget, never hang.
        SystemHealthService svc = new SystemHealthService(
                empty(), empty(), "test", "http://frees-frontend.invalid-host.local:8080/");
        long t = System.nanoTime();
        HealthReport report = svc.report();
        long ms = (System.nanoTime() - t) / 1_000_000;

        ComponentHealth frontend = byName(report).get("frees-frontend");
        assertEquals(SystemHealthService.DOWN, frontend.status());
        assertTrue(ms < 6000, "health endpoint must stay responsive, took " + ms + " ms");
    }
}
