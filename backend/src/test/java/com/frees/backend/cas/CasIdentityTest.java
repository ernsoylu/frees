package com.frees.backend.cas;

import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CasIdentityTest {

    private static Map<String, Double> solve(String lhs, String rhs, String var) {
        Expr l = CasExpressions.parse(lhs);
        Expr r = CasExpressions.parse(rhs);
        return CasIdentity.solveCoefficients(l, r, var);
    }

    @Test
    void solvesPartialFractionResidues() {
        // (s+3)/((s+1)(s+2)) = A/(s+1) + B/(s+2)  ->  A=2, B=-1
        Map<String, Double> c = solve("(s + 3)/(s^2 + 3*s + 2)", "a/(s+1) + b/(s+2)", "s");

        assertEquals(2.0, c.get("a"), 1e-9);
        assertEquals(-1.0, c.get("b"), 1e-9);
    }

    @Test
    void solvesResiduesWithPoleAtOrigin() {
        // (2s+1)/(s(s+1)) = A/s + B/(s+1)  ->  A=1, B=1
        Map<String, Double> c = solve("(2*s + 1)/(s^2 + s)", "a/s + b/(s+1)", "s");

        assertEquals(1.0, c.get("a"), 1e-9);
        assertEquals(1.0, c.get("b"), 1e-9);
    }

    @Test
    void solvesRepeatedPoleResidues() {
        // (s+3)/(s+1)^2 = A/(s+1) + B/(s+1)^2  ->  A=1, B=2
        Map<String, Double> c = solve("(s + 3)/(s^2 + 2*s + 1)", "a/(s+1) + b/(s+1)^2", "s");

        assertEquals(1.0, c.get("a"), 1e-9);
        assertEquals(2.0, c.get("b"), 1e-9);
    }

    @Test
    void solvesIrreducibleQuadraticTerm() {
        // (s^2 + 2)/((s+1)(s^2+s+1)) = A/(s+1) + (B*s + C)/(s^2+s+1).
        // Verify numerically: the reconstructed RHS matches the LHS for all s.
        Map<String, Double> c = solve(
                "(s^2 + 2)/((s+1)*(s^2 + s + 1))",
                "a/(s+1) + (b*s + d)/(s^2 + s + 1)", "s");
        double a = c.get("a");
        double b = c.get("b");
        double d = c.get("d");

        for (double s : new double[]{-3, 0, 2, 5.5}) {
            double lhs = (s * s + 2) / ((s + 1) * (s * s + s + 1));
            double rhs = a / (s + 1) + (b * s + d) / (s * s + s + 1);
            assertEquals(lhs, rhs, 1e-9, "decomposition mismatch at s=" + s);
        }
    }

    @Test
    void rejectsInconsistentIdentity() {
        // 1/(s+1) can never equal A/(s+2) for all s.
        assertThrows(CasEngine.CasException.class,
                () -> solve("1/(s+1)", "a/(s+2)", "s"));
    }
}
