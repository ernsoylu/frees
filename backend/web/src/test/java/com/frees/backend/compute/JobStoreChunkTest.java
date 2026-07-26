package com.frees.backend.compute;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The chunked-table protocol in the job store: write-then-count assembly,
 * chunk-index ordering, and the terminal-state guard that keeps a failed
 * parent from being resurrected by late siblings. Redis is a map-backed
 * mock — the protocol under test is the store's, not the transport's.
 */
class JobStoreChunkTest {

    private final Map<String, String> backing = new ConcurrentHashMap<>();
    private JobStore store;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> ops = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(ops);
        doAnswer(inv -> {
            backing.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(ops).set(anyString(), anyString(), any(Duration.class));
        when(ops.get(anyString())).thenAnswer(inv -> backing.get(inv.<String>getArgument(0)));
        when(ops.increment(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            long next = Long.parseLong(backing.getOrDefault(key, "0")) + 1;
            backing.put(key, Long.toString(next));
            return next;
        });
        store = new JobStore(redis, new ObjectMapper());
    }

    @Test
    void onlyTheLastChunkAssemblesAndOrderIsByIndex() {
        store.savePendingChunked("j1", 3);
        // Chunks land out of order; only the third call gets the list.
        assertTrue(store.saveChunkResult("j1", 2, Map.of("part", 2)).isEmpty());
        assertTrue(store.saveChunkResult("j1", 0, Map.of("part", 0)).isEmpty());
        List<String> all = store.saveChunkResult("j1", 1, Map.of("part", 1));
        assertEquals(3, all.size());
        assertTrue(all.get(0).contains("0") && all.get(1).contains("1") && all.get(2).contains("2"),
                "chunk order is index order, not arrival order: " + all);
        assertEquals("PENDING", store.get("j1").status(), "assembly does not complete the job itself");
    }

    @Test
    void terminalParentIsNeverResurrected() {
        store.savePendingChunked("j2", 2);
        assertTrue(store.saveChunkResult("j2", 0, Map.of("part", 0)).isEmpty());
        store.saveFailed("j2", "a sibling chunk crashed");
        // The count-completing sibling stands down instead of assembling.
        assertTrue(store.saveChunkResult("j2", 1, Map.of("part", 1)).isEmpty());
        assertEquals("FAILED", store.get("j2").status());
    }

    @Test
    void missingChunkPayloadStandsDown() {
        store.savePendingChunked("j3", 2);
        assertTrue(store.saveChunkResult("j3", 0, Map.of("part", 0)).isEmpty());
        backing.remove("job:j3:chunk:0"); // TTL expiry between write and assembly
        assertTrue(store.saveChunkResult("j3", 1, Map.of("part", 1)).isEmpty());
    }
}
