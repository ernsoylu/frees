package com.frees.backend.ast;

import java.util.ArrayList;
import java.util.List;

/**
 * Symbolic partial differentiation of {@link Expr} ASTs.
 *
 * <p>{@link #differentiate(Expr, String)} returns the derivative expression,
 * or {@code null} when the expression contains constructs that cannot be
 * differentiated analytically (property calls, eigen decompositions, integrals,
 * user-defined procedures, etc.).  A {@code null} return signals the caller to
 * fall back to numerical finite differences.
 *
 * <p>The returned expression is algebraically simplified to remove trivial
 * terms ({@code 0 + x}, {@code 1 * x}, {@code x^0}, etc.).
 */
public final class Differentiator {

    private Differentiator() {}

    /**
     * Computes ∂expr/∂variable symbolically.
     *
     * @param expr     the expression to differentiate
     * @param variable the variable name (case-insensitive; stored lowercase)
     * @return the derivative expression, or {@code null} if analytical
     *         differentiation is not possible
     */
    public static Expr differentiate(Expr expr, String variable) {
        String var = variable.toLowerCase();
        return diff(expr, var);
    }

    // ── core recursive differentiator ────────────────────────────────────

    private static Expr diff(Expr e, String var) {
        return switch (e) {
            case Expr.Num n -> num(0);
            case Expr.Var(String name) -> name.equals(var) ? num(1) : num(0);

            case Expr.Neg(Expr operand) -> {
                Expr d = diff(operand, var);
                yield d == null ? null : simplifyNeg(d);
            }

            case Expr.BinOp(char op, Expr left, Expr right) ->
                diffBinOp(op, left, right, var);

            case Expr.Call(String function, List<Expr> args) ->
                diffCall(function, args, var);

            // Non-differentiable constructs.
            case Expr.Str s -> null;
            case Expr.ArrayAccess a -> null;
            case Expr.Range r -> null;
            case Expr.ArrayLiteral a -> null;
            case Expr.Compare c -> null;
            case Expr.Logical l -> null;
            case Expr.Not n -> null;
        };
    }

    // ── binary operators ─────────────────────────────────────────────────

    private static Expr diffBinOp(char op, Expr f, Expr g, String var) {
        return switch (op) {
            case '+' -> {
                Expr df = diff(f, var);
                Expr dg = diff(g, var);
                yield (df == null || dg == null) ? null : simplifyAdd(df, dg);
            }
            case '-' -> {
                Expr df = diff(f, var);
                Expr dg = diff(g, var);
                yield (df == null || dg == null) ? null : simplifySub(df, dg);
            }
            case '*' -> {
                // Product rule: f'g + fg'
                Expr df = diff(f, var);
                Expr dg = diff(g, var);
                if (df == null || dg == null) yield null;
                yield simplifyAdd(simplifyMul(df, g), simplifyMul(f, dg));
            }
            case '/' -> {
                // Quotient rule: (f'g − fg') / g²
                Expr df = diff(f, var);
                Expr dg = diff(g, var);
                if (df == null || dg == null) yield null;
                Expr numerator = simplifySub(simplifyMul(df, g), simplifyMul(f, dg));
                Expr denominator = simplifyMul(g, g);
                yield simplifyDiv(numerator, denominator);
            }
            case '^' -> diffPower(f, g, var);
            default -> null;
        };
    }

    /**
     * Power rule.
     * <ul>
     *   <li>Constant exponent: d/dx f^n = n * f^(n−1) * f'</li>
     *   <li>General case: d/dx f^g = f^g * (g' ln f + g f'/f)</li>
     * </ul>
     */
    private static Expr diffPower(Expr f, Expr g, String var) {
        Expr df = diff(f, var);
        Expr dg = diff(g, var);
        if (df == null || dg == null) return null;

        if (isConstant(g)) {
            // n * f^(n-1) * f'
            Expr nMinusOne = simplifySub(g, num(1));
            return simplifyMul(simplifyMul(g, simplifyPow(f, nMinusOne)), df);
        }
        // General: f^g * (g' * ln(f) + g * f'/f)
        Expr lnF = call("ln", f);
        Expr term1 = simplifyMul(dg, lnF);
        Expr term2 = simplifyMul(g, simplifyDiv(df, f));
        return simplifyMul(simplifyPow(f, g), simplifyAdd(term1, term2));
    }

    // ── function calls (chain rule) ──────────────────────────────────────

