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
import org.springframework.beans.factory.annotation.Value;
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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

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

    /**
     * Sorted-set index of live Redis session keys, scored by write time, used
     * to bound how many can exist at once.
     *
     * <p>The in-memory store is capped at {@link #MAX_SESSIONS}, but the Redis
     * mirror was not capped by anything: the key is chosen by the client, every
     * solve writes one, and each lives an hour. Nothing stopped a caller from
     * minting a fresh id per request and growing Redis without limit — and
     * Redis is a critical dependency in the health rollup, so exhausting it
     * takes the whole system DOWN, not just the REPL. Validating the id fixes
     * key SIZE but not key COUNT (unlimited valid UUIDs are free to generate),
     * so the count needs its own bound.
     */
    private static final String REDIS_INDEX_KEY = "session:index";

    /** Hard ceiling on mirrored sessions; oldest are evicted past it. Well above
     *  any real concurrent-user count for this deployment. Field-initialised so
     *  the no-arg (unit-test) constructor still gets the production value when
     *  Spring is not doing the injecting. */
    @Value("${frees.security.max-redis-sessions:2000}")
    private int maxRedisSessions = 2_000;

    /**
     * A session id may only be a UUID — which is exactly what the frontend
     * generates ({@code crypto.randomUUID()} in App.tsx). Anything else is not
     * from our client, and is kept out of Redis so the shared key namespace
     * cannot be polluted with arbitrary or oversized keys.
     */
    private static final Pattern SESSION_ID = Pattern.compile(
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");

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

    /**
     * True when this id may touch Redis at all.
     *
     * <p>Deliberately excludes {@link #DEFAULT_SESSION}: the no-id fallback is a
     * single shared key, so mirroring it would persist one client's workspace
     * under a name every other no-id client also reads — and push it across
     * JVMs. Keeping it in-memory confines that shared namespace to a single
     * process, which is all the local single-user convenience it exists for
     * needs. (Our own frontend always sends an id, so nothing real lands here.)
     */
    private boolean mirrorable(String sessionId) {
        return redisActive() && sessionId != null && SESSION_ID.matcher(sessionId).matches();
    }

    private static String redisKey(String sessionId) {
        return REDIS_KEY_PREFIX + key(sessionId);
    }

    /** Loads a session snapshot from Redis, or {@code null} if absent/unreadable. */
    private Session loadFromRedis(String sessionId) {
        if (!mirrorable(sessionId)) {
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
        if (!mirrorable(sessionId)) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(session);
            redisTemplate.opsForValue().set(redisKey(sessionId), json,
                    Duration.ofSeconds(REDIS_TTL_SECONDS));
            indexAndTrim(sessionId);
        } catch (Exception e) {
            log.warn("Failed to mirror session {} to Redis", sessionId, e);
        }
    }

    /**
     * Records the key in the index and drops the oldest once the ceiling is
     * passed, so the mirrored set stays bounded no matter how many distinct
     * ids arrive. Best-effort: a failure here must never fail the solve that
     * triggered it, since the snapshot itself is already written.
     */
    private void indexAndTrim(String sessionId) {
        try {
            var zset = redisTemplate.opsForZSet();
            zset.add(REDIS_INDEX_KEY, sessionId, System.currentTimeMillis());
            Long size = zset.size(REDIS_INDEX_KEY);
            if (size == null || size <= maxRedisSessions) {
                return;
            }
            long excess = size - maxRedisSessions;
            Set<String> oldest = zset.range(REDIS_INDEX_KEY, 0, excess - 1);
            if (oldest == null || oldest.isEmpty()) {
                return;
            }
            log.info("Redis session cap reached ({}); evicting {} oldest session(s)", size, oldest.size());
            redisTemplate.delete(oldest.stream().map(SolveContextCache::redisKey).toList());
            zset.remove(REDIS_INDEX_KEY, oldest.toArray());
        } catch (RuntimeException e) {
            log.warn("Failed to trim the Redis session index", e);
        }
    }

    /** One workspace variable as the user sees it: display value, unit, uncertainty. */
    public record ReplVar(double value, String unit, Double uncertainty) implements Serializable {}

    /** Mutable per-document state: the last solve snapshot plus REPL-defined vars. */
    @JsonAutoDetect(fieldVisibility = Visibility.ANY, getterVisibility = Visibility.NONE)
    public static final class Session implements Serializable {
        private static final long serialVersionUID = 1L;
        // --- solve snapshot (replaced wholesale on each solve) ---
        // S3077 suppressed: each field holds an *immutable* instance (Map.copyOf/List.copyOf
        // in replaceSnapshot) replaced atomically, so volatile is the correct safe-publication
        // idiom. They must stay plain Map/List (not AtomicReference) to remain serializable in
        // the Jackson/Redis JSON snapshot.
        @SuppressWarnings("java:S3077")
        private volatile Map<String, Double> siValues = Map.of();      // lowercased name -> SI value
        @SuppressWarnings("java:S3077")
        private volatile Map<String, ReplVar> displayVars = Map.of();  // lowercased name -> display tuple
        @SuppressWarnings("java:S3077")
        private volatile List<String> names = List.of();               // display spellings
        /** FUNCTION/TABLE defs in scope. Excluded from the Redis JSON
         *  snapshot (Jackson cannot deserialize the sealed {@link ProcDef}
         *  interface without type info); the REPL can still evaluate solved
         *  variables and expressions — calling FUNCTION/TABLE blocks from the
         *  REPL in async mode is a documented follow-up. */
        @JsonIgnore
        @SuppressWarnings("java:S3077") // immutable Map.copyOf replaced wholesale; volatile = safe publication
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

        /**
         * True once anything is available to evaluate against (solve, defs, or
         * REPL vars).
         *
         * <p>{@code @JsonIgnore} is load-bearing, not tidiness. The class sets
         * {@code getterVisibility = NONE}, but that does not cover IS-getters,
         * so this was serialised into the Redis snapshot as {@code "populated"}
         * — a name matching no field on the way back in. With Jackson's default
         * FAIL_ON_UNKNOWN_PROPERTIES that made every read throw
         * UnrecognizedPropertyException, which loadFromRedis catches and turns
         * into "no session". Cross-JVM hydration therefore never worked: an api
         * node could not see a solve performed by a compute node, so the REPL
         * silently behaved as if the document had never been solved.
         */
        @JsonIgnore
        public boolean isPopulated() {
            return !siValues.isEmpty() || !defs.isEmpty() || !overlaySi.isEmpty();
        }
    }

    /**
     * True when an id-less caller must NOT be given the shared fallback session.
     *
     * <p>{@link #DEFAULT_SESSION} is a single key shared by every caller that
     * omits an id, so on a deployment serving more than one user it hands one
     * client's solved workspace — variable names and values — to any other
     * client that simply leaves the id off. That is fine for the local
     * single-user case it exists for, and not fine anywhere else, so it is
     * confined to the profile where there is only one user: the async profiles
     * (api/compute) are the deployed, potentially multi-user topology, and
     * there an id-less caller gets a private throwaway session instead.
     */
    private boolean sharedFallbackForbidden(String sessionId) {
        return (sessionId == null || sessionId.isBlank()) && redisActive();
    }

    /** The session for {@code sessionId}, creating an empty one if absent. */
    public Session session(String sessionId) {
        if (sharedFallbackForbidden(sessionId)) {
            return new Session(); // private, not stored, not shared
        }
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
        if (sharedFallbackForbidden(sessionId)) {
            return null;
        }
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
        if (mirrorable(sessionId)) {
            try {
                redisTemplate.delete(redisKey(sessionId));
                redisTemplate.opsForZSet().remove(REDIS_INDEX_KEY, sessionId);
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
