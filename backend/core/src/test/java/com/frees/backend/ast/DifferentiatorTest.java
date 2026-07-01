package com.frees.backend.ast;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for {@link Differentiator}: symbolic partial differentiation of the
 * expression AST. Tests cover basic rules, chain rule, product/quotient rules,
 * special functions, unsupported constructs, and simplification quality.
 */
class DifferentiatorTest {

    // ── helpers ──────────────────────────────────────────────────────────

    private static Expr num(double v) { return new Expr.Num(v); }
    private static Expr var(String n) { return new Expr.Var(n); }
    private static Expr neg(Expr e)   { return new Expr.Neg(e); }
    private static Expr add(Expr a, Expr b) { return new Expr.BinOp('+', a, b); }
    private static Expr sub(Expr a, Expr b) { return new Expr.BinOp('-', a, b); }
    private static Expr mul(Expr a, Expr b) { return new Expr.BinOp('*', a, b); }
    private static Expr div(Expr a, Expr b) { return new Expr.BinOp('/', a, b); }
    private static Expr pow(Expr a, Expr b) { return new Expr.BinOp('^', a, b); }
    private static Expr call(String fn, Expr... args) {
        return new Expr.Call(fn, List.of(args));
    }

    /** Evaluate an expression at a single variable value. */
    private static double eval(Expr e, String var, double value) {
        return Evaluator.eval(e, new java.util.HashMap<>(Map.of(var, value)));
    }

    /** Evaluate an expression at multiple variable values. */
    private static double eval(Expr e, Map<String, Double> values) {
        return Evaluator.eval(e, new java.util.HashMap<>(values));
    }

    /**
     * Verifies that the analytical derivative matches a numerical central
     * difference approximation at the given point.
     */
    private static void assertDerivativeNumerically(Expr expr, String var,
                                                    Map<String, Double> point,
                                                    double tol) {
        Expr deriv = Differentiator.differentiate(expr, var);
        assertNotNull(deriv, "Expected differentiable expression");

        double analyticalValue = eval(deriv, point);

        double h = 1e-7;
        Map<String, Double> plus = new java.util.HashMap<>(point);
        Map<String, Double> minus = new java.util.HashMap<>(point);
        plus.put(var, point.get(var) + h);
        minus.put(var, point.get(var) - h);
        double numerical = (eval(expr, plus) - eval(expr, minus)) / (2 * h);

        assertEquals(numerical, analyticalValue, tol,
                "Analytical derivative of %s w.r.t. %s at %s".formatted(expr, var, point));
    }

    // ── basic derivatives ────────────────────────────────────────────────

    @Test
    void constantDerivativeIsZero() {
        Expr d = Differentiator.differentiate(num(42), "x");
        assertNotNull(d);
        assertEquals(0.0, eval(d, "x", 5.0));
    }

    @Test
    void variableDerivativeIsOneForMatchAndZeroForOther() {
        Expr dx = Differentiator.differentiate(var("x"), "x");
        Expr dy = Differentiator.differentiate(var("x"), "y");
        assertNotNull(dx);
        assertNotNull(dy);
        assertEquals(1.0, eval(dx, "x", 3.0));
        assertEquals(0.0, eval(dy, Map.of("x", 3.0, "y", 1.0)));
    }

    @Test
    void caseInsensitiveVariableNames() {
        // Variable names are case-insensitive (lowercased by Var constructor).
        Expr d = Differentiator.differentiate(var("X"), "x");
        assertNotNull(d);
        assertEquals(1.0, eval(d, "x", 7.0));
    }

    @Test
    void linearExpression() {
        // d/dx (3x + 5) = 3
        Expr expr = add(mul(num(3), var("x")), num(5));
        Expr d = Differentiator.differentiate(expr, "x");
        assertNotNull(d);
        assertEquals(3.0, eval(d, "x", 99.0), 1e-12);
    }

    @Test
    void negationDerivative() {
        // d/dx (-x) = -1
        Expr d = Differentiator.differentiate(neg(var("x")), "x");
        assertNotNull(d);
        assertEquals(-1.0, eval(d, "x", 5.0));
    }

    @Test
    void subtractionDerivative() {
        // d/dx (x - x^2) = 1 - 2x
        Expr expr = sub(var("x"), pow(var("x"), num(2)));
        assertDerivativeNumerically(expr, "x", Map.of("x", 3.0), 1e-6);
    }

