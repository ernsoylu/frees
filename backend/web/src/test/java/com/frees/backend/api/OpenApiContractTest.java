package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The machine-readable API contract must stay published and must describe
 *  the endpoints scripts actually call (Python client, CI harnesses). */
@SpringBootTest
@AutoConfigureMockMvc
class OpenApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void servesOpenApiDocumentUnderTheApiPrefix() throws Exception {
        mockMvc.perform(get("/api/openapi"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").exists())
                .andExpect(jsonPath("$.info.title").value("frees API"))
                .andExpect(jsonPath("$.paths.['/api/solve']").exists())
                .andExpect(jsonPath("$.paths.['/api/check']").exists());
    }
}
