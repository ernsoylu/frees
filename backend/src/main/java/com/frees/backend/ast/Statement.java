package com.frees.backend.ast;

import java.util.List;

/**
 * Represents a parsed statement in frEES, which can be an equation
 * or a duplicate block.
 */
public sealed interface Statement permits Statement.Eq, Statement.Duplicate {

    record Eq(Expr lhs, Expr rhs, String sourceText) implements Statement {}

    record Duplicate(String varName, Expr start, Expr end, List<Statement> body) implements Statement {}
}
