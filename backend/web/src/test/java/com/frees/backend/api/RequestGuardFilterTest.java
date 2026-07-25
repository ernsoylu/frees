package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "frees.security.max-body-bytes=200",
        "frees.security.rate-limit-requests=3",
        "frees.security.rate-limit-window-seconds=60",
        "frees.security.rate-limit-repl-requests=2",
        "frees.security.rate-limit-repl-window-seconds=60",
})
class RequestGuardFilterTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void rejectsOversizedBody() throws Exception {
        String big = "{\"text\": \"" + "x=1;".repeat(100) + "\"}"; // > 200 bytes
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(big))
                .andExpect(result ->
                        assertTrue(result.getResponse().getStatus() == 413,
                                "Oversized body should be rejected with 413, got "
                                        + result.getResponse().getStatus()));
    }

    @Test
    void throttlesExcessiveRequests() throws Exception {
        // With a limit of 3 per window, a short burst from one IP must hit 429.
        boolean throttled = false;
        for (int i = 0; i < 6; i++) {
            int status = mockMvc.perform(post("/api/check")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"text\": \"x=1\"}"))
                    .andReturn().getResponse().getStatus();
            if (status == 429) {
                throttled = true;
                break;
            }
        }
        assertTrue(throttled, "Rate limiter should return 429 within a short burst");
    }

    /**
     * A rotating X-Forwarded-For must not buy a fresh rate-limit bucket.
     *
     * <p>The header nginx forwards is append-only: "&lt;whatever the client
     * sent&gt;, &lt;the peer nginx saw&gt;". Reading the FIRST element — as the
     * filter used to — reads a value the caller picked, so sending a new one
     * per request reset the counter every time and the limit never applied.
     * Here every request carries a different spoofed prefix behind the same
     * real client address, exactly as nginx would present it.
     */
    @Test
    void rotatingForwardedForDoesNotBypassTheRateLimit() throws Exception {
        boolean throttled = false;
        for (int i = 0; i < 8; i++) {
            int status = mockMvc.perform(post("/api/check")
                            .header("X-Forwarded-For", "10.9.9." + i + ", 203.0.113.9")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"text\": \"x=1\"}"))
                    .andReturn().getResponse().getStatus();
            if (status == 429) {
                throttled = true;
                break;
            }
        }
        assertTrue(throttled,
                "A rotating X-Forwarded-For prefix must not reset the per-client counter");
    }

    /** X-Real-IP is set by nginx with proxy_set_header, which REPLACES any
     *  client-supplied value, so it outranks the append-only forwarded chain. */
    @Test
    void prefersRealIpOverASpoofedForwardedChain() throws Exception {
        boolean throttled = false;
        for (int i = 0; i < 8; i++) {
            int status = mockMvc.perform(post("/api/check")
                            .header("X-Forwarded-For", "10.8.8." + i)
                            .header("X-Real-IP", "203.0.113.42")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"text\": \"x=1\"}"))
                    .andReturn().getResponse().getStatus();
            if (status == 429) {
                throttled = true;
                break;
            }
        }
        assertTrue(throttled,
                "Accounting must key on X-Real-IP, not the client-supplied forwarded chain");
    }

    @Test
    void throttlesExcessiveReplRequests() throws Exception {
        // With a REPL limit of 2 per window, the 3rd request to /api/repl/evaluate must hit 429.
        boolean throttled = false;
        for (int i = 0; i < 4; i++) {
            int status = mockMvc.perform(post("/api/repl/evaluate")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"sessionId\": \"test\", \"expression\": \"x+1\"}"))
                    .andReturn().getResponse().getStatus();
            if (status == 429) {
                throttled = true;
                break;
            }
        }
        assertTrue(throttled, "REPL rate limiter should return 429 after 2 requests");
    }
}
