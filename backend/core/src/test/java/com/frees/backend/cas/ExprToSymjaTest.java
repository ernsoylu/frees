package com.frees.backend.cas;

import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Renders the scalar algebraic subset of frees Expr nodes into Symja input strings. */
class ExprToSymjaTest {

    @Test
    void integerNumbersHaveNoDecimalPoint() {
        // Integers must stay integers so Symja factors over the integers.
        assertEquals("5", ExprToSymja.convert(new Expr.Num(5.0)));
    }

    @Test
    void nonIntegerNumbersKeepDecimal() {
        assertEquals("2.5", ExprToSymja.convert(new Expr.Num(2.5)));
    }

    @Test
    void imaginaryUnitIsRendered() {
        assertEquals("(1*I)", ExprToSymja.convert(new Expr.Num(1.0, null, true)));
    }

    @Test
    void variableAndArithmetic() {
        assertEquals("x", ExprToSymja.convert(new Expr.Var("x")));
        Expr sum = new Expr.BinOp('+', new Expr.Var("x"), new Expr.Num(1.0));
        assertEquals("(x+1)", ExprToSymja.convert(sum));
        Expr pow = new Expr.BinOp('^', new Expr.Var("x"), new Expr.Num(2.0));
        assertEquals("(x^2)", ExprToSymja.convert(pow));
    }

    @Test
    void negation() {
        assertEquals("(-(x))", ExprToSymja.convert(new Expr.Neg(new Expr.Var("x"))));
    }

    @Test
    void knownFunctionsMapToSymjaNames() {
        assertEquals("Log(x)", ExprToSymja.convert(new Expr.Call("ln", List.of(new Expr.Var("x")))));
        assertEquals("Sqrt(x)", ExprToSymja.convert(new Expr.Call("sqrt", List.of(new Expr.Var("x")))));
        assertEquals("Sin(x)", ExprToSymja.convert(new Expr.Call("sin", List.of(new Expr.Var("x")))));
    }

    @Test
    void unknownFunctionIsRejected() {
        assertThrows(ExprToSymja.UnsupportedExpression.class,
                () -> ExprToSymja.convert(new Expr.Call("mysteryfn", List.of(new Expr.Var("x")))));
    }

    @Test
    void nonAlgebraicNodesAreRejected() {
        assertThrows(ExprToSymja.UnsupportedExpression.class,
                () -> ExprToSymja.convert(new Expr.Str("hi")));
        assertThrows(ExprToSymja.UnsupportedExpression.class,
                () -> ExprToSymja.convert(new Expr.ArrayAccess("a", List.of(new Expr.Num(1.0)))));
        assertThrows(ExprToSymja.UnsupportedExpression.class,
                () -> ExprToSymja.convert(new Expr.ArrayLiteral(List.of(new Expr.Num(1.0)))));
        assertThrows(ExprToSymja.UnsupportedExpression.class,
                () -> ExprToSymja.convert(new Expr.Range(new Expr.Num(1.0), new Expr.Num(5.0))));
        assertThrows(ExprToSymja.UnsupportedExpression.class,
                () -> ExprToSymja.convert(new Expr.Compare("<", new Expr.Var("x"), new Expr.Var("y"))));
        assertThrows(ExprToSymja.UnsupportedExpression.class,
                () -> ExprToSymja.convert(new Expr.Logical("and", new Expr.Var("x"), new Expr.Var("y"))));
        assertThrows(ExprToSymja.UnsupportedExpression.class,
                () -> ExprToSymja.convert(new Expr.Not(new Expr.Var("x"))));
    }
}
