package com.frees.backend.api;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The liveness probe returns UP with no dependency checks, so it never touches
 * the {@link SystemHealthService} — safe to use as the platform deploy gate.
 * The other tests pin the topology-detail gating on {@code /api/health}.
 */
class HealthControllerLivenessTest {

    @Test
    void liveIsAlwaysUpAndTouchesNoDependencies() {
        // Passing a null health service proves live() does not probe dependencies.
        HealthController controller = new HealthController(null, "");
        Map<String, String> body = controller.live();
        assertEquals("UP", body.get("status"));
        assertEquals("frees-api", body.get("service"));
    }

    private static SystemHealthService.HealthReport sampleReport() {
        return new SystemHealthService.HealthReport("UP", "frees-api", "t", List.of(
                new SystemHealthService.ComponentHealth("frees-redis", "cache", "UP", 1, "PONG")));
    }

    private static SystemHealthService stubHealth() {
        SystemHealthService svc = mock(SystemHealthService.class);
        when(svc.report()).thenReturn(sampleReport());
        return svc;
    }

    @Test
    void unconfiguredTokenLeavesDetailUnguarded() {
        // No token configured (local/dev): full topology is returned to anyone.
        HealthController controller = new HealthController(stubHealth(), "");
        ResponseEntity<SystemHealthService.HealthReport> res = controller.health(mock(HttpServletRequest.class));
        assertEquals(HttpStatus.OK, res.getStatusCode());
        assertEquals(1, res.getBody().components().size());
    }

    @Test
    void configuredTokenRedactsTopologyWhenHeaderMissingOrWrong() {
        HealthController controller = new HealthController(stubHealth(), "s3cret");
        HttpServletRequest noHeader = mock(HttpServletRequest.class);
        HttpServletRequest wrongHeader = mock(HttpServletRequest.class);
        when(wrongHeader.getHeader(HealthController.HEALTH_TOKEN_HEADER)).thenReturn("nope");

        for (HttpServletRequest req : List.of(noHeader, wrongHeader)) {
            ResponseEntity<SystemHealthService.HealthReport> res = controller.health(req);
            assertEquals(HttpStatus.OK, res.getStatusCode());              // status still public
            assertEquals("UP", res.getBody().status());
            assertTrue(res.getBody().components().isEmpty());              // topology redacted
        }
    }

    @Test
    void configuredTokenDisclosesTopologyWithMatchingHeader() {
        HealthController controller = new HealthController(stubHealth(), "s3cret");
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader(HealthController.HEALTH_TOKEN_HEADER)).thenReturn("s3cret");
        ResponseEntity<SystemHealthService.HealthReport> res = controller.health(req);
        assertEquals(1, res.getBody().components().size());
    }
}
