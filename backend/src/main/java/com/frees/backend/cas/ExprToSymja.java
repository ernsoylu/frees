package com.frees.backend.cas;

import com.frees.backend.ast.Expr;

import java.util.List;
import java.util.Map;

/**
 * Renders a frees {@link Expr} into a Symja (matheclipse) input string.
 *
 * <p>Only the scalar algebraic subset is supported: numbers, variables, the
 * arithmetic operators (+ - * / ^), negation, and known scalar functions.
 * Array/matrix, comparison, logical and string nodes are rejected, because the
 * CAS directives operate on ordinary algebraic expressions.
 */
public final class ExprToSymja {

    /** frees function name (lowercase) -> Symja canonical (capitalised) name. */
    private static final Map<String, String> FUNCTION_NAMES = Map.ofEntries(
            Map.entry("ln", "Log"),
            Map.entry("log10", "Log10"),
            Map.entry("sqrt", "Sqrt"),
            Map.entry("exp", "Exp"),
            Map.entry("abs", "Abs"),
            Map.entry("sin", "Sin"),
            Map.entry("cos", "Cos"),
            Map.entry("tan", "Tan"),
            Map.entry("arcsin", "ArcSin"),
            Map.entry("arccos", "ArcCos"),
            Map.entry("arctan", "ArcTan"),
            Map.entry("sinh", "Sinh"),
            Map.entry("cosh", "Cosh"),
            Map.entry("tanh", "Tanh"),
            Map.entry("arcsinh", "ArcSinh"),
            Map.entry("arccosh", "ArcCosh"),
            Map.entry("arctanh", "ArcTanh"));

    private ExprToSymja() {
    }

    /** Thrown when an expression contains a construct the CAS layer cannot handle. */
    public static final class UnsupportedExpression extends RuntimeException {
        public UnsupportedExpression(String message) {
            super(message);
        }
    }

    public static String convert(Expr e) {
        StringBuilder sb = new StringBuilder();
        write(e, sb);
        return sb.toString();
    }

    private static void write(Expr e, StringBuilder sb) {
        switch (e) {
            case Expr.Num(double value, String unit, boolean isImaginary) -> {
                if (isImaginary) {
                    sb.append('(').append(number(value)).append("*I)");
                } else {
                    sb.append(number(value));
                }
            }
            case Expr.Var(String name) -> sb.append(name);
            case Expr.Neg(Expr operand) -> {
                sb.append("(-(");
                write(operand, sb);
                sb.append("))");
            }
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                sb.append('(');
                write(left, sb);
                sb.append(op);
                write(right, sb);
                sb.append(')');
            }
            case Expr.Call(String function, List<Expr> args) -> writeCall(function, args, sb);
            case Expr.Str ignored ->
                    throw new UnsupportedExpression("string literals are not supported in CAS expressions");
            case Expr.ArrayAccess ignored ->
                    throw new UnsupportedExpression("array indexing is not supported in CAS expressions");
            case Expr.ArrayLiteral ignored ->
                    throw new UnsupportedExpression("array/matrix literals are not supported in CAS expressions");
            case Expr.Range ignored ->
                    throw new UnsupportedExpression("ranges are not supported in CAS expressions");
            case Expr.Compare ignored ->
                    throw new UnsupportedExpression("comparisons are not supported in CAS expressions");
            case Expr.Logical ignored ->
                    throw new UnsupportedExpression("logical operators are not supported in CAS expressions");
            case Expr.Not ignored ->
                    throw new UnsupportedExpression("boolean negation is not supported in CAS expressions");
        }
    }

    private static void writeCall(String function, List<Expr> args, StringBuilder sb) {
        String name = FUNCTION_NAMES.get(function);
        if (name == null) {
            throw new UnsupportedExpression("function not supported in CAS expressions: " + function);
        }
        sb.append(name).append('(');
        for (int i = 0; i < args.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            write(args.get(i), sb);
        }
        sb.append(')');
    }

    /**
     * Emits integral values without a decimal point so Symja treats them as
     * exact integers (e.g. {@code Factor(x^2-1)} only factors over the integers
     * when the literals are integers, not {@code 1.0}).
     */
    private static String number(double value) {
        if (value == Math.rint(value) && !Double.isInfinite(value)
                && Math.abs(value) < 1e15) {
            return Long.toString((long) value);
        }
        return Double.toString(value);
    }
}
