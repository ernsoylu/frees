package com.frees.backend.api;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Chunked-table aggregation: rows concatenate in chunk order, counters sum,
 * elapsed time is the slowest chunk (the parallel wall clock), and the
 * variable list comes from the first chunk.
 */
class TableChunkAggregationTest {

    private static SolveController.SolveTableResponse chunk(int firstRow, int rowCount,
                                                            long elapsed, int failed) {
        List<SolveController.TableRowResult> results = new java.util.ArrayList<>();
        for (int i = 0; i < rowCount; i++) {
            boolean ok = i >= failed;
            results.add(new SolveController.TableRowResult(ok,
                    ok ? Map.of("x", (double) (firstRow + i)) : Map.of(),
                    ok ? null : "row failed"));
        }
        return new SolveController.SolveTableResponse(results,
                new SolveController.TableStatsDto(rowCount, rowCount - failed, failed,
                        3, 3, rowCount * 7, elapsed, 1e-9 * (firstRow + 1)),
                List.of(new SolveDtos.VariableDto("x", firstRow, "-")));
    }

    @Test
    void rowsConcatenateInChunkOrderAndStatsCombine() {
        SolveController.SolveTableResponse merged = SolveController.aggregateChunks(List.of(
                chunk(0, 3, 120, 0),
                chunk(3, 3, 480, 1),
                chunk(6, 2, 250, 0)));

        assertEquals(8, merged.results().size());
        assertEquals(0.0, merged.results().get(0).values().get("x"));
        assertEquals(6.0, merged.results().get(6).values().get("x"), "chunk order preserved");

        SolveController.TableStatsDto stats = merged.stats();
        assertEquals(8, stats.runs());
        assertEquals(7, stats.solved());
        assertEquals(1, stats.failed());
        assertEquals(8 * 7, stats.iterations());
        assertEquals(480, stats.elapsedMillis(), "elapsed is the slowest chunk, not the sum");
        assertEquals(3, stats.equations());
        assertEquals(1e-9 * 7, stats.maxResidual(), 1e-18);
        assertEquals(1, merged.variables().size());
        assertEquals(0.0, merged.variables().get(0).value(), "variables from the first chunk");
    }

    @Test
    void singleChunkPassesThrough() {
        SolveController.SolveTableResponse only = chunk(0, 4, 90, 0);
        SolveController.SolveTableResponse merged = SolveController.aggregateChunks(List.of(only));
        assertEquals(only.results(), merged.results());
        assertEquals(90, merged.stats().elapsedMillis());
    }
}