    // ── polynomial derivatives ───────────────────────────────────────────

    @Test
    void quadraticPolynomial() {
        // d/dx (x^2) = 2x
        Expr expr = pow(var("x"), num(2));
        Expr d = Differentiator.differentiate(expr, "x");
        assertNotNull(d);
        assertEquals(6.0, eval(d, "x", 3.0), 1e-12);
        assertEquals(10.0, eval(d, "x", 5.0), 1e-12);
    }

    @Test
    void cubicPolynomial() {
        // d/dx (x^3) = 3x^2
        Expr expr = pow(var("x"), num(3));
        assertDerivativeNumerically(expr, "x", Map.of("x", 2.0), 1e-6);
    }

    @Test
    void polynomialMultipleTerms() {
        // d/dx (2x^3 - 5x^2 + 3x - 7) = 6x^2 - 10x + 3
        Expr expr = sub(
                add(sub(mul(num(2), pow(var("x"), num(3))),
                        mul(num(5), pow(var("x"), num(2)))),
                    mul(num(3), var("x"))),
                num(7));
        double x = 4.0;
        double expected = 6 * x * x - 10 * x + 3; // 96 - 40 + 3 = 59
        Expr d = Differentiator.differentiate(expr, "x");
        assertNotNull(d);
        assertEquals(expected, eval(d, "x", x), 1e-10);
    }

    // ── product rule ─────────────────────────────────────────────────────

    @Test
    void productRule() {
        // d/dx (x * x^2) = d/dx(x^3) = 3x^2
        Expr expr = mul(var("x"), pow(var("x"), num(2)));
        assertDerivativeNumerically(expr, "x", Map.of("x", 2.5), 1e-6);
    }

    @Test
    void productRuleTwoVariables() {
        // d/dx (x * y) = y
        Expr expr = mul(var("x"), var("y"));
        Expr dx = Differentiator.differentiate(expr, "x");
        assertNotNull(dx);
        assertEquals(7.0, eval(dx, Map.of("x", 3.0, "y", 7.0)), 1e-12);
    }

    // ── quotient rule ────────────────────────────────────────────────────

    @Test
    void quotientRule() {
        // d/dx (x / (x+1)) = 1/(x+1)^2
        Expr expr = div(var("x"), add(var("x"), num(1)));
        assertDerivativeNumerically(expr, "x", Map.of("x", 3.0), 1e-6);
    }

    // ── power rule ───────────────────────────────────────────────────────

