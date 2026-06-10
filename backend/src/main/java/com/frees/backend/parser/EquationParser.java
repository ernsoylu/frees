package com.frees.backend.parser;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
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

    /** Parsed equations plus the first-appearance spelling of each variable. */
    public record ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames) {}

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
        List<Statement> statements = builder.buildProgram(program);

        Map<String, String> displayNames = new HashMap<>(builder.displayNames());
        Map<String, Double> constants = extractConstants(statements);

        List<Equation> equations = new ArrayList<>();
        flatten(statements, new HashMap<>(), constants, displayNames, equations);

        return new ParseResult(equations, displayNames);
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

    private void flatten(List<Statement> statements, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, String> displayNames, List<Equation> out) {
        for (Statement stmt : statements) {
            switch (stmt) {
                case Statement.Duplicate dup -> {
                    double startVal = evalIndexExpr(expandExpr(dup.start(), loopVars, constants, displayNames), loopVars, constants);
                    double endVal = evalIndexExpr(expandExpr(dup.end(), loopVars, constants, displayNames), loopVars, constants);
                    int start = (int) Math.round(startVal);
                    int end = (int) Math.round(endVal);
                    if (start <= end) {
                        for (int i = start; i <= end; i++) {
                            Map<String, Double> newLoopVars = new HashMap<>(loopVars);
                            newLoopVars.put(dup.varName(), (double) i);
                            flatten(dup.body(), newLoopVars, constants, displayNames, out);
                        }
                    } else {
                        for (int i = start; i >= end; i--) {
                            Map<String, Double> newLoopVars = new HashMap<>(loopVars);
                            newLoopVars.put(dup.varName(), (double) i);
                            flatten(dup.body(), newLoopVars, constants, displayNames, out);
                        }
                    }
                }
                case Statement.Eq eq -> {
                    if (eq.lhs() instanceof Expr.ArrayAccess aa && aa.indices().stream().anyMatch(idx -> idx instanceof Expr.Range)) {
                        List<Expr> lhsVars = expandArrayAccessToElements(aa, loopVars, constants, displayNames);
                        Expr expandedRhs = expandExpr(eq.rhs(), loopVars, constants, displayNames);
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
                        Expr expandedLhs = expandExpr(eq.lhs(), loopVars, constants, displayNames);
                        Expr expandedRhs = expandExpr(eq.rhs(), loopVars, constants, displayNames);
                        out.add(new Equation(expandedLhs, expandedRhs, eq.sourceText()));
                    }
                }
            }
        }
    }

    private Expr expandExpr(Expr e, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, String> displayNames) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Var v -> {
                if (loopVars.containsKey(v.name())) {
                    yield new Expr.Num(loopVars.get(v.name()));
                }
                yield v;
            }
            case Expr.Neg neg -> new Expr.Neg(expandExpr(neg.operand(), loopVars, constants, displayNames));
            case Expr.BinOp b -> new Expr.BinOp(b.op(),
                    expandExpr(b.left(), loopVars, constants, displayNames),
                    expandExpr(b.right(), loopVars, constants, displayNames));
            case Expr.Call c -> {
                List<Expr> expandedArgs = new ArrayList<>();
                for (Expr arg : c.args()) {
                    if (arg instanceof Expr.ArrayAccess aa && aa.indices().stream().anyMatch(idx -> idx instanceof Expr.Range)) {
                        expandedArgs.addAll(expandArrayAccessToElements(aa, loopVars, constants, displayNames));
                    } else {
                        expandedArgs.add(expandExpr(arg, loopVars, constants, displayNames));
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
                    Expr expandedIdx = expandExpr(idx, loopVars, constants, displayNames);
                    double val = evalIndexExpr(expandedIdx, loopVars, constants);
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
                    expandExpr(r.start(), loopVars, constants, displayNames),
                    expandExpr(r.end(), loopVars, constants, displayNames));
            case Expr.ArrayLiteral al -> {
                List<Expr> expandedElems = new ArrayList<>();
                for (Expr elem : al.elements()) {
                    expandedElems.add(expandExpr(elem, loopVars, constants, displayNames));
                }
                yield new Expr.ArrayLiteral(expandedElems);
            }
        };
    }

    private List<Expr> expandArrayAccessToElements(Expr.ArrayAccess aa, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, String> displayNames) {
        List<List<Integer>> indexPossibilities = new ArrayList<>();
        for (Expr idx : aa.indices()) {
            Expr expandedIdx = expandExpr(idx, loopVars, constants, displayNames);
            if (expandedIdx instanceof Expr.Range r) {
                double startVal = evalIndexExpr(r.start(), loopVars, constants);
                double endVal = evalIndexExpr(r.end(), loopVars, constants);
                int start = (int) Math.round(startVal);
                int end = (int) Math.round(endVal);
                List<Integer> rangeVals = new ArrayList<>();
                if (start <= end) {
                    for (int v = start; v <= end; v++) {
                        rangeVals.add(v);
                    }
                } else {
                    for (int v = start; v >= end; v--) {
                        rangeVals.add(v);
                    }
                }
                indexPossibilities.add(rangeVals);
            } else {
                double val = evalIndexExpr(expandedIdx, loopVars, constants);
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

    private void generateCombinations(List<List<Integer>> lists, int depth, List<Integer> current, List<List<Integer>> result) {
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

    private double evalIndexExpr(Expr e, Map<String, Double> loopVars, Map<String, Double> constants) {
        Map<String, Double> combined = new HashMap<>(constants);
        combined.putAll(loopVars);
        try {
            return Evaluator.eval(e, combined);
        } catch (Exception ex) {
            throw new ParseException("Array index expression cannot be evaluated to a constant: " + e);
        }
    }
}

