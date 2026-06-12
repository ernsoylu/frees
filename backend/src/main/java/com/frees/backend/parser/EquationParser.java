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

    private record FlattenContext(Map<String, Double> loopVars,
                                  Map<String, Double> constants,
                                  Map<String, String> displayNames,
                                  List<Equation> out,
                                  Map<String, ProcDef> defs,
                                  AtomicInteger moduleCounter) {}

    private boolean tryExtractConstant(Statement stmt, Map<String, Double> constants) {
        if (!(stmt instanceof Statement.Eq(Expr lhs, Expr rhs, String sourceText))) {
            return false;
        }
        if (lhs instanceof Expr.Var(String name)) {
            if (!constants.containsKey(name)) {
                try {
                    double val = Evaluator.eval(rhs, constants);
                    constants.put(name, val);
                    return true;
                } catch (Exception ignored) {
                    // Ignored: evaluation may fail until dependent variables are resolved
                }
            }
        } else if (rhs instanceof Expr.Var(String name)) {
            if (!constants.containsKey(name)) {
                try {
                    double val = Evaluator.eval(lhs, constants);
                    constants.put(name, val);
                    return true;
                } catch (Exception ignored) {
                    // Ignored: evaluation may fail until dependent variables are resolved
                }
            }
        }
        return false;
    }

    private Map<String, Double> extractConstants(List<Statement> statements) {
        Map<String, Double> constants = new HashMap<>();
        boolean progress = true;
        while (progress) {
            progress = false;
            for (Statement stmt : statements) {
                if (tryExtractConstant(stmt, constants)) {
                    progress = true;
                }
            }
        }
        return constants;
    }

    private void flatten(List<Statement> statements, Map<String, Double> loopVars,
                         Map<String, Double> constants, Map<String, String> displayNames,
                         List<Equation> out, Map<String, ProcDef> defs,
                         AtomicInteger moduleCounter) {
        FlattenContext ctx = new FlattenContext(loopVars, constants, displayNames, out, defs, moduleCounter);
        for (Statement stmt : statements) {
            switch (stmt) {
                case Statement.Duplicate(String varName, Expr start, Expr end, List<Statement> body) ->
                    flattenDuplicate(varName, start, end, body, ctx);
                case Statement.Eq(Expr lhs, Expr rhs, String sourceText) ->
                    flattenEq(lhs, rhs, sourceText, ctx);
                case Statement.CallProc(String name, List<Expr> inputs, List<Expr> outputs, String sourceText) ->
                    flattenCallProc(name, inputs, outputs, sourceText, ctx);
            }
        }
    }

    private void flattenDuplicate(String varName, Expr start, Expr end, List<Statement> body,
                                  FlattenContext ctx) {
        double startVal = evalIndexExpr(expandExpr(start, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()), ctx.loopVars(), ctx.constants(), ctx.defs());
        double endVal = evalIndexExpr(expandExpr(end, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()), ctx.loopVars(), ctx.constants(), ctx.defs());
        int startInt = (int) Math.round(startVal);
        int endInt = (int) Math.round(endVal);
        if (startInt <= endInt) {
            for (int i = startInt; i <= endInt; i++) {
                Map<String, Double> newLoopVars = new HashMap<>(ctx.loopVars());
                newLoopVars.put(varName, (double) i);
                flatten(body, newLoopVars, ctx.constants(), ctx.displayNames(), ctx.out(), ctx.defs(), ctx.moduleCounter());
            }
        } else {
            for (int i = startInt; i >= endInt; i--) {
                Map<String, Double> newLoopVars = new HashMap<>(ctx.loopVars());
                newLoopVars.put(varName, (double) i);
                flatten(body, newLoopVars, ctx.constants(), ctx.displayNames(), ctx.out(), ctx.defs(), ctx.moduleCounter());
            }
        }
    }

    private void flattenEq(Expr lhs, Expr rhs, String sourceText, FlattenContext ctx) {
        if (rhs instanceof Expr.Call(String function, List<Expr> args)) {
            String func = function.toLowerCase();
            if (func.equals("inverse") || func.equals("transpose")) {
                flattenMatrixTransform(func, lhs, args.get(0), sourceText, ctx);
                return;
            }
            if (func.equals("dot") || func.equals("norm") || func.equals("determinant")) {
                flattenVectorOrDet(func, lhs, args, sourceText, ctx);
                return;
            }
            if (func.equals("cross")) {
                flattenCrossProduct(lhs, args, sourceText, ctx);
                return;
            }
            if (func.equals("solvelinear")) {
                flattenSolveLinear(lhs, args, sourceText, ctx);
                return;
            }
        }

        if (lhs instanceof Expr.ArrayAccess(String nameL, List<Expr> indicesL) && indicesL.stream().anyMatch(idx -> idx instanceof Expr.Range)
                && rhs instanceof Expr.ArrayAccess(String nameR, List<Expr> indicesR) && indicesR.stream().anyMatch(idx -> idx instanceof Expr.Range)) {
            List<Expr> lhsVars = expandArrayAccessToElements(nameL, indicesL, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            List<Expr> rhsVars = expandArrayAccessToElements(nameR, indicesR, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (lhsVars.size() != rhsVars.size()) {
                throw new ParseException("Array range mismatch: LHS has " + lhsVars.size() + " elements, but RHS has " + rhsVars.size() + " elements.");
            }
            for (int i = 0; i < lhsVars.size(); i++) {
                ctx.out().add(new Equation(lhsVars.get(i), rhsVars.get(i), sourceText));
            }
        } else if (lhs instanceof Expr.ArrayAccess(String nameL, List<Expr> indicesL) && indicesL.stream().anyMatch(idx -> idx instanceof Expr.Range)) {
            List<Expr> lhsVars = expandArrayAccessToElements(nameL, indicesL, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr expandedRhs = expandExpr(rhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (expandedRhs instanceof Expr.ArrayLiteral(List<Expr> elements)) {
                if (lhsVars.size() != elements.size()) {
                    throw new ParseException("Array range assignment mismatch: LHS has " + lhsVars.size() + " elements, but RHS has " + elements.size() + " elements.");
                }
                for (int i = 0; i < lhsVars.size(); i++) {
                    ctx.out().add(new Equation(lhsVars.get(i), elements.get(i), sourceText));
                }
            } else {
                for (Expr lhsVar : lhsVars) {
                    ctx.out().add(new Equation(lhsVar, expandedRhs, sourceText));
                }
            }
        } else {
            Expr expandedLhs = expandExpr(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr expandedRhs = expandExpr(rhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            ctx.out().add(new Equation(expandedLhs, expandedRhs, sourceText));
        }
    }

    private void flattenMatrixTransform(String func, Expr lhs, Expr firstArg, String sourceText, FlattenContext ctx) {
        MatrixInfo lhsMat = parseMatrixInfo(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo rhsMat = parseMatrixInfo(firstArg, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (func.equals("transpose")) {
            if (lhsMat.rows != rhsMat.cols || lhsMat.cols != rhsMat.rows) {
                throw new ParseException("Dimension mismatch for Transpose: LHS is " + lhsMat.rows + "x" + lhsMat.cols + ", RHS is " + rhsMat.cols + "x" + rhsMat.rows);
            }
            for (int i = 0; i < lhsMat.rows; i++) {
                for (int j = 0; j < lhsMat.cols; j++) {
                    ctx.out().add(new Equation(lhsMat.elements[i][j], rhsMat.elements[j][i], sourceText));
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
                        sum = sum == null ? term : new Expr.BinOp('+', sum, term);
                    }
                    double expected = (i == j) ? 1.0 : 0.0;
                    ctx.out().add(new Equation(sum, new Expr.Num(expected), sourceText));
                }
            }
        }
    }

    private void flattenVectorOrDet(String func, Expr lhs, List<Expr> args, String sourceText, FlattenContext ctx) {
        Expr expandedLhs = expandExpr(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (func.equals("dot")) {
            VectorInfo u = parseVectorInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            VectorInfo v = parseVectorInfo(args.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (u.size != v.size) {
                throw new ParseException("Dot product requires vectors of identical size.");
            }
            Expr sum = null;
            for (int i = 0; i < u.size; i++) {
                Expr term = new Expr.BinOp('*', u.elements[i], v.elements[i]);
                sum = sum == null ? term : new Expr.BinOp('+', sum, term);
            }
            ctx.out().add(new Equation(expandedLhs, sum, sourceText));
        } else if (func.equals("norm")) {
            VectorInfo v = parseVectorInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr sumSq = null;
            for (int i = 0; i < v.size; i++) {
                Expr term = new Expr.BinOp('*', v.elements[i], v.elements[i]);
                sumSq = sumSq == null ? term : new Expr.BinOp('+', sumSq, term);
            }
            Expr normExpr = new Expr.Call("sqrt", List.of(sumSq));
            ctx.out().add(new Equation(expandedLhs, normExpr, sourceText));
        } else if (func.equals("determinant")) {
            MatrixInfo m = parseMatrixInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (m.rows != m.cols) {
                throw new ParseException("Determinant requires a square matrix.");
            }
            Expr detExpr = expandDeterminant(m.elements);
            ctx.out().add(new Equation(expandedLhs, detExpr, sourceText));
        }
    }

    private void flattenCrossProduct(Expr lhs, List<Expr> args, String sourceText, FlattenContext ctx) {
        VectorInfo w = parseVectorInfo(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo u = parseVectorInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo v = parseVectorInfo(args.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
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

        ctx.out().add(new Equation(w.elements[0], w1, sourceText));
        ctx.out().add(new Equation(w.elements[1], w2, sourceText));
        ctx.out().add(new Equation(w.elements[2], w3, sourceText));
    }

    private void flattenSolveLinear(Expr lhs, List<Expr> args, String sourceText, FlattenContext ctx) {
        VectorInfo x = parseVectorInfo(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo a = parseMatrixInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo b = parseVectorInfo(args.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (a.rows != a.cols || a.rows != x.size || b.size != x.size) {
            throw new ParseException("SolveLinear requires square matrix A and vectors x, b of compatible size.");
        }
        int n = x.size;
        for (int i = 0; i < n; i++) {
            Expr sum = null;
            for (int j = 0; j < n; j++) {
                Expr term = new Expr.BinOp('*', a.elements[i][j], x.elements[j]);
                sum = sum == null ? term : new Expr.BinOp('+', sum, term);
            }
            ctx.out().add(new Equation(sum, b.elements[i], sourceText));
        }
    }

    private void flattenCallProc(String name, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        String defName = name.toLowerCase();
        if (defName.equals("eigenvalues") || defName.equals("eigen")) {
            flattenEigen(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ludecompose") || defName.equals("eulerdecompose") || defName.equals("eulerrotate")) {
            flattenDecomposeOrRotate(defName, inputs, outputs, sourceText, ctx);
            return;
        }

        ProcDef def = ctx.defs().get(defName);
        if (def == null) {
            throw new ParseException("Unknown PROCEDURE or MODULE: '" + defName + "'");
        }
        switch (def) {
            case ProcDef.ProcedureDef pd -> flattenProcedureCall(pd, inputs, outputs, ctx);
            case ProcDef.ModuleDef md -> flattenModuleCall(md, inputs, outputs, ctx);
            default -> throw new ParseException("'" + defName + "' is a FUNCTION, not callable with CALL (use it directly in an expression)");
        }
    }

    private void flattenEigen(String defName, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        boolean wantVectors = defName.equals("eigen");
        int expectedOutputs = wantVectors ? 2 : 1;
        if (inputs.size() != 1 || outputs.size() != expectedOutputs) {
            throw new ParseException(wantVectors
                    ? "Eigen expects 1 input matrix and 2 outputs (eigenvalue vector, eigenvector matrix), e.g. CALL Eigen(A[1..3,1..3] : lambda[1..3], V[1..3,1..3])"
                    : "Eigenvalues expects 1 input matrix and 1 output vector, e.g. CALL Eigenvalues(A[1..3,1..3] : lambda[1..3])");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo lambda = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (a.rows != a.cols || lambda.size != a.rows) {
            throw new ParseException("Eigenvalues requires a square matrix and an eigenvalue vector of matching size.");
        }
        int n = a.rows;
        List<Expr> entries = new ArrayList<>(n * n);
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        for (int k = 0; k < n; k++) {
            ctx.out().add(new Equation(lambda.elements[k],
                    new Expr.Call("eigen$val$" + k + "$" + n, entries), sourceText));
        }
        if (wantVectors) {
            MatrixInfo v = parseMatrixInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (v.rows != n || v.cols != n) {
                throw new ParseException("Eigen requires an n x n eigenvector matrix (eigenvectors as columns).");
            }
            for (int i = 0; i < n; i++) {
                for (int k = 0; k < n; k++) {
                    ctx.out().add(new Equation(v.elements[i][k],
                            new Expr.Call("eigen$vec$" + i + "$" + k + "$" + n, entries), sourceText));
                }
            }
        }
    }

    private void flattenDecomposeOrRotate(String defName, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (defName.equals("ludecompose")) {
            if (inputs.size() != 1 || outputs.size() != 2) {
                throw new ParseException("LUDecompose expects exactly 1 input matrix and 2 output matrices, e.g. CALL LUDecompose(A[1..3,1..3] : L[1..3,1..3], U[1..3,1..3])");
            }
            MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            MatrixInfo l = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            MatrixInfo u = parseMatrixInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (a.rows != a.cols || l.rows != l.cols || u.rows != u.cols || a.rows != l.rows) {
                throw new ParseException("LUDecompose requires all matrices to be square and of identical size.");
            }
            int n = a.rows;
            for (int i = 0; i < n; i++) {
                for (int j = 0; j < n; j++) {
                    if (i < j) {
                        ctx.out().add(new Equation(l.elements[i][j], new Expr.Num(0.0), sourceText));
                    } else if (i == j) {
                        ctx.out().add(new Equation(l.elements[i][j], new Expr.Num(1.0), sourceText));
                    }
                    if (i > j) {
                        ctx.out().add(new Equation(u.elements[i][j], new Expr.Num(0.0), sourceText));
                    }
                    Expr sum = null;
                    for (int k = 0; k < n; k++) {
                        Expr term = new Expr.BinOp('*', l.elements[i][k], u.elements[k][j]);
                        sum = sum == null ? term : new Expr.BinOp('+', sum, term);
                    }
                    ctx.out().add(new Equation(sum, a.elements[i][j], sourceText));
                }
            }
            return;
        }
        if (defName.equals("eulerrotate")) {
            if (inputs.size() != 3 || outputs.size() != 1) {
                throw new ParseException("EulerRotate expects 3 angles (phi, theta, psi) and 1 output matrix, e.g. CALL EulerRotate(phi, theta, psi : R[1..3,1..3])");
            }
            Expr phi = expandExpr(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr theta = expandExpr(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr psi = expandExpr(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            MatrixInfo r = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (r.rows != 3 || r.cols != 3) {
                throw new ParseException("EulerRotate output matrix must be 3x3.");
            }
            Expr cosPhi = new Expr.Call("cos", List.of(phi));
            Expr sinPhi = new Expr.Call("sin", List.of(phi));
            Expr cosTheta = new Expr.Call("cos", List.of(theta));
            Expr sinTheta = new Expr.Call("sin", List.of(theta));
            Expr cosPsi = new Expr.Call("cos", List.of(psi));
            Expr sinPsi = new Expr.Call("sin", List.of(psi));

            ctx.out().add(new Equation(r.elements[0][0], new Expr.BinOp('-',
                    new Expr.BinOp('*', cosPhi, cosPsi),
                    new Expr.BinOp('*', new Expr.BinOp('*', sinPhi, cosTheta), sinPsi)), sourceText));

            ctx.out().add(new Equation(r.elements[0][1], new Expr.BinOp('-',
                    new Expr.Neg(new Expr.BinOp('*', cosPhi, sinPsi)),
                    new Expr.BinOp('*', new Expr.BinOp('*', sinPhi, cosTheta), cosPsi)), sourceText));

            ctx.out().add(new Equation(r.elements[0][2], new Expr.BinOp('*', sinPhi, sinTheta), sourceText));

            ctx.out().add(new Equation(r.elements[1][0], new Expr.BinOp('+',
                    new Expr.BinOp('*', sinPhi, cosPsi),
                    new Expr.BinOp('*', new Expr.BinOp('*', cosPhi, cosTheta), sinPsi)), sourceText));

            ctx.out().add(new Equation(r.elements[1][1], new Expr.BinOp('+',
                    new Expr.Neg(new Expr.BinOp('*', sinPhi, sinPsi)),
                    new Expr.BinOp('*', new Expr.BinOp('*', cosPhi, cosTheta), cosPsi)), sourceText));

            ctx.out().add(new Equation(r.elements[1][2], new Expr.Neg(new Expr.BinOp('*', cosPhi, sinTheta)), sourceText));

            ctx.out().add(new Equation(r.elements[2][0], new Expr.BinOp('*', sinTheta, sinPsi), sourceText));
            ctx.out().add(new Equation(r.elements[2][1], new Expr.BinOp('*', sinTheta, cosPsi), sourceText));
            ctx.out().add(new Equation(r.elements[2][2], cosTheta, sourceText));
            return;
        }
        if (defName.equals("eulerdecompose")) {
            if (inputs.size() != 1 || outputs.size() != 3) {
                throw new ParseException("EulerDecompose expects 1 input matrix and 3 output variables, e.g. CALL EulerDecompose(R[1..3,1..3] : phi, theta, psi)");
            }
            MatrixInfo r = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (r.rows != 3 || r.cols != 3) {
                throw new ParseException("EulerDecompose input matrix must be 3x3.");
            }
            Expr phi = expandExpr(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr theta = expandExpr(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr psi = expandExpr(outputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

            ctx.out().add(new Equation(new Expr.Call("cos", List.of(theta)), r.elements[2][2], sourceText));
            ctx.out().add(new Equation(new Expr.BinOp('*', new Expr.Call("sin", List.of(phi)), new Expr.Call("sin", List.of(theta))), r.elements[0][2], sourceText));
            ctx.out().add(new Equation(new Expr.BinOp('*', new Expr.Call("sin", List.of(theta)), new Expr.Call("sin", List.of(psi))), r.elements[2][0], sourceText));
        }
    }

    private void flattenProcedureCall(ProcDef.ProcedureDef pd, List<Expr> inputs, List<Expr> outputs, FlattenContext ctx) {
        List<Expr> expandedInputs = new ArrayList<>();
        for (Expr inp : inputs) {
            expandedInputs.add(expandExpr(inp, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()));
        }

        if (outputs.size() != pd.outputs().size()) {
            throw new ParseException("CALL " + pd.name() + " provides " + outputs.size()
                    + " output variable(s) but PROCEDURE declares " + pd.outputs().size());
        }
        for (int k = 0; k < outputs.size(); k++) {
            Expr outputExpr = expandExpr(outputs.get(k), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (!(outputExpr instanceof Expr.Var(String varName))) {
                throw new ParseException("CALL output argument must resolve to a variable: " + outputs.get(k));
            }
            String syntheticFn = "proc$" + pd.name() + "$" + k;
            Expr callExpr = new Expr.Call(syntheticFn, expandedInputs);
            ctx.out().add(new Equation(outputExpr, callExpr, "CALL " + pd.name()));
            ctx.displayNames().putIfAbsent(varName, varName);
        }
    }

    private void flattenModuleCall(ProcDef.ModuleDef md, List<Expr> inputs, List<Expr> outputs, FlattenContext ctx) {
        int instance = ctx.moduleCounter().incrementAndGet();
        String ns = md.name() + "$" + instance + "$";  // e.g. "heatex$1$"

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
            Expr inputExpr = expandExpr(inputs.get(i), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            ctx.out().add(new Equation(new Expr.Var(nsParam), inputExpr, "MODULE " + md.name() + " input " + md.inputs().get(i)));
            ctx.displayNames().putIfAbsent(nsParam, nsParam);
        }

        // Module body equations with namespaced variables
        for (Statement bodyStmt : md.body()) {
            if (bodyStmt instanceof Statement.Eq(Expr lhs, Expr rhs, String sourceText)) {
                Expr nsLhs = namespaceExpr(lhs, ns, md.inputs(), md.outputs());
                Expr nsRhs = namespaceExpr(rhs, ns, md.inputs(), md.outputs());
                ctx.out().add(new Equation(nsLhs, nsRhs, sourceText));
                // Register display names for namespaced variables
                nsLhs.variables().forEach(v -> ctx.displayNames().putIfAbsent(v, v));
                nsRhs.variables().forEach(v -> ctx.displayNames().putIfAbsent(v, v));
            }
        }

        // Output binding equations: outputVar = ns$outputParam
        for (int i = 0; i < md.outputs().size(); i++) {
            String nsParam = ns + md.outputs().get(i);
            Expr outputExpr = expandExpr(outputs.get(i), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (!(outputExpr instanceof Expr.Var(String varName))) {
                throw new ParseException("CALL output argument must resolve to a variable: " + outputs.get(i));
            }
            ctx.out().add(new Equation(outputExpr, new Expr.Var(nsParam), "MODULE " + md.name() + " output " + md.outputs().get(i)));
            ctx.displayNames().putIfAbsent(varName, varName);
        }
    }

    private Expr namespaceExpr(Expr e, String ns,
                                List<String> inputs, List<String> outputs) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Var(String name) -> new Expr.Var(ns + name);
            case Expr.Neg(Expr operand) -> new Expr.Neg(namespaceExpr(operand, ns, inputs, outputs));
            case Expr.BinOp(char op, Expr left, Expr right) -> new Expr.BinOp(op,
                    namespaceExpr(left, ns, inputs, outputs),
                    namespaceExpr(right, ns, inputs, outputs));
            case Expr.Call(String function, List<Expr> args) -> {
                List<Expr> newArgs = args.stream()
                        .map(a -> namespaceExpr(a, ns, inputs, outputs))
                        .toList();
                yield new Expr.Call(function, newArgs);
            }
            case Expr.ArrayAccess(String name, List<Expr> indices) -> {
                List<Expr> newIdx = indices.stream()
                        .map(i -> namespaceExpr(i, ns, inputs, outputs))
                        .toList();
                yield new Expr.ArrayAccess(ns + name, newIdx);
            }
            case Expr.Range(Expr start, Expr end) -> new Expr.Range(
                    namespaceExpr(start, ns, inputs, outputs),
                    namespaceExpr(end, ns, inputs, outputs));
            case Expr.ArrayLiteral(List<Expr> elements) -> {
                List<Expr> elems = elements.stream()
                        .map(elem -> namespaceExpr(elem, ns, inputs, outputs))
                        .toList();
                yield new Expr.ArrayLiteral(elems);
            }
            case Expr.Compare(String op, Expr left, Expr right) -> new Expr.Compare(op,
                    namespaceExpr(left, ns, inputs, outputs),
                    namespaceExpr(right, ns, inputs, outputs));
            case Expr.Logical(String op, Expr left, Expr right) -> new Expr.Logical(op,
                    namespaceExpr(left, ns, inputs, outputs),
                    namespaceExpr(right, ns, inputs, outputs));
            case Expr.Not(Expr operand) -> new Expr.Not(namespaceExpr(operand, ns, inputs, outputs));
        };
    }

    private Expr expandExpr(Expr e, Map<String, Double> loopVars,
                             Map<String, Double> constants, Map<String, String> displayNames,
                             Map<String, ProcDef> defs) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Var(String name) -> {
                if (loopVars.containsKey(name)) {
                    yield new Expr.Num(loopVars.get(name));
                }
                yield e;
            }
            case Expr.Neg(Expr operand) -> new Expr.Neg(expandExpr(operand, loopVars, constants, displayNames, defs));
            case Expr.BinOp(char op, Expr left, Expr right) -> new Expr.BinOp(op,
                    expandExpr(left, loopVars, constants, displayNames, defs),
                    expandExpr(right, loopVars, constants, displayNames, defs));
            case Expr.Call(String function, List<Expr> args) -> {
                List<Expr> expandedArgs = new ArrayList<>();
                for (Expr arg : args) {
                    if (arg instanceof Expr.ArrayAccess(String name, List<Expr> indices) && indices.stream().anyMatch(idx -> idx instanceof Expr.Range)) {
                        expandedArgs.addAll(expandArrayAccessToElements(name, indices, loopVars, constants, displayNames, defs));
                    } else {
                        expandedArgs.add(expandExpr(arg, loopVars, constants, displayNames, defs));
                    }
                }
                yield new Expr.Call(function, expandedArgs);
            }
            case Expr.ArrayAccess(String name, List<Expr> indices) -> {
                if (indices.stream().anyMatch(idx -> idx instanceof Expr.Range)) {
                    throw new ParseException("Array range '" + name + "[...]' is only allowed on the LHS of assignments or as function arguments.");
                }
                List<Integer> evalIndices = new ArrayList<>();
                for (Expr idx : indices) {
                    Expr expandedIdx = expandExpr(idx, loopVars, constants, displayNames, defs);
                    double val = evalIndexExpr(expandedIdx, loopVars, constants, defs);
                    evalIndices.add((int) Math.round(val));
                }
                StringBuilder sb = new StringBuilder(name);
                sb.append("[");
                for (int i = 0; i < evalIndices.size(); i++) {
                    if (i > 0) sb.append(",");
                    sb.append(evalIndices.get(i));
                }
                sb.append("]");
                String canonicalName = sb.toString();

                String baseDisplay = displayNames.getOrDefault(name, name);
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
            case Expr.Range(Expr start, Expr end) -> new Expr.Range(
                    expandExpr(start, loopVars, constants, displayNames, defs),
                    expandExpr(end, loopVars, constants, displayNames, defs));
            case Expr.ArrayLiteral(List<Expr> elements) -> {
                List<Expr> expandedElems = new ArrayList<>();
                for (Expr elem : elements) {
                    expandedElems.add(expandExpr(elem, loopVars, constants, displayNames, defs));
                }
                yield new Expr.ArrayLiteral(expandedElems);
            }
            case Expr.Compare(String op, Expr left, Expr right) -> new Expr.Compare(op,
                    expandExpr(left, loopVars, constants, displayNames, defs),
                    expandExpr(right, loopVars, constants, displayNames, defs));
            case Expr.Logical(String op, Expr left, Expr right) -> new Expr.Logical(op,
                    expandExpr(left, loopVars, constants, displayNames, defs),
                    expandExpr(right, loopVars, constants, displayNames, defs));
            case Expr.Not(Expr operand) -> new Expr.Not(
                    expandExpr(operand, loopVars, constants, displayNames, defs));
        };
    }

    private List<List<Integer>> evaluateIndexPossibilities(List<Expr> indices, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, String> displayNames, Map<String, ProcDef> defs) {
        List<List<Integer>> indexPossibilities = new ArrayList<>();
        for (Expr idx : indices) {
            Expr expandedIdx = expandExpr(idx, loopVars, constants, displayNames, defs);
            if (expandedIdx instanceof Expr.Range(Expr startExpr, Expr endExpr)) {
                double startVal = evalIndexExpr(startExpr, loopVars, constants, defs);
                double endVal = evalIndexExpr(endExpr, loopVars, constants, defs);
                int start = (int) Math.round(startVal);
                int end = (int) Math.round(endVal);
                List<Integer> rangeVals = new ArrayList<>();
                int dir = start <= end ? 1 : -1;
                for (int v = start; start <= end ? v <= end : v >= end; v += dir) {
                    rangeVals.add(v);
                }
                indexPossibilities.add(rangeVals);
            } else {
                double val = evalIndexExpr(expandedIdx, loopVars, constants, defs);
                indexPossibilities.add(List.of((int) Math.round(val)));
            }
        }
        return indexPossibilities;
    }

    private List<Expr> buildElementVars(String name, List<List<Integer>> combinations, Map<String, String> displayNames) {
        List<Expr> elements = new ArrayList<>();
        for (List<Integer> combo : combinations) {
            StringBuilder sb = new StringBuilder(name).append("[");
            StringBuilder dsb = new StringBuilder(displayNames.getOrDefault(name, name)).append("[");
            for (int i = 0; i < combo.size(); i++) {
                if (i > 0) {
                    sb.append(",");
                    dsb.append(", ");
                }
                sb.append(combo.get(i));
                dsb.append(combo.get(i));
            }
            sb.append("]");
            dsb.append("]");
            String canonicalName = sb.toString();
            displayNames.put(canonicalName, dsb.toString());
            elements.add(new Expr.Var(canonicalName));
        }
        return elements;
    }

    private List<Expr> expandArrayAccessToElements(String name, List<Expr> indices, Map<String, Double> loopVars,
                                                    Map<String, Double> constants, Map<String, String> displayNames,
                                                    Map<String, ProcDef> defs) {
        List<List<Integer>> indexPossibilities = evaluateIndexPossibilities(indices, loopVars, constants, displayNames, defs);
        List<List<Integer>> combinations = new ArrayList<>();
        generateCombinations(indexPossibilities, 0, new ArrayList<>(), combinations);
        return buildElementVars(name, combinations, displayNames);
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
        if (!(expr instanceof Expr.ArrayAccess(String name, List<Expr> indices))) {
            throw new ParseException("Expected matrix array access: e.g. A[1..3, 1..3]");
        }
        if (indices.size() != 2) {
            throw new ParseException("Matrix must have exactly 2 dimensions: " + name);
        }
        Expr r0 = expandExpr(indices.get(0), loopVars, constants, displayNames, defs);
        Expr r1 = expandExpr(indices.get(1), loopVars, constants, displayNames, defs);
        if (!(r0 instanceof Expr.Range(Expr start0, Expr end0)) || !(r1 instanceof Expr.Range(Expr start1, Expr end1))) {
            throw new ParseException("Matrix indices must specify ranges: e.g. A[1..3, 1..3]");
        }
        int rStart = (int) Math.round(evalIndexExpr(start0, loopVars, constants, defs));
        int rEnd = (int) Math.round(evalIndexExpr(end0, loopVars, constants, defs));
        int cStart = (int) Math.round(evalIndexExpr(start1, loopVars, constants, defs));
        int cEnd = (int) Math.round(evalIndexExpr(end1, loopVars, constants, defs));

        int numRows = Math.abs(rEnd - rStart) + 1;
        int numCols = Math.abs(cEnd - cStart) + 1;

        Expr.Var[][] elements = new Expr.Var[numRows][numCols];
        int rDir = rStart <= rEnd ? 1 : -1;
        int cDir = cStart <= cEnd ? 1 : -1;

        for (int i = 0; i < numRows; i++) {
            int rowIdx = rStart + i * rDir;
            for (int j = 0; j < numCols; j++) {
                int colIdx = cStart + j * cDir;
                String canonical = name + "[" + rowIdx + "," + colIdx + "]";
                String baseDisplay = displayNames.getOrDefault(name, name);
                displayNames.put(canonical, baseDisplay + "[" + rowIdx + ", " + colIdx + "]");
                elements[i][j] = new Expr.Var(canonical);
            }
        }
        return new MatrixInfo(name, numRows, numCols, rStart, cStart, elements);
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
        if (!(expr instanceof Expr.ArrayAccess(String name, List<Expr> indices))) {
            throw new ParseException("Expected vector array access: e.g. v[1..3]");
        }
        if (indices.size() != 1) {
            throw new ParseException("Vector must have exactly 1 dimension: " + name);
        }
        Expr r0 = expandExpr(indices.get(0), loopVars, constants, displayNames, defs);
        if (!(r0 instanceof Expr.Range(Expr start, Expr end))) {
            throw new ParseException("Vector index must specify a range: e.g. v[1..3]");
        }
        int vStart = (int) Math.round(evalIndexExpr(start, loopVars, constants, defs));
        int vEnd = (int) Math.round(evalIndexExpr(end, loopVars, constants, defs));

        int size = Math.abs(vEnd - vStart) + 1;
        Expr.Var[] elements = new Expr.Var[size];
        int dir = vStart <= vEnd ? 1 : -1;

        for (int i = 0; i < size; i++) {
            int idx = vStart + i * dir;
            String canonical = name + "[" + idx + "]";
            String baseDisplay = displayNames.getOrDefault(name, name);
            displayNames.put(canonical, baseDisplay + "[" + idx + "]");
            elements[i] = new Expr.Var(canonical);
        }
        return new VectorInfo(name, size, vStart, elements);
    }

    private Expr[][] subMatrix(Expr[][] mat, int skipCol) {
        int n = mat.length;
        Expr[][] sub = new Expr[n - 1][n - 1];
        for (int r = 1; r < n; r++) {
            int colIdx = 0;
            for (int c = 0; c < n; c++) {
                if (c != skipCol) {
                    sub[r - 1][colIdx++] = mat[r][c];
                }
            }
        }
        return sub;
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
            Expr[][] sub = subMatrix(mat, j);
            Expr subDet = expandDeterminant(sub);
            Expr cofactor = new Expr.BinOp('*', mat[0][j], subDet);
            if (j % 2 == 1) {
                cofactor = new Expr.Neg(cofactor);
            }
            sum = sum == null ? cofactor : new Expr.BinOp('+', sum, cofactor);
        }
        return sum;
    }
}
