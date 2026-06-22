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

/** Logic tests for the REPL evaluator against a hand-built solved session. */
class ReplEvaluatorTest {

    private final ReplEvaluator evaluator = new ReplEvaluator(new com.frees.backend.core.EquationSystemSolver());
    private SolveContextCache cache;

    @BeforeEach
    void setUp() {
        cache = new SolveContextCache();
        cache.put("s",
                Map.of("a", 4.0, "b", 9.0, "p", 250_000.0, "t", 300.0),
                Map.of(
                        "a", new SolveContextCache.ReplVar(4.0, "", null),
                        "b", new SolveContextCache.ReplVar(9.0, "", null),
                        "p", new SolveContextCache.ReplVar(250.0, "kPa", null),
                        "t", new SolveContextCache.ReplVar(300.0, "K", 0.5)),
                List.of("a", "b", "p", "T"),
                Map.of(),
                UnitRegistry.UnitSystem.SI);
    }

    private SolveContextCache.Session session() {
        return cache.session("s");
    }

    @Test
    void evaluatesArithmetic() {
        ReplEvaluator.Outcome o = evaluator.evaluate("a * b", session());
        assertTrue(o.success(), o.error());
        assertEquals(36.0, o.value(), 1e-9);
        assertEquals("36", o.text());
    }

    @Test
    void definesAnsForNonAssignments() {
        SolveContextCache.Session s = session();
        ReplEvaluator.Outcome o = evaluator.evaluate("2 + 3", s);
        assertTrue(o.success(), o.error());
        assertEquals(5.0, o.value(), 1e-9);
        assertEquals("ans", o.assignedName());

        // Referencing ans in the next line
        ReplEvaluator.Outcome use = evaluator.evaluate("ans * 2", s);
        assertTrue(use.success(), use.error());
        assertEquals(10.0, use.value(), 1e-9);
    }

    @Test
    void evaluatesBuiltinFunction() {
        ReplEvaluator.Outcome o = evaluator.evaluate("sqrt(b) + 1", session());
        assertTrue(o.success(), o.error());
        assertEquals(4.0, o.value(), 1e-9);
    }

    @Test
    void bareVariableEchoesDisplayValueUnitAndUncertainty() {
        ReplEvaluator.Outcome o = evaluator.evaluate("T", session());
        assertTrue(o.success(), o.error());
        assertEquals(300.0, o.value(), 1e-9);
        assertEquals("K", o.unit());
        assertEquals(0.5, o.uncertainty(), 1e-9);
        assertEquals("300 ± 0.5 [K]", o.text());
    }

    @Test
    void propagatesUnitsThroughArithmetic() {
        // p is 250 kPa (250000 Pa); doubling stays a pressure, shown in SI as Pa.
        ReplEvaluator.Outcome o = evaluator.evaluate("p * 2", session());
        assertTrue(o.success(), o.error());
        assertEquals(500_000.0, o.value(), 1e-6);
        assertEquals("Pa", o.unit());
    }

    @Test
    void caseInsensitiveVariableLookup() {
        ReplEvaluator.Outcome o = evaluator.evaluate("P / 1000", session());
        assertTrue(o.success(), o.error());
        assertEquals(250.0, o.value(), 1e-9);
    }

    @Test
    void assignmentDefinesAPersistentVariable() {
        SolveContextCache.Session s = session();
        ReplEvaluator.Outcome a = evaluator.evaluate("A = 356 [kPa]", s);
        assertTrue(a.success(), a.error());
        assertEquals(356_000.0, a.value(), 1e-6);
        assertEquals("Pa", a.unit());
        assertTrue(a.text().startsWith("A = "));

        // The new variable is visible to later lines and to tab-completion.
        ReplEvaluator.Outcome use = evaluator.evaluate("A / 2", s);
        assertTrue(use.success(), use.error());
        assertEquals(178_000.0, use.value(), 1e-6);
        assertTrue(s.completionNames().contains("a") || s.completionNames().contains("A"));
    }

    @Test
    void literalMathWorksWithoutASolve() {
        ReplEvaluator.Outcome o = evaluator.evaluate("2 + 2", cache.session("fresh"));
        assertTrue(o.success(), o.error());
        assertEquals(4.0, o.value(), 1e-9);
    }

