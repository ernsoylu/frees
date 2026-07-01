package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 2: array-language-style range generation that fills an array variable,
 * e.g. speed = 0:10:100 | Linear  and  freq = 1:5:1000 | Log.
 */
class CodeRangeTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void linearRangeWithStepFillsArray() {
        var result = solver.solve("""
                speed = 0:10:100
                a = speed[1]
                b = speed[3]
                c = speed[11]
                """);
        assertEquals(0.0, result.variables().get("a"), 1e-9);
        assertEquals(20.0, result.variables().get("b"), 1e-9);
        assertEquals(100.0, result.variables().get("c"), 1e-9);
    }

    @Test
    void twoNumberFormDefaultsToStepOne() {
        var result = solver.solve("""
                n = 1:5
                first = n[1]
                last = n[5]
                """);
        assertEquals(1.0, result.variables().get("first"), 1e-9);
        assertEquals(5.0, result.variables().get("last"), 1e-9);
    }

    @Test
    void negativeStepCountsDown() {
        var result = solver.solve("""
                t = 50:-10:0
                a = t[1]
                b = t[6]
                """);
        assertEquals(50.0, result.variables().get("a"), 1e-9);
        assertEquals(0.0, result.variables().get("b"), 1e-9);
    }

    @Test
    void explicitLinearFlagWorks() {
        var result = solver.solve("""
                x = -50:50:50 | Linear
                a = x[1]
                b = x[3]
                """);
        assertEquals(-50.0, result.variables().get("a"), 1e-9);
        assertEquals(50.0, result.variables().get("b"), 1e-9);
    }

    @Test
    void logRangeSpacesGeometrically() {
        // 5 points from 1 to 1000: 1, 10^0.75, 10^1.5, 10^2.25, 1000
        var result = solver.solve("""
                freq = 1:5:1000 | Log
                f1 = freq[1]
                f3 = freq[3]
                f5 = freq[5]
                """);
        assertEquals(1.0, result.variables().get("f1"), 1e-9);
        assertEquals(Math.pow(10, 1.5), result.variables().get("f3"), 1e-6);
        assertEquals(1000.0, result.variables().get("f5"), 1e-9);
    }

    @Test
    void rangeArrayWorksWithSum() {
        var result = solver.solve("""
                v = 1:1:10
                total = Sum(v[1:10])
                """);
        assertEquals(55.0, result.variables().get("total"), 1e-9);
    }
}