    @Test
    void generalPowerRule() {
        // d/dx (x^x) at x=2:  x^x (ln x + 1)
        Expr expr = pow(var("x"), var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 2.0), 1e-5);
    }

    @Test
    void constantBasePowerRule() {
        // d/dx (2^x) = 2^x * ln(2)
        Expr expr = pow(num(2), var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 3.0), 1e-5);
    }

    // ── chain rule with built-in functions ────────────────────────────────

    @Test
    void sinOfXSquared() {
        // d/dx sin(x^2) = cos(x^2) * 2x
        Expr expr = call("sin", pow(var("x"), num(2)));
        assertDerivativeNumerically(expr, "x", Map.of("x", 1.5), 1e-6);
    }

    @Test
    void cosDerivative() {
        // d/dx cos(x) = -sin(x)
        Expr expr = call("cos", var("x"));
        Expr d = Differentiator.differentiate(expr, "x");
        assertNotNull(d);
        double x = 1.0;
        assertEquals(-Math.sin(x), eval(d, "x", x), 1e-12);
    }

    @Test
    void tanDerivative() {
        // d/dx tan(x) = 1/cos²(x)
        Expr expr = call("tan", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 0.5), 1e-6);
    }

    @Test
    void expOf2x() {
        // d/dx exp(2x) = 2 * exp(2x)
        Expr expr = call("exp", mul(num(2), var("x")));
        assertDerivativeNumerically(expr, "x", Map.of("x", 1.0), 1e-6);
    }

    @Test
    void lnOfXPlus1() {
        // d/dx ln(x+1) = 1/(x+1)
        Expr expr = call("ln", add(var("x"), num(1)));
        Expr d = Differentiator.differentiate(expr, "x");
        assertNotNull(d);
        double x = 3.0;
        assertEquals(1.0 / (x + 1), eval(d, "x", x), 1e-12);
    }

    @Test
    void log10Derivative() {
        // d/dx log10(x) = 1/(x ln10)
        Expr expr = call("log10", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 5.0), 1e-6);
    }

    @Test
    void sqrtDerivative() {
        // d/dx sqrt(x) = 1/(2 sqrt(x))
        Expr expr = call("sqrt", var("x"));
        Expr d = Differentiator.differentiate(expr, "x");
        assertNotNull(d);
        double x = 4.0;
        assertEquals(1.0 / (2 * Math.sqrt(x)), eval(d, "x", x), 1e-12);
    }

    @Test
    void sqrtChainRule() {
        // d/dx sqrt(x^2 + 1) = x / sqrt(x^2 + 1)
        Expr expr = call("sqrt", add(pow(var("x"), num(2)), num(1)));
        assertDerivativeNumerically(expr, "x", Map.of("x", 3.0), 1e-6);
    }

    // ── inverse trig ─────────────────────────────────────────────────────

    @Test
    void arcsinDerivative() {
        Expr expr = call("arcsin", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 0.5), 1e-6);
    }

    @Test
    void arccosDerivative() {
        Expr expr = call("arccos", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 0.5), 1e-6);
    }

    @Test
    void arctanDerivative() {
        Expr expr = call("arctan", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 2.0), 1e-6);
    }

    // ── abs ──────────────────────────────────────────────────────────────

    @Test
    void absDerivativePositive() {
        // d/dx |x| at x=3 → sign(3) = 1
        Expr expr = call("abs", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 3.0), 1e-6);
    }

    @Test
    void absDerivativeNegative() {
        // d/dx |x| at x=-3 → sign(-3) = -1
        Expr expr = call("abs", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", -3.0), 1e-6);
    }

    // ── special functions ────────────────────────────────────────────────

    @Test
    void erfDerivative() {
        // d/dx erf(x) = (2/√π) exp(-x²)
        Expr expr = call("erf", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 1.0), 1e-6);
    }

    @Test
    void erfcDerivative() {
        // d/dx erfc(x) = -(2/√π) exp(-x²)
        Expr expr = call("erfc", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 0.5), 1e-6);
    }

    @Test
    void erfChainRule() {
        // d/dx erf(2x) = (2/√π) exp(-4x²) * 2
        Expr expr = call("erf", mul(num(2), var("x")));
        assertDerivativeNumerically(expr, "x", Map.of("x", 0.5), 1e-5);
    }

    @Test
    void gammaDerivative() {
        // d/dx Γ(x) = Γ(x) * ψ(x)  -- verified numerically
        Expr expr = call("gamma", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 3.0), 1e-4);
    }

    @Test
    void logGammaDerivative() {
        // d/dx lnΓ(x) = ψ(x)
        Expr expr = call("loggamma", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 3.0), 1e-5);
    }

    @Test
    void erfInvDerivative() {
        // d/dx erfinv(x) = (√π/2) exp(erfinv(x)²)
        Expr expr = call("erfinv", var("x"));
        assertDerivativeNumerically(expr, "x", Map.of("x", 0.5), 1e-5);
    }

    @Test
    void betaDerivative() {
        // ∂/∂a B(a,b) = B(a,b)(ψ(a) − ψ(a+b)), and the same through both args
        Expr expr = call("beta", var("a"), var("b"));
        assertDerivativeNumerically(expr, "a", Map.of("a", 2.0, "b", 3.0), 1e-6);
        assertDerivativeNumerically(expr, "b", Map.of("a", 2.0, "b", 3.0), 1e-6);
        // Chain rule through a composite first argument
        Expr composite = call("beta", mul(var("x"), num(2)), num(3));
        assertDerivativeNumerically(composite, "x", Map.of("x", 1.5), 1e-6);
    }

    @Test
    void besselJDerivative() {
        // d/dx J_n(x) = (J_{n−1}(x) − J_{n+1}(x)) / 2, constant order
        Expr expr = call("besselj", var("x"), num(1));
        assertDerivativeNumerically(expr, "x", Map.of("x", 2.5), 1e-6);
    }

    @Test
    void besselIDerivative() {
        // d/dx I_n(x) = (I_{n−1}(x) + I_{n+1}(x)) / 2, constant order
        Expr expr = call("besseli", var("x"), num(1));
        assertDerivativeNumerically(expr, "x", Map.of("x", 2.0), 1e-6);
    }

    @Test
    void besselWithVariableOrderIsNotDifferentiable() {
        // The recurrence derivative only holds for a constant order.
        Expr expr = call("besselj", var("x"), var("n"));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    @Test
    void newBesselAndChiSquareDerivatives() {
        Expr k = call("besselk", var("x"), num(1));
        assertDerivativeNumerically(k, "x", Map.of("x", 1.5), 1e-6);

        Expr y = call("bessely", var("x"), num(1));
        assertDerivativeNumerically(y, "x", Map.of("x", 2.0), 1e-6);

        // Shortcut functions
        Expr j0 = call("besselj0", var("x"));
        assertDerivativeNumerically(j0, "x", Map.of("x", 2.0), 1e-6);

        Expr j1 = call("besselj1", var("x"));
        assertDerivativeNumerically(j1, "x", Map.of("x", 2.0), 1e-6);

        Expr i0 = call("besseli0", var("x"));
        assertDerivativeNumerically(i0, "x", Map.of("x", 2.0), 1e-6);

        Expr i1 = call("besseli1", var("x"));
        assertDerivativeNumerically(i1, "x", Map.of("x", 2.0), 1e-6);

        Expr k0 = call("besselk0", var("x"));
        assertDerivativeNumerically(k0, "x", Map.of("x", 1.5), 1e-6);

        Expr k1 = call("besselk1", var("x"));
        assertDerivativeNumerically(k1, "x", Map.of("x", 1.5), 1e-6);

        Expr y0 = call("bessely0", var("x"));
        assertDerivativeNumerically(y0, "x", Map.of("x", 2.0), 1e-6);

        Expr y1 = call("bessely1", var("x"));
        assertDerivativeNumerically(y1, "x", Map.of("x", 2.0), 1e-6);

        // Chi-Square
        Expr chi2 = call("chi_square", var("x"), num(2));
        assertDerivativeNumerically(chi2, "x", Map.of("x", 4.0), 1e-6);
    }

    // ── unsupported expressions return null ──────────────────────────────

    @Test
    void propertyCallReturnsNull() {
        Expr expr = new Expr.Call("prop$enthalpy$r134a$t$x",
                List.of(num(300), num(1)));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    @Test
    void procedureCallReturnsNull() {
        Expr expr = new Expr.Call("proc$myfunc$0", List.of(var("x")));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    @Test
    void eigenCallReturnsNull() {
        Expr expr = new Expr.Call("eigen$val$0$2", List.of(num(1), num(0), num(0), num(1)));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    @Test
    void integralReturnsNull() {
        Expr expr = call("integral", var("x"), var("t"), num(0), num(1));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    @Test
    void compareExprReturnsNull() {
        Expr expr = new Expr.Compare("<", var("x"), num(5));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    @Test
    void arrayAccessReturnsNull() {
        Expr expr = new Expr.ArrayAccess("a", List.of(var("x")));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    // ── simplification quality ───────────────────────────────────────────

    @Test
    void derivativeOfConstantSimplifiesToZeroLiteral() {
        Expr d = Differentiator.differentiate(num(7), "x");
        assertInstanceOf(Expr.Num.class, d);
        assertEquals(0.0, ((Expr.Num) d).value());
    }

    @Test
    void derivativeOfVariableSimplifiesToOneLiteral() {
        Expr d = Differentiator.differentiate(var("x"), "x");
        assertInstanceOf(Expr.Num.class, d);
        assertEquals(1.0, ((Expr.Num) d).value());
    }

    @Test
    void zeroPlusXSimplifiesToX() {
        // d/dx (5 + x) should not contain a "0 + 1" sub-tree.
        Expr d = Differentiator.differentiate(add(num(5), var("x")), "x");
        assertNotNull(d);
        // Should simplify to just 1.
        assertInstanceOf(Expr.Num.class, d);
        assertEquals(1.0, ((Expr.Num) d).value());
    }

    @Test
    void xPlusZeroSimplifiesToX() {
        // d/dx (x + 5) = 1 + 0 → should simplify to 1.
        Expr d = Differentiator.differentiate(add(var("x"), num(5)), "x");
        assertNotNull(d);
        assertInstanceOf(Expr.Num.class, d);
        assertEquals(1.0, ((Expr.Num) d).value());
    }

    @Test
    void oneMulXSimplifiesToX() {
        // Verify 1 * expr simplifies to expr.
        Expr simplified = Differentiator.simplifyMul(num(1), var("x"));
        assertInstanceOf(Expr.Var.class, simplified);
    }

    @Test
    void zeroMulXSimplifiesToZero() {
        Expr simplified = Differentiator.simplifyMul(num(0), var("x"));
        assertInstanceOf(Expr.Num.class, simplified);
        assertEquals(0.0, ((Expr.Num) simplified).value());
    }

    @Test
    void xPowZeroSimplifiesToOne() {
        Expr simplified = Differentiator.simplifyPow(var("x"), num(0));
        assertInstanceOf(Expr.Num.class, simplified);
        assertEquals(1.0, ((Expr.Num) simplified).value());
    }

    @Test
    void xPowOneSimplifiesToX() {
        Expr simplified = Differentiator.simplifyPow(var("x"), num(1));
        assertInstanceOf(Expr.Var.class, simplified);
    }

    @Test
    void zeroDivXSimplifiesToZero() {
        Expr simplified = Differentiator.simplifyDiv(num(0), var("x"));
        assertInstanceOf(Expr.Num.class, simplified);
        assertEquals(0.0, ((Expr.Num) simplified).value());
    }

    @Test
    void negOfZeroSimplifiesToZero() {
        Expr simplified = Differentiator.simplifyNeg(num(0));
        assertInstanceOf(Expr.Num.class, simplified);
        assertEquals(0.0, ((Expr.Num) simplified).value());
    }

    @Test
    void doubleNegSimplifies() {
        // neg(neg(x)) → x
        Expr simplified = Differentiator.simplifyNeg(neg(var("x")));
        assertInstanceOf(Expr.Var.class, simplified);
    }

    // ── partial derivatives (multivariable) ──────────────────────────────

    @Test
    void partialDerivativeXY() {
        // f(x,y) = x^2 * y + 3*y^2
        // ∂f/∂x = 2x*y,  ∂f/∂y = x^2 + 6y
        Expr expr = add(mul(pow(var("x"), num(2)), var("y")),
                        mul(num(3), pow(var("y"), num(2))));
        Map<String, Double> pt = Map.of("x", 2.0, "y", 3.0);
        assertDerivativeNumerically(expr, "x", pt, 1e-6);
        assertDerivativeNumerically(expr, "y", pt, 1e-6);
    }

    // ── composition of multiple functions ────────────────────────────────

    @Test
    void compositionExpSin() {
        // d/dx exp(sin(x)) = exp(sin(x)) * cos(x)
        Expr expr = call("exp", call("sin", var("x")));
        assertDerivativeNumerically(expr, "x", Map.of("x", 1.0), 1e-6);
    }

    @Test
    void compositionLnSqrt() {
        // d/dx ln(sqrt(x)) = 1/(2x)
        Expr expr = call("ln", call("sqrt", var("x")));
        Expr d = Differentiator.differentiate(expr, "x");
        assertNotNull(d);
        double x = 4.0;
        assertEquals(1.0 / (2 * x), eval(d, "x", x), 1e-12);
    }

    // ── derivative of residual (lhs - rhs) as used by Newton solver ─────

    @Test
    void residualDerivative() {
        // Equation: x^2 + y = 5  →  residual = x^2 + y - 5
        // d(residual)/dx = 2x,  d(residual)/dy = 1
        Expr lhs = add(pow(var("x"), num(2)), var("y"));
        Expr rhs = num(5);
        Expr residual = sub(lhs, rhs);

        Expr dx = Differentiator.differentiate(residual, "x");
        Expr dy = Differentiator.differentiate(residual, "y");
        assertNotNull(dx);
        assertNotNull(dy);

        Map<String, Double> pt = Map.of("x", 3.0, "y", 1.0);
        assertEquals(6.0, eval(dx, pt), 1e-12);
        assertEquals(1.0, eval(dy, pt), 1e-12);
    }

    // ── null propagation through binary operators ────────────────────────

    @Test
    void nullPropagatesThroughAdd() {
        // If sub-expression can't be differentiated, the whole thing returns null.
        Expr expr = add(var("x"),
                new Expr.Call("prop$h$water$t$p", List.of(var("x"), num(100))));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    @Test
    void nullPropagatesThroughMul() {
        Expr expr = mul(var("x"),
                new Expr.Call("proc$myfunc$0", List.of(var("x"))));
        assertNull(Differentiator.differentiate(expr, "x"));
    }

    @Test
    void differentiatesHyperbolicFunctions() {
        assertDerivativeNumerically(call("sinh", var("x")), "x", Map.of("x", 1.0), 1e-6);
        assertDerivativeNumerically(call("cosh", var("x")), "x", Map.of("x", 1.0), 1e-6);
        assertDerivativeNumerically(call("tanh", var("x")), "x", Map.of("x", 1.0), 1e-6);
        assertDerivativeNumerically(call("arcsinh", var("x")), "x", Map.of("x", 1.0), 1e-6);
        assertDerivativeNumerically(call("arccosh", var("x")), "x", Map.of("x", 2.0), 1e-6);
        assertDerivativeNumerically(call("arctanh", var("x")), "x", Map.of("x", 0.5), 1e-6);
    }

    @Test
    void differentiatesPiecewiseAndRounding() {
        Expr fl = call("floor", var("x"));
        Expr cl = call("ceil", var("x"));
        Expr tr = call("trunc", var("x"));
        Expr sg = call("sign", var("x"));
        Expr st = call("step", var("x"));
        Expr rd = call("round", var("x"));
        Expr rd2 = call("round", var("x"), num(2));

        assertEquals(0.0, eval(Differentiator.differentiate(fl, "x"), "x", 1.5));
        assertEquals(0.0, eval(Differentiator.differentiate(cl, "x"), "x", 1.5));
        assertEquals(0.0, eval(Differentiator.differentiate(tr, "x"), "x", 1.5));
        assertEquals(0.0, eval(Differentiator.differentiate(sg, "x"), "x", 1.5));
        assertEquals(0.0, eval(Differentiator.differentiate(st, "x"), "x", 1.5));
        assertEquals(0.0, eval(Differentiator.differentiate(rd, "x"), "x", 1.5));
        assertEquals(0.0, eval(Differentiator.differentiate(rd2, "x"), "x", 1.5));

        // factorial (Gamma-based): Factorial(x) = Gamma(x+1)
        assertDerivativeNumerically(call("factorial", var("x")), "x", Map.of("x", 2.0), 1e-4);
    }

    @Test
    void differentiatesConditionalsAndSeries() {
        // If(a, b, x^2, y, z) -> w.r.t x -> If(a, b, 2x, 0, 0)
        Expr ifExpr = new Expr.Call("if", List.of(num(1), num(2), pow(var("x"), num(2)), var("y"), var("z")));
        Expr dIf = Differentiator.differentiate(ifExpr, "x");
        assertNotNull(dIf);
        assertEquals(4.0, eval(dIf, Map.of("x", 2.0, "y", 10.0, "z", 20.0)));

        // Sum(i, 1, 3, i*x^2) -> w.r.t x -> Sum(i, 1, 3, 2*i*x) = 2x + 4x + 6x = 12x
        Expr sumExpr = new Expr.Call("sum", List.of(var("i"), num(1), num(3), mul(var("i"), pow(var("x"), num(2)))));
        Expr dSum = Differentiator.differentiate(sumExpr, "x");
        assertNotNull(dSum);
        assertEquals(24.0, eval(dSum, Map.of("x", 2.0)), 1e-9);

        // Product(i, 1, 3, x) -> Product of 3 x's = x^3 -> derivative 3x^2
        Expr prodExpr = new Expr.Call("product", List.of(var("i"), num(1), num(3), var("x")));
        Expr dProd = Differentiator.differentiate(prodExpr, "x");
        assertNotNull(dProd);
        assertEquals(12.0, eval(dProd, Map.of("x", 2.0)), 1e-9);
    }

    @Test
    void differentiatesComplexHelpersInRealMode() {
        assertDerivativeNumerically(call("conj", var("x")), "x", Map.of("x", 2.0), 1e-6);
        assertDerivativeNumerically(call("magnitude", var("x")), "x", Map.of("x", 2.0), 1e-6);
        assertEquals(0.0, eval(Differentiator.differentiate(call("angle", var("x")), "x"), "x", 2.0));
        assertDerivativeNumerically(call("cis", var("x")), "x", Map.of("x", 1.0), 1e-6);
    }
}
