package com.frees.backend.api;

import com.frees.backend.compute.ComputeDispatcher;
import com.frees.backend.compute.ComputeTask;
import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Chunk routing on the table endpoint: large accessor-free tables fan out as
 * ordered slices under one parent jobId; accessor tables and small tables
 * keep the single-task path.
 */
class SolveControllerChunkRoutingTest {

    private ComputeDispatcher dispatcher;
    private SolveController controller;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        dispatcher = mock(ComputeDispatcher.class);
        ObjectProvider<ComputeDispatcher> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(dispatcher);
        controller = new SolveController(mock(EquationSystemSolver.class),
                mock(SolveContextCache.class), mock(CyclePathResolver.class), provider);
        ReflectionTestUtils.setField(controller, "maxTableRows", 5000);
        ReflectionTestUtils.setField(controller, "tableChunkSize", 100);
        ReflectionTestUtils.setField(controller, "maxTableSeconds", 120L);
    }

    private static SolveController.SolveTableRequest tableRequest(String text, int rows) {
        List<Map<String, Double>> rowList = IntStream.range(0, rows)
                .mapToObj(i -> Map.of("tin", (double) i))
                .map(m -> (Map<String, Double>) m)
                .toList();
        return new SolveController.SolveTableRequest(text, null, List.of(), "SI",
                new SolveController.TableDto(List.of("tin"), rowList), List.of());
    }

    @Test
    void largeAccessorFreeTableFansOutInOrderedSlices() {
        ResponseEntity<?> response = controller.solveTable(tableRequest("y = 2*tin", 250));
        assertEquals(202, response.getStatusCode().value());

        ArgumentCaptor<String> jobId = ArgumentCaptor.forClass(String.class);
        verify(dispatcher).beginChunked(jobId.capture(), eq(3));
        ArgumentCaptor<Object> chunks = ArgumentCaptor.forClass(Object.class);
        verify(dispatcher, org.mockito.Mockito.times(3)).publishChunk(eq(jobId.getValue()), chunks.capture());

        List<SolveController.TableChunkRequest> sent = chunks.getAllValues().stream()
                .map(SolveController.TableChunkRequest.class::cast)
                .toList();
        assertEquals(List.of(0, 1, 2), sent.stream().map(SolveController.TableChunkRequest::chunkIndex).toList());
        assertEquals(List.of(100, 100, 50),
                sent.stream().map(c -> c.request().table().rows().size()).toList());
        assertEquals(3, sent.get(0).chunkCount());
        assertEquals(200.0, sent.get(2).request().table().rows().get(0).get("tin"),
                "the last slice starts where the second ended");
        verify(dispatcher, never()).dispatch(anyString(), any(), any());
    }

    @Test
    void accessorTablesStaySerial() {
        controller.solveTable(tableRequest("y = TableSum(tin)", 250));
        verify(dispatcher).dispatch(eq(ComputeTask.SOLVE_TABLE), any(), any());
        verify(dispatcher, never()).beginChunked(anyString(), anyInt());
    }

    @Test
    void smallTablesStaySerial() {
        controller.solveTable(tableRequest("y = 2*tin", 80));
        verify(dispatcher).dispatch(eq(ComputeTask.SOLVE_TABLE), any(), any());
        verify(dispatcher, never()).beginChunked(anyString(), anyInt());
    }

    @Test
    void oversizedTablesAreRejectedBeforeAnyDispatch() {
        ResponseEntity<?> response = controller.solveTable(tableRequest("y = 2*tin", 5001));
        assertEquals(422, response.getStatusCode().value());
        verify(dispatcher, never()).dispatch(anyString(), any(), any());
        verify(dispatcher, never()).beginChunked(anyString(), anyInt());
    }
}
