package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PlotControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void fluidsReturnsList() throws Exception {
        mockMvc.perform(get("/api/fluids"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").exists())
                .andExpect(jsonPath("$.fluids").isArray());
    }

    @Test
    void propertyPlotGeneratesDiagram() throws Exception {
        // Valid diagram request
        mockMvc.perform(post("/api/propplot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fluid\": \"water\", \"type\": \"T-s\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fluid").value("water"))
                .andExpect(jsonPath("$.kind").value("TS"));

        // Missing fluid
        mockMvc.perform(post("/api/propplot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fluid\": \"\", \"type\": \"T-s\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());

        // Invalid diagram type
        mockMvc.perform(post("/api/propplot")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fluid\": \"water\", \"type\": \"invalid_type\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void psychrometricChartGeneratesChart() throws Exception {
        // Valid chart request
        mockMvc.perform(post("/api/psychart")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pressure\": 101325.0, \"tMin\": 0.0, \"tMax\": 50.0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pressure").value(101325.0));

        // Invalid pressure
        mockMvc.perform(post("/api/psychart")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pressure\": -1.0, \"tMin\": 0.0, \"tMax\": 50.0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    void exportTranscodesSvg() throws Exception {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"40\"/></svg>";

        // Valid PDF export
        mockMvc.perform(post("/api/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\": \"pdf\", \"svg\": \"" + svg.replace("\"", "\\\"") + "\"}"))
                .andExpect(status().isOk());

        // Valid EPS export
        mockMvc.perform(post("/api/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\": \"eps\", \"svg\": \"" + svg.replace("\"", "\\\"") + "\"}"))
                .andExpect(status().isOk());

        // Missing SVG
        mockMvc.perform(post("/api/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\": \"pdf\", \"svg\": \"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());

        // Invalid format
        mockMvc.perform(post("/api/export")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\": \"invalid_format\", \"svg\": \"" + svg.replace("\"", "\\\"") + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}
