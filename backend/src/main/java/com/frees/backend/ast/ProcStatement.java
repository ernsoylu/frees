package com.frees.backend.ast;

import java.util.List;

/**
 * AST node for a statement inside a FUNCTION or PROCEDURE body.
 * Unlike top-level Statement, these execute sequentially (not as equations).
 */
public sealed interface ProcStatement permits
        ProcStatement.Assign,
        ProcStatement.IfElse,
        ProcStatement.RepeatUntil,
        ProcStatement.Eq,
        ProcStatement.For,
        ProcStatement.While {

    /** Sequential assignment: var := expr */
    record Assign(String varName, Expr value) implements ProcStatement {}

    /** IF condition THEN thenBranch [ELSE elseBranch] END */
    record IfElse(Expr condition, List<ProcStatement> thenBranch,
                  List<ProcStatement> elseBranch) implements ProcStatement {}

    /** REPEAT body UNTIL condition */
    record RepeatUntil(List<ProcStatement> body, Expr condition) implements ProcStatement {}

    /** An equation used inside a FUNCTION body for intermediate relations */
    record Eq(Expr lhs, Expr rhs, String sourceText) implements ProcStatement {}

    /** FOR loop inside a procedure */
    record For(String varName, Expr start, Expr end,
               List<ProcStatement> body) implements ProcStatement {}

    /** WHILE loop inside a procedure */
    record While(Expr condition, List<ProcStatement> body) implements ProcStatement {}
}