    private static Expr diffCall(String function, List<Expr> args, String var) {
        // Property calls, user-defined functions, special synthetic calls
        if (function.startsWith("prop$") || function.startsWith("proc$")
                || function.startsWith("eigen$")) {
            return null;
        }

        return switch (function) {
            // ── trig ────────────────────────────────────────────────────
            case "sin" -> chainRule(args, var, f -> call("cos", f));
            case "cos" -> chainRule(args, var, f -> simplifyNeg(call("sin", f)));
            case "tan" -> chainRule(args, var, f ->
                    simplifyDiv(num(1), simplifyMul(call("cos", f), call("cos", f))));

            // ── inverse trig ────────────────────────────────────────────
            case "arcsin" -> chainRule(args, var, f ->
                    simplifyDiv(num(1), call("sqrt",
                            simplifySub(num(1), simplifyMul(f, f)))));
            case "arccos" -> chainRule(args, var, f ->
                    simplifyNeg(simplifyDiv(num(1), call("sqrt",
                            simplifySub(num(1), simplifyMul(f, f))))));
            case "arctan" -> chainRule(args, var, f ->
                    simplifyDiv(num(1), simplifyAdd(num(1), simplifyMul(f, f))));

            // ── exp / log ───────────────────────────────────────────────
            case "exp" -> chainRule(args, var, f -> call("exp", f));
            case "ln"  -> chainRule(args, var, f -> simplifyDiv(num(1), f));
            case "log10" -> chainRule(args, var, f ->
                    simplifyDiv(num(1), simplifyMul(f, call("ln", num(10)))));
            case "sqrt" -> chainRule(args, var, f ->
                    simplifyDiv(num(1), simplifyMul(num(2), call("sqrt", f))));

            // ── abs ─────────────────────────────────────────────────────
            // d/dx |f| = f / |f| * f'  (= sign(f) * f')
            case "abs" -> chainRule(args, var, f ->
                    simplifyDiv(f, call("abs", f)));

            // ── error functions ─────────────────────────────────────────
            // d/dx erf(f) = (2/√π) exp(−f²) f'
            case "erf" -> chainRule(args, var, f ->
                    simplifyMul(
                            simplifyDiv(num(2), call("sqrt", num(Math.PI))),
                            call("exp", simplifyNeg(simplifyMul(f, f)))));
            // d/dx erfc(f) = −(2/√π) exp(−f²) f'
            case "erfc" -> chainRule(args, var, f ->
                    simplifyNeg(simplifyMul(
                            simplifyDiv(num(2), call("sqrt", num(Math.PI))),
                            call("exp", simplifyNeg(simplifyMul(f, f))))));

            // ── gamma ───────────────────────────────────────────────────
            // d/dx Γ(f) = Γ(f) * ψ(f) * f'   (ψ = digamma)
            case "gamma" -> chainRule(args, var, f ->
                    simplifyMul(call("gamma", f), call("digamma", f)));
            // d/dx lnΓ(f) = ψ(f) * f'
            case "loggamma" -> chainRule(args, var, f -> call("digamma", f));
            // digamma itself is evaluated numerically at runtime; it only
            // appears as an intermediate inside a Jacobian expression.

            // d/dx erfinv(f) = (√π/2) exp(erfinv(f)²) f'
            case "erfinv" -> chainRule(args, var, f -> {
                Expr inv = call("erfinv", f);
                return simplifyMul(
                        simplifyDiv(call("sqrt", num(Math.PI)), num(2)),
                        call("exp", simplifyMul(inv, inv)));
            });

            // ∂/∂x B(a,b) = B(a,b) [(ψ(a) − ψ(a+b)) a' + (ψ(b) − ψ(a+b)) b']
            case "beta" -> diffBeta(args, var);

            // d/dx J_n(x) = (J_{n−1}(x) − J_{n+1}(x)) / 2 · x'  (constant n)
            case "besselj", "bessel_j" -> diffBessel(args, var, function, true, false);
            // d/dx I_n(x) = (I_{n−1}(x) + I_{n+1}(x)) / 2 · x'  (constant n)
            case "besseli", "bessel_i" -> diffBessel(args, var, function, false, false);
            // d/dx Y_n(x) = (Y_{n−1}(x) − Y_{n+1}(x)) / 2 · x'  (constant n)
            case "bessely", "bessel_y" -> diffBessel(args, var, function, true, false);
            // d/dx K_n(x) = -(K_{n−1}(x) + K_{n+1}(x)) / 2 · x'  (constant n)
            case "besselk", "bessel_k" -> diffBessel(args, var, function, false, true);

            // Shortcut Bessel functions
            case "besselj0", "bessel_j0" -> chainRule(args, var, f -> simplifyNeg(call(function.substring(0, function.length() - 1) + "1", f)));
            case "besseli0", "bessel_i0" -> chainRule(args, var, f -> call(function.substring(0, function.length() - 1) + "1", f));
            case "bessely0", "bessel_y0" -> chainRule(args, var, f -> simplifyNeg(call(function.substring(0, function.length() - 1) + "1", f)));
            case "besselk0", "bessel_k0" -> chainRule(args, var, f -> simplifyNeg(call(function.substring(0, function.length() - 1) + "1", f)));

            case "besselj1", "bessel_j1" -> chainRule(args, var, f -> simplifySub(call(function.substring(0, function.length() - 1) + "0", f), simplifyDiv(call(function, f), f)));
            case "besseli1", "bessel_i1" -> chainRule(args, var, f -> simplifySub(call(function.substring(0, function.length() - 1) + "0", f), simplifyDiv(call(function, f), f)));
            case "bessely1", "bessel_y1" -> chainRule(args, var, f -> simplifySub(call(function.substring(0, function.length() - 1) + "0", f), simplifyDiv(call(function, f), f)));
            case "besselk1", "bessel_k1" -> chainRule(args, var, f -> simplifySub(simplifyNeg(call(function.substring(0, function.length() - 1) + "0", f)), simplifyDiv(call(function, f), f)));

            // Chi-Square distribution derivative: the PDF
            case "chi_square" -> {
                if (args.size() != 2) yield null;
                Expr x = args.get(0);
                Expr df = args.get(1);
                if (!isConstant(df)) yield null;
                Expr dx = diff(x, var);
                if (dx == null) yield null;
                Expr halfDf = simplifyDiv(df, num(2));
                Expr numerator = simplifyMul(
                        call("exp", simplifyNeg(simplifyDiv(x, num(2)))),
                        simplifyPow(x, simplifySub(halfDf, num(1)))
                );
                Expr denominator = simplifyMul(
                        simplifyPow(num(2), halfDf),
                        call("gamma", halfDf)
                );
                yield simplifyMul(simplifyDiv(numerator, denominator), dx);
            }
            case "random", "randg", "uncertaintyof" -> num(0.0);
            case "probability" -> {
                if (args.size() != 4) yield null;
                Expr x1 = args.get(0);
                Expr x2 = args.get(1);
                Expr mean = args.get(2);
                Expr stdDev = args.get(3);
                if (!isConstant(mean) || !isConstant(stdDev)) yield null;
                Expr dx1 = diff(x1, var);
                Expr dx2 = diff(x2, var);
                if (dx1 == null || dx2 == null) yield null;
                Expr factor = simplifyMul(stdDev, num(Math.sqrt(2.0 * Math.PI)));
                Expr pdf1 = simplifyDiv(
                        call("exp", simplifyNeg(simplifyDiv(simplifyPow(simplifySub(x1, mean), num(2)), simplifyMul(num(2), simplifyPow(stdDev, num(2)))))),
                        factor
                );
                Expr pdf2 = simplifyDiv(
                        call("exp", simplifyNeg(simplifyDiv(simplifyPow(simplifySub(x2, mean), num(2)), simplifyMul(num(2), simplifyPow(stdDev, num(2)))))),
                        factor
                );
                yield simplifySub(simplifyMul(pdf2, dx2), simplifyMul(pdf1, dx1));
            }

            // ── hyperbolic functions ────────────────────────────────────
            case "sinh" -> chainRule(args, var, f -> call("cosh", f));
            case "cosh" -> chainRule(args, var, f -> call("sinh", f));
            case "tanh" -> chainRule(args, var, f ->
                    simplifySub(num(1), simplifyMul(call("tanh", f), call("tanh", f))));
            case "arcsinh" -> chainRule(args, var, f ->
                    simplifyDiv(num(1), call("sqrt", simplifyAdd(simplifyMul(f, f), num(1)))));
            case "arccosh" -> chainRule(args, var, f ->
                    simplifyDiv(num(1), call("sqrt", simplifySub(simplifyMul(f, f), num(1)))));
            case "arctanh" -> chainRule(args, var, f ->
                    simplifyDiv(num(1), simplifySub(num(1), simplifyMul(f, f))));

            // ── rounding and piecewise ─────────────────────────────────
            case "floor", "ceil", "trunc", "sign", "step" ->
                    args.stream().anyMatch(a -> a.variables().contains(var)) ? num(0) : num(0);
            case "round" -> {
                if (args.isEmpty() || args.size() > 2) yield null;
                Expr f = args.get(0);
                Expr df = diff(f, var);
                yield df == null ? null : num(0);
            }
            case "factorial" -> {
                if (args.size() != 1) yield null;
                Expr f = args.get(0);
                Expr df = diff(f, var);
                if (df == null) yield null;
                Expr fact = call("factorial", f);
                Expr digamma = call("digamma", simplifyAdd(f, num(1)));
                yield simplifyMul(simplifyMul(fact, digamma), df);
            }

            // ── conditionals & series ───────────────────────────────────
            case "if" -> {
                if (args.size() != 5) yield null;
                Expr a = args.get(0);
                Expr b = args.get(1);
                Expr x = args.get(2);
                Expr y = args.get(3);
                Expr z = args.get(4);
                Expr dx = diff(x, var);
                Expr dy = diff(y, var);
                Expr dz = diff(z, var);
                if (dx == null || dy == null || dz == null) yield null;
                yield new Expr.Call("if", List.of(a, b, dx, dy, dz));
            }
            case "sum" -> {
                if (args.size() == 4 && args.get(0) instanceof Expr.Var(String idxVar)) {
                    Expr term = args.get(3);
                    Expr dTerm = diff(term, var);
                    if (dTerm == null) yield null;
                    yield new Expr.Call("sum", List.of(args.get(0), args.get(1), args.get(2), dTerm));
                } else {
                    List<Expr> dArgs = new ArrayList<>();
                    for (Expr arg : args) {
                        Expr da = diff(arg, var);
                        if (da == null) yield null;
                        dArgs.add(da);
                    }
                    yield new Expr.Call("sum", dArgs);
                }
            }
            case "product" -> {
                if (args.size() == 4 && args.get(0) instanceof Expr.Var(String idxVar)) {
                    Expr lower = args.get(1);
                    Expr upper = args.get(2);
                    Expr term = args.get(3);
                    Expr dTerm = diff(term, var);
                    if (dTerm == null) yield null;
                    Expr prod = new Expr.Call("product", List.of(args.get(0), lower, upper, term));
                    Expr sumTerm = simplifyDiv(dTerm, term);
                    Expr sum = new Expr.Call("sum", List.of(args.get(0), lower, upper, sumTerm));
                    yield simplifyMul(prod, sum);
                } else {
                    yield null;
                }
            }

            // ── complex helpers in real mode ────────────────────────────
            case "conj" -> {
                if (args.size() != 1) yield null;
                yield diff(args.get(0), var);
            }
            case "magnitude" -> chainRule(args, var, f -> simplifyDiv(f, call("abs", f)));
            case "angle", "anglerad", "angledeg" -> {
                if (args.size() != 1) yield null;
                Expr f = args.get(0);
                Expr df = diff(f, var);
                yield df == null ? null : num(0);
            }
            case "cis" -> chainRule(args, var, f -> simplifyNeg(call("sin", f)));

            // ── unsupported multi-arg or procedural functions ────────────
            case "integral", "min", "max", "average", "avg",
                 "atan2", "mod", "gcd", "lcm",
                 "bitand", "bitor", "bitxor", "bitnot", "bitshiftl", "bitshiftr",
                 "baseconvert", "digamma",
                 "real", "imag" -> null;

            // Unknown function → cannot differentiate
            default -> null;
        };
    }

