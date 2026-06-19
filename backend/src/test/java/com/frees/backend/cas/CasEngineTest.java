package com.frees.backend.cas;

import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CasEngineTest {

    private final CasEngine cas = new CasEngine();

    /** Evaluates a result expression at a single variable assignment. */
    private static double at(Expr e, String var, double value) {
        return Evaluator.eval(e, Map.of(var, value));
    }

    @Test
    void factorPreservesValueAndFactors() {
        CasEngine.CasResult r = cas.factor("x^2 - 1");

        // Symbolically a product of the two linear factors.
        assertTrue(r.symjaOutput().contains("x"), "should still be in terms of x: " + r.symjaOutput());
        assertFalse(r.latex().isBlank(), "latex should be rendered");

        // Numerically identical to the input across sample points.
        for (double x : new double[]{-3, -1, 0, 2, 5.5}) {
            assertEquals(x * x - 1, at(r.expr(), "x", x), 1e-9, "factor changed the value at x=" + x);
        }
    }

    @Test
    void expandMatchesPolynomial() {
        CasEngine.CasResult r = cas.expand("(x + 1)^2");

        for (double x : new double[]{-2, 0, 1, 4.25}) {
            double expected = (x + 1) * (x + 1);
            assertEquals(expected, at(r.expr(), "x", x), 1e-9, "expand changed the value at x=" + x);
        }
    }

    @Test
    void simplifyPythagoreanIdentityIsOne() {
        CasEngine.CasResult r = cas.simplify("sin(x)^2 + cos(x)^2");

        assertEquals("1", r.symjaOutput(), "trig identity should simplify to 1");
        assertEquals(1.0, at(r.expr(), "x", 0.7), 1e-9);
    }

    @Test
    void naturalLogRoundTripsAsLn() {
        // Symja prints natural log as Log(...); the normalizer must turn it back
        // into frees' ln(...) so the result evaluates correctly.
        CasEngine.CasResult r = cas.simplify("ln(x) + ln(x)");
        assertEquals(2.0 * Math.log(3.0), at(r.expr(), "x", 3.0), 1e-9);
    }

    @Test
    void partialFractionResiduesMatchOriginal() {
        // (s+3)/((s+1)(s+2)) = 2/(s+1) - 1/(s+2): the Laplace residue workflow.
        CasEngine.CasResult r = cas.apart("(s + 3)/(s^2 + 3*s + 2)", "s");

        for (double s : new double[]{-5, -3, 0, 1.5, 4}) {
            double expected = (s + 3) / (s * s + 3 * s + 2);
            assertEquals(expected, at(r.expr(), "s", s), 1e-9, "partial fractions changed value at s=" + s);
        }
        // Decomposed form should be a sum of two simple fractions, not the original quadratic.
        assertFalse(r.symjaOutput().contains("^2"), "expected simple fractions: " + r.symjaOutput());
    }

    @Test
    void apartAcceptsBuiltTransferFunction() {
        var tf = TransferFunction.fraction(new double[]{1, 3}, new double[]{1, 3, 2}, "s");
        CasEngine.CasResult r = cas.apart(tf, "s");

        for (double s : new double[]{-5, 0, 2.25}) {
            double expected = (s + 3) / (s * s + 3 * s + 2);
            assertEquals(expected, at(r.expr(), "s", s), 1e-9);
        }
    }

    @Test
    void rejectsArrayExpressions() {
        assertThrows(CasEngine.CasException.class, () -> cas.factor("[1, 2, 3]"));
    }

    @Test
    void rejectsUnparseableInput() {
        assertThrows(CasEngine.CasException.class, () -> cas.factor("x +"));
    }
}
