package com.frees.backend.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Bounds on a single parametric-table request.
 *
 * <p>The solver's elapsed-time cap is PER SOLVE, and a table runs one solve per
 * row — re-solving every row on every fixed-point pass when accessors are
 * present. Nothing bounded that product, so one request could hold a compute
 * worker for far longer than the per-solve cap suggests. Both limits are set
 * absurdly low here so the guards are observable without a slow model.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "frees.solver.max-table-rows=3",
        "frees.solver.max-table-seconds=0",
})
class SolveTableLimitsTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SolveController solveController;

    private static SolveController.SolveTableRequest tableOf(int rows) {
        List<Map<String, Double>> data = new ArrayList<>();
        for (int i = 1; i <= rows; i++) {
            data.add(Map.of("a", (double) i));
        }
        return new SolveController.SolveTableRequest(
                "x = a * 2", null, null, null,
                new SolveController.TableDto(List.of("a"), data), null);
    }

    @Test
    void rejectsATableWithTooManyRowsBeforeEnqueueing() throws Exception {
        String rows = "{\"a\": 1.0},{\"a\": 2.0},{\"a\": 3.0},{\"a\": 4.0}"; // 4 > limit of 3
        mockMvc.perform(post("/api/solve/table")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\": \"x = a * 2\", \"table\": {\"variables\": [\"a\"], "
                                + "\"rows\": [" + rows + "]}}"))
                .andExpect(status().isUnprocessableEntity());
    }

    /** The same cap is re-applied at the compute entry point, which deserialises
     *  the request off the queue rather than receiving it from the endpoint. */
    @Test
    void rejectsTooManyRowsAtTheComputeEntryPointToo() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> solveController.computeSolveTable(tableOf(4)));
        assertTrue(ex.getMessage().contains("too many rows"),
                "expected the row cap to reject it, got: " + ex.getMessage());
    }

    /** A row count under the cap still can't run past the wall-clock budget —
     *  the guard that stops slow rows from adding up to an unbounded run. */
    @Test
    void stopsARunThatExceedsItsWallClockBudget() {
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> solveController.computeSolveTable(tableOf(2)));
        assertTrue(ex.getMessage().contains("second budget"),
                "expected the time budget to stop it, got: " + ex.getMessage());
    }
}
