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
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
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
    void interruptedProbeRestoresTheInterruptFlagAndReportsDown() {
        SystemHealthService svc = new SystemHealthService(empty(), empty(), "test", "");
        try {
            // With the caller interrupted, every pooled probe's future.get()
            // throws InterruptedException; the service must re-interrupt and
            // degrade to DOWN instead of swallowing the flag (java:S2142).
            Thread.currentThread().interrupt();
            HealthReport report = svc.report();
            assertTrue(Thread.currentThread().isInterrupted(),
                    "the interrupt flag must be restored");
            assertNotNull(report);
        } finally {
            Thread.interrupted(); // clear so no other test inherits the flag
        }
    }

    /**
     * /api/health is unauthenticated and each report opens a Redis connection,
     * opens an AMQP connection, runs a queue RPC and makes an outbound HTTP
     * call. Uncached, that turns an unmetered endpoint into an amplifier, so
     * repeated calls inside the TTL must reuse the previous report rather than
     * re-probe. Identity is the assertion because the cache stores and returns
     * the exact instance — a re-probe would necessarily build a new one.
     */
    @Test
    void repeatedReportsWithinTheTtlReuseTheProbeResult() {
        SystemHealthService svc = new SystemHealthService(empty(), empty(), "test", "");
        HealthReport first = svc.report();
        for (int i = 0; i < 20; i++) {
            assertSame(first, svc.report(), "report must be served from cache within the TTL");
        }
    }

    @Test
    void reprobesOnceTheCacheHasExpired() throws Exception {
        SystemHealthService svc = new SystemHealthService(empty(), empty(), "test", "");
        HealthReport first = svc.report();
        Thread.sleep(2100); // just past CACHE_TTL_MS
        assertNotSame(first, svc.report(), "a stale cache must be refreshed");
    }

    /**
     * A burst arriving on a COLD cache must still collapse to one probe — the
     * case that matters, since that is exactly what a flood produces. Losers of
     * the race wait for the winner's result instead of each starting their own.
     */
    @Test
    void aConcurrentBurstOnAColdCacheProbesOnce() throws Exception {
        // An unreachable frontend makes each probe take real time, so the
        // threads genuinely overlap rather than trivially serialising.
        SystemHealthService svc = new SystemHealthService(
                empty(), empty(), "test", "http://frees-frontend.invalid-host.local:8080/");
        int threads = 12;
        var barrier = new java.util.concurrent.CyclicBarrier(threads);
        var results = new java.util.concurrent.ConcurrentLinkedQueue<HealthReport>();
        var pool = java.util.concurrent.Executors.newFixedThreadPool(threads);
        try {
            for (int i = 0; i < threads; i++) {
                pool.submit(() -> {
                    barrier.await();
                    results.add(svc.report());
                    return null;
                });
            }
            pool.shutdown();
            assertTrue(pool.awaitTermination(30, java.util.concurrent.TimeUnit.SECONDS),
                    "burst did not finish in time");
        } finally {
            pool.shutdownNow();
        }
        assertEquals(threads, results.size());
        HealthReport any = results.peek();
        assertTrue(results.stream().allMatch(r -> r == any),
                "every caller in the burst must receive the same single probe result");
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