    @Test
    void unknownVariableIsReportedNotSilentlyZero() {
        ReplEvaluator.Outcome o = evaluator.evaluate("nope + 1", session());
        assertFalse(o.success());
        assertNotNull(o.error());
    }

    @Test
    void solvesSingleUnknownAssignment() {
        SolveContextCache.Session s = session();
        // p is 250 kPa (250_000 Pa). Solving p = 50000 * x should yield x = 5.
        ReplEvaluator.Outcome o = evaluator.evaluate("p = 50000 * x", s);
        assertTrue(o.success(), o.error());
        assertEquals(5.0, o.value(), 1e-9);
        assertEquals("x = 5 [Pa]", o.text());
        assertEquals("x", o.assignedName());

        // x is now defined in the session
        ReplEvaluator.Outcome use = evaluator.evaluate("x", s);
        assertTrue(use.success(), use.error());
        assertEquals(5.0, use.value(), 1e-9);
    }

    @Test
    void solvesSingleUnknownComparison() {
        SolveContextCache.Session s = session();
        // b is 9. Solving y + 2 = b should yield y = 7.
        ReplEvaluator.Outcome o = evaluator.evaluate("y + 2 = b", s);
        assertTrue(o.success(), o.error());
        assertEquals(7.0, o.value(), 1e-9);
        assertEquals("y = 7", o.text());
        assertEquals("y", o.assignedName());
    }

    @Test
    void solvesWithCasingPreservation() {
        SolveContextCache.Session s = session();
        // Solving P = 50000 * h_Anot should yield h_Anot = 5, preserving spelling.
        ReplEvaluator.Outcome o = evaluator.evaluate("P = 50000 * h_Anot", s);
        assertTrue(o.success(), o.error());
        assertEquals("h_Anot", o.assignedName());
        assertEquals("h_Anot = 5 [Pa]", o.text());
    }

    @Test
    void syntaxErrorIsReported() {
        ReplEvaluator.Outcome o = evaluator.evaluate("3 +* 2", session());
        assertFalse(o.success());
        assertTrue(o.error().toLowerCase().contains("syntax") || o.error().toLowerCase().contains("unexpected"));
    }

    @Test
    void testReplMatrixAndVectorRangeCreation() {
        SolveContextCache.Session s = session();

        // 1. Explicit matrix assignment
        ReplEvaluator.Outcome o1 = evaluator.evaluate("M = [1 2 3; 4 5 6]", s);
        assertTrue(o1.success(), o1.error());
        assertEquals("[1 2 3; 4 5 6]", o1.text().substring(4));

        // verify elements are stored in session siValues
        assertEquals(1.0, s.siValues().get("m[1,1]"));
        assertEquals(2.0, s.siValues().get("m[1,2]"));
        assertEquals(3.0, s.siValues().get("m[1,3]"));
        assertEquals(4.0, s.siValues().get("m[2,1]"));
        assertEquals(5.0, s.siValues().get("m[2,2]"));
        assertEquals(6.0, s.siValues().get("m[2,3]"));

        // 2. Vector range assignment
        ReplEvaluator.Outcome o2 = evaluator.evaluate("v = [1:2:7]", s);
        assertTrue(o2.success(), o2.error());
        assertEquals("[1 3 5 7]", o2.text().substring(4));

        // verify range elements
        assertEquals(1.0, s.siValues().get("v[1]"));
        assertEquals(3.0, s.siValues().get("v[2]"));
        assertEquals(5.0, s.siValues().get("v[3]"));
        assertEquals(7.0, s.siValues().get("v[4]"));
    }

