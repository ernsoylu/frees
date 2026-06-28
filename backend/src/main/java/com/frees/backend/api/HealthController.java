package com.frees.backend.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * {@code GET /api/health} — a topology-wide health report covering every service
 * in the deployment chart: {@code frees-api} (this node), {@code frees-redis},
 * {@code frees-rabbitmq}, {@code frees-compute} (worker replica count from the
 * task queue's live consumers), and {@code frees-frontend}. Each component
 * reports a status (UP / DEGRADED / DOWN / UNKNOWN), its replica count where
 * observable, and a short detail.
 *
 * <p>Returns 200 when the system is UP or DEGRADED and 503 when a critical
 * dependency is DOWN, so uptime monitors flag outages while the full per-service
 * breakdown stays readable in the body either way. Exempt from the API rate
 * limiter (see {@code RequestGuardFilter}) so dashboards can poll it freely.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    private final SystemHealthService health;

    public HealthController(SystemHealthService health) {
        this.health = health;
    }

    @GetMapping("/health")
    public ResponseEntity<SystemHealthService.HealthReport> health() {
        SystemHealthService.HealthReport report = health.report();
        HttpStatus code = SystemHealthService.DOWN.equals(report.status())
                ? HttpStatus.SERVICE_UNAVAILABLE
                : HttpStatus.OK;
        return ResponseEntity.status(code).body(report);
    }
}
