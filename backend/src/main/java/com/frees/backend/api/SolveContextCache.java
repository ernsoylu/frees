package com.frees.backend.api;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonAutoDetect;
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.units.UnitRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.time.Duration;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Store of the most recent successful solve, keyed by a client-supplied
 * session id (one per open document/tab). The REPL reads from here so it can
 * evaluate expressions against the solved workspace without re-solving the
 * whole document on every keystroke.
 *
 * <p>Each {@link Session} holds an immutable solve snapshot plus a small mutable
 * overlay of variables the user defined directly in the REPL (e.g. {@code A = 5}).
 *
 * <h2>Redis mirroring (asynchronous compute architecture)</h2>
 * Under the {@code api} and {@code compute} Spring profiles the in-memory store
 * is mirrored to Redis under {@code session:<sessionId>}: the compute node
 * persists a solved snapshot there, and an api node that has never seen the
 * session in memory hydrates it from Redis so its REPL can evaluate against the
 * compute node's result. The in-memory store remains primary within a JVM
 * (preserving the within-request sharing the REPL relies on); Redis is the
 * cross-JVM durability layer.
 *
 * <p>The REPL overlay (variables defined at the terminal) is api-node-local:
 * it is captured in Redis at solve time but mid-session overlay mutations are
 * not written back. This is sufficient for the single-api-node deployment and
 * the documented multi-node follow-up; the snapshot — the part that must cross
 * from compute to api — is fully durable.
 *
 * <p>On the default profile (local dev, unit tests) there is no Redis usage at
 * all: the cache is purely in-memory and self-evicting (TTL + session cap).
 */
@Component
public class SolveContextCache {

    private static final Logger log = LoggerFactory.getLogger(SolveContextCache.class);

    /** Fallback key for clients that don't send a session id (e.g. local single-user use). */
    public static final String DEFAULT_SESSION = "default";

    private static final long TTL_MILLIS = 60L * 60L * 1000L; // 1 hour
    private static final int MAX_SESSIONS = 256;
    private static final String REDIS_KEY_PREFIX = "session:";
    private static final long REDIS_TTL_SECONDS = 60L * 60L; // 1 hour

    private final Map<String, Session> store = new ConcurrentHashMap<>();
    private final Environment environment;
    /** StringRedisTemplate is always auto-configured when Redis is on the
     *  classpath; used with JSON serialization (like {@code JobStore}) to
     *  avoid generic-type injection issues. {@code null} on the default profile. */
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Autowired
    public SolveContextCache(@Autowired(required = false) StringRedisTemplate redisTemplate,
                             @Autowired(required = false) ObjectMapper objectMapper,
                             Environment environment) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    /** No-arg constructor for unit tests: in-memory only, Redis disabled. */
    public SolveContextCache() {
        this(null, null, null);
    }

    /** True when the async profiles are active and Redis is wired. */
    private boolean redisActive() {
        return environment != null
                && environment.acceptsProfiles(Profiles.of("api | compute"))
                && redisTemplate != null
                && objectMapper != null;
    }

    private static String redisKey(String sessionId) {
        return REDIS_KEY_PREFIX + key(sessionId);
    }

    /** Loads a session snapshot from Redis, or {@code null} if absent/unreadable. */
    private Session loadFromRedis(String sessionId) {
        if (!redisActive()) {
            return null;
        }
        try {
            String json = redisTemplate.opsForValue().get(redisKey(sessionId));
            if (json == null) {
                return null;
            }
            return objectMapper.readValue(json, Session.class);
        } catch (RuntimeException e) {
            log.warn("Failed to load session {} from Redis", sessionId, e);
            return null;
        } catch (Exception e) {
            log.warn("Failed to deserialize session {} from Redis", sessionId, e);
            return null;
        }
    }

