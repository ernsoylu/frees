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
    void rejectsInconsistentIdentity() {
        // 1/(s+1) can never equal A/(s+2) for all s.
        assertThrows(CasEngine.CasException.class,
                () -> solve("1/(s+1)", "a/(s+2)", "s"));
    }
}
