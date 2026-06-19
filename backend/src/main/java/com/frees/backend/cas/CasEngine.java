package com.frees.backend.cas;

import com.frees.backend.ast.Expr;
import com.frees.backend.parser.LatexConverter;
import org.matheclipse.core.eval.ExprEvaluator;
import org.matheclipse.core.interfaces.IExpr;
import org.matheclipse.parser.client.SyntaxError;
import org.matheclipse.parser.client.math.MathException;

import java.util.Map;

/**
 * Entry point for the symbolic CAS directives. Each operation takes a frees
 * expression string, hands it to the Symja (matheclipse) engine, and brings the
 * symbolic result back into the frees {@link Expr} world so it renders through
 * the existing {@link LatexConverter}.
 *
 * <p>The round trip is deliberately string-based: frees {@code Expr} ->
 * Symja input string -> Symja evaluation -> Symja output string -> frees
 * {@code Expr}. This keeps the bridge small and lets both sides reuse their own
 * parsers/printers rather than depending on each other's internal node types.
 */
public final class CasEngine {

    /** Hard cap on Symja recursion depth, to bound pathological inputs. */
    private static final short MAX_RECURSION = 256;

    /** Result of a CAS operation. */
    public record CasResult(Expr expr, String latex, String symjaInput, String symjaOutput) {
    }

    /** Thrown when a CAS operation fails (bad input, engine error, timeout). */
    public static final class CasException extends RuntimeException {
        public CasException(String message) {
            super(message);
        }

        public CasException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public CasResult factor(String expression) {
        return apply("Factor", expression);
    }

    public CasResult expand(String expression) {
        return apply("Expand", expression);
    }

    public CasResult simplify(String expression) {
        return apply("Simplify", expression);
    }

    /**
     * Partial-fraction decomposition of a rational expression with respect to
     * {@code variable} — e.g. {@code apart("(s+3)/(s^2+3*s+2)", "s")} yields
     * {@code 2/(s+1) - 1/(s+2)}. This is the Laplace residue workflow.
     */
    public CasResult apart(String expression, String variable) {
        return applyWithVariable("Apart", expression, variable);
    }

    /** Partial-fraction decomposition of an already-built expression tree. */
    public CasResult apart(Expr expression, String variable) {
        String var = requireIdentifier(variable);
        String symjaInput = toSymja(expression);
        String symjaOutput = evaluate("Apart(" + symjaInput + "," + var + ")");
        return buildResult(symjaInput, symjaOutput);
    }

    /** Runs a single-argument Symja function over a frees expression. */
    public CasResult apply(String symjaFunction, String expression) {
        String symjaInput = toSymja(expression);
        String symjaOutput = evaluate(symjaFunction + "(" + symjaInput + ")");
        return buildResult(symjaInput, symjaOutput);
    }

    /** Runs a Symja function that takes the expression plus a variable argument. */
    public CasResult applyWithVariable(String symjaFunction, String expression, String variable) {
        String var = requireIdentifier(variable);
        String symjaInput = toSymja(expression);
        String symjaOutput = evaluate(symjaFunction + "(" + symjaInput + "," + var + ")");
        return buildResult(symjaInput, symjaOutput);
    }

    private String toSymja(String expression) {
        Expr input;
        try {
            input = CasExpressions.parse(expression);
        } catch (CasExpressions.ParseFailure e) {
            throw new CasException("could not parse expression: " + e.getMessage(), e);
        }
        return toSymja(input);
    }

    private String toSymja(Expr input) {
        try {
            return ExprToSymja.convert(input);
        } catch (ExprToSymja.UnsupportedExpression e) {
            throw new CasException(e.getMessage(), e);
        }
    }

    private CasResult buildResult(String symjaInput, String symjaOutput) {
        Expr result;
        try {
            result = CasExpressions.parse(SymjaOutputNormalizer.normalize(symjaOutput));
        } catch (CasExpressions.ParseFailure e) {
            throw new CasException(
                    "could not read CAS result '" + symjaOutput + "': " + e.getMessage(), e);
        }
        String latex = LatexConverter.toLatex(result, Map.of());
        return new CasResult(result, latex, symjaInput, symjaOutput);
    }

    /** Variable names handed to Symja must be plain identifiers (frees lowercases them). */
    private static String requireIdentifier(String variable) {
        if (variable == null || !variable.matches("[A-Za-z][A-Za-z0-9_]*")) {
            throw new CasException("invalid variable name: '" + variable + "'");
        }
        return variable.toLowerCase();
    }

    private String evaluate(String command) {
        try {
            ExprEvaluator util = new ExprEvaluator(false, MAX_RECURSION);
            IExpr result = util.eval(command);
            return result.toString();
        } catch (SyntaxError e) {
            throw new CasException("CAS syntax error evaluating '" + command + "': " + e.getMessage(), e);
        } catch (MathException e) {
            throw new CasException("CAS math error evaluating '" + command + "': " + e.getMessage(), e);
        } catch (StackOverflowError e) {
            throw new CasException("CAS expression too deeply nested: " + command, e);
        }
    }
}
