package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SymbolicIdentityTest {

    private final EquationParser parser = new EquationParser();

    /** Maps each "var = value" equation to its numeric value. */
    private static Map<String, Double> values(List<Equation> equations) {
        Map<String, Double> out = new HashMap<>();
        for (Equation eq : equations) {
            if (eq.lhs() instanceof Expr.Var(String name)) {
                out.put(name, Evaluator.eval(eq.rhs(), Map.of()));
            }
        }
        return out;
    }

    @Test
    void partialFractionIdentityBecomesResidueEquations() {
        List<Equation> equations = parser.parse(
                "SYMBOLIC s\n(s + 3)/(s^2 + 3*s + 2) = A/(s+1) + B/(s+2)");

        Map<String, Double> v = values(equations);
        assertEquals(2.0, v.get("a"), 1e-9);
        assertEquals(-1.0, v.get("b"), 1e-9);

        // The symbolic variable must NOT leak into the equation system as an unknown.
        for (Equation eq : equations) {
            assertFalse(eq.variables().contains("s"), "s should not appear as an unknown: " + eq.variables());
        }
    }

    @Test
    void residuesCombineWithOrdinaryEquations() {
        // A and B are ordinary variables afterwards: a downstream equation can use them.
        List<Equation> equations = parser.parse(
                "SYMBOLIC s\n(s + 3)/(s^2 + 3*s + 2) = A/(s+1) + B/(s+2)\nk = A + B");
        // The identity contributes a=2, b=-1; the third line stays a normal equation.
        assertTrue(equations.stream().anyMatch(e -> e.variables().contains("k")),
                "the ordinary k equation should survive");
    }

    @Test
    void rejectsInconsistentIdentity() {
        assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("SYMBOLIC s\n1/(s+1) = A/(s+2)"));
    }
}