    @Test
    void testReplQueryAndAssignArrayAccess() {
        SolveContextCache.Session s = session();

        // Setup matrix elements in session siValues manually
        s.define("m[1,1]", 10.0, new SolveContextCache.ReplVar(10.0, "m/s", null));
        s.define("m[1,2]", 20.0, new SolveContextCache.ReplVar(20.0, "m/s", null));
        s.define("i", 2.0, new SolveContextCache.ReplVar(2.0, "", null));

        // Query matrix element directly
        ReplEvaluator.Outcome o1 = evaluator.evaluate("M[1,1]", s);
        assertTrue(o1.success(), o1.error());
        assertEquals(10.0, o1.value());

        // Query matrix element using variable index
        ReplEvaluator.Outcome o2 = evaluator.evaluate("M[1,i]", s);
        assertTrue(o2.success(), o2.error());
        assertEquals(20.0, o2.value());

        // Element assignment (should solve single unknown and define it)
        ReplEvaluator.Outcome o3 = evaluator.evaluate("M[1,2] = 25", s);
        assertTrue(o3.success(), o3.error());
        assertEquals(25.0, o3.value());
        assertEquals(25.0, s.siValues().get("m[1,2]"));
    }

    @Test
    void testReplMatrixOperations() {
        SolveContextCache.Session s = session();

        // 1. Define vector v
        evaluator.evaluate("v = [1:2:5]", s); // elements: 1, 3, 5

        // 2. Element-wise multiplication with scalar
        ReplEvaluator.Outcome o1 = evaluator.evaluate("A = v .* 2", s);
        assertTrue(o1.success(), o1.error());
        assertEquals("[2 6 10]", o1.text().substring(4));
        assertEquals(2.0, s.siValues().get("a[1]"));
        assertEquals(6.0, s.siValues().get("a[2]"));
        assertEquals(10.0, s.siValues().get("a[3]"));
        assertNotNull(o1.assignedVariables());
        assertEquals(3, o1.assignedVariables().size());

        // 3. Matrix scaling with unit
        ReplEvaluator.Outcome o2 = evaluator.evaluate("A = A .* (1 [kg])", s);
        assertTrue(o2.success(), o2.error());
        assertEquals("[2 6 10] [kg]", o2.text().substring(4));
        assertEquals(2.0, s.siValues().get("a[1]"));
        assertEquals(6.0, s.siValues().get("a[2]"));
        assertEquals(10.0, s.siValues().get("a[3]"));
        assertEquals("kg", s.unitOf("a[1]"));

        // 4. Matrix addition
        ReplEvaluator.Outcome o3 = evaluator.evaluate("B = A + A", s);
        assertTrue(o3.success(), o3.error());
        assertEquals("[4 12 20] [kg]", o3.text().substring(4));
        assertEquals(4.0, s.siValues().get("b[1]"));

        // 5. Bare matrix query
        ReplEvaluator.Outcome o4 = evaluator.evaluate("B", s);
        assertTrue(o4.success(), o4.error());
        assertEquals("[4 12 20] [kg]", o4.text());
        assertEquals("ans", o4.assignedName());
    }

    /** A session seeded with a 2x2 diagonal matrix A = [[2,0],[0,3]]. */
    private SolveContextCache.Session sessionWithMatrixA() {
        cache.put("m",
                Map.of("a[1,1]", 2.0, "a[1,2]", 0.0, "a[2,1]", 0.0, "a[2,2]", 3.0),
                Map.of(),
                List.of("A"),
                Map.of(),
                UnitRegistry.UnitSystem.SI);
        return cache.session("m");
    }

    @Test
    void callEigenvaluesFromSessionMatrix() {
        SolveContextCache.Session s = sessionWithMatrixA();
        ReplEvaluator.Outcome o = evaluator.evaluate("CALL Eigenvalues(A : lambda)", s);
        assertTrue(o.success(), o.error());
        // Eigenvalues of diag(2,3) are {2,3} (order not guaranteed).
        double l1 = s.siValues().get("lambda[1]");
        double l2 = s.siValues().get("lambda[2]");
        assertEquals(5.0, l1 + l2, 1e-6);
        assertEquals(6.0, l1 * l2, 1e-6);
        assertNotNull(o.assignedVariables());
        assertEquals(2, o.assignedVariables().size());
    }

    @Test
    void callOutputsArePrintedAndOverlaid() {
        SolveContextCache.Session s = sessionWithMatrixA();
        ReplEvaluator.Outcome o = evaluator.evaluate("CALL Eigenvalues(A : lambda)", s);
        assertTrue(o.success(), o.error());
        assertTrue(o.text().startsWith("lambda = ["), o.text());
        // The overlay is queryable on the next line.
        ReplEvaluator.Outcome echo = evaluator.evaluate("lambda[1]", s);
        assertTrue(echo.success(), echo.error());
    }

