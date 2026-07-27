package com.frees.backend.api;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;

/**
 * {@code GET /api/health} — a topology-wide health report covering every service
 * in the deployment chart: {@code frees-api} (this node), {@code frees-redis},
 * {@code frees-rabbitmq}, {@code frees-compute} (worker replica count from the
 * task queue's live consumers), and {@code frees-frontend}. Each component
 * reports a status (UP / DEGRADED / DOWN / UNKNOWN), its replica count where
 * observable, and a short detail.
 *
 * <p>Returns 200 when the system is UP or DEGRADED and 503 when a critical
 * dependency is DOWN, so uptime monitors flag outages while the overall status
 * is readable either way. It carries its own generous rate limit rather than
 * the general one (see {@code RequestGuardFilter}) and the report is cached
 * briefly ({@code SystemHealthService}), so dashboards can poll freely without
 * the endpoint becoming a way to drive unmetered Redis/broker/HTTP fan-out.
 * {@code /api/health/live} is the fully exempt liveness probe.
 *
 * <p><b>Topology-detail gating.</b> The per-service breakdown (service names,
 * roles, replica counts, queue depth, dependency latency) is reconnaissance-
 * grade information, so it is only included for callers that present the
 * configured {@code X-Health-Token}. Everyone else gets the overall status and
 * the correct 200/503 code — enough for an uptime monitor — with an empty
 * component list. When no token is configured (e.g. local dev) the full detail
 * is returned unguarded, preserving the prior behaviour.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    /** Header a monitoring caller sends to receive the full per-service breakdown. */
    static final String HEALTH_TOKEN_HEADER = "X-Health-Token";

    private final SystemHealthService health;
    private final String detailToken;

    public HealthController(
            SystemHealthService health,
            @Value("${frees.security.health-detail-token:}") String detailToken) {
        this.health = health;
        this.detailToken = detailToken == null ? "" : detailToken.trim();
    }

    @GetMapping("/health")
    public ResponseEntity<SystemHealthService.HealthReport> health(HttpServletRequest request) {
        SystemHealthService.HealthReport report = health.report();
        HttpStatus code = SystemHealthService.DOWN.equals(report.status())
                ? HttpStatus.SERVICE_UNAVAILABLE
                : HttpStatus.OK;
        // The overall status (and its 200/503 code) is always public; the
        // per-service topology is redacted unless the caller is authorized.
        return ResponseEntity.status(code).body(detailAllowed(request) ? report : redact(report));
    }

    /** True when topology detail may be disclosed: either no token is configured
     *  (unguarded, for local/dev use) or the request presents the matching token.
     *
     *  <p>Compared with {@link MessageDigest#isEqual} rather than
     *  {@link String#equals}, which returns as soon as two bytes differ and so
     *  leaks how much of a guess was correct. Remote timing analysis over HTTP
     *  is not a practical way to recover a 64-hex token, but a constant-time
     *  comparison costs nothing and removes the question. */
    private boolean detailAllowed(HttpServletRequest request) {
        if (detailToken.isEmpty()) {
            return true;
        }
        String presented = request.getHeader(HEALTH_TOKEN_HEADER);
        if (presented == null) {
            return false;
        }
        return MessageDigest.isEqual(
                detailToken.getBytes(StandardCharsets.UTF_8),
                presented.trim().getBytes(StandardCharsets.UTF_8));
    }

    /** Strips the per-service breakdown, keeping only the overall status. */
    private static SystemHealthService.HealthReport redact(SystemHealthService.HealthReport report) {
        return new SystemHealthService.HealthReport(
                report.status(), report.service(), report.timestamp(), List.of());
    }

    /**
     * Liveness probe — always 200 if this JVM can serve a request, with NO
     * dependency checks. Use this as the platform deploy/liveness healthcheck so a
     * rollout (or auto-restart) is never gated on Redis/RabbitMQ being up; use
     * {@code /api/health} (which 503s on a critical dependency) for monitoring and
     * alerting instead.
     */
    @GetMapping("/health/live")
    public Map<String, String> live() {
        return Map.of("status", "UP", "service", "frees-api");
    }
}
