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

    @Test
    void unitAnnotatedConstantsAreConvertedToSi() {
        // All calculations run in SI: 140 kPa becomes 140000 Pa at parse time.
        Equation eq = parser.parse("P = 140 [kPa]").get(0);
        assertEquals(140000.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-9);
        assertEquals("Pa", ((com.frees.backend.ast.Expr.Num) eq.rhs()).unit());

        Equation mass = parser.parse("m = 120 [lb]").get(0);
        assertEquals(54.4310844, Evaluator.eval(mass.rhs(), Map.of()), 1e-6);
        assertEquals("kg", ((com.frees.backend.ast.Expr.Num) mass.rhs()).unit());
    }

    @Test
    void convertFoldsToConstantFactor() {
        Equation eq = parser.parse("A = Convert(ft^2, in^2)").get(0);
        assertEquals(144.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-9);
    }

    @Test
    void convertInsideExpression() {
        Equation eq = parser.parse("L_in = 2 * Convert(ft, in)").get(0);
        assertEquals(24.0, Evaluator.eval(eq.rhs(), Map.of()), 1e-9);
    }

    @Test
    void convertTempIsAffine() {
        Equation eq = parser.parse("T = ConvertTemp(C, K, 25)").get(0);
        assertEquals(298.15, Evaluator.eval(eq.rhs(), Map.of()), 1e-9);

        Equation boiling = parser.parse("T = ConvertTemp(F, C, 212)").get(0);
        assertEquals(100.0, Evaluator.eval(boiling.rhs(), Map.of()), 1e-9);

        Equation rankine = parser.parse("T = ConvertTemp(K, R, 100)").get(0);
        assertEquals(180.0, Evaluator.eval(rankine.rhs(), Map.of()), 1e-9);
    }

    @Test
    void bareTemperatureAnnotationsConvertAffinely() {
        Equation celsius = parser.parse("T = 25 [C]").get(0);
        assertEquals(298.15, Evaluator.eval(celsius.rhs(), Map.of()), 1e-9);
        assertEquals("K", ((com.frees.backend.ast.Expr.Num) celsius.rhs()).unit());

        Equation fahrenheit = parser.parse("T = 80 [F]").get(0);
        assertEquals(299.81666666666666, Evaluator.eval(fahrenheit.rhs(), Map.of()), 1e-9);
    }

    @Test
    void convertTempRejectsUnknownScale() {
        assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("T = ConvertTemp(X, K, 25)"));
    }

    @Test
    void convertWithUnknownUnitFailsAtParseTime() {
        assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("x = Convert(blorbs, kg)"));
    }

    @Test
    void convertWithMismatchedDimensionsFailsAtParseTime() {
        assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("x = Convert(kg, m)"));
    }
}
