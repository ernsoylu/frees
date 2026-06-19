package com.frees.backend.cas;

import com.frees.backend.ast.Expr;
import org.matheclipse.core.eval.ExprEvaluator;
import org.matheclipse.core.interfaces.IExpr;
import org.matheclipse.parser.client.math.MathException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

/**
 * Solves a symbolic identity for its unknown coefficients.
 *
 * <p>Given an equation {@code lhs(var) == rhs(var, c1, c2, ...)} that must hold
 * for <em>all</em> values of the independent {@code var} (e.g. the Laplace
 * variable {@code s}), this finds the coefficient values {@code c1, c2, ...}.
 * This is the engine behind the partial-fraction workflow: writing
 * {@code (s+3)/(s^2+3*s+2) = A/(s+1) + B/(s+2)} solves for the residues
 * {@code A = 2}, {@code B = -1}, which then become ordinary frees variables.
 *
 * <p>Method: the identity holds for all {@code var} iff the numerator of
 * {@code lhs - rhs} (over a common denominator) is the zero polynomial, i.e.
 * every coefficient of {@code var} vanishes. Those coefficient equations are
 * linear in the unknowns and solved by Symja.
 */
public final class CasIdentity {

    private static final short MAX_RECURSION = 256;

    private CasIdentity() {
    }

    /**
     * Solves {@code lhs == rhs} (as an identity in {@code variable}) for every
     * symbol other than {@code variable}. Returns coefficient name -> value, in
     * a stable (sorted) order.
     */
    public static Map<String, Double> solveCoefficients(Expr lhs, Expr rhs, String variable) {
        String var = variable.toLowerCase();

        TreeSet<String> unknowns = new TreeSet<>();
        unknowns.addAll(lhs.variables());
        unknowns.addAll(rhs.variables());
        unknowns.remove(var);
        if (unknowns.isEmpty()) {
            throw new CasEngine.CasException("identity has no unknown coefficients to solve for");
        }

        String lhsS = convert(lhs);
        String rhsS = convert(rhs);
        String unknownList = String.join(",", unknowns);

        try {
            ExprEvaluator util = new ExprEvaluator(false, MAX_RECURSION);
            // The numerator of (lhs - rhs) over a common denominator must be the
            // zero polynomial in var; equate each coefficient to zero and solve.
            util.eval("sol = Solve(Map(Function(#1 == 0), "
                    + "CoefficientList(Numerator(Together((" + lhsS + ") - (" + rhsS + "))), " + var + ")), {"
                    + unknownList + "})");

            Map<String, Double> result = new LinkedHashMap<>();
            List<String> failures = new ArrayList<>();
            for (String name : unknowns) {
                // name /. First(sol): substitute the first solution's rules into
                // the bare symbol, yielding its value. A non-number means the
                // system was inconsistent or underdetermined for that unknown.
                IExpr value;
                try {
                    value = util.eval(name + " /. First(sol)");
                } catch (RuntimeException ex) {
                    failures.add(name);
                    continue;
                }
                if (value.isNumber()) {
                    result.put(name, value.evalDouble());
                } else {
                    failures.add(name);
                }
            }
            if (!failures.isEmpty()) {
                throw new CasEngine.CasException(
                        "could not solve the identity for: " + String.join(", ", failures)
                                + " (it may be inconsistent or underdetermined)");
            }
            return result;
        } catch (MathException e) {
            throw new CasEngine.CasException("CAS error solving identity: " + e.getMessage(), e);
        } catch (StackOverflowError e) {
            throw new CasEngine.CasException("identity too deeply nested to solve", e);
        }
    }

    private static String convert(Expr e) {
        try {
            return ExprToSymja.convert(e);
        } catch (ExprToSymja.UnsupportedExpression ex) {
            throw new CasEngine.CasException(ex.getMessage(), ex);
        }
    }
}
