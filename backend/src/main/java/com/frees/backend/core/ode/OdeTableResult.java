package com.frees.backend.core.ode;

import java.util.List;

/**
 * The first-class <em>ODE Table</em> produced by one solved {@code DYNAMIC}
 * block — a sibling of the Parametric Table / Function Table family. Columns are
 * {@code [timeVar, states…, auxiliaries…]} and rows are the sampled time steps,
 * shaped so the frontend renders it in the Tables window and plots it (state vs
 * time / state vs state) through the existing parametric-table path with no new
 * plot code. The analytic solver also reads cells/extrema out of it via the ODE
 * Table accessors ({@code ODEValue}, {@code FinalValue}, {@code MaxValue},
 * {@code TimeAt}, column aggregates) in a second-solve pass.
 *
 * @param name     block name (the table / graph name)
 * @param columns  column headers, {@code [timeVar, states…, auxiliaries…]}
 * @param rows     one row per output sample, aligned to {@code columns}
 * @param events   recorded event firings (name + time)
 * @param method   the solver actually used
 * @param stopped  whether a stop-event ended the run early
 * @param endTime  final time reached
 */
public record OdeTableResult(
        String name,
        List<String> columns,
        List<List<Double>> rows,
        List<EventHit> events,
        String method,
        boolean stopped,
        double endTime) {

    public record EventHit(String name, double time) {}
}
