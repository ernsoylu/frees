package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Cross-origin policy.
 *
 * <p>No shipped deployment needs CORS: Docker and Railway serve the frontend
 * same-origin through the nginx {@code /api} proxy, and {@code npm start} is
 * same-origin too because the Vite dev server proxies {@code /api}. The former
 * default allowed {@code https://*.up.railway.app} — every app on Railway's
 * shared apex — which let an attacker-controlled page drive this API from its
 * visitors' browsers and read the responses, spreading load across residential
 * IPs and defeating per-client rate limiting by construction.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CorsPolicyTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void doesNotGrantCrossOriginAccessToAnotherRailwayApp() throws Exception {
        mockMvc.perform(post("/api/check")
                        .header(HttpHeaders.ORIGIN, "https://someone-elses-app.up.railway.app")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x=1\"}"))
                .andExpect(result -> assertNull(
                        result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN),
                        "a shared-hosting wildcard is not an origin restriction; no "
                                + "cross-origin grant should be issued"));
    }

    @Test
    void deniesTheCrossOriginPreflightToo() throws Exception {
        mockMvc.perform(options("/api/check")
                        .header(HttpHeaders.ORIGIN, "https://evil.example.com")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(result -> assertNull(
                        result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN),
                        "preflight must not be granted either"));
    }
}
