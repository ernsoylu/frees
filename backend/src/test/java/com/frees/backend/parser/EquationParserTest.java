package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
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

    @Test
    void parsesSimpleArrayAccess() {
        List<Equation> equations = parser.parse("X[1] = 5\nY = X[1] + 2");
        assertEquals(2, equations.size());
        assertEquals("x[1]", ((com.frees.backend.ast.Expr.Var) equations.get(0).lhs()).name());
    }

    @Test
    void parsesDuplicateLoop() {
        List<Equation> equations = parser.parse(
                "N = 3\n" +
                "Duplicate i = 1, N\n" +
                "   X[i] = i * 2\n" +
                "End"
        );
        // N = 3 (1 equation) plus 3 duplicated equations = 4 equations
        assertEquals(4, equations.size());

        // Check the generated equations: X[1] = 1 * 2, X[2] = 2 * 2, X[3] = 3 * 2
        assertEquals("x[1]", ((com.frees.backend.ast.Expr.Var) equations.get(1).lhs()).name());
        assertEquals("x[2]", ((com.frees.backend.ast.Expr.Var) equations.get(2).lhs()).name());
        assertEquals("x[3]", ((com.frees.backend.ast.Expr.Var) equations.get(3).lhs()).name());
    }

    @Test
    void parsesNestedDuplicateLoops() {
        List<Equation> equations = parser.parse(
                "Duplicate i = 1, 2\n" +
                "   Duplicate j = 1, 3\n" +
                "      A[i,j] = i + j\n" +
                "   End\n" +
                "End"
        );
        // Generates 2 * 3 = 6 equations
        assertEquals(6, equations.size());
        assertEquals("a[1,1]", ((com.frees.backend.ast.Expr.Var) equations.get(0).lhs()).name());
        assertEquals("a[2,3]", ((com.frees.backend.ast.Expr.Var) equations.get(5).lhs()).name());
    }

    @Test
    void parsesArrayRangeAssignmentWithList() {
        List<Equation> equations = parser.parse("X[1..3] = [10, 20, 30]");
        assertEquals(3, equations.size());
        assertEquals("x[1]", ((com.frees.backend.ast.Expr.Var) equations.get(0).lhs()).name());
        assertEquals(10.0, Evaluator.eval(equations.get(0).rhs(), Map.of()), 1e-9);
        assertEquals("x[3]", ((com.frees.backend.ast.Expr.Var) equations.get(2).lhs()).name());
        assertEquals(30.0, Evaluator.eval(equations.get(2).rhs(), Map.of()), 1e-9);
    }

    @Test
    void parsesArrayRangeAssignmentWithScalar() {
        List<Equation> equations = parser.parse("Y[1..3] = 100");
        assertEquals(3, equations.size());
        assertEquals("y[1]", ((com.frees.backend.ast.Expr.Var) equations.get(0).lhs()).name());
        assertEquals(100.0, Evaluator.eval(equations.get(0).rhs(), Map.of()), 1e-9);
        assertEquals("y[3]", ((com.frees.backend.ast.Expr.Var) equations.get(2).lhs()).name());
        assertEquals(100.0, Evaluator.eval(equations.get(2).rhs(), Map.of()), 1e-9);
    }

    @Test
    void parsesFunctionCallWithArrayRange() {
        List<Equation> equations = parser.parse(
                "X[1..3] = [10, 20, 30]\n" +
                "Total = Sum(X[1..3])\n" +
                "Avg = Average(X[1..3])"
        );
        // 3 + 1 + 1 = 5 equations
        assertEquals(5, equations.size());

        // Check Sum call expansion
        Expr.Call sumCall = (Expr.Call) equations.get(3).rhs();
        assertEquals("sum", sumCall.function());
        assertEquals(3, sumCall.args().size());
        assertEquals("x[1]", ((Expr.Var) sumCall.args().get(0)).name());
        assertEquals("x[3]", ((Expr.Var) sumCall.args().get(2)).name());

        // Check Average call expansion
        Expr.Call avgCall = (Expr.Call) equations.get(4).rhs();
        assertEquals("average", avgCall.function());
        assertEquals(3, avgCall.args().size());
    }
}
