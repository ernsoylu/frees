package com.frees.backend.parser;

import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.ast.ProcStatement;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Executes FUNCTION and PROCEDURE bodies imperatively.
 *
 * Functions return a single value (assigned to the function name).
 * Procedures set output variables and return them as a name→value map.
 */
public final class ProcedureEvaluator {

    private static final int MAX_ITERATIONS = 100_000;

    private final Map<String, ProcDef> defs;

    public ProcedureEvaluator(Map<String, ProcDef> defs) {
        this.defs = defs;
    }

    /** Call a FUNCTION and return its scalar result. */
    public double callFunction(ProcDef.FunctionDef def, List<Double> argValues,
                               Map<String, Double> outerValues) {
        if (argValues.size() != def.params().size()) {
            throw new IllegalArgumentException(
                    "FUNCTION " + def.name() + " expects " + def.params().size()
                            + " argument(s), got " + argValues.size());
        }
        Map<String, Double> locals = new HashMap<>(outerValues);
        for (int i = 0; i < def.params().size(); i++) {
            locals.put(def.params().get(i).toLowerCase(), argValues.get(i));
        }
        executeBody(def.body(), locals);
        Double result = locals.get(def.name().toLowerCase());
        if (result == null) {
            throw new IllegalStateException(
                    "FUNCTION " + def.name() + " never assigned a return value ('" + def.name() + " := ...' missing)");
        }
        return result;
    }

    /** Call a PROCEDURE and return its output variables as a name→value map. */
    public Map<String, Double> callProcedure(ProcDef.ProcedureDef def, List<Double> inputValues,
                                              Map<String, Double> outerValues) {
        if (inputValues.size() != def.inputs().size()) {
            throw new IllegalArgumentException(
                    "PROCEDURE " + def.name() + " expects " + def.inputs().size()
                            + " input(s), got " + inputValues.size());
        }
        Map<String, Double> locals = new HashMap<>(outerValues);
        for (int i = 0; i < def.inputs().size(); i++) {
            locals.put(def.inputs().get(i).toLowerCase(), inputValues.get(i));
        }
        executeBody(def.body(), locals);
        Map<String, Double> outputs = new HashMap<>();
        for (String out : def.outputs()) {
            String key = out.toLowerCase();
            Double val = locals.get(key);
            if (val == null) {
                throw new IllegalStateException(
                        "PROCEDURE " + def.name() + " never assigned output variable '" + out + "'");
            }
            outputs.put(key, val);
        }
        return outputs;
    }

    /** Execute a list of procedural statements, mutating the locals map. */
    private void executeBody(List<ProcStatement> stmts, Map<String, Double> locals) {
        for (ProcStatement stmt : stmts) {
            executeOne(stmt, locals);
        }
    }

    private void executeOne(ProcStatement stmt, Map<String, Double> locals) {
        switch (stmt) {
            case ProcStatement.Assign a -> {
                double val = evalExpr(a.value(), locals);
                locals.put(a.var().toLowerCase(), val);
            }
            case ProcStatement.IfElse ife -> {
                double cond = evalExpr(ife.condition(), locals);
                if (cond != 0.0) {
                    executeBody(ife.thenBranch(), locals);
                } else {
                    executeBody(ife.elseBranch(), locals);
                }
            }
            case ProcStatement.RepeatUntil ru -> {
                int iterations = 0;
                do {
                    executeBody(ru.body(), locals);
                    if (++iterations > MAX_ITERATIONS) {
                        throw new IllegalStateException("REPEAT-UNTIL exceeded " + MAX_ITERATIONS + " iterations");
                    }
                } while (evalExpr(ru.condition(), locals) == 0.0);
            }
            case ProcStatement.Eq eq -> {
                // An equation inside a function body: treat it as an assignment
                // if one side is a simple variable; otherwise it's informational.
                if (eq.lhs() instanceof Expr.Var v) {
                    locals.put(v.name(), evalExpr(eq.rhs(), locals));
                } else if (eq.rhs() instanceof Expr.Var v) {
                    locals.put(v.name(), evalExpr(eq.lhs(), locals));
                }
            }
            case ProcStatement.Duplicate dup -> {
                double startVal = evalExpr(dup.start(), locals);
                double endVal = evalExpr(dup.end(), locals);
                int start = (int) Math.round(startVal);
                int end = (int) Math.round(endVal);
                int step = start <= end ? 1 : -1;
                for (int i = start; i != end + step; i += step) {
                    Map<String, Double> loopLocals = new HashMap<>(locals);
                    loopLocals.put(dup.varName().toLowerCase(), (double) i);
                    executeBody(dup.body(), loopLocals);
                    locals.putAll(loopLocals);
                }
            }
        }
    }

    /** Evaluate an expression using locals + dispatching to user-defined functions. */
    private double evalExpr(Expr e, Map<String, Double> locals) {
        return com.frees.backend.ast.Evaluator.eval(e, locals, defs);
    }
}
