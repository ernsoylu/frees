package com.frees.backend.api;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;

/**
 * Defense-in-depth guard on the /api endpoints against application-layer
 * denial-of-service: it rejects oversized request bodies (HTTP 413) and
 * throttles requests per client IP (HTTP 429).
 *
 * <p>nginx applies the same limits for traffic that reaches the backend
 * through the frontend proxy, but the backend port can also be hit directly,
 * so the limits are enforced here too. Limits are configurable via
 * {@code frees.security.*} properties.
 */
@Component
public class RequestGuardFilter extends OncePerRequestFilter {

    /** Cap on tracked client IPs so the rate-limit map cannot itself be grown
     * without bound (which would be a memory-exhaustion vector). */
    private static final int MAX_TRACKED_IPS = 50_000;

    /**
     * Routes that parse and expand the document SYNCHRONOUSLY on the request
     * thread — {@code /api/check} outright, and {@code /api/solve} +
     * {@code /api/solve/table} via their pre-dispatch syntax validation. Peak
     * heap on the API node is (concurrent parses) x (per-parse cost), so
     * bounding concurrency is what actually bounds memory; the per-request cost
     * itself is bounded by the parser's equation budget.
     */
    private static final String[] PARSE_HEAVY_ROUTES = {"/api/check", "/api/solve"};

    private final long maxBodyBytes;
    private final long maxUploadBytes;
    private final int maxRequests;
    private final long windowMillis;
    private final int maxReplRequests;
    private final long replWindowMillis;
    private final Map<String, Counter> counters = new ConcurrentHashMap<>();
    private final Semaphore parseSlots;

    public RequestGuardFilter(
            @Value("${frees.security.max-body-bytes:1048576}") long maxBodyBytes,
            @Value("${frees.security.max-upload-bytes:209715200}") long maxUploadBytes,
            @Value("${frees.security.rate-limit-requests:120}") int maxRequests,
            @Value("${frees.security.rate-limit-window-seconds:60}") long windowSeconds,
            @Value("${frees.security.rate-limit-repl-requests:15}") int maxReplRequests,
            @Value("${frees.security.rate-limit-repl-window-seconds:60}") long replWindowSeconds,
            @Value("${frees.security.max-concurrent-parses:8}") int maxConcurrentParses) {
        this.maxBodyBytes = maxBodyBytes;
        this.maxUploadBytes = maxUploadBytes;
        this.maxRequests = maxRequests;
        this.windowMillis = windowSeconds * 1000L;
        this.maxReplRequests = maxReplRequests;
        this.replWindowMillis = replWindowSeconds * 1000L;
        this.parseSlots = new Semaphore(Math.max(1, maxConcurrentParses));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!request.getRequestURI().startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        // The health endpoints (/api/health and /api/health/live) are exempt from
        // the body-size and rate limits so monitoring dashboards and the platform
        // deploy/liveness probe can poll them freely without being throttled.
        if (request.getRequestURI().startsWith("/api/health")) {
            chain.doFilter(request, response);
            return;
        }

        // Measurement uploads (Data Analyzer) get a dedicated, much larger cap
        // — ONLY on /api/measurements*; every other route keeps the 1 MB cap.
        // Content-Length alone is spoofable, so MeasurementStore additionally
        // counts the streamed bytes and aborts over-cap uploads mid-stream.
        long routeCap = request.getRequestURI().startsWith("/api/measurements")
                ? maxUploadBytes
                : maxBodyBytes;
        long length = request.getContentLengthLong();
        if (length > routeCap) {
            response.sendError(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                    "Request body exceeds the " + routeCap + "-byte limit.");
            return;
        }

        String ip = clientIp(request);
        String uri = request.getRequestURI();

        // Stricter rate limiting specifically for REPL CAS/solve evaluations
        if ("/api/repl/evaluate".equals(uri)) {
            if (!allow(ip + ":repl", maxReplRequests, replWindowMillis)) {
                response.setStatus(429); // 429 Too Many Requests
                response.setContentType("text/plain");
                response.getWriter().write("Too many REPL requests. Please slow down and retry shortly.");
                return;
            }
        }

        // General rate limit for all API requests
        if (!allow(ip, maxRequests, windowMillis)) {
            response.setStatus(429); // 429 Too Many Requests
            response.setContentType("text/plain");
            response.getWriter().write("Too many requests. Please slow down and retry shortly.");
            return;
        }

        if (isParseHeavy(uri)) {
            if (!parseSlots.tryAcquire()) {
                // Shed rather than queue: admitting these unbounded is what lets
                // concurrent large documents stack their peak heap and OOM the node.
                response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
                response.setContentType("text/plain");
                response.setHeader("Retry-After", "2");
                response.getWriter().write(
                        "The server is busy checking other documents. Please retry in a moment.");
                return;
            }
            try {
                chain.doFilter(request, response);
            } finally {
                parseSlots.release();
            }
            return;
        }

        chain.doFilter(request, response);
    }

