package com.frees.backend.compute;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.frees.backend.api.MeasurementCalcController;
import com.frees.backend.api.OptimizeController;
import com.frees.backend.api.SolveController;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.ObjectProvider;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The chunk fan-out plumbing: the dispatcher publishes chunks under the
 * parent's jobId (failing the parent on a broken publish), and the listener's
 * chunk handler computes, records, and assembles — or fails the parent.
 */
class TableChunkDispatchTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void publishChunkCarriesTheParentJobId() {
        RabbitTemplate rabbit = mock(RabbitTemplate.class);
        JobStore store = mock(JobStore.class);
        ComputeDispatcher dispatcher = new ComputeDispatcher(rabbit, store, mapper);

        dispatcher.beginChunked("parent-1", 4);
        verify(store).savePendingChunked("parent-1", 4);

        dispatcher.publishChunk("parent-1", Map.of("chunkIndex", 0));
        ArgumentCaptor<ComputeTask> task = ArgumentCaptor.forClass(ComputeTask.class);
        verify(rabbit).convertAndSend(eq(ComputeTask.QUEUE), task.capture());
        assertEquals("parent-1", task.getValue().jobId());
        assertEquals(ComputeTask.SOLVE_TABLE_CHUNK, task.getValue().taskType());
        verify(store, never()).saveFailed(anyString(), anyString());
    }

    @Test
    void brokenPublishFailsTheParent() {
        RabbitTemplate rabbit = mock(RabbitTemplate.class);
        JobStore store = mock(JobStore.class);
        doThrow(new RuntimeException("broker down")).when(rabbit)
                .convertAndSend(eq(ComputeTask.QUEUE), any(ComputeTask.class));
        new ComputeDispatcher(rabbit, store, mapper).publishChunk("parent-2", Map.of());
        verify(store).saveFailed(eq("parent-2"), anyString());
    }

    @SuppressWarnings("unchecked")
    private ComputeTaskListener listener(SolveController solve, JobStore store) {
        ObjectProvider<io.opentelemetry.api.OpenTelemetry> otel = mock(ObjectProvider.class);
        when(otel.getIfAvailable()).thenReturn(null);
        return new ComputeTaskListener(solve, mock(OptimizeController.class),
                mock(MeasurementCalcController.class), store, mapper, otel, true);
    }

    private static SolveController.TableChunkRequest chunkRequest(int index, int count) {
        return new SolveController.TableChunkRequest(
                new SolveController.SolveTableRequest("x = 1", null, List.of(), "SI",
                        new SolveController.TableDto(List.of(), List.of()), List.of()),
                index, count);
    }

    @Test
    void lastChunkAssemblesTheParentResponse() throws Exception {
        SolveController solve = mock(SolveController.class);
        JobStore store = mock(JobStore.class);
        SolveController.SolveTableResponse part = new SolveController.SolveTableResponse(
                List.of(new SolveController.TableRowResult(true, Map.of("x", 1.0), null)),
                new SolveController.TableStatsDto(1, 1, 0, 1, 1, 2, 5, 0.0),
                List.of());
        when(solve.computeSolveTable(any())).thenReturn(part);
        when(store.saveChunkResult(eq("p"), anyInt(), any()))
                .thenReturn(List.of(mapper.writeValueAsString(part), mapper.writeValueAsString(part)));

        listener(solve, store).onTask(new ComputeTask("p", ComputeTask.SOLVE_TABLE_CHUNK, null,
                mapper.writeValueAsString(chunkRequest(1, 2))), Map.of());

        ArgumentCaptor<Object> completed = ArgumentCaptor.forClass(Object.class);
        verify(store).saveCompleted(eq("p"), completed.capture());
        SolveController.SolveTableResponse merged =
                (SolveController.SolveTableResponse) completed.getValue();
        assertEquals(2, merged.results().size());
        assertEquals(2, merged.stats().runs());
    }

    @Test
    void nonFinalChunkRecordsWithoutCompleting() throws Exception {
        SolveController solve = mock(SolveController.class);
        JobStore store = mock(JobStore.class);
        when(solve.computeSolveTable(any())).thenReturn(new SolveController.SolveTableResponse(
                List.of(), null, List.of()));
        when(store.saveChunkResult(anyString(), anyInt(), any())).thenReturn(List.of());

        listener(solve, store).onTask(new ComputeTask("p2", ComputeTask.SOLVE_TABLE_CHUNK, null,
                mapper.writeValueAsString(chunkRequest(0, 2))), Map.of());

        verify(store, never()).saveCompleted(anyString(), any());
        verify(store, never()).saveFailed(anyString(), anyString());
    }

    @Test
    void chunkComputeFailureFailsTheParent() throws Exception {
        SolveController solve = mock(SolveController.class);
        JobStore store = mock(JobStore.class);
        when(solve.computeSolveTable(any())).thenThrow(new IllegalStateException("budget"));

        listener(solve, store).onTask(new ComputeTask("p3", ComputeTask.SOLVE_TABLE_CHUNK, null,
                mapper.writeValueAsString(chunkRequest(0, 2))), Map.of());

        verify(store).saveFailed(eq("p3"), anyString());
    }
}
