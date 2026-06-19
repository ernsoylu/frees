package com.frees.backend.cas;

import com.frees.backend.ast.Expr;

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