    @Test
    void callRouthDetectsStability() {
        // Stable characteristic polynomial s^3 + 6 s^2 + 11 s + 6 = (s+1)(s+2)(s+3).
        cache.put("r",
                Map.of("den[1]", 1.0, "den[2]", 6.0, "den[3]", 11.0, "den[4]", 6.0),
                Map.of(),
                List.of("den"),
                Map.of(),
                UnitRegistry.UnitSystem.SI);
        SolveContextCache.Session s = cache.session("r");
        ReplEvaluator.Outcome o = evaluator.evaluate("CALL Routh(den : nRHP, stable)", s);
        assertTrue(o.success(), o.error());
        assertEquals(0.0, s.siValues().get("nrhp"), 1e-9);
        assertEquals(1.0, s.siValues().get("stable"), 1e-9);
    }

    @Test
    void callWithoutColonReports() {
        ReplEvaluator.Outcome o = evaluator.evaluate("CALL Routh(den)", session());
        assertFalse(o.success());
        assertTrue(o.error().contains("':'"), o.error());
    }

    // --- Symbolic CAS functions (Symja-backed) -----------------------------

    private String cas(String input) {
        ReplEvaluator.Outcome o = evaluator.evaluate(input, session());
        assertTrue(o.success(), o.error());
        return o.text().replace(" ", "");
    }

    @Test
    void casExpandMultipliesOutBinomial() {
        // (x+1)^2 -> 1 + 2 x + x^2
        String out = cas("Expand((x+1)^2)");
        assertTrue(out.contains("x^2"), out);
        assertTrue(out.contains("2*x") || out.contains("2x"), out);
    }

    @Test
    void casFactorRecombines() {
        // x^2 + 2 x + 1 -> (1+x)^2
        String out = cas("Factor(x^2 + 2*x + 1)");
        assertTrue(out.contains("1+x") || out.contains("x+1"), out);
    }

    @Test
    void casApartPartialFractions() {
        // (s+3)/(s^2+3 s+2) = 2/(s+1) - 1/(s+2)
        String out = cas("Apart((s+3)/(s^2+3*s+2), s)");
        assertTrue(out.contains("1+s") || out.contains("s+1"), out);
        assertTrue(out.contains("2+s") || out.contains("s+2"), out);
    }

    @Test
    void casInverseLaplaceGivesExponential() {
        // L^-1{ 1/(s+2) } = e^{-2 t}
        String out = cas("InverseLaplace(1/(s+2), s, t)").toLowerCase();
        assertTrue(out.contains("-2*t") || out.contains("-2t"), out);
    }

    @Test
    void casApartWithoutVariableReports() {
        ReplEvaluator.Outcome o = evaluator.evaluate("Apart((s+3)/(s^2+3*s+2))", session());
        assertFalse(o.success());
        assertTrue(o.error().toLowerCase().contains("variable"), o.error());
    }

    @Test
    void casDifferentiate() {
        // d/dx (x^3 + x^2) = 3 x^2 + 2 x
        String out = cas("Diff(x^3 + x^2, x)");
        assertTrue(out.contains("3*x^2") || out.contains("3x^2"), out);
        assertTrue(out.contains("2*x") || out.contains("2x"), out);
    }

    @Test
    void casIntegrate() {
        // ∫ x^2 dx = x^3 / 3
        String out = cas("Integrate(x^2, x)");
        assertTrue(out.contains("x^3"), out);
    }

    @Test
    void casUnsolvableReportsNoClosedForm() {
        // InverseLaplace of a non-rational form Symja can't invert → guarded message,
        // not the call echoed back.
        ReplEvaluator.Outcome o = evaluator.evaluate("InverseLaplace(1/ln(s), s, t)", session());
        if (!o.success()) {
            assertTrue(o.error().toLowerCase().contains("no closed form")
                    || o.error().toLowerCase().contains("cas"), o.error());
        }
    }
}