    private static boolean isParseHeavy(String uri) {
        for (String route : PARSE_HEAVY_ROUTES) {
            if (uri.startsWith(route)) {
                return true;
            }
        }
        return false;
    }

    /** Fixed-window per-IP counter; returns false once the window's quota is
     * exhausted. Stale windows are swept when the map grows large. */
    private boolean allow(String key, int limit, long window) {
        long now = System.currentTimeMillis();
        if (counters.size() > MAX_TRACKED_IPS) {
            counters.entrySet().removeIf(e -> now - e.getValue().windowStart > window * 2);
        }
        Counter counter = counters.computeIfAbsent(key, k -> new Counter(now));
        synchronized (counter) {
            if (now - counter.windowStart >= window) {
                counter.windowStart = now;
                counter.count = 0;
            }
            counter.count++;
            return counter.count <= limit;
        }
    }

    /**
     * Resolves the client IP for rate-limit accounting.
     *
     * <p><b>Only the right-hand end of the forwarded chain is trustworthy.</b>
     * {@code X-Forwarded-For} is append-only: nginx forwards it as
     * {@code $proxy_add_x_forwarded_for}, which expands to
     * "&lt;whatever the client sent&gt;, &lt;the peer nginx saw&gt;". Reading the
     * FIRST element therefore reads a value the client chose — so a caller
     * sending a fresh {@code X-Forwarded-For} per request got a fresh counter
     * per request and the rate limits (both the general one and the stricter
     * REPL one) did nothing at all.
     *
     * <p>{@code X-Real-IP} is preferred because nginx sets it with
     * {@code proxy_set_header X-Real-IP $remote_addr}, which REPLACES any
     * client-supplied value rather than appending to it, and because nginx's
     * {@code real_ip} module (see nginx.conf.template) has by then already
     * resolved {@code $remote_addr} to the true client through any upstream
     * edge proxy — Railway's router, a Pangolin/Traefik tunnel. The last
     * {@code X-Forwarded-For} element is the fallback for a proxy that sets
     * only that; it is the address our immediate peer observed, which is
     * likewise not client-settable. A direct connection (no proxy headers at
     * all) falls back to the socket address.
     *
     * <p>These headers are only trustworthy because every deployment reaches
     * the backend through the frontend's nginx. On a local dev box the API port
     * is bound to loopback, so the only caller able to forge them is the user
     * themselves.
     */
    private static String clientIp(HttpServletRequest request) {
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int lastComma = forwarded.lastIndexOf(',');
            String last = lastComma >= 0 ? forwarded.substring(lastComma + 1) : forwarded;
            if (!last.isBlank()) {
                return last.trim();
            }
        }
        return request.getRemoteAddr();
    }

    private static final class Counter {
        long windowStart;
        int count;

        Counter(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}
