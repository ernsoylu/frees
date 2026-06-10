package com.frees.backend.ast;

import java.util.Set;
import java.util.TreeSet;

/**
 * AST for an EES expression. Variable names are stored lowercase because
 * EES variable names are case-insensitive.
 */
public sealed interface Expr permits Expr.Num, Expr.Var, Expr.BinOp, Expr.Neg, Expr.Call {

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
        }
    }
}