    /** Mirrors the current snapshot of {@code session} to Redis (best-effort). */
    private void mirrorToRedis(String sessionId, Session session) {
        if (!redisActive()) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(session);
            redisTemplate.opsForValue().set(redisKey(sessionId), json,
                    Duration.ofSeconds(REDIS_TTL_SECONDS));
        } catch (Exception e) {
            log.warn("Failed to mirror session {} to Redis", sessionId, e);
        }
    }

    /** One workspace variable as the user sees it: display value, unit, uncertainty. */
    public record ReplVar(double value, String unit, Double uncertainty) implements Serializable {}

    /** Mutable per-document state: the last solve snapshot plus REPL-defined vars. */
    @JsonAutoDetect(fieldVisibility = Visibility.ANY, getterVisibility = Visibility.NONE)
    public static final class Session implements Serializable {
        private static final long serialVersionUID = 1L;
        // --- solve snapshot (replaced wholesale on each solve) ---
        private volatile Map<String, Double> siValues = Map.of();      // lowercased name -> SI value
        private volatile Map<String, ReplVar> displayVars = Map.of();  // lowercased name -> display tuple
        private volatile List<String> names = List.of();               // display spellings
        /** FUNCTION/TABLE defs in scope. Excluded from the Redis JSON
         *  snapshot (Jackson cannot deserialize the sealed {@link ProcDef}
         *  interface without type info); the REPL can still evaluate solved
         *  variables and expressions — calling FUNCTION/TABLE blocks from the
         *  REPL in async mode is a documented follow-up. */
        @JsonIgnore
        private volatile Map<String, ProcDef> defs = Map.of();
        private volatile UnitRegistry.UnitSystem system = UnitRegistry.UnitSystem.SI;
        // --- REPL-defined overlay (survives across REPL calls, reset on solve).
        //     Api-node-local: excluded from the Redis snapshot.
        @JsonIgnore
        private final Map<String, Double> overlaySi = new ConcurrentHashMap<>();
        @JsonIgnore
        private final Map<String, ReplVar> overlayDisplay = new ConcurrentHashMap<>();
        private volatile long timestampMillis = System.currentTimeMillis();

        public Map<String, ProcDef> defs() { return defs; }
        public UnitRegistry.UnitSystem system() { return system; }

        /** Sets the preferred display unit system. Applied on every REPL
         *  evaluate so the terminal reflects the live preference even before a
         *  re-solve (the solve snapshot otherwise pins a possibly-stale system). */
        public void setSystem(UnitRegistry.UnitSystem system) {
            this.system = system != null ? system : UnitRegistry.UnitSystem.SI;
        }

        /** SI values visible to expression math: solve snapshot with REPL overlay on top. */
        public Map<String, Double> siValues() {
            if (overlaySi.isEmpty()) return siValues;
            Map<String, Double> merged = new HashMap<>(siValues);
            merged.putAll(overlaySi);
            return merged;
        }

        /** Display tuple for a bare-variable echo (REPL overlay shadows the solve). */
        public ReplVar displayOf(String lowerName) {
            ReplVar v = overlayDisplay.get(lowerName);
            return v != null ? v : displayVars.get(lowerName);
        }

        /** Unit string for dimension lookups; null when the variable is unknown. */
        public String unitOf(String lowerName) {
            ReplVar v = displayOf(lowerName);
            return v != null ? v.unit() : null;
        }

        /** Variable names for tab-completion: solve snapshot names plus REPL-defined ones. */
        public List<String> completionNames() {
            if (overlayDisplay.isEmpty()) return names;
            LinkedHashSet<String> all = new LinkedHashSet<>(names);
            all.addAll(overlayDisplay.keySet());
            return List.copyOf(all);
        }

        /** Records a REPL-defined variable (from {@code name = expr}). */
        public void define(String lowerName, double si, ReplVar display) {
            overlaySi.put(lowerName, si);
            overlayDisplay.put(lowerName, display);
        }

        /** Drops all REPL-defined variables (the `clear` command). */
        public void clearOverlay() {
            overlaySi.clear();
            overlayDisplay.clear();
        }

        /** Drops a specific REPL-defined variable. */
        public void clearVariable(String lowerName) {
            overlaySi.remove(lowerName);
            overlayDisplay.remove(lowerName);
            String prefix = lowerName + "[";
            overlaySi.keySet().removeIf(k -> k.startsWith(prefix));
            overlayDisplay.keySet().removeIf(k -> k.startsWith(prefix));
        }

        /** True once anything is available to evaluate against (solve, defs, or REPL vars). */
        public boolean isPopulated() {
            return !siValues.isEmpty() || !defs.isEmpty() || !overlaySi.isEmpty();
        }
    }

    /** The session for {@code sessionId}, creating an empty one if absent. */
    public Session session(String sessionId) {
        evict();
        String k = key(sessionId);
        Session s = store.get(k);
        if (s == null) {
            // Cross-JVM hydration: a compute node may have solved this session;
            // pull the snapshot from Redis so this JVM's REPL can see it.
            s = loadFromRedis(sessionId);
            if (s == null) {
                s = new Session();
            }
            store.put(k, s);
        }
        return s;
    }

    /** The session for {@code sessionId}, or {@code null} if absent/expired. */
    public Session peek(String sessionId) {
        String k = key(sessionId);
        Session s = store.get(k);
        if (s == null) {
            s = loadFromRedis(sessionId);
            if (s != null) {
                store.put(k, s);
            }
        }
        if (s == null) return null;
        if (isExpired(s)) { store.remove(k); return null; }
        return s;
    }

    /** Replaces the solve snapshot for {@code sessionId}. The REPL overlay is kept
     *  (REPL-defined/overridden variables persist across solves so the terminal
     *  keeps priority over the editor); it is dropped only by the `clear` command. */
    public void put(String sessionId,
                    Map<String, Double> siValues,
                    Map<String, ReplVar> displayVars,
                    List<String> names,
                    Map<String, ProcDef> defs,
                    UnitRegistry.UnitSystem system) {
        Session s = session(sessionId);
        s.siValues = Map.copyOf(siValues);
        s.displayVars = Map.copyOf(displayVars);
        s.names = List.copyOf(names);
        s.defs = Map.copyOf(defs);
        s.system = system != null ? system : UnitRegistry.UnitSystem.SI;
        s.timestampMillis = System.currentTimeMillis();
        // Persist the solved snapshot so an api node (possibly a different JVM
        // than the compute node that ran the solve) can hydrate it for the REPL.
        mirrorToRedis(sessionId, s);
    }

    public void clear(String sessionId) {
        String k = key(sessionId);
        store.remove(k);
        if (redisActive()) {
            try {
                redisTemplate.delete(redisKey(sessionId));
            } catch (RuntimeException e) {
                log.warn("Failed to delete session {} from Redis", sessionId, e);
            }
        }
    }

    private static boolean isExpired(Session s) {
        return System.currentTimeMillis() - s.timestampMillis > TTL_MILLIS;
    }

    private static String key(String sessionId) {
        return (sessionId == null || sessionId.isBlank()) ? DEFAULT_SESSION : sessionId;
    }

    /** Drops expired entries, then trims the oldest if the session cap is exceeded. */
    private void evict() {
        store.values().removeIf(SolveContextCache::isExpired);
        int overflow = store.size() - MAX_SESSIONS;
        if (overflow > 0) {
            store.entrySet().stream()
                    .sorted(Comparator.comparingLong(e -> e.getValue().timestampMillis))
                    .limit(overflow)
                    .map(Map.Entry::getKey)
                    .toList()
                    .forEach(store::remove);
        }
    }
}
