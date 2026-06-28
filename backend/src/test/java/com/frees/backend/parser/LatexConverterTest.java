package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.cas.PolynomialHelpers.ResidueResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

    @Test
    void testToLatexString() {
        Expr s = new Expr.Str("hello");
        assertEquals("\\text{'hello'}", LatexConverter.toLatex(s, Map.of()));
    }

    @Test
    void testPowerWithBinopBaseWrapsInParens() {
        Expr pow = new Expr.BinOp('^', new Expr.BinOp('+', new Expr.Var("x"), new Expr.Var("y")), new Expr.Num(2));
        assertEquals("\\left(x + y\\right)^{2}", LatexConverter.toLatex(pow, Map.of()));
    }

    @Test
    void testHyperbolicAndInverseHyperbolicCalls() {
        assertEquals("\\sinh\\left(x\\right)", LatexConverter.toLatex(new Expr.Call("sinh", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("\\cosh\\left(x\\right)", LatexConverter.toLatex(new Expr.Call("cosh", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("\\tanh\\left(x\\right)", LatexConverter.toLatex(new Expr.Call("tanh", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("\\text{arcsinh}\\left(x\\right)", LatexConverter.toLatex(new Expr.Call("arcsinh", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("\\text{arccosh}\\left(x\\right)", LatexConverter.toLatex(new Expr.Call("arccosh", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("\\text{arctanh}\\left(x\\right)", LatexConverter.toLatex(new Expr.Call("arctanh", List.of(new Expr.Var("x"))), Map.of()));
    }

    @Test
    void testBesselAndChiSquareCalls() {
        assertEquals("J_{n}\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("besselj", List.of(new Expr.Var("x"), new Expr.Var("n"))), Map.of()));
        assertEquals("I_{n}\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("bessel_i", List.of(new Expr.Var("x"), new Expr.Var("n"))), Map.of()));
        assertEquals("Y_{n}\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("bessely", List.of(new Expr.Var("x"), new Expr.Var("n"))), Map.of()));
        assertEquals("K_{n}\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("besselk", List.of(new Expr.Var("x"), new Expr.Var("n"))), Map.of()));
        assertEquals("J_0\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("besselj0", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("I_1\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("besseli1", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("Y_0\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("bessely0", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("K_1\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("besselk1", List.of(new Expr.Var("x"))), Map.of()));
        assertEquals("\\chi^2\\left(x\\right)",
                LatexConverter.toLatex(new Expr.Call("chi_square", List.of(new Expr.Var("x"))), Map.of()));
    }

    @Test
    void testChemistryPropertyCallWithoutEncodedArgs() {
        // prop$molarmass has fewer than 3 '$'-parts → rendered straight from args.
        Expr prop = new Expr.Call("prop$molarmass", List.of(new Expr.Str("H2O")));
        assertEquals("\\text{Molarmass}\\left(\\text{'H2O'}\\right)", LatexConverter.toLatex(prop, Map.of()));
    }

    @Test
    void testTransferFunctionFallbackOnNonConstantCoeffs() {
        // tf with symbolic (non-array-literal) coefficients can't expand → plain call form.
        Expr tf = new Expr.Call("tf", List.of(new Expr.Var("a"), new Expr.Var("b")));
        assertEquals("\\text{tf}\\left(a, b\\right)", LatexConverter.toLatex(tf, Map.of()));
    }

    // --- Partial-fraction (residue) rendering ------------------------------

    @Test
    void testResidueRealPolesSum() {
        // 2/(s+1) + (-1)/(s+2)
        ResidueResult res = new ResidueResult(
                new double[][]{{2, 0}, {-1, 0}},
                new double[][]{{-1, 0}, {-2, 0}},
                new int[]{1, 1}, 0.0);
        assertEquals("\\frac{2}{s + 1} + \\frac{-1}{s + 2}", LatexConverter.toLatex(res));
    }

    @Test
    void testResidueRepeatedPolePlusDirectTerm() {
        // 1/(s-3)^2 + 5
        ResidueResult res = new ResidueResult(
                new double[][]{{1, 0}},
                new double[][]{{3, 0}},
                new int[]{2}, 5.0);
        assertEquals("\\frac{1}{\\left(s - 3\\right)^{2}} + 5", LatexConverter.toLatex(res));
    }

    @Test
    void testResidueComplexPoleAndResidue() {
        // 2i / (s + (1 - 3i))  from residue (0,2i), pole (-1,3i)
        ResidueResult res = new ResidueResult(
                new double[][]{{0, 2}},
                new double[][]{{-1, 3}},
                new int[]{1}, 0.0);
        assertEquals("\\frac{2i}{s + \\left(1 - 3i\\right)}", LatexConverter.toLatex(res));
    }

    @Test
    void testResidueAtOriginWithNegImaginaryResidue() {
        // -i / s  (residue (0,-1), pole at origin)
        ResidueResult res = new ResidueResult(
                new double[][]{{0, -1}},
                new double[][]{{0, 0}},
                new int[]{1}, 0.0);
        assertEquals("\\frac{-i}{s}", LatexConverter.toLatex(res));
    }

    @Test
    void testResidueSkipsZeroResiduesAndShowsLoneDirectTerm() {
        // All residues zero → only the direct term k remains.
        ResidueResult res = new ResidueResult(
                new double[][]{{0, 0}},
                new double[][]{{-1, 0}},
                new int[]{1}, 0.0);
        assertEquals("0", LatexConverter.toLatex(res));
    }

    @Test
    void testResidueWithFullComplexResidue() {
        // residue (2 + i) over a pole at origin exercises the full re+im formatComplex branch.
        ResidueResult res = new ResidueResult(
                new double[][]{{2, 1}},
                new double[][]{{0, 0}},
                new int[]{1}, 0.0);
        assertTrue(LatexConverter.toLatex(res).contains("2 + i"), LatexConverter.toLatex(res));
    }
}
