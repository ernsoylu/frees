package com.frees.backend.ast;

import java.util.Set;
import java.util.TreeSet;

/**
 * AST for an EES expression. Variable names are stored lowercase because
 * EES variable names are case-insensitive.
 */
public sealed interface Expr permits Expr.Num, Expr.Var, Expr.BinOp, Expr.Neg,
        Expr.Call, Expr.ArrayAccess, Expr.Range, Expr.ArrayLiteral,
        Expr.Compare, Expr.Logical, Expr.Not {

    /** A numeric literal, optionally annotated with units: 140 [kPa]. */
    record Num(double value, String unit) implements Expr {
        public Num(double value) {
            this(value, null);
        }
    }

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
            case Num n -> {}
            case Var v -> out.add(v.name());
            case Neg neg -> collectVariables(neg.operand(), out);
            case BinOp b -> {
                collectVariables(b.left(), out);
                collectVariables(b.right(), out);
            }
            case Call c -> c.args().forEach(a -> collectVariables(a, out));
            case ArrayAccess aa -> {
                out.add(aa.name());
                aa.indices().forEach(idx -> collectVariables(idx, out));
            }
            case Range r -> {
                collectVariables(r.start(), out);
                collectVariables(r.end(), out);
            }
            case ArrayLiteral al -> al.elements().forEach(elem -> collectVariables(elem, out));
            case Compare cmp -> {
                collectVariables(cmp.left(), out);
                collectVariables(cmp.right(), out);
            }
            case Logical log -> {
                collectVariables(log.left(), out);
                collectVariables(log.right(), out);
            }
            case Not not -> collectVariables(not.operand(), out);
        }
    }
}
