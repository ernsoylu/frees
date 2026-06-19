package com.frees.backend.ast;

import java.util.List;

/**
 * Represents a parsed statement in frees, which can be an equation,
 * a FOR loop block, or a CALL to a PROCEDURE or MODULE.
 */
public sealed interface Statement permits Statement.Eq, Statement.For, Statement.CallProc, Statement.Symbolic {

    record Eq(Expr lhs, Expr rhs, String sourceText) implements Statement {}

    record For(String varName, Expr start, Expr end, List<Statement> body) implements Statement {}

    /**
     * SYMBOLIC s, t — declares independent symbolic variables. Equations that
     * involve one are treated as identities that must hold for all values of
     * that variable (the CAS solves them for the remaining coefficients), rather
     * than as numeric equations to solve for the symbolic variable itself.
     */
    record Symbolic(List<String> names) implements Statement {}

    /**
     * CALL name(inputs : outputs) — invokes a PROCEDURE or MODULE.
     * At flatten time this generates equations that bind the outputs.
     */
    record CallProc(String name, List<Expr> inputs, List<Expr> outputs, String sourceText) implements Statement {}
}
