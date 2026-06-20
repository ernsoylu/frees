package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ParametricAccessorContextTest {

    @Test
    void aggregatesCellAndIntegralResolveAgainstColumns() {
        Map<String, double[]> columns = Map.of(
                "t", new double[]{0, 1, 2, 3},
                "q", new double[]{1, 2, 3, 4});
        ParametricAccessorContext.install(2, 4, columns, List.of("t", "q"));
        try {
            assertEquals(2.0, ParametricAccessorContext.currentRun());
            assertEquals(4.0, ParametricAccessorContext.runCount());
            assertEquals(10.0, ParametricAccessorContext.aggregate("sum", "q"), 1e-12);
            assertEquals(2.5, ParametricAccessorContext.aggregate("avg", "q"), 1e-12);
            assertEquals(1.0, ParametricAccessorContext.aggregate("min", "q"), 1e-12);
            assertEquals(4.0, ParametricAccessorContext.aggregate("max", "q"), 1e-12);
            // TableValue(run=3, col=2): column 2 is "q", run 3 -> q[2] = 3
            assertEquals(3.0, ParametricAccessorContext.cell(3, 2), 1e-12);
            // Trapezoid integral of q w.r.t t = 1.5 + 2.5 + 3.5 = 7.5
            assertEquals(7.5, ParametricAccessorContext.integral("q", "t"), 1e-12);
        } finally {
            ParametricAccessorContext.clear();
        }
    }

    @Test
    void aggregatesSkipUnsolvedRows() {
        Map<String, double[]> columns = Map.of("q", new double[]{2, Double.NaN, 4});
        ParametricAccessorContext.install(1, 3, columns, List.of("q"));
        try {
            assertEquals(6.0, ParametricAccessorContext.aggregate("sum", "q"), 1e-12);
            assertEquals(3.0, ParametricAccessorContext.aggregate("avg", "q"), 1e-12);
        } finally {
            ParametricAccessorContext.clear();
        }
    }

    @Test
    void returnsSafeDefaultsWithoutContext() {
        assertEquals(1.0, ParametricAccessorContext.currentRun());
        assertEquals(0.0, ParametricAccessorContext.runCount());
        assertEquals(0.0, ParametricAccessorContext.aggregate("sum", "q"));
        assertEquals(0.0, ParametricAccessorContext.integral("q", "t"));
    }
}
