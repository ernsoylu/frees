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

    /** Runs a single-argument Symja function over a frees expression. */
    public CasResult apply(String symjaFunction, String expression) {
        Expr input;
        try {
            input = CasExpressions.parse(expression);
        } catch (CasExpressions.ParseFailure e) {
            throw new CasException("could not parse expression: " + e.getMessage(), e);
        }

        String symjaInput;
        try {
            symjaInput = ExprToSymja.convert(input);
        } catch (ExprToSymja.UnsupportedExpression e) {
            throw new CasException(e.getMessage(), e);
        }

        String symjaOutput = evaluate(symjaFunction + "(" + symjaInput + ")");

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
