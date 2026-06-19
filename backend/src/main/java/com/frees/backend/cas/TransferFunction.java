package com.frees.backend.cas;

import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Builds a transfer-function expression {@code num(var) / den(var)} from
 * coefficient arrays, as a frees {@link Expr} so it renders through the existing
 * {@code LatexConverter} and feeds straight into the CAS (e.g. partial
 * fractions).
 *
 * <p>Coefficients are in descending powers, MATLAB-style: {@code [1, 3, 2]}
 * means {@code var^2 + 3*var + 2}.
 */
public final class TransferFunction {

    private TransferFunction() {
    }

    /**
     * Rewrites every {@code tf(num, den)} call in an expression into the
     * corresponding {@code num(variable)/den(variable)} fraction, so a transfer
     * function written as {@code tf([1,3],[1,3,2])} can be manipulated by the
     * CAS. The coefficient arrays must be constant (array literals of numbers).
     */
    public static Expr expandCalls(Expr e, String variable) {
        return switch (e) {
            case Expr.Call(String function, List<Expr> args) -> {
                if (function.equals("tf")) {
                    yield expandTfCall(args, variable);
                }
                yield new Expr.Call(function, args.stream().map(a -> expandCalls(a, variable)).toList());
            }
            case Expr.BinOp(char op, Expr l, Expr r) ->
                    new Expr.BinOp(op, expandCalls(l, variable), expandCalls(r, variable));
            case Expr.Neg(Expr operand) -> new Expr.Neg(expandCalls(operand, variable));
            case Expr.Range(Expr start, Expr end) ->
                    new Expr.Range(expandCalls(start, variable), expandCalls(end, variable));
            case Expr.ArrayLiteral(List<Expr> elements) ->
                    new Expr.ArrayLiteral(elements.stream().map(a -> expandCalls(a, variable)).toList());
            case Expr.Compare(String op, Expr l, Expr r) ->
                    new Expr.Compare(op, expandCalls(l, variable), expandCalls(r, variable));
            case Expr.Logical(String op, Expr l, Expr r) ->
                    new Expr.Logical(op, expandCalls(l, variable), expandCalls(r, variable));
            case Expr.Not(Expr operand) -> new Expr.Not(expandCalls(operand, variable));
            case Expr.ArrayAccess(String name, List<Expr> indices) ->
                    new Expr.ArrayAccess(name, indices.stream().map(a -> expandCalls(a, variable)).toList());
            case Expr.Num ignored -> e;
            case Expr.Var ignored -> e;
            case Expr.Str ignored -> e;
        };
    }

    private static Expr expandTfCall(List<Expr> args, String variable) {
        if (args.size() != 2) {
            throw new IllegalArgumentException("tf expects two arguments: tf(num, den)");
        }
        return fraction(coefficients(args.get(0), "num"), coefficients(args.get(1), "den"), variable);
    }

    /** Evaluates an array-literal argument to constant coefficients. */
    private static double[] coefficients(Expr arg, String which) {
        if (!(arg instanceof Expr.ArrayLiteral(List<Expr> rows))) {
            throw new IllegalArgumentException(
                    "tf " + which + " must be a constant array literal, e.g. [1, 3, 2]");
        }
        // A bracket literal is built as rows of cells (ArrayLiteral of ArrayLiterals).
        // A coefficient vector is 1-D, so flatten row- or column-vector nesting.
        List<Expr> elements = new ArrayList<>();
        for (Expr row : rows) {
            if (row instanceof Expr.ArrayLiteral(List<Expr> cells)) {
                elements.addAll(cells);
            } else {
                elements.add(row);
            }
        }
        double[] coeffs = new double[elements.size()];
        for (int i = 0; i < elements.size(); i++) {
            try {
                coeffs[i] = Evaluator.eval(elements.get(i), Map.of());
            } catch (RuntimeException ex) {
                throw new IllegalArgumentException(
                        "tf " + which + " coefficients must be constants: " + ex.getMessage(), ex);
            }
        }
        return coeffs;
    }

    /** Builds {@code num/den} as a single rational expression in {@code variable}. */
    public static Expr fraction(double[] num, double[] den, String variable) {
        if (den.length == 0) {
            throw new IllegalArgumentException("denominator must have at least one coefficient");
        }
        return new Expr.BinOp('/', polynomial(num, variable), polynomial(den, variable));
    }

    /** Builds a polynomial in {@code variable} from descending-power coefficients. */
    public static Expr polynomial(double[] coeffsDescending, String variable) {
        int n = coeffsDescending.length;
        Expr poly = null;
        for (int i = 0; i < n; i++) {
            double c = coeffsDescending[i];
            if (c == 0.0) {
                continue;
            }
            int power = n - 1 - i;
            poly = addTerm(poly, c, power, variable);
        }
        return poly == null ? new Expr.Num(0.0) : poly;
    }

    private static Expr addTerm(Expr poly, double coeff, int power, String variable) {
        // Use subtraction for negative coefficients so the rendered polynomial
        // reads "s^2 + 3*s - 2" rather than "... + -2".
        boolean negative = coeff < 0;
        Expr term = term(Math.abs(coeff), power, variable);
        if (poly == null) {
            return negative ? new Expr.Neg(term) : term;
        }
        return new Expr.BinOp(negative ? '-' : '+', poly, term);
    }

    /** A single {@code coeff * variable^power} term, with the usual 1/var^1 simplifications. */
    private static Expr term(double magnitude, int power, String variable) {
        Expr powerExpr = powerExpr(variable, power);
        if (powerExpr == null) {
            // power == 0: a bare constant.
            return new Expr.Num(magnitude);
        }
        if (magnitude == 1.0) {
            return powerExpr;
        }
        return new Expr.BinOp('*', new Expr.Num(magnitude), powerExpr);
    }

    /** {@code variable^power}, or null for power 0, or the bare variable for power 1. */
    private static Expr powerExpr(String variable, int power) {
        if (power == 0) {
            return null;
        }
        Expr var = new Expr.Var(variable);
        if (power == 1) {
            return var;
        }
        return new Expr.BinOp('^', var, new Expr.Num(power));
    }
}
