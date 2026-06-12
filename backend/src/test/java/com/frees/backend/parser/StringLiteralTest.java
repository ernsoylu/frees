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

    // ── String variables (name$, Story 9.9 / Milestone 9) ────────────────

    @Test
    void stringVariableResolvesAndLeavesNumericSystem() {
        // The definition is a compile-time constant: it is substituted and
        // removed, so only the numeric equation remains.
        List<Equation> equations = parser.parse("d$ = '1010'\nx = BaseConvert(d$, 2, 10)");
        assertEquals(1, equations.size());
        assertEquals(Set.of("x"), equations.get(0).variables());
        assertEquals(10.0, Evaluator.eval(equations.get(0).rhs(), Map.of()), 1e-9);
    }

    @Test
    void stringVariableDefinitionReversedSidesWorks() {
        List<Equation> equations = parser.parse("'FF' = d$\nx = BaseConvert(d$, 16, 10)");
        assertEquals(1, equations.size());
        assertEquals(255.0, Evaluator.eval(equations.get(0).rhs(), Map.of()), 1e-9);
    }

    @Test
    void stringVariableAsFluidName() {
        // R$ = 'R134a' resolves inside the synthetic prop$ call encoding.
        List<Equation> equations = parser.parse("R$ = 'R134a'\nh = Enthalpy(R$, T=300, x=1)");
        assertEquals(1, equations.size());
        Expr rhs = equations.get(0).rhs();
        assertInstanceOf(Expr.Call.class, rhs);
        assertTrue(((Expr.Call) rhs).function().startsWith("prop$enthalpy$r134a$"),
                ((Expr.Call) rhs).function());
    }

    @Test
    void undefinedStringVariableThrows() {
        EquationParser.ParseException e = assertThrows(
                EquationParser.ParseException.class,
                () -> parser.parse("x = BaseConvert(d$, 2, 10)"));
        assertTrue(e.getMessage().contains("d$"), e.getMessage());
        assertTrue(e.getMessage().contains("not defined"), e.getMessage());
    }

    @Test
    void conflictingStringVariableDefinitionsThrow() {
        EquationParser.ParseException e = assertThrows(
                EquationParser.ParseException.class,
                () -> parser.parse("a$ = 'one'\na$ = 'two'"));
        assertTrue(e.getMessage().contains("defined twice"), e.getMessage());
    }

    @Test
    void stringVariableIsCaseInsensitive() {
        List<Equation> equations = parser.parse("D$ = 'FF'\nx = BaseConvert(d$, 16, 10)");
        assertEquals(1, equations.size());
        assertEquals(255.0, Evaluator.eval(equations.get(0).rhs(), Map.of()), 1e-9);
    }

    @Test
    void quotedConvertArguments() {
        // Story 2.2 writes Convert('From', 'To'); quoted and bare both work.
        List<Equation> equations = parser.parse("x = Convert('ft^2', 'in^2')");
        assertEquals(144.0, Evaluator.eval(equations.get(0).rhs(), Map.of()), 1e-9);
        List<Equation> bare = parser.parse("x = Convert(ft^2, in^2)");
        assertEquals(144.0, Evaluator.eval(bare.get(0).rhs(), Map.of()), 1e-9);
    }
}
