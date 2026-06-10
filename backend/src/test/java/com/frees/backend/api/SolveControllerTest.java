package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SolveControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void solvesMilestoneSystemOverRest() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x+y=3\\ny=z-4\\nz=x^2-3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[0].name").value("x"))
                .andExpect(jsonPath("$.variables[0].value").value(2.7015621187164243))
                .andExpect(jsonPath("$.stats.equations").value(3))
                .andExpect(jsonPath("$.stats.unknowns").value(3))
                .andExpect(jsonPath("$.stats.blocks").value(1));
    }

    @Test
    void reportsSyntaxErrorsAsBadRequest() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + = 3\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void checkEndpointReportsSolvableSystem() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x+y=3\\ny=z-4\\nz=x^2-3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solvable").value(true))
                .andExpect(jsonPath("$.equations").value(3))
                .andExpect(jsonPath("$.unknowns").value(3));
    }

    @Test
    void checkEndpointReportsUnderspecifiedSystem() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + y = 3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solvable").value(false))
                .andExpect(jsonPath("$.equations").value(1))
                .andExpect(jsonPath("$.unknowns").value(2));
    }

    @Test
    void checkEndpointReportsFirstSyntaxError() throws Exception {
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + = 3\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solvable").value(false));
    }

    @Test
    void reportsSolverErrorsAsUnprocessable() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x + y = 3\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false));
    }
}
