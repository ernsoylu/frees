package com.frees.backend.cas;

import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TransferFunctionTest {

    private static double at(Expr e, double s) {
        return Evaluator.eval(e, Map.of("s", s));
    }

    @Test
    void polynomialUsesDescendingPowers() {
        // [1, 3, 2] -> s^2 + 3s + 2
        Expr poly = TransferFunction.polynomial(new double[]{1, 3, 2}, "s");
        for (double s : new double[]{-2, 0, 1, 3.5}) {
            assertEquals(s * s + 3 * s + 2, at(poly, s), 1e-12, "at s=" + s);
        }
    }

    @Test
    void polynomialHandlesNegativeAndZeroCoefficients() {
        // [2, 0, -5] -> 2s^2 - 5
        Expr poly = TransferFunction.polynomial(new double[]{2, 0, -5}, "s");
        for (double s : new double[]{-3, 0, 2}) {
            assertEquals(2 * s * s - 5, at(poly, s), 1e-12, "at s=" + s);
        }
    }

    @Test
    void fractionBuildsRatioOfPolynomials() {
        Expr tf = TransferFunction.fraction(new double[]{1, 3}, new double[]{1, 3, 2}, "s");
        for (double s : new double[]{-5, 0, 1, 4.25}) {
            double expected = (s + 3) / (s * s + 3 * s + 2);
            assertEquals(expected, at(tf, s), 1e-12, "at s=" + s);
        }
    }
}