    /**
     * Applies the chain rule for a single-argument function:
     * d/dx h(f(x)) = h'(f) * f'(x).
     *
     * @param outerDerivative maps the inner expression f to h'(f)
     */
    @FunctionalInterface
    private interface OuterDerivative {
        Expr apply(Expr f);
    }

    /** ∂/∂x B(a,b) = B(a,b) [(ψ(a) − ψ(a+b)) a' + (ψ(b) − ψ(a+b)) b']. */
    private static Expr diffBeta(List<Expr> args, String var) {
        if (args.size() != 2) return null;
        Expr a = args.get(0);
        Expr b = args.get(1);
        Expr da = diff(a, var);
        Expr db = diff(b, var);
        if (da == null || db == null) return null;
        Expr psiSum = call("digamma", simplifyAdd(a, b));
        Expr termA = simplifyMul(simplifySub(call("digamma", a), psiSum), da);
        Expr termB = simplifyMul(simplifySub(call("digamma", b), psiSum), db);
        return simplifyMul(new Expr.Call("beta", List.of(a, b)),
                simplifyAdd(termA, termB));
    }

    /**
     * Bessel recurrence derivative for {@code besselj(x, n)} / {@code besseli(x, n)}
     * with a constant order n:  J'_n = (J_{n−1} − J_{n+1})/2,  I'_n = (I_{n−1} + I_{n+1})/2.
     */
    private static Expr diffBessel(List<Expr> args, String var,
                                   String function, boolean subtract, boolean negate) {
        if (args.size() != 2) return null;
        Expr x = args.get(0);
        Expr order = args.get(1);
        if (!isConstant(order)) return null;
        Expr dx = diff(x, var);
        if (dx == null) return null;
        Expr lower = new Expr.Call(function, List.of(x, simplifySub(order, num(1))));
        Expr upper = new Expr.Call(function, List.of(x, simplifyAdd(order, num(1))));
        Expr combined = subtract ? simplifySub(lower, upper) : simplifyAdd(lower, upper);
        Expr result = simplifyMul(simplifyDiv(combined, num(2)), dx);
        return negate ? simplifyNeg(result) : result;
    }

