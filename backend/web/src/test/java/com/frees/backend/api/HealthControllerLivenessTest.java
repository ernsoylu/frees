package com.frees.backend.api;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The liveness probe returns UP with no dependency checks, so it never touches
 * the {@link SystemHealthService} — safe to use as the platform deploy gate.
 */
class HealthControllerLivenessTest {

    @Test
    void liveIsAlwaysUpAndTouchesNoDependencies() {
        // Passing a null health service proves live() does not probe dependencies.
        HealthController controller = new HealthController(null);
        Map<String, String> body = controller.live();
        assertEquals("UP", body.get("status"));
        assertEquals("frees-api", body.get("service"));
    }
}
