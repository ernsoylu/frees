package com.frees.backend.ast;

import java.util.List;

/**
 * Top-level definition: FUNCTION, PROCEDURE, or MODULE.
 */
public sealed interface ProcDef permits ProcDef.FunctionDef, ProcDef.ProcedureDef, ProcDef.ModuleDef {

    String name();

    /**
     * FUNCTION name(params) ... END
     * Returns a single value assigned to the function name via ':='.
     */
    record FunctionDef(String name, List<String> params,
                       List<ProcStatement> body) implements ProcDef {}

    /**
     * PROCEDURE name(inputs : outputs) ... END
     * Outputs are assigned via ':=' and injected as equations into the solver.
     */
    record ProcedureDef(String name, List<String> inputs, List<String> outputs,
                        List<ProcStatement> body) implements ProcDef {}

    /**
     * MODULE name(inputs : outputs) ... END
     * Body contains '=' equations that are grafted into the main equation system
     * with namespaced variable names to prevent collisions.
     */
    record ModuleDef(String name, List<String> inputs, List<String> outputs,
                     List<Statement> body) implements ProcDef {}
}
