package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class LatexConverterTest {

    @Test
    void testToLatexNumbers() {
        Expr n1 = new Expr.Num(5.0);
        assertEquals("5", LatexConverter.toLatex(n1, Map.of()));

        Expr n2 = new Expr.Num(2.5, "m", false);
        assertEquals("2.5\\,\\left[m\\right]", LatexConverter.toLatex(n2, Map.of()));

        Expr n3 = new Expr.Num(1.0, null, true);
        assertEquals("i", LatexConverter.toLatex(n3, Map.of()));

        Expr n4 = new Expr.Num(-1.0, null, true);
        assertEquals("-i", LatexConverter.toLatex(n4, Map.of()));

        Expr n5 = new Expr.Num(3.5, null, true);
        assertEquals("3.5i", LatexConverter.toLatex(n5, Map.of()));
    }

    @Test
    void testToLatexVariables() {
        Expr v1 = new Expr.Var("x");
        assertEquals("x", LatexConverter.toLatex(v1, Map.of()));

        Expr v2 = new Expr.Var("x_dot");
        assertEquals("\\dot{x}", LatexConverter.toLatex(v2, Map.of()));

        Expr v3 = new Expr.Var("x_hat");
        assertEquals("\\hat{x}", LatexConverter.toLatex(v3, Map.of()));

        Expr v4 = new Expr.Var("x_1");
        assertEquals("x_{1}", LatexConverter.toLatex(v4, Map.of()));

        Expr v5 = new Expr.Var("x_1_dot");
        assertEquals("\\dot{x_{1}}", LatexConverter.toLatex(v5, Map.of()));

        Expr v6 = new Expr.Var("x_1_hat");
        assertEquals("\\hat{x_{1}}", LatexConverter.toLatex(v6, Map.of()));
    }

    @Test
    void testToLatexNegativeAndBinary() {
        Expr neg1 = new Expr.Neg(new Expr.Var("x"));
        assertEquals("-x", LatexConverter.toLatex(neg1, Map.of()));

        Expr neg2 = new Expr.Neg(new Expr.BinOp('+', new Expr.Var("x"), new Expr.Var("y")));
        assertEquals("-\\left(x + y\\right)", LatexConverter.toLatex(neg2, Map.of()));

        Expr add = new Expr.BinOp('+', new Expr.Var("x"), new Expr.Var("y"));
        assertEquals("x + y", LatexConverter.toLatex(add, Map.of()));

        Expr sub = new Expr.BinOp('-', new Expr.Var("x"), new Expr.Var("y"));
        assertEquals("x - y", LatexConverter.toLatex(sub, Map.of()));

        Expr mul1 = new Expr.BinOp('*', new Expr.Num(2), new Expr.Var("y"));
        assertEquals("2\\,y", LatexConverter.toLatex(mul1, Map.of()));

        Expr mul2 = new Expr.BinOp('*', new Expr.Var("x"), new Expr.Var("y"));
        assertEquals("x\\cdot y", LatexConverter.toLatex(mul2, Map.of()));

        Expr div = new Expr.BinOp('/', new Expr.Var("x"), new Expr.Var("y"));
        assertEquals("\\frac{x}{y}", LatexConverter.toLatex(div, Map.of()));

        Expr pow1 = new Expr.BinOp('^', new Expr.Var("x"), new Expr.Num(2));
        assertEquals("x^{2}", LatexConverter.toLatex(pow1, Map.of()));

        Expr pow2 = new Expr.BinOp('^', new Expr.Neg(new Expr.Var("x")), new Expr.Num(2));
        assertEquals("\\left(-x\\right)^{2}", LatexConverter.toLatex(pow2, Map.of()));

        Expr expr = new Expr.BinOp('%', new Expr.Var("x"), new Expr.Var("y"));
        assertThrows(IllegalStateException.class, () -> LatexConverter.toLatex(expr, Map.of()));
    }

    @Test
    void testToLatexCalls() {
        Expr c1 = new Expr.Call("sqrt", List.of(new Expr.Var("x")));
        assertEquals("\\sqrt{x}", LatexConverter.toLatex(c1, Map.of()));

        Expr c2 = new Expr.Call("sin", List.of(new Expr.Var("x")));
        assertEquals("\\sin\\left(x\\right)", LatexConverter.toLatex(c2, Map.of()));

        Expr c3 = new Expr.Call("cos", List.of(new Expr.Var("x")));
        assertEquals("\\cos\\left(x\\right)", LatexConverter.toLatex(c3, Map.of()));

        Expr c4 = new Expr.Call("tan", List.of(new Expr.Var("x")));
        assertEquals("\\tan\\left(x\\right)", LatexConverter.toLatex(c4, Map.of()));

        Expr c5 = new Expr.Call("asin", List.of(new Expr.Var("x")));
        assertEquals("\\arcsin\\left(x\\right)", LatexConverter.toLatex(c5, Map.of()));

        Expr c6 = new Expr.Call("acos", List.of(new Expr.Var("x")));
        assertEquals("\\arccos\\left(x\\right)", LatexConverter.toLatex(c6, Map.of()));

        Expr c7 = new Expr.Call("atan", List.of(new Expr.Var("x")));
        assertEquals("\\arctan\\left(x\\right)", LatexConverter.toLatex(c7, Map.of()));

        Expr c8 = new Expr.Call("ln", List.of(new Expr.Var("x")));
        assertEquals("\\ln\\left(x\\right)", LatexConverter.toLatex(c8, Map.of()));

        Expr c9 = new Expr.Call("log10", List.of(new Expr.Var("x")));
        assertEquals("\\log_{10}\\left(x\\right)", LatexConverter.toLatex(c9, Map.of()));

        Expr c10 = new Expr.Call("exp", List.of(new Expr.Var("x")));
        assertEquals("e^{x}", LatexConverter.toLatex(c10, Map.of()));

        Expr c11 = new Expr.Call("abs", List.of(new Expr.Var("x")));
        assertEquals("\\left|x\\right|", LatexConverter.toLatex(c11, Map.of()));

        Expr c12 = new Expr.Call("convert", List.of(new Expr.Var("x"), new Expr.Var("y")));
        assertEquals("\\text{Convert}\\left(x, y\\right)", LatexConverter.toLatex(c12, Map.of()));

        Expr c13 = new Expr.Call("custom", List.of(new Expr.Var("x")));
        assertEquals("\\text{custom}\\left(x\\right)", LatexConverter.toLatex(c13, Map.of()));

        Expr prop = new Expr.Call("prop$enthalpy$r134a$t$x", List.of(new Expr.Var("T"), new Expr.Var("x")));
        assertEquals("\\text{Enthalpy}\\left(\\mathrm{r134a}, t=T, x=x\\right)", LatexConverter.toLatex(prop, Map.of("t", "T")));
    }

    @Test
    void testToLatexArrayAndMisc() {
        Expr arr = new Expr.ArrayAccess("A", List.of(new Expr.Num(1), new Expr.Num(2)));
        assertEquals("A_{1, 2}", LatexConverter.toLatex(arr, Map.of("a", "A")));

        Expr rng = new Expr.Range(new Expr.Num(1), new Expr.Num(5));
        assertEquals("1\\dots5", LatexConverter.toLatex(rng, Map.of()));

        Expr lit = new Expr.ArrayLiteral(List.of(new Expr.Num(1), new Expr.Num(2)));
        assertEquals("\\left[1, 2\\right]", LatexConverter.toLatex(lit, Map.of()));

        Expr cmp = new Expr.Compare("<=", new Expr.Var("x"), new Expr.Var("y"));
        assertEquals("x <= y", LatexConverter.toLatex(cmp, Map.of()));

        Expr log = new Expr.Logical("and", new Expr.Var("x"), new Expr.Var("y"));
        assertEquals("x \\text{ and } y", LatexConverter.toLatex(log, Map.of()));

        Expr not = new Expr.Not(new Expr.Var("x"));
        assertEquals("\\neg x", LatexConverter.toLatex(not, Map.of()));

        Equation eq = new Equation(new Expr.Var("x"), new Expr.Num(5), "x=5");
        assertEquals("x = 5", LatexConverter.toLatex(eq, Map.of()));
    }
}