    private static Expr chainRule(List<Expr> args, String var,
                                  OuterDerivative outerDerivative) {
        if (args.size() != 1) return null;
        Expr f = args.get(0);
        Expr df = diff(f, var);
        if (df == null) return null;
        Expr outer = outerDerivative.apply(f);
        return simplifyMul(outer, df);
    }

    // ── simplification ───────────────────────────────────────────────────

    /** Returns true if the expression does not depend on any variable. */
    private static boolean isConstant(Expr e) {
        return e.variables().isEmpty();
    }

    private static boolean isZero(Expr e) {
        return e instanceof Expr.Num(double v, String u, boolean i) && v == 0.0;
    }

    private static boolean isOne(Expr e) {
        return e instanceof Expr.Num(double v, String u, boolean i) && v == 1.0;
    }

    static Expr simplifyAdd(Expr a, Expr b) {
        if (isZero(a)) return b;
        if (isZero(b)) return a;
        // Fold two numeric constants.
        if (a instanceof Expr.Num(double va, String ua, boolean ia)
                && b instanceof Expr.Num(double vb, String ub, boolean ib)) {
            return num(va + vb);
        }
        return new Expr.BinOp('+', a, b);
    }

    static Expr simplifySub(Expr a, Expr b) {
        if (isZero(b)) return a;
        if (isZero(a)) return simplifyNeg(b);
        if (a instanceof Expr.Num(double va, String ua, boolean ia)
                && b instanceof Expr.Num(double vb, String ub, boolean ib)) {
            return num(va - vb);
        }
        return new Expr.BinOp('-', a, b);
    }

