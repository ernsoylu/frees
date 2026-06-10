package com.frees.backend.ast;

import java.util.List;

/**
 * Represents a parsed statement in frEES, which can be an equation,
 * a duplicate block, or a CALL to a PROCEDURE or MODULE.
 */
public sealed interface Statement permits Statement.Eq, Statement.Duplicate, Statement.CallProc {

    record Eq(Expr lhs, Expr rhs, String sourceText) implements Statement {}

    record Duplicate(String varName, Expr start, Expr end, List<Statement> body) implements Statement {}

    /**
     * CALL name(inputs : outputs) — invokes a PROCEDURE or MODULE.
     * At flatten time this generates equations that bind the outputs.
     */
    record CallProc(String name, List<Expr> inputs, List<String> outputs) implements Statement {}
}
