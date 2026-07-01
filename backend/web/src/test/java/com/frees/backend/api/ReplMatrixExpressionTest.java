package com.frees.backend.api;

import com.frees.backend.units.UnitRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The REPL's matrix-expression compiler: bare literals echoing into {@code ans},
 * true matrix multiplication, element-wise and broadcast operators, transpose,
 * negation, the dimension-agreement guards, and unit derivation for the
 * single-unknown implicit solve (the {@code findDimensionOfUnknown} walk).
 */
class ReplMatrixExpressionTest {

    private final ReplEvaluator evaluator =
            new ReplEvaluator(new com.frees.backend.core.EquationSystemSolver());
    private SolveContextCache cache;
    private SolveContextCache.Session session;

    @BeforeEach
    void setUp() {
        cache = new SolveContextCache();
        session = cache.session("m");
        // A = [1 2; 3 4], B = [5 6; 7 8], v3 = [1 2 3]
        assertTrue(evaluator.evaluate("A = [1 2; 3 4]", session).success());
        assertTrue(evaluator.evaluate("B = [5 6; 7 8]", session).success());
        assertTrue(evaluator.evaluate("v3 = [1 2 3]", session).success());
    }

    // --- bare literals --------------------------------------------------------

    @Test
    void bareMatrixLiteralEchoesIntoAns() {
        ReplEvaluator.Outcome o = evaluator.evaluate("[1 2; 3 4]", session);
        assertTrue(o.success(), o.error());
        assertEquals("ans", o.assignedName());
        assertEquals(1.0, session.siValues().get("ans[1,1]"));
        assertEquals(4.0, session.siValues().get("ans[2,2]"));
        assertEquals(4, o.assignedVariables().size());
    }

    @Test
    void bareVectorLiteralEvaluatesElementExpressions() {
        ReplEvaluator.Outcome o = evaluator.evaluate("[1+1 4 5]", session);
        assertTrue(o.success(), o.error());
        assertEquals(2.0, session.siValues().get("ans[1]"));
        assertEquals(5.0, session.siValues().get("ans[3]"));
    }

    // --- matrix algebra -------------------------------------------------------

    @Test
    void trueMatrixMultiplication() {
        ReplEvaluator.Outcome o = evaluator.evaluate("C = A * B", session);
        assertTrue(o.success(), o.error());
        // [1 2;3 4][5 6;7 8] = [19 22; 43 50]
        assertEquals(19.0, session.siValues().get("c[1,1]"), 1e-9);
        assertEquals(22.0, session.siValues().get("c[1,2]"), 1e-9);
        assertEquals(43.0, session.siValues().get("c[2,1]"), 1e-9);
        assertEquals(50.0, session.siValues().get("c[2,2]"), 1e-9);
    }

    @Test
    void elementWiseDivisionOfEqualShapes() {
        ReplEvaluator.Outcome o = evaluator.evaluate("D = B / B", session);
        assertTrue(o.success(), o.error());
        assertEquals(1.0, session.siValues().get("d[1,1]"), 1e-9);
        assertEquals(1.0, session.siValues().get("d[2,2]"), 1e-9);
    }

    @Test
    void scalarBroadcastsAcrossAMatrix() {
        ReplEvaluator.Outcome pow = evaluator.evaluate("E = A ^ 2", session);
        assertTrue(pow.success(), pow.error());
        assertEquals(1.0, session.siValues().get("e[1,1]"), 1e-9);
        assertEquals(16.0, session.siValues().get("e[2,2]"), 1e-9);

        ReplEvaluator.Outcome div = evaluator.evaluate("F = A / 2", session);
        assertTrue(div.success(), div.error());
        assertEquals(0.5, session.siValues().get("f[1,1]"), 1e-9);
        assertEquals(2.0, session.siValues().get("f[2,2]"), 1e-9);
    }

    @Test
    void transposeSwapsRowsAndColumns() {
        ReplEvaluator.Outcome o = evaluator.evaluate("G = Transpose(A)", session);
        assertTrue(o.success(), o.error());
        assertEquals(3.0, session.siValues().get("g[1,2]"), 1e-9);
        assertEquals(2.0, session.siValues().get("g[2,1]"), 1e-9);
    }

    @Test
    void negationAppliesElementWise() {
        ReplEvaluator.Outcome o = evaluator.evaluate("H = -A", session);
        assertTrue(o.success(), o.error());
        assertEquals(-1.0, session.siValues().get("h[1,1]"), 1e-9);
        assertEquals(-4.0, session.siValues().get("h[2,2]"), 1e-9);
    }

    // --- dimension guards -----------------------------------------------------

    @Test
    void incompatibleMultiplicationIsRejectedWithAClearMessage() {
        ReplEvaluator.Outcome o = evaluator.evaluate("C = A * v3", session);
        assertFalse(o.success());
        assertNotNull(o.error());
        assertTrue(o.error().toLowerCase().contains("dimensions"), o.error());
    }

    @Test
    void incompatibleElementWiseShapesAreRejected() {
        ReplEvaluator.Outcome o = evaluator.evaluate("C = A + v3", session);
        assertFalse(o.success());
        assertTrue(o.error().toLowerCase().contains("dimensions"), o.error());
    }

    // --- unit derivation through the implicit solve ---------------------------

    private SolveContextCache.Session unitSession() {
        cache.put("u",
                Map.of("len", 10.0),
                Map.of("len", new SolveContextCache.ReplVar(10.0, "m", null)),
                List.of("len"),
                Map.of(),
                UnitRegistry.UnitSystem.SI);
        return cache.session("u");
    }

    @Test
    void unknownScaledByAConstantInheritsTheTargetDimension() {
        SolveContextCache.Session s = unitSession();
        ReplEvaluator.Outcome o = evaluator.evaluate("2 * y = len", s);
        assertTrue(o.success(), o.error());
        assertEquals(5.0, o.value(), 1e-9);
        assertEquals("m", o.unit());
    }

    @Test
    void unknownInsideSqrtGetsTheSquaredDimension() {
        SolveContextCache.Session s = unitSession();
        ReplEvaluator.Outcome o = evaluator.evaluate("sqrt(w) = len", s);
        assertTrue(o.success(), o.error());
        assertEquals(100.0, o.value(), 1e-6);
        assertEquals("m^2", o.unit());
    }

    @Test
    void unknownInADenominatorIsDerivedThroughTheDivision() {
        SolveContextCache.Session s = unitSession();
        // len / u = 5 (dimensionless) -> u carries m
        ReplEvaluator.Outcome o = evaluator.evaluate("len / u = 5", s);
        assertTrue(o.success(), o.error());
        assertEquals(2.0, o.value(), 1e-9);
        assertEquals("m", o.unit());
    }

    @Test
    void unknownInASumInheritsTheSharedDimension() {
        SolveContextCache.Session s = unitSession();
        ReplEvaluator.Outcome o = evaluator.evaluate("len + q = 15", s);
        assertTrue(o.success(), o.error());
        assertEquals(5.0, o.value(), 1e-9);
    }

    @Test
    void unknownInsideAbsKeepsTheTargetDimension() {
        SolveContextCache.Session s = unitSession();
        ReplEvaluator.Outcome o = evaluator.evaluate("abs(r) = len", s);
        assertTrue(o.success(), o.error());
        assertEquals("m", o.unit());
    }
}
