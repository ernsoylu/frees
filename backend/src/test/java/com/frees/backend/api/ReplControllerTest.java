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

/** End-to-end: a solve populates the session cache that the REPL evaluates against. */
@SpringBootTest
@AutoConfigureMockMvc
class ReplControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private static final String SESSION = "repl-it-session";

    private void solve(String text) throws Exception {
        mockMvc.perform(post("/api/solve")
                        .header("X-Frees-Session", SESSION)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"" + text + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void evaluatesExpressionAgainstSolvedWorkspace() throws Exception {
        solve("T_1 = 300\\nQ = T_1 * 2");

        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + SESSION + "\", \"expression\": \"T_1 * 2 + Q\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.value").value(1200.0));
    }

    @Test
    void exposesWorkspaceVariablesForTabCompletion() throws Exception {
        solve("alpha = 1\\nbeta = alpha + 1");

        mockMvc.perform(get("/api/repl/variables").param("sessionId", SESSION))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@ == 'alpha')]").exists())
                .andExpect(jsonPath("$[?(@ == 'beta')]").exists());
    }

    @Test
    void literalMathWorksWithoutASolve() throws Exception {
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"never-solved\", \"expression\": \"2 + 2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.value").value(4.0));
    }

    @Test
    void referencingAnUnknownVariableFails() throws Exception {
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"never-solved\", \"expression\": \"missing_var + 1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void assignmentDefinesAReusableVariableWithUnits() throws Exception {
        String sid = "repl-assign";
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"A = 356 [kPa]\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.value").value(356000.0))
                .andExpect(jsonPath("$.unit").value("Pa"));

        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"A / 2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.value").value(178000.0));
    }

    @Test
    void solveAppliesReplOverridesOverTheEditor() throws Exception {
        // Editor sets a=10 → b=30; the override a=25 must win → b=75.
        mockMvc.perform(post("/api/solve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"a = 10\\nb = a * 3\", \"overrides\": [\"a = 25\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.variables[?(@.name == 'a')].value").value(org.hamcrest.Matchers.contains(25.0)))
                .andExpect(jsonPath("$.variables[?(@.name == 'b')].value").value(org.hamcrest.Matchers.contains(75.0)));
    }

    @Test
    void checkAppliesReplOverridesOverTheEditor() throws Exception {
        // Editor references a, but a is defined only in overrides.
        // Without overrides, check would fail. With overrides, it must succeed.
        mockMvc.perform(post("/api/check")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"b = a * 3\", \"overrides\": [\"a = 25\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solvable").value(true));
    }

    @Test
    void clearRemovesReplOverlay() throws Exception {
        String sid = "repl-clear";
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"Cv = 5\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/api/repl/clear")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"\"}"))
                .andExpect(status().isOk());

        // After clear, the REPL-defined variable is gone.
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"Cv\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void clearSpecificVariableRemovesOnlyThatVariable() throws Exception {
        String sid = "repl-clear-specific";
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"Cv = 5\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"Dv = 10\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));

        // Clear only Cv
        mockMvc.perform(post("/api/repl/clear")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"Cv\"}"))
                .andExpect(status().isOk());

        // Cv must be gone
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"Cv\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(false));

        // Dv must still be present
        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"Dv\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.value").value(10.0));
    }

    @Test
    void functionOnlyDocumentExposesItsFunctionsToTheRepl() throws Exception {
        String sid = "repl-fnonly";
        // This document has nothing to solve, so /solve fails — but its FUNCTION
        // must still be callable in the REPL.
        mockMvc.perform(post("/api/solve")
                        .header("X-Frees-Session", sid)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"FUNCTION sq(n)\\n  sq := n*n\\nEND\"}"))
                .andExpect(status().isUnprocessableEntity());

        mockMvc.perform(post("/api/repl/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionId\": \"" + sid + "\", \"expression\": \"sq(7)\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.value").value(49.0));
    }
}
