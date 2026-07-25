package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Bounds on what the session cache may write to Redis.
 *
 * <p>The Redis key is chosen by the client and every solve writes one with a
 * one-hour TTL, so without a bound a caller minting a fresh id per request grew
 * Redis without limit — and Redis is a critical dependency in the health
 * rollup, so exhausting it takes the whole system down, not just the REPL.
 */
@SpringBootTest
@ActiveProfiles({"api"})
@Testcontainers
@TestPropertySource(properties = "frees.security.max-redis-sessions=5")
class SolveContextCacheRedisTest {

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @Autowired
    private SolveContextCache cache;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Autowired
    private org.springframework.core.env.Environment environment;

    private void put(String sessionId) {
        cache.put(sessionId, Map.of("x", 1.0), Map.of(), List.of("x"), Map.of(), null);
    }

    @Test
    void mirrorsASessionWhoseIdIsAUuid() {
        String id = UUID.randomUUID().toString();
        put(id);
        assertNotNull(redisTemplate.opsForValue().get("session:" + id),
                "a well-formed session id should be mirrored for cross-JVM hydration");
    }

    /** Arbitrary ids are kept out of the shared Redis key namespace entirely,
     *  so it cannot be polluted with attacker-chosen or oversized keys. */
    @Test
    void doesNotMirrorASessionWhoseIdIsNotAUuid() {
        put("../../etc/passwd");
        put("x".repeat(100_000));
        put(SolveContextCache.DEFAULT_SESSION);

        assertNull(redisTemplate.opsForValue().get("session:../../etc/passwd"));
        assertNull(redisTemplate.opsForValue().get("session:" + "x".repeat(100_000)));
        assertNull(redisTemplate.opsForValue().get("session:" + SolveContextCache.DEFAULT_SESSION),
                "the shared no-id fallback must stay in-memory, never persisted or shared across JVMs");
    }

    /**
     * The point of mirroring to Redis at all: an api node that has never seen a
     * session in memory must be able to hydrate it from a solve a COMPUTE node
     * performed. This is the whole cross-JVM path, and it was silently broken.
     *
     * <p>{@code Session} sets {@code getterVisibility = NONE}, which does not
     * cover IS-getters, so {@code isPopulated()} was serialised as
     * {@code "populated"} — a name matching no field on the way back. Jackson's
     * default FAIL_ON_UNKNOWN_PROPERTIES turned every read into an exception,
     * which {@code loadFromRedis} catches and reports as "no session". Nothing
     * failed loudly: the REPL simply behaved as though the document had never
     * been solved. A second cache instance over the same Redis is the honest
     * reproduction — a fresh in-memory store, exactly like a different JVM.
     */
    @Test
    void aSecondNodeHydratesASessionSolvedElsewhere() {
        String id = UUID.randomUUID().toString();
        cache.put(id, Map.of("alpha", 1.0, "beta", 2.0),
                Map.of("beta", new SolveContextCache.ReplVar(2.0, "kPa", 0.5)),
                List.of("alpha", "beta"), Map.of(), null);

        SolveContextCache otherNode = new SolveContextCache(redisTemplate, objectMapper, environment);
        SolveContextCache.Session hydrated = otherNode.peek(id);

        assertNotNull(hydrated, "a node that never saw this session must hydrate it from Redis");
        assertEquals(2.0, hydrated.siValues().get("beta"));
        assertTrue(hydrated.completionNames().contains("alpha"));
        assertTrue(hydrated.isPopulated(), "the hydrated snapshot must not look empty");
        assertEquals("kPa", hydrated.unitOf("beta"));
    }

    /**
     * The same defect one level down, where the failure names itself. The cache
     * swallows a deserialisation error into a null session, so without this the
     * only symptom is "the REPL forgot my solve".
     */
    @Test
    void theSessionSnapshotSurvivesAJsonRoundTrip() throws Exception {
        String id = UUID.randomUUID().toString();
        cache.put(id, Map.of("alpha", 1.0), Map.of(), List.of("alpha"), Map.of(), null);
        SolveContextCache.Session original = cache.peek(id);
        assertNotNull(original);

        String json = objectMapper.writeValueAsString(original);
        SolveContextCache.Session parsed =
                objectMapper.readValue(json, SolveContextCache.Session.class);

        assertEquals(1.0, parsed.siValues().get("alpha"));
        assertFalse(json.contains("\"populated\""),
                "derived IS-getters must not be serialised: they come back as unknown "
                        + "properties and fail the read. JSON was: " + json);
    }

    /**
     * On a deployment that may serve more than one user, a caller who simply
     * omits the session id must not be handed the shared fallback workspace —
     * otherwise leaving the header off is enough to read whatever another
     * id-less client last solved: variable names and values.
     */
    @Test
    void anIdLessCallerGetsAPrivateSessionRatherThanTheSharedFallback() {
        cache.put(null, Map.of("secret_margin", 42.0), Map.of(),
                List.of("secret_margin"), Map.of(), null);

        assertNull(cache.peek(null),
                "an id-less reader must not see another id-less client's workspace");
        assertNull(cache.peek(""),
                "a blank id must not resolve to the shared fallback either");
        assertTrue(cache.session(null).completionNames().isEmpty(),
                "each id-less caller should get its own empty session");
    }

    /**
     * The real bound. Validating the id caps key SIZE but not key COUNT — valid
     * UUIDs are free to generate — so the mirrored set has to be trimmed.
     */
    @Test
    void evictsTheOldestOnceTheMirroredSessionCapIsPassed() {
        List<String> ids = new java.util.ArrayList<>();
        for (int i = 0; i < 20; i++) {
            String id = UUID.randomUUID().toString();
            ids.add(id);
            put(id);
        }

        Long indexed = redisTemplate.opsForZSet().size("session:index");
        assertNotNull(indexed);
        assertTrue(indexed <= 5,
                "the mirrored session set must stay capped, found " + indexed);

        // The newest survives, the oldest is gone.
        assertNotNull(redisTemplate.opsForValue().get("session:" + ids.get(ids.size() - 1)));
        assertNull(redisTemplate.opsForValue().get("session:" + ids.get(0)),
                "the oldest session should have been evicted, not left to expire on its own");

        long live = ids.stream()
                .filter(id -> redisTemplate.opsForValue().get("session:" + id) != null)
                .count();
        assertEquals(5, live, "exactly the cap should remain live");
    }
}
