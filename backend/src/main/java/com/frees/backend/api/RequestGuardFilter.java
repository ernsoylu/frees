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

    private final long maxBodyBytes;
    private final int maxRequests;
    private final long windowMillis;
    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    public RequestGuardFilter(
            @Value("${frees.security.max-body-bytes:1048576}") long maxBodyBytes,
            @Value("${frees.security.rate-limit-requests:120}") int maxRequests,
            @Value("${frees.security.rate-limit-window-seconds:60}") long windowSeconds) {
        this.maxBodyBytes = maxBodyBytes;
        this.maxRequests = maxRequests;
        this.windowMillis = windowSeconds * 1000L;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!request.getRequestURI().startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }

        long length = request.getContentLengthLong();
        if (length > maxBodyBytes) {
            response.sendError(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE,
                    "Request body exceeds the " + maxBodyBytes + "-byte limit.");
            return;
        }

        if (!allow(clientIp(request))) {
            response.setStatus(429); // 429 Too Many Requests
            response.setContentType("text/plain");
            response.getWriter().write("Too many requests. Please slow down and retry shortly.");
            return;
        }

        chain.doFilter(request, response);
    }

    /** Fixed-window per-IP counter; returns false once the window's quota is
     * exhausted. Stale windows are swept when the map grows large. */
    private boolean allow(String ip) {
        long now = System.currentTimeMillis();
        if (counters.size() > MAX_TRACKED_IPS) {
            counters.entrySet().removeIf(e -> now - e.getValue().windowStart > windowMillis * 2);
        }
        Counter counter = counters.computeIfAbsent(ip, k -> new Counter(now));
        synchronized (counter) {
            if (now - counter.windowStart >= windowMillis) {
                counter.windowStart = now;
                counter.count = 0;
            }
            counter.count++;
            return counter.count <= maxRequests;
        }
    }

    /** Resolves the client IP, trusting the proxy's forwarded headers (set by
     * nginx) and falling back to the socket address for direct connections. */
    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            int comma = forwarded.indexOf(',');
            return (comma > 0 ? forwarded.substring(0, comma) : forwarded).trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
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
