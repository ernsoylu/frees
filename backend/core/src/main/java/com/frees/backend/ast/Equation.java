package com.frees.backend.ast;

import java.util.Set;
import java.util.TreeSet;

/**
 * A single equation lhs = rhs. The solver works with the residual lhs - rhs.
 */
public record Equation(Expr lhs, Expr rhs, String sourceText) {

    public Set<String> variables() {
        Set<String> vars = new TreeSet<>(lhs.variables());
        vars.addAll(rhs.variables());
        return vars;
    }
}
