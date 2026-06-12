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
import java.util.Arrays;
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
                    Expr lhs = eq.lhs();
                    Expr rhs = eq.rhs();
                    if (rhs instanceof Expr.Call call) {
                        String func = call.function().toLowerCase();
                        if (func.equals("inverse") || func.equals("transpose")) {
                            MatrixInfo lhsMat = parseMatrixInfo(lhs, loopVars, constants, displayNames, defs);
                            MatrixInfo rhsMat = parseMatrixInfo(call.args().get(0), loopVars, constants, displayNames, defs);
                            if (func.equals("transpose")) {
                                if (lhsMat.rows != rhsMat.cols || lhsMat.cols != rhsMat.rows) {
                                    throw new ParseException("Dimension mismatch for Transpose: LHS is " + lhsMat.rows + "x" + lhsMat.cols + ", RHS is " + rhsMat.cols + "x" + rhsMat.rows);
                                }
                                for (int i = 0; i < lhsMat.rows; i++) {
                                    for (int j = 0; j < lhsMat.cols; j++) {
                                        out.add(new Equation(lhsMat.elements[i][j], rhsMat.elements[j][i], eq.sourceText()));
                                    }
                                }
                            } else if (func.equals("inverse")) {
                                if (lhsMat.rows != lhsMat.cols || rhsMat.rows != rhsMat.cols || lhsMat.rows != rhsMat.rows) {
                                    throw new ParseException("Inverse requires square matrices of identical size.");
                                }
                                int n = lhsMat.rows;
                                for (int i = 0; i < n; i++) {
                                    for (int j = 0; j < n; j++) {
                                        Expr sum = null;
                                        for (int k = 0; k < n; k++) {
                                            Expr term = new Expr.BinOp('*', rhsMat.elements[i][k], lhsMat.elements[k][j]);
                                            if (sum == null) {
                                                sum = term;
                                            } else {
                                                sum = new Expr.BinOp('+', sum, term);
                                            }
                                        }
                                        double expected = (i == j) ? 1.0 : 0.0;
                                        out.add(new Equation(sum, new Expr.Num(expected), eq.sourceText()));
                                    }
                                }
                            }
                            continue;
                        }
                        if (func.equals("dot") || func.equals("norm") || func.equals("determinant")) {
                            Expr expandedLhs = expandExpr(lhs, loopVars, constants, displayNames, defs);
                            if (func.equals("dot")) {
                                VectorInfo u = parseVectorInfo(call.args().get(0), loopVars, constants, displayNames, defs);
                                VectorInfo v = parseVectorInfo(call.args().get(1), loopVars, constants, displayNames, defs);
                                if (u.size != v.size) {
                                    throw new ParseException("Dot product requires vectors of identical size.");
                                }
                                Expr sum = null;
                                for (int i = 0; i < u.size; i++) {
                                    Expr term = new Expr.BinOp('*', u.elements[i], v.elements[i]);
                                    if (sum == null) {
                                        sum = term;
                                    } else {
                                        sum = new Expr.BinOp('+', sum, term);
                                    }
                                }
                                out.add(new Equation(expandedLhs, sum, eq.sourceText()));
                            } else if (func.equals("norm")) {
                                VectorInfo v = parseVectorInfo(call.args().get(0), loopVars, constants, displayNames, defs);
                                Expr sumSq = null;
                                for (int i = 0; i < v.size; i++) {
                                    Expr term = new Expr.BinOp('*', v.elements[i], v.elements[i]);
                                    if (sumSq == null) {
                                        sumSq = term;
                                    } else {
                                        sumSq = new Expr.BinOp('+', sumSq, term);
                                    }
                                }
                                Expr normExpr = new Expr.Call("sqrt", List.of(sumSq));
                                out.add(new Equation(expandedLhs, normExpr, eq.sourceText()));
                            } else if (func.equals("determinant")) {
                                MatrixInfo m = parseMatrixInfo(call.args().get(0), loopVars, constants, displayNames, defs);
                                if (m.rows != m.cols) {
                                    throw new ParseException("Determinant requires a square matrix.");
                                }
                                Expr detExpr = expandDeterminant(m.elements);
                                out.add(new Equation(expandedLhs, detExpr, eq.sourceText()));
                            }
                            continue;
                        }
                        if (func.equals("cross")) {
                            VectorInfo w = parseVectorInfo(lhs, loopVars, constants, displayNames, defs);
                            VectorInfo u = parseVectorInfo(call.args().get(0), loopVars, constants, displayNames, defs);
                            VectorInfo v = parseVectorInfo(call.args().get(1), loopVars, constants, displayNames, defs);
                            if (w.size != 3 || u.size != 3 || v.size != 3) {
                                throw new ParseException("Cross product is only defined for 3-dimensional vectors.");
                            }
                            Expr w1 = new Expr.BinOp('-',
                                    new Expr.BinOp('*', u.elements[1], v.elements[2]),
                                    new Expr.BinOp('*', u.elements[2], v.elements[1]));
                            Expr w2 = new Expr.BinOp('-',
                                    new Expr.BinOp('*', u.elements[2], v.elements[0]),
                                    new Expr.BinOp('*', u.elements[0], v.elements[2]));
                            Expr w3 = new Expr.BinOp('-',
                                    new Expr.BinOp('*', u.elements[0], v.elements[1]),
                                    new Expr.BinOp('*', u.elements[1], v.elements[0]));

                            out.add(new Equation(w.elements[0], w1, eq.sourceText()));
                            out.add(new Equation(w.elements[1], w2, eq.sourceText()));
                            out.add(new Equation(w.elements[2], w3, eq.sourceText()));
                            continue;
                        }
                        if (func.equals("solvelinear")) {
                            VectorInfo x = parseVectorInfo(lhs, loopVars, constants, displayNames, defs);
                            MatrixInfo a = parseMatrixInfo(call.args().get(0), loopVars, constants, displayNames, defs);
                            VectorInfo b = parseVectorInfo(call.args().get(1), loopVars, constants, displayNames, defs);
                            if (a.rows != a.cols || a.rows != x.size || b.size != x.size) {
                                throw new ParseException("SolveLinear requires square matrix A and vectors x, b of compatible size.");
                            }
                            int n = x.size;
                            for (int i = 0; i < n; i++) {
                                Expr sum = null;
                                for (int j = 0; j < n; j++) {
                                    Expr term = new Expr.BinOp('*', a.elements[i][j], x.elements[j]);
                                    if (sum == null) {
                                        sum = term;
                                    } else {
                                        sum = new Expr.BinOp('+', sum, term);
                                    }
                                }
                                out.add(new Equation(sum, b.elements[i], eq.sourceText()));
                            }
                            continue;
                        }
                    }

                    if (lhs instanceof Expr.ArrayAccess laa && laa.indices().stream().anyMatch(idx -> idx instanceof Expr.Range)
                            && rhs instanceof Expr.ArrayAccess raa && raa.indices().stream().anyMatch(idx -> idx instanceof Expr.Range)) {
                        List<Expr> lhsVars = expandArrayAccessToElements(laa, loopVars, constants, displayNames, defs);
                        List<Expr> rhsVars = expandArrayAccessToElements(raa, loopVars, constants, displayNames, defs);
                        if (lhsVars.size() != rhsVars.size()) {
                            throw new ParseException("Array range mismatch: LHS has " + lhsVars.size() + " elements, but RHS has " + rhsVars.size() + " elements.");
                        }
                        for (int i = 0; i < lhsVars.size(); i++) {
                            out.add(new Equation(lhsVars.get(i), rhsVars.get(i), eq.sourceText()));
                        }
                    } else if (eq.lhs() instanceof Expr.ArrayAccess aa && aa.indices().stream().anyMatch(idx -> idx instanceof Expr.Range)) {
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
                    String defName = call.name().toLowerCase();
                    if (defName.equals("eigenvalues") || defName.equals("eigen")) {
                        boolean wantVectors = defName.equals("eigen");
                        int expectedOutputs = wantVectors ? 2 : 1;
                        if (call.inputs().size() != 1 || call.outputs().size() != expectedOutputs) {
                            throw new ParseException(wantVectors
                                    ? "Eigen expects 1 input matrix and 2 outputs (eigenvalue vector, eigenvector matrix), e.g. CALL Eigen(A[1..3,1..3] : lambda[1..3], V[1..3,1..3])"
                                    : "Eigenvalues expects 1 input matrix and 1 output vector, e.g. CALL Eigenvalues(A[1..3,1..3] : lambda[1..3])");
                        }
                        MatrixInfo a = parseMatrixInfo(call.inputs().get(0), loopVars, constants, displayNames, defs);
                        VectorInfo lambda = parseVectorInfo(call.outputs().get(0), loopVars, constants, displayNames, defs);
                        if (a.rows != a.cols || lambda.size != a.rows) {
                            throw new ParseException("Eigenvalues requires a square matrix and an eigenvalue vector of matching size.");
                        }
                        int n = a.rows;
                        // The matrix entries become arguments of synthetic eigen$ calls, so the
                        // Tarjan blocker orders the decomposition after the entries are solved.
                        List<Expr> entries = new ArrayList<>(n * n);
                        for (int i = 0; i < n; i++) {
                            entries.addAll(Arrays.asList(a.elements[i]));
                        }
                        for (int k = 0; k < n; k++) {
                            out.add(new Equation(lambda.elements[k],
                                    new Expr.Call("eigen$val$" + k + "$" + n, entries), call.sourceText()));
                        }
                        if (wantVectors) {
                            MatrixInfo v = parseMatrixInfo(call.outputs().get(1), loopVars, constants, displayNames, defs);
                            if (v.rows != n || v.cols != n) {
                                throw new ParseException("Eigen requires an n x n eigenvector matrix (eigenvectors as columns).");
                            }
                            for (int i = 0; i < n; i++) {
                                for (int k = 0; k < n; k++) {
                                    out.add(new Equation(v.elements[i][k],
                                            new Expr.Call("eigen$vec$" + i + "$" + k + "$" + n, entries), call.sourceText()));
                                }
                            }
                        }
                        continue;
                    }
                    if (defName.equals("ludecompose") || defName.equals("eulerdecompose") || defName.equals("eulerrotate")) {
                        if (defName.equals("ludecompose")) {
                            if (call.inputs().size() != 1 || call.outputs().size() != 2) {
                                throw new ParseException("LUDecompose expects exactly 1 input matrix and 2 output matrices, e.g. CALL LUDecompose(A[1..3,1..3] : L[1..3,1..3], U[1..3,1..3])");
                            }
                            MatrixInfo a = parseMatrixInfo(call.inputs().get(0), loopVars, constants, displayNames, defs);
                            MatrixInfo l = parseMatrixInfo(call.outputs().get(0), loopVars, constants, displayNames, defs);
                            MatrixInfo u = parseMatrixInfo(call.outputs().get(1), loopVars, constants, displayNames, defs);
                            if (a.rows != a.cols || l.rows != l.cols || u.rows != u.cols || a.rows != l.rows) {
                                throw new ParseException("LUDecompose requires all matrices to be square and of identical size.");
                            }
                            int n = a.rows;
                            for (int i = 0; i < n; i++) {
                                for (int j = 0; j < n; j++) {
                                    if (i < j) {
                                        out.add(new Equation(l.elements[i][j], new Expr.Num(0.0), call.sourceText()));
                                    } else if (i == j) {
                                        out.add(new Equation(l.elements[i][j], new Expr.Num(1.0), call.sourceText()));
                                    }
                                    if (i > j) {
                                        out.add(new Equation(u.elements[i][j], new Expr.Num(0.0), call.sourceText()));
                                    }
                                    Expr sum = null;
                                    for (int k = 0; k < n; k++) {
                                        Expr term = new Expr.BinOp('*', l.elements[i][k], u.elements[k][j]);
                                        if (sum == null) {
                                            sum = term;
                                        } else {
                                            sum = new Expr.BinOp('+', sum, term);
                                        }
                                    }
                                    out.add(new Equation(sum, a.elements[i][j], call.sourceText()));
                                }
                            }
                            continue;
                        }
                        if (defName.equals("eulerrotate")) {
                            if (call.inputs().size() != 3 || call.outputs().size() != 1) {
                                throw new ParseException("EulerRotate expects 3 angles (phi, theta, psi) and 1 output matrix, e.g. CALL EulerRotate(phi, theta, psi : R[1..3,1..3])");
                            }
                            Expr phi = expandExpr(call.inputs().get(0), loopVars, constants, displayNames, defs);
                            Expr theta = expandExpr(call.inputs().get(1), loopVars, constants, displayNames, defs);
                            Expr psi = expandExpr(call.inputs().get(2), loopVars, constants, displayNames, defs);
                            MatrixInfo r = parseMatrixInfo(call.outputs().get(0), loopVars, constants, displayNames, defs);
                            if (r.rows != 3 || r.cols != 3) {
                                throw new ParseException("EulerRotate output matrix must be 3x3.");
                            }
                            Expr cosPhi = new Expr.Call("cos", List.of(phi));
                            Expr sinPhi = new Expr.Call("sin", List.of(phi));
                            Expr cosTheta = new Expr.Call("cos", List.of(theta));
                            Expr sinTheta = new Expr.Call("sin", List.of(theta));
                            Expr cosPsi = new Expr.Call("cos", List.of(psi));
                            Expr sinPsi = new Expr.Call("sin", List.of(psi));

                            out.add(new Equation(r.elements[0][0], new Expr.BinOp('-',
                                    new Expr.BinOp('*', cosPhi, cosPsi),
                                    new Expr.BinOp('*', new Expr.BinOp('*', sinPhi, cosTheta), sinPsi)), call.sourceText()));

                            out.add(new Equation(r.elements[0][1], new Expr.BinOp('-',
                                    new Expr.Neg(new Expr.BinOp('*', cosPhi, sinPsi)),
                                    new Expr.BinOp('*', new Expr.BinOp('*', sinPhi, cosTheta), cosPsi)), call.sourceText()));

                            out.add(new Equation(r.elements[0][2], new Expr.BinOp('*', sinPhi, sinTheta), call.sourceText()));

                            out.add(new Equation(r.elements[1][0], new Expr.BinOp('+',
                                    new Expr.BinOp('*', sinPhi, cosPsi),
                                    new Expr.BinOp('*', new Expr.BinOp('*', cosPhi, cosTheta), sinPsi)), call.sourceText()));

                            out.add(new Equation(r.elements[1][1], new Expr.BinOp('+',
                                    new Expr.Neg(new Expr.BinOp('*', sinPhi, sinPsi)),
                                    new Expr.BinOp('*', new Expr.BinOp('*', cosPhi, cosTheta), cosPsi)), call.sourceText()));

                            out.add(new Equation(r.elements[1][2], new Expr.Neg(new Expr.BinOp('*', cosPhi, sinTheta)), call.sourceText()));

                            out.add(new Equation(r.elements[2][0], new Expr.BinOp('*', sinTheta, sinPsi), call.sourceText()));
                            out.add(new Equation(r.elements[2][1], new Expr.BinOp('*', sinTheta, cosPsi), call.sourceText()));
                            out.add(new Equation(r.elements[2][2], cosTheta, call.sourceText()));
                            continue;
                        }
                        if (defName.equals("eulerdecompose")) {
                            if (call.inputs().size() != 1 || call.outputs().size() != 3) {
                                throw new ParseException("EulerDecompose expects 1 input matrix and 3 output variables, e.g. CALL EulerDecompose(R[1..3,1..3] : phi, theta, psi)");
                            }
                            MatrixInfo r = parseMatrixInfo(call.inputs().get(0), loopVars, constants, displayNames, defs);
                            if (r.rows != 3 || r.cols != 3) {
                                throw new ParseException("EulerDecompose input matrix must be 3x3.");
                            }
                            Expr phi = expandExpr(call.outputs().get(0), loopVars, constants, displayNames, defs);
                            Expr theta = expandExpr(call.outputs().get(1), loopVars, constants, displayNames, defs);
                            Expr psi = expandExpr(call.outputs().get(2), loopVars, constants, displayNames, defs);

                            out.add(new Equation(new Expr.Call("cos", List.of(theta)), r.elements[2][2], call.sourceText()));
                            out.add(new Equation(new Expr.BinOp('*', new Expr.Call("sin", List.of(phi)), new Expr.Call("sin", List.of(theta))), r.elements[0][2], call.sourceText()));
                            out.add(new Equation(new Expr.BinOp('*', new Expr.Call("sin", List.of(theta)), new Expr.Call("sin", List.of(psi))), r.elements[2][0], call.sourceText()));
                            continue;
                        }
                    }

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

        List<Expr> outputs = call.outputs();
        if (outputs.size() != pd.outputs().size()) {
            throw new ParseException("CALL " + pd.name() + " provides " + outputs.size()
                    + " output variable(s) but PROCEDURE declares " + pd.outputs().size());
        }
        for (int k = 0; k < outputs.size(); k++) {
            Expr outputExpr = expandExpr(outputs.get(k), loopVars, constants, displayNames, defs);
            if (!(outputExpr instanceof Expr.Var var)) {
                throw new ParseException("CALL output argument must resolve to a variable: " + outputs.get(k));
            }
            String varName = var.name();
            String syntheticFn = "proc$" + pd.name() + "$" + k;
            Expr callExpr = new Expr.Call(syntheticFn, expandedInputs);
            out.add(new Equation(outputExpr, callExpr, "CALL " + pd.name()));
            displayNames.putIfAbsent(varName, varName);
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
        List<Expr> outputs = call.outputs();

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
            Expr outputExpr = expandExpr(outputs.get(i), loopVars, constants, displayNames, defs);
            if (!(outputExpr instanceof Expr.Var var)) {
                throw new ParseException("CALL output argument must resolve to a variable: " + outputs.get(i));
            }
            String varName = var.name();
            out.add(new Equation(outputExpr, new Expr.Var(nsParam), "MODULE " + md.name() + " output " + md.outputs().get(i)));
            displayNames.putIfAbsent(varName, varName);
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
    private static class MatrixInfo {
        final String name;
        final int rows;
        final int cols;
        final int rowStart;
        final int colStart;
        final Expr.Var[][] elements;

        MatrixInfo(String name, int rows, int cols, int rowStart, int colStart, Expr.Var[][] elements) {
            this.name = name;
            this.rows = rows;
            this.cols = cols;
            this.rowStart = rowStart;
            this.colStart = colStart;
            this.elements = elements;
        }
    }

    private MatrixInfo parseMatrixInfo(Expr expr, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, String> displayNames, Map<String, ProcDef> defs) {
        if (!(expr instanceof Expr.ArrayAccess aa)) {
            throw new ParseException("Expected matrix array access: e.g. A[1..3, 1..3]");
        }
        if (aa.indices().size() != 2) {
            throw new ParseException("Matrix must have exactly 2 dimensions: " + aa.name());
        }
        Expr r0 = expandExpr(aa.indices().get(0), loopVars, constants, displayNames, defs);
        Expr r1 = expandExpr(aa.indices().get(1), loopVars, constants, displayNames, defs);
        if (!(r0 instanceof Expr.Range range0) || !(r1 instanceof Expr.Range range1)) {
            throw new ParseException("Matrix indices must specify ranges: e.g. A[1..3, 1..3]");
        }
        int rStart = (int) Math.round(evalIndexExpr(range0.start(), loopVars, constants, defs));
        int rEnd = (int) Math.round(evalIndexExpr(range0.end(), loopVars, constants, defs));
        int cStart = (int) Math.round(evalIndexExpr(range1.start(), loopVars, constants, defs));
        int cEnd = (int) Math.round(evalIndexExpr(range1.end(), loopVars, constants, defs));

        int numRows = Math.abs(rEnd - rStart) + 1;
        int numCols = Math.abs(cEnd - cStart) + 1;

        Expr.Var[][] elements = new Expr.Var[numRows][numCols];
        int rDir = rStart <= rEnd ? 1 : -1;
        int cDir = cStart <= cEnd ? 1 : -1;

        for (int i = 0; i < numRows; i++) {
            int rowIdx = rStart + i * rDir;
            for (int j = 0; j < numCols; j++) {
                int colIdx = cStart + j * cDir;
                String canonical = aa.name() + "[" + rowIdx + "," + colIdx + "]";
                String baseDisplay = displayNames.getOrDefault(aa.name(), aa.name());
                displayNames.put(canonical, baseDisplay + "[" + rowIdx + ", " + colIdx + "]");
                elements[i][j] = new Expr.Var(canonical);
            }
        }
        return new MatrixInfo(aa.name(), numRows, numCols, rStart, cStart, elements);
    }

    private static class VectorInfo {
        final String name;
        final int size;
        final int start;
        final Expr.Var[] elements;

        VectorInfo(String name, int size, int start, Expr.Var[] elements) {
            this.name = name;
            this.size = size;
            this.start = start;
            this.elements = elements;
        }
    }

    private VectorInfo parseVectorInfo(Expr expr, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, String> displayNames, Map<String, ProcDef> defs) {
        if (!(expr instanceof Expr.ArrayAccess aa)) {
            throw new ParseException("Expected vector array access: e.g. v[1..3]");
        }
        if (aa.indices().size() != 1) {
            throw new ParseException("Vector must have exactly 1 dimension: " + aa.name());
        }
        Expr r0 = expandExpr(aa.indices().get(0), loopVars, constants, displayNames, defs);
        if (!(r0 instanceof Expr.Range range)) {
            throw new ParseException("Vector index must specify a range: e.g. v[1..3]");
        }
        int vStart = (int) Math.round(evalIndexExpr(range.start(), loopVars, constants, defs));
        int vEnd = (int) Math.round(evalIndexExpr(range.end(), loopVars, constants, defs));

        int size = Math.abs(vEnd - vStart) + 1;
        Expr.Var[] elements = new Expr.Var[size];
        int dir = vStart <= vEnd ? 1 : -1;

        for (int i = 0; i < size; i++) {
            int idx = vStart + i * dir;
            String canonical = aa.name() + "[" + idx + "]";
            String baseDisplay = displayNames.getOrDefault(aa.name(), aa.name());
            displayNames.put(canonical, baseDisplay + "[" + idx + "]");
            elements[i] = new Expr.Var(canonical);
        }
        return new VectorInfo(aa.name(), size, vStart, elements);
    }

    private Expr expandDeterminant(Expr[][] mat) {
        int n = mat.length;
        if (n == 1) {
            return mat[0][0];
        }
        if (n == 2) {
            return new Expr.BinOp('-',
                    new Expr.BinOp('*', mat[0][0], mat[1][1]),
                    new Expr.BinOp('*', mat[0][1], mat[1][0]));
        }
        Expr sum = null;
        for (int j = 0; j < n; j++) {
            Expr[][] sub = new Expr[n - 1][n - 1];
            for (int r = 1; r < n; r++) {
                int colIdx = 0;
                for (int c = 0; c < n; c++) {
                    if (c == j) continue;
                    sub[r - 1][colIdx++] = mat[r][c];
                }
            }
            Expr subDet = expandDeterminant(sub);
            Expr cofactor = new Expr.BinOp('*', mat[0][j], subDet);
            if (j % 2 == 1) {
                cofactor = new Expr.Neg(cofactor);
            }
            if (sum == null) {
                sum = cofactor;
            } else {
                sum = new Expr.BinOp('+', sum, cofactor);
            }
        }
        return sum;
    }
}
