package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EquationParserTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void parsesSimpleEquations() {
        List<Equation> equations = parser.parse("x + y = 3\ny = z - 4\nz = x^2 - 3");
        assertEquals(3, equations.size());
        assertEquals(Set.of("x", "y"), equations.get(0).variables());
        assertEquals(Set.of("y", "z"), equations.get(1).variables());
        assertEquals(Set.of("x", "z"), equations.get(2).variables());
    }

    @Test
    void acceptsSemicolonSeparators() {
        assertEquals(3, parser.parse("x+y=3; y=z-4; z=x^2-3").size());
    }

    @Test
    void variableNamesAreCaseInsensitive() {
        List<Equation> equations = parser.parse("X + x = 4");
        assertEquals(Set.of("x"), equations.get(0).variables());
    }

    @Test
    void skipsBraceAndQuoteComments() {
        List<Equation> equations = parser.parse(
                "{ this is a comment } x = 2 \"another comment\"\ny = x + 1");
        assertEquals(2, equations.size());
    }

    @Test
    void evaluatesOperatorPrecedence() {
        Equation eq = parser.parse("q = 2 + 3 * 4 ^ 2").get(0);
        assertEquals(50.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-12);
    }

    @Test
    void powerIsRightAssociative() {
        Equation eq = parser.parse("q = 2 ^ 3 ^ 2").get(0);
        assertEquals(512.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-12);
    }

    @Test
    void parsesScientificNotation() {
        Equation eq = parser.parse("q = 1.5e3 + 0.5E-1").get(0);
        assertEquals(1500.05, Evaluator.eval(eq.rhs(), Map.of()), 1e-12);
    }

    @Test
    void parsesFunctionCalls() {
        Equation eq = parser.parse("q = SQRT(16) + Max(2, 5)").get(0);
        assertEquals(9.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-12);
    }

    @Test
    void rejectsInvalidSyntax() {
        assertThrows(EquationParser.ParseException.class, () -> parser.parse("x + = 3"));
    }
}
