package com.frees.backend.api;

import com.frees.backend.compute.ComputeTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.core.QueueInformation;
import org.springframework.amqp.rabbit.connection.Connection;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Probes every service in the deployment topology so {@code GET /api/health}
 * can report the whole chart — {@code frees-api} (this node), {@code frees-redis},
 * {@code frees-rabbitmq}, {@code frees-compute} (worker replica count via the
 * task queue's live consumers), and {@code frees-frontend} — with each
 * component's status, replica count, and a short detail.
 *
 * <p>Every probe runs on a bounded-timeout worker thread so a hung dependency
 * (e.g. an unreachable Redis with a 60 s Lettuce connect timeout) can never
 * stall the health endpoint itself — the whole point of a health check is to
 * stay responsive while something downstream is broken.
 */
@Service
public class SystemHealthService {

    private static final Logger log = LoggerFactory.getLogger(SystemHealthService.class);

    /** Status values, ordered by severity for the rollup. */
    public static final String UP = "UP";
    public static final String DEGRADED = "DEGRADED";
    public static final String DOWN = "DOWN";
    public static final String UNKNOWN = "UNKNOWN";

    /** Per-probe wall-clock budget; the endpoint never blocks longer than this. */
    private static final long PROBE_TIMEOUT_MS = 2500;

    public record ComponentHealth(String name, String role, String status,
                                  Integer replicas, String detail) {}

    public record HealthReport(String status, String service, String timestamp,
                               List<ComponentHealth> components) {}

    private final ObjectProvider<RedisConnectionFactory> redisFactory;
    private final ObjectProvider<RabbitAdmin> rabbitAdmin;
    private final String activeProfiles;
    private final String frontendUrl;

    private final ExecutorService probePool = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "health-probe");
        t.setDaemon(true);
        return t;
    });

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(PROBE_TIMEOUT_MS))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public SystemHealthService(
            ObjectProvider<RedisConnectionFactory> redisFactory,
            ObjectProvider<RabbitAdmin> rabbitAdmin,
            @Value("${spring.profiles.active:default}") String activeProfiles,
            @Value("${frees.health.frontend-url:}") String frontendUrl) {
        this.redisFactory = redisFactory;
        this.rabbitAdmin = rabbitAdmin;
        this.activeProfiles = activeProfiles;
        this.frontendUrl = frontendUrl == null ? "" : frontendUrl.trim();
    }

    /** Probe every component and roll up an overall status. */
    public HealthReport report() {
        List<ComponentHealth> components = new ArrayList<>();
        components.add(probeApi());
        components.add(timed("frees-redis", "cache", this::probeRedis));
        components.add(timed("frees-rabbitmq", "broker", this::probeRabbit));
        components.add(timed("frees-compute", "worker", this::probeCompute));
        components.add(timed("frees-frontend", "web", this::probeFrontend));

        String overall = rollup(components);
        return new HealthReport(overall, "frees-api", Instant.now().toString(), components);
    }

    /**
     * Overall status: any critical dependency (cache/broker) DOWN drags the
     * system to DOWN; a degraded worker or web tier yields DEGRADED; otherwise
     * UP. UNKNOWN components (a tier not reachable from this profile) are
     * informational and never fail the rollup.
     */
    private String rollup(List<ComponentHealth> components) {
        String worst = UP;
        for (ComponentHealth c : components) {
            boolean critical = "cache".equals(c.role()) || "broker".equals(c.role());
            if (DOWN.equals(c.status())) {
                worst = critical ? DOWN : worse(worst, DEGRADED);
            } else if (DEGRADED.equals(c.status())) {
                worst = worse(worst, DEGRADED);
            }
            if (DOWN.equals(worst)) {
                return DOWN;
            }
        }
        return worst;
    }

    private String worse(String a, String b) {
        if (DOWN.equals(a) || DOWN.equals(b)) {
            return DOWN;
        }
        if (DEGRADED.equals(a) || DEGRADED.equals(b)) {
            return DEGRADED;
        }
        return UP;
    }

    private ComponentHealth probeApi() {
        return new ComponentHealth("frees-api", "api", UP, 1,
                "this instance responding (profiles=" + activeProfiles + ")");
    }

    private ComponentHealth probeRedis() {
        RedisConnectionFactory factory = redisFactory.getIfAvailable();
        if (factory == null) {
            return new ComponentHealth("frees-redis", "cache", UNKNOWN, null,
                    "no Redis configured under profiles=" + activeProfiles);
        }
        long t = System.nanoTime();
        try (RedisConnection conn = factory.getConnection()) {
            String pong = conn.ping();
            long ms = (System.nanoTime() - t) / 1_000_000;
            return new ComponentHealth("frees-redis", "cache", UP, 1,
                    "PING -> " + pong + " (" + ms + " ms)");
        } catch (Exception e) {
            return new ComponentHealth("frees-redis", "cache", DOWN, 0, cause(e));
        }
    }

    private ComponentHealth probeRabbit() {
        RabbitAdmin admin = rabbitAdmin.getIfAvailable();
        if (admin == null) {
            return new ComponentHealth("frees-rabbitmq", "broker", UNKNOWN, null,
                    "no broker configured under profiles=" + activeProfiles);
        }
        long t = System.nanoTime();
        try (Connection conn = admin.getRabbitTemplate().getConnectionFactory().createConnection()) {
            boolean open = conn.isOpen();
            long ms = (System.nanoTime() - t) / 1_000_000;
            if (open) {
                return new ComponentHealth("frees-rabbitmq", "broker", UP, 1,
                        "connection open (" + ms + " ms)");
            }
            return new ComponentHealth("frees-rabbitmq", "broker", DOWN, 0,
                    "connection not open");
        } catch (Exception e) {
            return new ComponentHealth("frees-rabbitmq", "broker", DOWN, 0, cause(e));
        }
    }

    /**
     * Compute health is read from the task queue's live consumer count: at
     * {@code prefetch = 1} each compute replica registers exactly one consumer,
     * so the consumer count is the number of healthy workers actually attached
     * and pulling work. A non-zero backlog with zero consumers is the classic
     * "jobs pile up forever" outage.
     */
    private ComponentHealth probeCompute() {
        RabbitAdmin admin = rabbitAdmin.getIfAvailable();
        if (admin == null) {
            return new ComponentHealth("frees-compute", "worker", UNKNOWN, null,
                    "broker unavailable; cannot read worker consumers");
        }
        try {
            QueueInformation info = admin.getQueueInfo(ComputeTask.QUEUE);
            if (info == null) {
                return new ComponentHealth("frees-compute", "worker", UNKNOWN, null,
                        "queue '" + ComputeTask.QUEUE + "' not declared yet");
            }
            int consumers = (int) info.getConsumerCount();
            long backlog = info.getMessageCount();
            String detail = consumers + " consumer(s) on '" + ComputeTask.QUEUE
                    + "', " + backlog + " job(s) queued";
            String status = consumers >= 1 ? UP : DOWN;
            if (consumers == 0) {
                detail = "NO compute workers consuming '" + ComputeTask.QUEUE
                        + "' (" + backlog + " job(s) queued)";
            }
            return new ComponentHealth("frees-compute", "worker", status, consumers, detail);
        } catch (Exception e) {
            return new ComponentHealth("frees-compute", "worker", DOWN, 0, cause(e));
        }
    }

    private ComponentHealth probeFrontend() {
        if (frontendUrl.isEmpty()) {
            return new ComponentHealth("frees-frontend", "web", UNKNOWN, null,
                    "frontend URL not configured (set FRONTEND_HEALTH_URL)");
        }
        long t = System.nanoTime();
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(frontendUrl))
                    .timeout(Duration.ofMillis(PROBE_TIMEOUT_MS))
                    .method("HEAD", HttpRequest.BodyPublishers.noBody())
                    .build();
            HttpResponse<Void> resp = httpClient.send(req, HttpResponse.BodyHandlers.discarding());
            long ms = (System.nanoTime() - t) / 1_000_000;
            int code = resp.statusCode();
            if (code >= 200 && code < 400) {
                return new ComponentHealth("frees-frontend", "web", UP, 1,
                        "HTTP " + code + " (" + ms + " ms)");
            }
            return new ComponentHealth("frees-frontend", "web", DOWN, 0,
                    "HTTP " + code + " from " + frontendUrl);
        } catch (Exception e) {
            return new ComponentHealth("frees-frontend", "web", DOWN, 0, cause(e));
        }
    }

    /** Run a probe on the bounded-timeout pool so a hung dependency can't stall the endpoint. */
    private ComponentHealth timed(String name, String role, Callable<ComponentHealth> probe) {
        Future<ComponentHealth> future = probePool.submit(probe);
        try {
            return future.get(PROBE_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            return new ComponentHealth(name, role, DOWN, 0,
                    "probe timed out after " + PROBE_TIMEOUT_MS + " ms (unreachable?)");
        } catch (Exception e) {
            log.warn("Health probe for {} failed", name, e);
            return new ComponentHealth(name, role, DOWN, 0, cause(e));
        }
    }

    private static String cause(Throwable e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String msg = root.getMessage();
        return root.getClass().getSimpleName() + (msg != null ? ": " + msg : "");
    }
}
