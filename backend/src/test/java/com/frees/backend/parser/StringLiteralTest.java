package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class StringLiteralTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void parsesStringLiteralInEquation() {
        // x = 'hello' should parse without error
        List<Equation> equations = parser.parse("x = 'hello'");
        assertEquals(1, equations.size());
    }

    @Test
    void astContainsStrNode() {
        List<Equation> equations = parser.parse("x = 'hello'");
        Expr rhs = equations.get(0).rhs();
        assertInstanceOf(Expr.Str.class, rhs);
        assertEquals("hello", ((Expr.Str) rhs).value());
    }

    @Test
    void stringLiteralHasNoVariables() {
        List<Equation> equations = parser.parse("x = 'hello'");
        // The RHS is a string literal – no variables
        assertEquals(Set.of(), equations.get(0).rhs().variables());
        // The full equation has only 'x'
        assertEquals(Set.of("x"), equations.get(0).variables());
    }

    @Test
    void evaluatingStringLiteralThrows() {
        Expr.Str str = new Expr.Str("hello");
        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> Evaluator.eval(str, Map.of()));
        assertTrue(ex.getMessage().contains("hello"));
        assertTrue(ex.getMessage().contains("cannot be evaluated as a number"));
    }

    @Test
    void stringLiteralAsCallArgParses() {
        // A function call with a string argument should parse
        List<Equation> equations = parser.parse("h = Enthalpy('R134a', T=300, x=1)");
        assertEquals(1, equations.size());
    }

    @Test
    void doubleQuoteTextIsStillComment() {
        // Double quotes remain comments, not string literals
        List<Equation> equations = parser.parse("\"this is a comment\" x = 2");
        assertEquals(1, equations.size());
        // Only the equation x = 2 survives
        assertEquals(Set.of("x"), equations.get(0).variables());
    }

    @Test
    void emptyStringLiteralParses() {
        List<Equation> equations = parser.parse("x = ''");
        assertEquals(1, equations.size());
        Expr rhs = equations.get(0).rhs();
        assertInstanceOf(Expr.Str.class, rhs);
        assertEquals("", ((Expr.Str) rhs).value());
    }

    @Test
    void stringWithSpacesAndDigits() {
        List<Equation> equations = parser.parse("x = 'R134a fluid 2'");
        Expr rhs = equations.get(0).rhs();
        assertInstanceOf(Expr.Str.class, rhs);
        assertEquals("R134a fluid 2", ((Expr.Str) rhs).value());
    }

    @Test
    void evalStringFromStrExpr() {
        assertEquals("hello", Evaluator.evalString(new Expr.Str("hello")));
    }

    @Test
    void evalStringFromVarExprBackwardCompat() {
        // Bare identifiers are treated as strings for backward compatibility
        assertEquals("r134a", Evaluator.evalString(new Expr.Var("R134a")));
    }

    @Test
    void evalStringFromNumThrows() {
        assertThrows(IllegalStateException.class,
                () -> Evaluator.evalString(new Expr.Num(42.0)));
    }
}
