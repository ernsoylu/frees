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
                .andExpect(jsonPath("$.variables[0].value").value(
                        org.hamcrest.Matchers.closeTo(2.7015621187164243, 1e-6)))
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
    void solveResponseCarriesSiUnitsIncludingDerived() throws Exception {
        // SI everywhere: 100 bar -> 1e7 Pa; F = P*A derives N = 240000.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\\nA = 0.024 [m^2]\\nF = P * A\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[0].name").value("A"))
                .andExpect(jsonPath("$.variables[0].units").value("m^2"))
                .andExpect(jsonPath("$.variables[1].name").value("F"))
                .andExpect(jsonPath("$.variables[1].value").value(
                        org.hamcrest.Matchers.closeTo(240000.0, 1e-3)))
                .andExpect(jsonPath("$.variables[1].units").value("N"))
                .andExpect(jsonPath("$.variables[2].value").value(
                        org.hamcrest.Matchers.closeTo(1.0e7, 1e-3)))
                .andExpect(jsonPath("$.variables[2].units").value("Pa"));
    }

    @Test
    void displayUnitSystemConvertsResults() throws Exception {
        // Computed in SI (1e7 Pa); displayed per the requested system.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\\nA = 0.024 [m^2]\\nF = P * A\","
                                + "\"displayUnitSystem\": \"ENG_SI\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[2].name").value("P"))
                .andExpect(jsonPath("$.variables[2].value").value(
                        org.hamcrest.Matchers.closeTo(10000.0, 1e-6)))
                .andExpect(jsonPath("$.variables[2].units").value("kPa"));

        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\\nA = 0.024 [m^2]\\nF = P * A\","
                                + "\"displayUnitSystem\": \"ENGLISH\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[1].units").value("lbf"))
                .andExpect(jsonPath("$.variables[2].value").value(
                        org.hamcrest.Matchers.closeTo(1450.377377, 1e-4)))
                .andExpect(jsonPath("$.variables[2].units").value("psi"));
    }

    @Test
    void declaredNonSiUnitsDisplayConverted() throws Exception {
        // SI default: P computed as 1e7 Pa but declared in bar -> shown as 100 bar.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"P = 100 [bar]\","
                                + "\"variableInfo\": [{\"name\":\"P\",\"units\":\"bar\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variables[0].value").value(
                        org.hamcrest.Matchers.closeTo(100.0, 1e-6)))
                .andExpect(jsonPath("$.variables[0].units").value("bar"));
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
                .andExpect(status().isBadRequest())
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

    @Test
    void solvesParametricTable() throws Exception {
        mockMvc.perform(post("/api/solve/table")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"I = V / R_1\","
                                + "\"table\": {"
                                + "  \"variables\": [\"V\", \"R_1\", \"I\"],"
                                + "  \"rows\": ["
                                + "    {\"V\": 30.0, \"R_1\": 120.0},"
                                + "    {\"V\": 60.0, \"R_1\": 120.0}"
                                + "  ]"
                                + "}"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].success").value(true))
                .andExpect(jsonPath("$.results[0].values.I").value(0.25))
                .andExpect(jsonPath("$.results[1].success").value(true))
                .andExpect(jsonPath("$.results[1].values.I").value(0.5));
    }

    @Test
    void automaticallyResolvesMissingStatePropertiesFromBackground() throws Exception {
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"T[1] = 373.15\\nP[1] = 101325\", \"fillMissing\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[?(@.name == 'T[1]')].value").value(373.15))
                .andExpect(jsonPath("$.variables[?(@.name == 'P[1]')].value").value(101325.0))
                .andExpect(jsonPath("$.variables[?(@.name == 'h[1]')].value").exists())
                .andExpect(jsonPath("$.variables[?(@.name == 's[1]')].value").exists())
                .andExpect(jsonPath("$.variables[?(@.name == 'v[1]')].value").exists());
    }

    @Test
    void optimizesSingleVariableProblem() throws Exception {
        mockMvc.perform(post("/api/optimize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"y = (x - 3)^2 + 4\","
                                + "\"objective\": \"y\","
                                + "\"decision\": \"x\","
                                + "\"lower\": 0.0,"
                                + "\"upper\": 10.0,"
                                + "\"maximize\": false"
                                + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.objective.name").value("y"))
                .andExpect(jsonPath("$.objective.value").value(org.hamcrest.Matchers.closeTo(4.0, 1e-3)))
                .andExpect(jsonPath("$.decision.name").value("x"))
                .andExpect(jsonPath("$.decision.value").value(org.hamcrest.Matchers.closeTo(3.0, 1e-3)));
    }

    @Test
    void optimizeEndpointValidatesBlankText() throws Exception {
        mockMvc.perform(post("/api/optimize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"\","
                                + "\"objective\": \"y\","
                                + "\"decision\": \"x\","
                                + "\"lower\": 0.0,"
                                + "\"upper\": 10.0,"
                                + "\"maximize\": false"
                                + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value("No equations entered."));
    }

    @Test
    void optimizeEndpointValidatesSyntaxError() throws Exception {
        mockMvc.perform(post("/api/optimize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"
                                + "\"text\": \"y = (x - 3)^2 + \","
                                + "\"objective\": \"y\","
                                + "\"decision\": \"x\","
                                + "\"lower\": 0.0,"
                                + "\"upper\": 10.0,"
                                + "\"maximize\": false"
                                + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").value(org.hamcrest.Matchers.containsString("Syntax error")));
    }
}

