package com.frees.backend.ast;

import java.util.Set;
import java.util.TreeSet;

/**
 * AST for a frees expression. Variable names are stored lowercase because
 * variable names are case-insensitive.
 */
public sealed interface Expr extends java.io.Serializable permits Expr.Num, Expr.Str, Expr.Var, Expr.BinOp, Expr.Neg,
        Expr.Call, Expr.ArrayAccess, Expr.Range, Expr.ArrayLiteral,
        Expr.Compare, Expr.Logical, Expr.Not {

    /** A numeric literal, optionally annotated with units: 140 [kPa]. */
    record Num(double value, String unit, boolean isImaginary) implements Expr {
        public Num(double value) {
            this(value, null, false);
        }
        public Num(double value, String unit) {
            this(value, unit, false);
        }
    }

    /** A string literal: 'hello'. */
    record Str(String value) implements Expr {}

    record Var(String name) implements Expr {
        public Var {
            name = name.toLowerCase();
        }
    }

    record BinOp(char op, Expr left, Expr right) implements Expr {}

    record Neg(Expr operand) implements Expr {}

    record Call(String function, java.util.List<Expr> args) implements Expr {
        public Call {
            function = function.toLowerCase();
        }
    }

    record ArrayAccess(String name, java.util.List<Expr> indices) implements Expr {
        public ArrayAccess {
            name = name.toLowerCase();
        }
    }

    record Range(Expr start, Expr end) implements Expr {}

    record ArrayLiteral(java.util.List<Expr> elements) implements Expr {}

    /** Relational comparison: op is one of "<", ">", "<=", ">=", "<>", "=". Evaluates to 1.0 (true) or 0.0 (false). */
    record Compare(String op, Expr left, Expr right) implements Expr {}

    /** Boolean AND / OR. Evaluates to 1.0 (true) or 0.0 (false). */
    record Logical(String op, Expr left, Expr right) implements Expr {}

    /** Boolean NOT. Evaluates to 1.0 if operand == 0.0, else 0.0. */
    record Not(Expr operand) implements Expr {}

    default Set<String> variables() {
        Set<String> vars = new TreeSet<>();
        collectVariables(this, vars);
        return vars;
    }

    private static void collectVariables(Expr e, Set<String> out) {
        switch (e) {
            case Num(double value, String unit, boolean isImaginary) -> {
                // Number literals do not contain variables
            }
            case Str(String value) -> {
                // String literals do not contain variables
            }
            case Var(String name) -> out.add(name);
            case Neg(Expr operand) -> collectVariables(operand, out);
            case BinOp(char op, Expr left, Expr right) -> {
                collectVariables(left, out);
                collectVariables(right, out);
            }
            case Call(String function, java.util.List<Expr> args) -> {
                String lowerFn = function.toLowerCase();
                if ((lowerFn.equals("sum") || lowerFn.equals("product"))
                        && args.size() == 4 && args.get(0) instanceof Var(String varName)) {
                    collectVariables(args.get(1), out);
                    collectVariables(args.get(2), out);
                    Set<String> temp = new TreeSet<>();
                    collectVariables(args.get(3), temp);
                    temp.remove(varName.toLowerCase());
                    out.addAll(temp);
                } else if (lowerFn.equals("gaussintegral")
                        && args.size() >= 4 && args.get(1) instanceof Var(String dummy)) {
                    // GaussIntegral(f, t, a, b[, points]): t is a bound integration
                    // variable, not a system unknown — collect the rest, minus t.
                    Set<String> temp = new TreeSet<>();
                    collectVariables(args.get(0), temp);
                    temp.remove(dummy.toLowerCase());
                    out.addAll(temp);
                    for (int i = 2; i < args.size(); i++) {
                        collectVariables(args.get(i), out);
                    }
                } else {
                    args.forEach(a -> collectVariables(a, out));
                }
            }
            case ArrayAccess(String name, java.util.List<Expr> indices) -> {
                out.add(name);
                indices.forEach(idx -> collectVariables(idx, out));
            }
            case Range(Expr start, Expr end) -> {
                collectVariables(start, out);
                collectVariables(end, out);
            }
            case ArrayLiteral(java.util.List<Expr> elements) -> elements.forEach(elem -> collectVariables(elem, out));
            case Compare(String op, Expr left, Expr right) -> {
                collectVariables(left, out);
                collectVariables(right, out);
            }
            case Logical(String op, Expr left, Expr right) -> {
                collectVariables(left, out);
                collectVariables(right, out);
            }
            case Not(Expr operand) -> collectVariables(operand, out);
        }
    }
}
