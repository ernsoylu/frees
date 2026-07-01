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
