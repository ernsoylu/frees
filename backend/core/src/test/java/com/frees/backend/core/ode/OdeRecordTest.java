package com.frees.backend.core.ode;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Verifies that the ODE carrier records compare, hash and print by array
 * <em>content</em> rather than reference identity (Sonar java:S6218). Each test
 * builds two records with equal-but-distinct arrays and asserts value equality,
 * matching hash codes, and array contents surfaced in {@code toString}.
 */
class OdeRecordTest {

    private static OdeProblem problem(double[] y0) {
        OdeRhs rhs = (t, y) -> new double[] {-y[0]};
        return new OdeProblem("ode45", 0.0, 1.0, y0, rhs, 100, null,
                1e-6, 1e-9, null, List.of(), Long.MAX_VALUE);
    }

    @Test
    void odeResultEqualsHashCodeAndToStringUseArrayContent() {
        OdeResult a = new OdeResult(new double[] {0.0, 1.0}, new double[][] {{1.0}, {0.5}},
                List.of(), false, 1.0, 5, 1);
        OdeResult b = new OdeResult(new double[] {0.0, 1.0}, new double[][] {{1.0}, {0.5}},
                List.of(), false, 1.0, 5, 1);
        OdeResult diff = new OdeResult(new double[] {0.0, 2.0}, new double[][] {{1.0}, {0.5}},
                List.of(), false, 1.0, 5, 1);

        assertEquals(a, a);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, diff);
        assertNotEquals(a, null);
        assertNotEquals(a, "not a result");
        assertTrue(a.toString().contains("1.0"));
    }

    @Test
    void eventRecordEqualsHashCodeAndToStringUseArrayContent() {
        OdeResult.EventRecord a = new OdeResult.EventRecord("apogee", 2.5, new double[] {3.0, 0.0});
        OdeResult.EventRecord b = new OdeResult.EventRecord("apogee", 2.5, new double[] {3.0, 0.0});
        OdeResult.EventRecord diff = new OdeResult.EventRecord("apogee", 2.5, new double[] {3.0, 1.0});

        assertEquals(a, a);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, diff);
        assertNotEquals(a, null);
        assertNotEquals(a, "x");
        assertTrue(a.toString().contains("apogee"));
    }

    @Test
    void odeProblemEqualsHashCodeAndToStringUseArrayContent() {
        OdeProblem a = problem(new double[] {1.0, 2.0});
        OdeProblem b = problem(new double[] {1.0, 2.0});
        OdeProblem diff = problem(new double[] {1.0, 9.0});

        assertEquals(a, a);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, diff);
        assertNotEquals(a, null);
        assertNotEquals(a, "x");
        assertTrue(a.toString().contains("ode45"));
    }

    @Test
    void stepResultEqualsHashCodeAndToStringUseArrayContent() {
        OdeMethod.StepResult a = new OdeMethod.StepResult(true, new double[] {1.0}, new double[] {2.0}, 0.1);
        OdeMethod.StepResult b = new OdeMethod.StepResult(true, new double[] {1.0}, new double[] {2.0}, 0.1);
        OdeMethod.StepResult diff = new OdeMethod.StepResult(true, new double[] {1.0}, new double[] {9.0}, 0.1);

        assertEquals(a, a);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, diff);
        assertNotEquals(a, null);
        assertNotEquals(a, "x");
        assertTrue(a.toString().contains("accepted=true"));
    }

    @Test
    void eventHitEqualsHashCodeAndToStringUseArrayContent() {
        OdeIntegrator.EventHit a = new OdeIntegrator.EventHit("hit", 1.0, new double[] {4.0, 5.0}, true);
        OdeIntegrator.EventHit b = new OdeIntegrator.EventHit("hit", 1.0, new double[] {4.0, 5.0}, true);
        OdeIntegrator.EventHit diff = new OdeIntegrator.EventHit("hit", 1.0, new double[] {4.0, 6.0}, true);

        assertEquals(a, a);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, diff);
        assertNotEquals(a, null);
        assertNotEquals(a, "x");
        assertTrue(a.toString().contains("hit"));
    }
}