    static Expr simplifyMul(Expr a, Expr b) {
        if (isZero(a) || isZero(b)) return num(0);
        if (isOne(a)) return b;
        if (isOne(b)) return a;
        if (a instanceof Expr.Num(double va, String ua, boolean ia)
                && b instanceof Expr.Num(double vb, String ub, boolean ib)) {
            return num(va * vb);
        }
        return new Expr.BinOp('*', a, b);
    }

    static Expr simplifyDiv(Expr a, Expr b) {
        if (isZero(a)) return num(0);
        if (isOne(b)) return a;
        if (a instanceof Expr.Num(double va, String ua, boolean ia)
                && b instanceof Expr.Num(double vb, String ub, boolean ib) && vb != 0.0) {
            return num(va / vb);
        }
        return new Expr.BinOp('/', a, b);
    }

    static Expr simplifyPow(Expr base, Expr exp) {
        if (isZero(exp)) return num(1);
        if (isOne(exp)) return base;
        return new Expr.BinOp('^', base, exp);
    }

    static Expr simplifyNeg(Expr a) {
        if (isZero(a)) return num(0);
        if (a instanceof Expr.Neg(Expr inner)) return inner;
        if (a instanceof Expr.Num(double v, String u, boolean i)) return num(-v);
        return new Expr.Neg(a);
    }

    // ── helpers ───────────────────────────────────────────────────────────

    private static Expr.Num num(double value) {
        return new Expr.Num(value);
    }

    private static Expr.Call call(String function, Expr arg) {
        return new Expr.Call(function, List.of(arg));
    }
}
