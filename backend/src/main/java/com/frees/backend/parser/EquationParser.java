package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.ast.Statement;
import com.frees.backend.ast.Evaluator;
import org.antlr.v4.runtime.BaseErrorListener;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.Recognizer;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;


/**
 * Parses EES source text into a list of equations using the ANTLR-generated
 * lexer/parser and an AST-building visitor.
 */
public final class EquationParser {

    public static class ParseException extends RuntimeException {
        public ParseException(String message) {
            super(message);
        }
    }

    private static class CollectingErrorListener extends BaseErrorListener {
        final List<String> errors = new ArrayList<>();

        @Override
        public void syntaxError(Recognizer<?, ?> recognizer, Object offendingSymbol,
                                int line, int charPositionInLine, String msg,
                                RecognitionException e) {
            errors.add("line " + line + ":" + (charPositionInLine + 1) + " " + msg);
        }
    }

    /** Parsed equations plus the first-appearance spelling of each variable and procedure definitions. */
    public record ParseResult(
            List<Equation> equations,
            java.util.Map<String, String> displayNames,
            java.util.Map<String, ProcDef> defs) {

        /** Backward-compat constructor for callers that don't need defs. */
        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames) {
            this(equations, displayNames, Map.of());
        }
    }

    public ParseResult parseResult(String source) {
        CollectingErrorListener errorListener = new CollectingErrorListener();

        EesLexer lexer = new EesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errorListener);

        EesParser parser = new EesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);

        EesParser.ProgramContext program = parser.program();
        if (!errorListener.errors.isEmpty()) {
            throw new ParseException(String.join("\n", errorListener.errors));
        }

        AstBuilder builder = new AstBuilder();
        AstBuilder.ProgramResult programResult = builder.buildProgram(program);
        List<Statement> statements = programResult.statements();
        Map<String, ProcDef> defs = new HashMap<>(programResult.defs());

        Map<String, String> displayNames = new HashMap<>(builder.displayNames());
        Map<String, Double> constants = extractConstants(statements);

        // Counter for module instance namespacing
        AtomicInteger moduleCounter = new AtomicInteger(0);

        List<Equation> equations = new ArrayList<>();
        flatten(statements, new HashMap<>(), constants, displayNames, equations, defs, moduleCounter);

        return new ParseResult(equations, displayNames, defs);
    }

    public List<Equation> parse(String source) {
        return parseResult(source).equations();
    }

    private Map<String, Double> extractConstants(List<Statement> statements) {
        Map<String, Double> constants = new HashMap<>();
        boolean progress = true;
        while (progress) {
            progress = false;
            for (Statement stmt : statements) {
                if (stmt instanceof Statement.Eq eq) {
                    if (eq.lhs() instanceof Expr.Var varExpr) {
                        String name = varExpr.name();
                        if (!constants.containsKey(name)) {
                            try {
                                double val = Evaluator.eval(eq.rhs(), constants);
                                constants.put(name, val);
                                progress = true;
                            } catch (Exception ignored) {}
                        }
                    } else if (eq.rhs() instanceof Expr.Var varExpr) {
                        String name = varExpr.name();
                        if (!constants.containsKey(name)) {
                            try {
                                double val = Evaluator.eval(eq.lhs(), constants);
                                constants.put(name, val);
                                progress = true;
                            } catch (Exception ignored) {}
                        }
                    }
                }
            }
        }
        return constants;
    }

    private void flatten(List<Statement> statements, Map<String, Double> loopVars,
                         Map<String, Double> constants, Map<String, String> displayNames,
                         List<Equation> out, Map<String, ProcDef> defs,
                         AtomicInteger moduleCounter) {
        for (Statement stmt : statements) {
            switch (stmt) {
                case Statement.Duplicate dup -> {
                    double startVal = evalIndexExpr(expandExpr(dup.start(), loopVars, constants, displayNames, defs), loopVars, constants, defs);
                    double endVal = evalIndexExpr(expandExpr(dup.end(), loopVars, constants, displayNames, defs), loopVars, constants, defs);
                    int start = (int) Math.round(startVal);
                    int end = (int) Math.round(endVal);
                    if (start <= end) {
                        for (int i = start; i <= end; i++) {
                            Map<String, Double> newLoopVars = new HashMap<>(loopVars);
                            newLoopVars.put(dup.varName(), (double) i);
                            flatten(dup.body(), newLoopVars, constants, displayNames, out, defs, moduleCounter);
                        }
                    } else {
                        for (int i = start; i >= end; i--) {
                            Map<String, Double> newLoopVars = new HashMap<>(loopVars);
                            newLoopVars.put(dup.varName(), (double) i);
                            flatten(dup.body(), newLoopVars, constants, displayNames, out, defs, moduleCounter);
                        }
                    }
                }
                case Statement.Eq eq -> {
                    if (eq.lhs() instanceof Expr.ArrayAccess aa && aa.indices().stream().anyMatch(idx -> idx instanceof Expr.Range)) {
                        List<Expr> lhsVars = expandArrayAccessToElements(aa, loopVars, constants, displayNames, defs);
                        Expr expandedRhs = expandExpr(eq.rhs(), loopVars, constants, displayNames, defs);
                        if (expandedRhs instanceof Expr.ArrayLiteral al) {
                            if (lhsVars.size() != al.elements().size()) {
                                throw new ParseException("Array range assignment mismatch: LHS has " + lhsVars.size() + " elements, but RHS has " + al.elements().size() + " elements.");
                            }
                            for (int i = 0; i < lhsVars.size(); i++) {
                                out.add(new Equation(lhsVars.get(i), al.elements().get(i), eq.sourceText()));
                            }
                        } else {
                            for (Expr lhsVar : lhsVars) {
                                out.add(new Equation(lhsVar, expandedRhs, eq.sourceText()));
                            }
                        }
                    } else {
                        Expr expandedLhs = expandExpr(eq.lhs(), loopVars, constants, displayNames, defs);
                        Expr expandedRhs = expandExpr(eq.rhs(), loopVars, constants, displayNames, defs);
                        out.add(new Equation(expandedLhs, expandedRhs, eq.sourceText()));
                    }
                }
                case Statement.CallProc call -> {
                    String defName = call.name();
                    ProcDef def = defs.get(defName);
                    if (def == null) {
                        throw new ParseException("Unknown PROCEDURE or MODULE: '" + defName + "'");
                    }
                    if (def instanceof ProcDef.ProcedureDef pd) {
                        flattenProcedureCall(pd, call, loopVars, constants, displayNames, out, defs);
                    } else if (def instanceof ProcDef.ModuleDef md) {
                        flattenModuleCall(md, call, loopVars, constants, displayNames, out, defs, moduleCounter);
                    } else {
                        throw new ParseException("'" + defName + "' is a FUNCTION, not callable with CALL (use it directly in an expression)");
                    }
                }
            }
        }
    }

    /**
     * PROCEDURE call: evaluate inputs (must be known constants or loop vars),
     * run the procedure body, then inject output equations into the system.
     *
     * Inputs that are not constant are represented as synthetic function calls
     * so that the Tarjan blocker correctly orders them after the inputs are solved.
     */
    private void flattenProcedureCall(ProcDef.ProcedureDef pd, Statement.CallProc call,
                                      Map<String, Double> loopVars, Map<String, Double> constants,
                                      Map<String, String> displayNames, List<Equation> out,
                                      Map<String, ProcDef> defs) {
        List<Expr> expandedInputs = new ArrayList<>();
        for (Expr inp : call.inputs()) {
            expandedInputs.add(expandExpr(inp, loopVars, constants, displayNames, defs));
        }

        // For each output variable, add an equation:
        //   outputVar = proc$name$k(inputs...)
        // The synthetic function proc$name$k is dispatched to the procedure evaluator.
        List<String> outputs = call.outputs();
        if (outputs.size() != pd.outputs().size()) {
            throw new ParseException("CALL " + pd.name() + " provides " + outputs.size()
                    + " output variable(s) but PROCEDURE declares " + pd.outputs().size());
        }
        for (int k = 0; k < outputs.size(); k++) {
            String syntheticFn = "proc$" + pd.name() + "$" + k;
            Expr callExpr = new Expr.Call(syntheticFn, expandedInputs);
            out.add(new Equation(new Expr.Var(outputs.get(k)), callExpr, "CALL " + pd.name()));
            displayNames.putIfAbsent(outputs.get(k), outputs.get(k));
        }
    }

    /**
     * MODULE call: graft a namespaced copy of the module's equations.
     * Input bindings become equations: namespace$param = inputExpr.
     * Output bindings become equations: outputVar = namespace$param.
     */
    private void flattenModuleCall(ProcDef.ModuleDef md, Statement.CallProc call,
                                   Map<String, Double> loopVars, Map<String, Double> constants,
                                   Map<String, String> displayNames, List<Equation> out,
                                   Map<String, ProcDef> defs, AtomicInteger moduleCounter) {
        int instance = moduleCounter.incrementAndGet();
        String ns = md.name() + "$" + instance + "$";  // e.g. "heatex$1$"

        List<Expr> inputs = call.inputs();
        List<String> outputs = call.outputs();

        if (inputs.size() != md.inputs().size()) {
            throw new ParseException("CALL " + md.name() + " provides " + inputs.size()
                    + " input(s) but MODULE declares " + md.inputs().size());
        }
        if (outputs.size() != md.outputs().size()) {
            throw new ParseException("CALL " + md.name() + " provides " + outputs.size()
                    + " output variable(s) but MODULE declares " + md.outputs().size());
        }

        // Input binding equations: ns$param = inputExpr
        for (int i = 0; i < md.inputs().size(); i++) {
            String nsParam = ns + md.inputs().get(i);
            Expr inputExpr = expandExpr(inputs.get(i), loopVars, constants, displayNames, defs);
            out.add(new Equation(new Expr.Var(nsParam), inputExpr, "MODULE " + md.name() + " input " + md.inputs().get(i)));
            displayNames.putIfAbsent(nsParam, nsParam);
        }

        // Module body equations with namespaced variables
        for (Statement bodyStmt : md.body()) {
            if (bodyStmt instanceof Statement.Eq eq) {
                Expr nsLhs = namespaceExpr(eq.lhs(), ns, md.inputs(), md.outputs());
                Expr nsRhs = namespaceExpr(eq.rhs(), ns, md.inputs(), md.outputs());
                out.add(new Equation(nsLhs, nsRhs, eq.sourceText()));
                // Register display names for namespaced variables
                nsLhs.variables().forEach(v -> displayNames.putIfAbsent(v, v));
                nsRhs.variables().forEach(v -> displayNames.putIfAbsent(v, v));
            }
        }

        // Output binding equations: outputVar = ns$outputParam
        for (int i = 0; i < md.outputs().size(); i++) {
            String nsParam = ns + md.outputs().get(i);
            out.add(new Equation(new Expr.Var(outputs.get(i)), new Expr.Var(nsParam), "MODULE " + md.name() + " output " + md.outputs().get(i)));
            displayNames.putIfAbsent(outputs.get(i), outputs.get(i));
        }
    }

    /**
     * Rewrite all variable references in an expr so that variables that match
     * the module's parameter list get the namespace prefix; other variables
     * also get prefixed (they're internal to the module).
     */
    private Expr namespaceExpr(Expr e, String ns,
                                List<String> inputs, List<String> outputs) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Var v -> new Expr.Var(ns + v.name());
            case Expr.Neg neg -> new Expr.Neg(namespaceExpr(neg.operand(), ns, inputs, outputs));
            case Expr.BinOp b -> new Expr.BinOp(b.op(),
                    namespaceExpr(b.left(), ns, inputs, outputs),
                    namespaceExpr(b.right(), ns, inputs, outputs));
            case Expr.Call c -> {
                List<Expr> newArgs = c.args().stream()
                        .map(a -> namespaceExpr(a, ns, inputs, outputs))
                        .toList();
                yield new Expr.Call(c.function(), newArgs);
            }
            case Expr.ArrayAccess aa -> {
                List<Expr> newIdx = aa.indices().stream()
                        .map(i -> namespaceExpr(i, ns, inputs, outputs))
                        .toList();
                yield new Expr.ArrayAccess(ns + aa.name(), newIdx);
            }
            case Expr.Range r -> new Expr.Range(
                    namespaceExpr(r.start(), ns, inputs, outputs),
                    namespaceExpr(r.end(), ns, inputs, outputs));
            case Expr.ArrayLiteral al -> {
                List<Expr> elems = al.elements().stream()
                        .map(elem -> namespaceExpr(elem, ns, inputs, outputs))
                        .toList();
                yield new Expr.ArrayLiteral(elems);
            }
            case Expr.Compare cmp -> new Expr.Compare(cmp.op(),
                    namespaceExpr(cmp.left(), ns, inputs, outputs),
                    namespaceExpr(cmp.right(), ns, inputs, outputs));
            case Expr.Logical log -> new Expr.Logical(log.op(),
                    namespaceExpr(log.left(), ns, inputs, outputs),
                    namespaceExpr(log.right(), ns, inputs, outputs));
            case Expr.Not not -> new Expr.Not(namespaceExpr(not.operand(), ns, inputs, outputs));
        };
    }

    private Expr expandExpr(Expr e, Map<String, Double> loopVars,
                             Map<String, Double> constants, Map<String, String> displayNames,
                             Map<String, ProcDef> defs) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Var v -> {
                if (loopVars.containsKey(v.name())) {
                    yield new Expr.Num(loopVars.get(v.name()));
                }
                yield v;
            }
            case Expr.Neg neg -> new Expr.Neg(expandExpr(neg.operand(), loopVars, constants, displayNames, defs));
            case Expr.BinOp b -> new Expr.BinOp(b.op(),
                    expandExpr(b.left(), loopVars, constants, displayNames, defs),
                    expandExpr(b.right(), loopVars, constants, displayNames, defs));
            case Expr.Call c -> {
                List<Expr> expandedArgs = new ArrayList<>();
                for (Expr arg : c.args()) {
                    if (arg instanceof Expr.ArrayAccess aa && aa.indices().stream().anyMatch(idx -> idx instanceof Expr.Range)) {
                        expandedArgs.addAll(expandArrayAccessToElements(aa, loopVars, constants, displayNames, defs));
                    } else {
                        expandedArgs.add(expandExpr(arg, loopVars, constants, displayNames, defs));
                    }
                }
                yield new Expr.Call(c.function(), expandedArgs);
            }
            case Expr.ArrayAccess aa -> {
                if (aa.indices().stream().anyMatch(idx -> idx instanceof Expr.Range)) {
                    throw new ParseException("Array range '" + aa.name() + "[...]' is only allowed on the LHS of assignments or as function arguments.");
                }
                List<Integer> evalIndices = new ArrayList<>();
                for (Expr idx : aa.indices()) {
                    Expr expandedIdx = expandExpr(idx, loopVars, constants, displayNames, defs);
                    double val = evalIndexExpr(expandedIdx, loopVars, constants, defs);
                    evalIndices.add((int) Math.round(val));
                }
                StringBuilder sb = new StringBuilder(aa.name());
                sb.append("[");
                for (int i = 0; i < evalIndices.size(); i++) {
                    if (i > 0) sb.append(",");
                    sb.append(evalIndices.get(i));
                }
                sb.append("]");
                String canonicalName = sb.toString();

                String baseDisplay = displayNames.getOrDefault(aa.name(), aa.name());
                StringBuilder dsb = new StringBuilder(baseDisplay);
                dsb.append("[");
                for (int i = 0; i < evalIndices.size(); i++) {
                    if (i > 0) dsb.append(", ");
                    dsb.append(evalIndices.get(i));
                }
                dsb.append("]");
                displayNames.put(canonicalName, dsb.toString());

                yield new Expr.Var(canonicalName);
            }
            case Expr.Range r -> new Expr.Range(
                    expandExpr(r.start(), loopVars, constants, displayNames, defs),
                    expandExpr(r.end(), loopVars, constants, displayNames, defs));
            case Expr.ArrayLiteral al -> {
                List<Expr> expandedElems = new ArrayList<>();
                for (Expr elem : al.elements()) {
                    expandedElems.add(expandExpr(elem, loopVars, constants, displayNames, defs));
                }
                yield new Expr.ArrayLiteral(expandedElems);
            }
            case Expr.Compare cmp -> new Expr.Compare(cmp.op(),
                    expandExpr(cmp.left(), loopVars, constants, displayNames, defs),
                    expandExpr(cmp.right(), loopVars, constants, displayNames, defs));
            case Expr.Logical log -> new Expr.Logical(log.op(),
                    expandExpr(log.left(), loopVars, constants, displayNames, defs),
                    expandExpr(log.right(), loopVars, constants, displayNames, defs));
            case Expr.Not not -> new Expr.Not(
                    expandExpr(not.operand(), loopVars, constants, displayNames, defs));
        };
    }

    private List<Expr> expandArrayAccessToElements(Expr.ArrayAccess aa, Map<String, Double> loopVars,
                                                    Map<String, Double> constants, Map<String, String> displayNames,
                                                    Map<String, ProcDef> defs) {
        List<List<Integer>> indexPossibilities = new ArrayList<>();
        for (Expr idx : aa.indices()) {
            Expr expandedIdx = expandExpr(idx, loopVars, constants, displayNames, defs);
            if (expandedIdx instanceof Expr.Range r) {
                double startVal = evalIndexExpr(r.start(), loopVars, constants, defs);
                double endVal = evalIndexExpr(r.end(), loopVars, constants, defs);
                int start = (int) Math.round(startVal);
                int end = (int) Math.round(endVal);
                List<Integer> rangeVals = new ArrayList<>();
                if (start <= end) {
                    for (int v = start; v <= end; v++) rangeVals.add(v);
                } else {
                    for (int v = start; v >= end; v--) rangeVals.add(v);
                }
                indexPossibilities.add(rangeVals);
            } else {
                double val = evalIndexExpr(expandedIdx, loopVars, constants, defs);
                indexPossibilities.add(List.of((int) Math.round(val)));
            }
        }

        List<List<Integer>> combinations = new ArrayList<>();
        generateCombinations(indexPossibilities, 0, new ArrayList<>(), combinations);

        List<Expr> elements = new ArrayList<>();
        for (List<Integer> combo : combinations) {
            StringBuilder sb = new StringBuilder(aa.name());
            sb.append("[");
            for (int i = 0; i < combo.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(combo.get(i));
            }
            sb.append("]");
            String canonicalName = sb.toString();

            String baseDisplay = displayNames.getOrDefault(aa.name(), aa.name());
            StringBuilder dsb = new StringBuilder(baseDisplay);
            dsb.append("[");
            for (int i = 0; i < combo.size(); i++) {
                if (i > 0) dsb.append(", ");
                dsb.append(combo.get(i));
            }
            dsb.append("]");
            displayNames.put(canonicalName, dsb.toString());
            elements.add(new Expr.Var(canonicalName));
        }
        return elements;
    }

    private void generateCombinations(List<List<Integer>> lists, int depth,
                                       List<Integer> current, List<List<Integer>> result) {
        if (depth == lists.size()) {
            result.add(new ArrayList<>(current));
            return;
        }
        for (int val : lists.get(depth)) {
            current.add(val);
            generateCombinations(lists, depth + 1, current, result);
            current.remove(current.size() - 1);
        }
    }

    private double evalIndexExpr(Expr e, Map<String, Double> loopVars,
                                  Map<String, Double> constants, Map<String, ProcDef> defs) {
        Map<String, Double> combined = new HashMap<>(constants);
        combined.putAll(loopVars);
        try {
            return Evaluator.eval(e, combined, defs);
        } catch (Exception ex) {
            throw new ParseException("Array index expression cannot be evaluated to a constant: " + e);
        }
    }
}
