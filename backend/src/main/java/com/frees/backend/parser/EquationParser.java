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
 * Parses frees source text into a list of equations using the ANTLR-generated
 * lexer/parser and an AST-building visitor.
 */
public final class EquationParser {

    /** Largest span a single FOR loop or array range (1..N) may expand to, and
     * the backstop on the total number of equations a program may generate.
     * These bound parse-time expansion so a tiny input (e.g. FOR i = 1 TO 1e9)
     * cannot exhaust memory/CPU — a denial-of-service guard. */
    static final int MAX_RANGE_SPAN = 1_000_000;
    static final int MAX_GENERATED_EQUATIONS = 500_000;

    // Internal sentinel op chars for MATLAB-style element-wise operators. They
    // only ever exist on a raw Expr inside matrix compilation; compileMatrixExpr
    // expands them to per-element BinOps using the corresponding base op, so the
    // sentinels never reach the scalar consumers (Evaluator, LatexConverter, …).
    public static final char ELEMENT_MUL = '⊙';   // .*
    public static final char ELEMENT_DIV = '⊘';   // ./
    public static final char ELEMENT_LDIV = '∖';  // .\
    public static final char ELEMENT_POW = '↑';   // .^

    static boolean isElementwiseOp(char op) {
        return op == ELEMENT_MUL || op == ELEMENT_DIV
                || op == ELEMENT_LDIV || op == ELEMENT_POW;
    }

    /** The scalar operator an element-wise op applies to each pair of elements. */
    static char elementwiseBaseOp(char op) {
        return switch (op) {
            case ELEMENT_MUL -> '*';
            case ELEMENT_DIV -> '/';
            case ELEMENT_LDIV -> '\\';
            case ELEMENT_POW -> '^';
            default -> op;
        };
    }

    /** True if any node in the expression tree is an element-wise operator, so
     * the equation must route through matrix compilation even when an enclosing
     * operator wouldn't otherwise flag it as a matrix expression. */
    static boolean containsElementwiseOp(Expr e) {
        return switch (e) {
            case Expr.BinOp(char op, Expr left, Expr right) ->
                isElementwiseOp(op) || containsElementwiseOp(left) || containsElementwiseOp(right);
            case Expr.Neg(Expr operand) -> containsElementwiseOp(operand);
            case Expr.Call(String fn, List<Expr> args) -> args.stream().anyMatch(EquationParser::containsElementwiseOp);
            default -> false;
        };
    }

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
            java.util.Map<String, ProcDef> defs,
            List<com.frees.backend.ast.ParametricTable> parametricTables,
            List<com.frees.backend.ast.PlotDef> plots) {

        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames,
                           java.util.Map<String, ProcDef> defs,
                           List<com.frees.backend.ast.ParametricTable> parametricTables) {
            this(equations, displayNames, defs, parametricTables, List.of());
        }

        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames,
                           java.util.Map<String, ProcDef> defs) {
            this(equations, displayNames, defs, List.of(), List.of());
        }

        /** Backward-compat constructor for callers that don't need defs. */
        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames) {
            this(equations, displayNames, Map.of(), List.of(), List.of());
        }
    }

    public ParseResult parseResult(String source) {
        CollectingErrorListener errorListener = new CollectingErrorListener();

        FreesLexer lexer = new FreesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errorListener);

        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);

        FreesParser.ProgramContext program = parser.program();
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

        // String variables (R$ = 'R134a') are compile-time constants:
        // substitute their values and drop the definition equations.
        equations = StringVariables.resolve(equations, displayNames);

        return new ParseResult(equations, displayNames, defs, programResult.parametricTables(),
                programResult.plots());
    }

    public List<Equation> parse(String source) {
        return parseResult(source).equations();
    }

    private record FlattenContext(Map<String, Double> loopVars,
                                  Map<String, Double> constants,
                                  Map<String, String> displayNames,
                                  List<Equation> out,
                                  Map<String, ProcDef> defs,
                                  AtomicInteger moduleCounter,
                                  // Declared shapes of matrix/vector variables ({rows, cols},
                                  // lowercased name) so a bare reference like SolveLinear(A, b)
                                  // resolves to the explicit A[1..r,1..c] form.
                                  Map<String, int[]> shapes) {}

    private static void registerShape(String name, int rows, int cols, FlattenContext ctx) {
        ctx.shapes().put(name.toLowerCase(), new int[]{rows, cols});
    }

    private static Expr rangeAccess(String name, int[] shape) {
        List<Expr> idx = new ArrayList<>();
        if (shape[0] == 1 || shape[1] == 1) { // vector: single 1..n index
            int n = Math.max(shape[0], shape[1]);
            idx.add(new Expr.Range(new Expr.Num(1), new Expr.Num(n)));
        } else {
            idx.add(new Expr.Range(new Expr.Num(1), new Expr.Num(shape[0])));
            idx.add(new Expr.Range(new Expr.Num(1), new Expr.Num(shape[1])));
        }
        return new Expr.ArrayAccess(name, idx);
    }

    /** Rewrites bare references to a registered matrix/vector variable into the
     * explicit A[1..r,1..c] form, so MATLAB-style bare names work in operations. */
    private Expr resolveShapes(Expr e, FlattenContext ctx) {
        return switch (e) {
            case Expr.Var(String name) -> {
                int[] shape = ctx.shapes().get(name.toLowerCase());
                yield shape == null ? e : rangeAccess(name, shape);
            }
            case Expr.BinOp(char op, Expr l, Expr r) ->
                new Expr.BinOp(op, resolveShapes(l, ctx), resolveShapes(r, ctx));
            case Expr.Neg(Expr o) -> new Expr.Neg(resolveShapes(o, ctx));
            case Expr.Call(String fn, List<Expr> args) -> {
                List<Expr> na = new ArrayList<>();
                for (Expr a : args) {
                    na.add(resolveShapes(a, ctx));
                }
                yield new Expr.Call(fn, na);
            }
            default -> e;
        };
    }

    /** If lhs is a bare name, register it as a vector of the given size and
     * return the explicit v[1..size] form; otherwise return it unchanged. */
    private Expr explicitVectorOutput(Expr lhs, int size, FlattenContext ctx) {
        if (lhs instanceof Expr.Var(String name)) {
            registerShape(name, size, 1, ctx);
            return new Expr.ArrayAccess(name,
                    List.of(new Expr.Range(new Expr.Num(1), new Expr.Num(size))));
        }
        return lhs;
    }

    /** As {@link #explicitVectorOutput} but for a rows×cols matrix output. */
    private Expr explicitMatrixOutput(Expr lhs, int rows, int cols, FlattenContext ctx) {
        if (lhs instanceof Expr.Var(String name)) {
            registerShape(name, rows, cols, ctx);
            return rangeAccess(name, new int[]{rows, cols});
        }
        return lhs;
    }

    private boolean tryExtractConstant(Statement stmt, Map<String, Double> constants) {
        if (!(stmt instanceof Statement.Eq(Expr lhs, Expr rhs, String sourceText))) {
            return false;
        }
        if (lhs instanceof Expr.Var(String name) && !constants.containsKey(name)) {
            try {
                double val = Evaluator.eval(rhs, constants);
                constants.put(name, val);
                return true;
            } catch (Exception ignored) {
                // Ignored: evaluation may fail until dependent variables are resolved
            }
        } else if (rhs instanceof Expr.Var(String name) && !constants.containsKey(name)) {
            try {
                double val = Evaluator.eval(lhs, constants);
                constants.put(name, val);
                return true;
            } catch (Exception ignored) {
                // Ignored: evaluation may fail until dependent variables are resolved
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
        FlattenContext ctx = new FlattenContext(loopVars, constants, displayNames, out, defs, moduleCounter, new HashMap<>());
        for (Statement stmt : statements) {
            switch (stmt) {
                case Statement.For(String varName, Expr start, Expr end, List<Statement> body) ->
                    flattenFor(varName, start, end, body, ctx);
                case Statement.Eq(Expr lhs, Expr rhs, String sourceText) ->
                    flattenEq(lhs, rhs, sourceText, ctx);
                case Statement.CallProc(String name, List<Expr> inputs, List<Expr> outputs, String sourceText) ->
                    flattenCallProc(name, inputs, outputs, sourceText, ctx);
            }
        }
    }

    private void flattenFor(String varName, Expr start, Expr end, List<Statement> body,
                            FlattenContext ctx) {
        double startVal = evalIndexExpr(expandExpr(start, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()), ctx.loopVars(), ctx.constants(), ctx.defs());
        double endVal = evalIndexExpr(expandExpr(end, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()), ctx.loopVars(), ctx.constants(), ctx.defs());
        int startInt = (int) Math.round(startVal);
        int endInt = (int) Math.round(endVal);
        long span = Math.abs((long) endInt - startInt) + 1;
        if (span > MAX_RANGE_SPAN) {
            throw new ParseException("FOR loop range is too large (" + span
                    + " iterations; limit " + MAX_RANGE_SPAN + "). Reduce the loop bounds.");
        }
        int step = startInt <= endInt ? 1 : -1;
        for (int i = startInt; startInt <= endInt ? i <= endInt : i >= endInt; i += step) {
            Map<String, Double> newLoopVars = new HashMap<>(ctx.loopVars());
            newLoopVars.put(varName, (double) i);
            flatten(body, newLoopVars, ctx.constants(), ctx.displayNames(), ctx.out(), ctx.defs(), ctx.moduleCounter());
            checkEquationBudget(ctx.out());
        }
    }

    /** Backstop against runaway expansion (e.g. deeply nested loops): a program
     * may not generate more than {@link #MAX_GENERATED_EQUATIONS} equations. */
    private static void checkEquationBudget(List<Equation> out) {
        if (out.size() > MAX_GENERATED_EQUATIONS) {
            throw new ParseException("Too many equations generated (over "
                    + MAX_GENERATED_EQUATIONS + "). Reduce loop or array sizes.");
        }
    }

    private void flattenEq(Expr lhs, Expr rhs, String sourceText, FlattenContext ctx) {
        // Rewrite bare references to known matrix/vector variables (e.g. the A, b
        // in SolveLinear(A, b)) into their explicit A[1..r,1..c] form.
        lhs = resolveShapes(lhs, ctx);
        rhs = resolveShapes(rhs, ctx);

        // Dedicated matrix-function handlers run first: they write the output
        // directly (no helper temp variable leaks into the solution).
        if (rhs instanceof Expr.Call(String function, List<Expr> args)) {
            String func = switch (function.toLowerCase()) {
                case "inv" -> "inverse";          // MATLAB aliases
                case "det" -> "determinant";
                default -> function.toLowerCase();
            };
            if (func.equals("inverse") || func.equals("transpose")) {
                flattenMatrixTransform(func, lhs, args.get(0), sourceText, ctx);
                return;
            }
            if (func.equals("dot") || func.equals("norm") || func.equals("nrm2") || func.equals("determinant") || func.equals("asum")) {
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

        // MATLAB-style bare creation: A = [1 2; 3 4], v = [1 2 3], Z = zeros(2,2).
        if (lhs instanceof Expr.Var(String vname)
                && (rhs instanceof Expr.ArrayLiteral
                    || isMatrixExpr(rhs, ctx.loopVars(), ctx.constants(), ctx.defs())
                    || containsElementwiseOp(rhs))) {
            flattenBareMatrixCreation(vname, rhs, sourceText, ctx);
            return;
        }

        if (isMatrixExpr(lhs, ctx.loopVars(), ctx.constants(), ctx.defs()) || isMatrixExpr(rhs, ctx.loopVars(), ctx.constants(), ctx.defs())
                || containsElementwiseOp(lhs) || containsElementwiseOp(rhs)) {
            Expr[][] lhsMat = compileMatrixExpr(lhs, ctx);
            Expr[][] rhsMat = compileMatrixExpr(rhs, ctx);
            // Remember an explicitly-dimensioned LHS (A[1..r,1..c] = ...) so a
            // later bare reference to it resolves.
            if (lhs instanceof Expr.ArrayAccess(String ln, List<Expr> li) && !li.isEmpty()) {
                registerShape(ln, lhsMat.length, lhsMat[0].length, ctx);
            }
            if (rhsMat.length == 1 && rhsMat[0].length == 1) {
                Expr scalarVal = rhsMat[0][0];
                rhsMat = new Expr[lhsMat.length][lhsMat[0].length];
                for (int i = 0; i < lhsMat.length; i++) {
                    for (int j = 0; j < lhsMat[0].length; j++) {
                        rhsMat[i][j] = scalarVal;
                    }
                }
            } else if (lhsMat.length != rhsMat.length || lhsMat[0].length != rhsMat[0].length) {
                if (lhsMat.length == rhsMat[0].length && lhsMat[0].length == rhsMat.length && (lhsMat.length == 1 || lhsMat[0].length == 1)) {
                    Expr[][] transposedRhs = new Expr[lhsMat.length][lhsMat[0].length];
                    for (int i = 0; i < lhsMat.length; i++) {
                        for (int j = 0; j < lhsMat[0].length; j++) {
                            transposedRhs[i][j] = rhsMat[j][i];
                        }
                    }
                    rhsMat = transposedRhs;
                } else {
                    throw new ParseException("Matrix assignment dimension mismatch: LHS is " +
                            lhsMat.length + "x" + lhsMat[0].length + ", but RHS is " +
                            rhsMat.length + "x" + rhsMat[0].length);
                }
            }
            for (int i = 0; i < lhsMat.length; i++) {
                for (int j = 0; j < lhsMat[0].length; j++) {
                    ctx.out().add(new Equation(lhsMat[i][j], rhsMat[i][j], sourceText));
                }
            }
        } else {
            Expr expandedLhs = expandExpr(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr expandedRhs = expandExpr(rhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            ctx.out().add(new Equation(expandedLhs, expandedRhs, sourceText));
        }
    }

    /** MATLAB-style bare creation: A = [1 2; 3 4], v = [1, 2, 3] or v = [1; 2; 3].
     * Emits element equations (A[i,j] or v[k]) and registers the shape. */
    private void flattenBareMatrixCreation(String name, Expr rhs, String sourceText, FlattenContext ctx) {
        Expr[][] m = compileMatrixExpr(rhs, ctx);
        int rows = m.length;
        int cols = m[0].length;
        boolean vector = rows == 1 || cols == 1;
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                String canonical = vector
                        ? name + "[" + (Math.max(i, j) + 1) + "]"
                        : name + "[" + (i + 1) + "," + (j + 1) + "]";
                ctx.displayNames().putIfAbsent(canonical,
                        ctx.displayNames().getOrDefault(name, name)
                                + canonical.substring(name.length()));
                ctx.out().add(new Equation(new Expr.Var(canonical), m[i][j], sourceText));
            }
        }
        registerShape(name, rows, cols, ctx);
    }

    private void flattenMatrixTransform(String func, Expr lhs, Expr firstArg, String sourceText, FlattenContext ctx) {
        MatrixInfo rhsMat = parseMatrixInfo(firstArg, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        // Allow a bare output name (C = Inverse(A)): size it from the operation.
        int outRows = func.equals("transpose") ? rhsMat.cols : rhsMat.rows;
        int outCols = func.equals("transpose") ? rhsMat.rows : rhsMat.cols;
        lhs = explicitMatrixOutput(lhs, outRows, outCols, ctx);
        MatrixInfo lhsMat = parseMatrixInfo(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
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
        } else if (func.equals("norm") || func.equals("nrm2")) {
            VectorInfo v = parseVectorInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr sumSq = null;
            for (int i = 0; i < v.size; i++) {
                Expr term = new Expr.BinOp('*', v.elements[i], v.elements[i]);
                sumSq = sumSq == null ? term : new Expr.BinOp('+', sumSq, term);
            }
            Expr normExpr = new Expr.Call("sqrt", List.of(sumSq));
            ctx.out().add(new Equation(expandedLhs, normExpr, sourceText));
        } else if (func.equals("asum")) {
            VectorInfo v = parseVectorInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr sumAbs = null;
            for (int i = 0; i < v.size; i++) {
                Expr term = new Expr.Call("abs", List.of(v.elements[i]));
                sumAbs = sumAbs == null ? term : new Expr.BinOp('+', sumAbs, term);
            }
            ctx.out().add(new Equation(expandedLhs, sumAbs, sourceText));
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
        lhs = explicitVectorOutput(lhs, 3, ctx); // allow a bare output: w = cross(u, v)
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
        MatrixInfo a = parseMatrixInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo b = parseVectorInfo(args.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        // Allow a bare output name (x = SolveLinear(A, b)): size it from b.
        lhs = explicitVectorOutput(lhs, b.size, ctx);
        VectorInfo x = parseVectorInfo(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
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
            case Expr.Str s -> s;
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
            case Expr.Str s -> s;
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
                    if (i > 0) dsb.append(",");
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
                long count = Math.abs((long) end - start) + 1;
                if (count > MAX_RANGE_SPAN) {
                    throw new ParseException("Array range is too large (" + count
                            + " elements; limit " + MAX_RANGE_SPAN + "). Reduce the index range.");
                }
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
                    dsb.append(",");
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
        long total = 1;
        for (List<Integer> dim : indexPossibilities) {
            total *= dim.size();
            if (total > MAX_RANGE_SPAN) {
                throw new ParseException("Array expansion of '" + name + "[...]' is too large ("
                        + total + " elements; limit " + MAX_RANGE_SPAN + "). Reduce the index ranges.");
            }
        }
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
        long cells = (long) numRows * numCols;
        if (cells > MAX_RANGE_SPAN) {
            throw new ParseException("Matrix '" + name + "[...]' is too large (" + cells
                    + " elements; limit " + MAX_RANGE_SPAN + "). Reduce the index ranges.");
        }

        Expr.Var[][] elements = new Expr.Var[numRows][numCols];
        int rDir = rStart <= rEnd ? 1 : -1;
        int cDir = cStart <= cEnd ? 1 : -1;

        for (int i = 0; i < numRows; i++) {
            int rowIdx = rStart + i * rDir;
            for (int j = 0; j < numCols; j++) {
                int colIdx = cStart + j * cDir;
                String canonical = name + "[" + rowIdx + "," + colIdx + "]";
                String baseDisplay = displayNames.getOrDefault(name, name);
                displayNames.put(canonical, baseDisplay + "[" + rowIdx + "," + colIdx + "]");
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

        long span = Math.abs((long) vEnd - vStart) + 1;
        if (span > MAX_RANGE_SPAN) {
            throw new ParseException("Vector '" + name + "[...]' is too large (" + span
                    + " elements; limit " + MAX_RANGE_SPAN + "). Reduce the index range.");
        }
        int size = (int) span;
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

    private boolean isMatrixExpr(Expr e, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, ProcDef> defs) {
        return switch (e) {
            case Expr.ArrayAccess(String name, List<Expr> indices) -> 
                indices.stream().anyMatch(idx -> idx instanceof Expr.Range || isMatrixExpr(idx, loopVars, constants, defs));
            case Expr.ArrayLiteral(List<Expr> elements) -> 
                elements.stream().anyMatch(elem -> elem instanceof Expr.ArrayLiteral || isMatrixExpr(elem, loopVars, constants, defs));
            case Expr.BinOp(char op, Expr left, Expr right) ->
                isElementwiseOp(op) ||
                ((op == '*' || op == '+' || op == '-' || op == '\\') &&
                (isMatrixExpr(left, loopVars, constants, defs) || isMatrixExpr(right, loopVars, constants, defs)));
            case Expr.Call(String function, List<Expr> args) -> isMatrixFunction(function);
            default -> false;
        };
    }

    /** Functions whose result is a matrix/vector (so an equation using one is a
     * matrix equation). Scalar-valued ones (det, dot, norm) are excluded. */
    private static final java.util.Set<String> MATRIX_FUNCTIONS = java.util.Set.of(
            "transpose", "inverse", "inv", "solvelinear",
            "axpy", "scal", "gemv", "gemm", "ger", "copy",
            "zeros", "ones", "eye", "identity", "diag", "linspace");

    private static boolean isMatrixFunction(String function) {
        return MATRIX_FUNCTIONS.contains(function.toLowerCase());
    }

    private void checkGeneratorSize(int rows, int cols, String fn) {
        if (rows < 1 || cols < 1) {
            throw new ParseException(fn + " dimensions must be >= 1");
        }
        if ((long) rows * cols > MAX_RANGE_SPAN) {
            throw new ParseException(fn + " matrix is too large (limit " + MAX_RANGE_SPAN + ").");
        }
    }

    /** MATLAB-style matrix generators: zeros, ones, eye/identity, diag, linspace. */
    private Expr[][] compileMatrixGenerator(String fn, List<Expr> args, FlattenContext ctx) {
        Map<String, Double> loopVars = ctx.loopVars();
        Map<String, Double> constants = ctx.constants();
        Map<String, String> displayNames = ctx.displayNames();
        Map<String, ProcDef> defs = ctx.defs();
        java.util.function.ToDoubleFunction<Expr> num = a ->
                evalIndexExpr(expandExpr(a, loopVars, constants, displayNames, defs), loopVars, constants, defs);

        switch (fn) {
            case "zeros", "ones" -> {
                int r = (int) Math.round(num.applyAsDouble(args.get(0)));
                int c = args.size() > 1 ? (int) Math.round(num.applyAsDouble(args.get(1))) : r;
                checkGeneratorSize(r, c, fn);
                double fill = fn.equals("ones") ? 1.0 : 0.0;
                Expr[][] m = new Expr[r][c];
                for (int i = 0; i < r; i++) {
                    for (int j = 0; j < c; j++) {
                        m[i][j] = new Expr.Num(fill);
                    }
                }
                return m;
            }
            case "eye", "identity" -> {
                int r = (int) Math.round(num.applyAsDouble(args.get(0)));
                int c = args.size() > 1 ? (int) Math.round(num.applyAsDouble(args.get(1))) : r;
                checkGeneratorSize(r, c, fn);
                Expr[][] m = new Expr[r][c];
                for (int i = 0; i < r; i++) {
                    for (int j = 0; j < c; j++) {
                        m[i][j] = new Expr.Num(i == j ? 1.0 : 0.0);
                    }
                }
                return m;
            }
            case "linspace" -> {
                double a = num.applyAsDouble(args.get(0));
                double b = num.applyAsDouble(args.get(1));
                int n = args.size() > 2 ? (int) Math.round(num.applyAsDouble(args.get(2))) : 100;
                checkGeneratorSize(n, 1, fn);
                Expr[][] m = new Expr[n][1];
                for (int k = 0; k < n; k++) {
                    double t = n == 1 ? b : a + (b - a) * k / (n - 1);
                    m[k][0] = new Expr.Num(t);
                }
                return m;
            }
            default -> { // diag
                Expr[][] v = compileMatrixExpr(args.get(0), ctx);
                if (v.length == 1 || v[0].length == 1) { // vector -> diagonal matrix
                    int n = Math.max(v.length, v[0].length);
                    Expr[][] m = new Expr[n][n];
                    for (int i = 0; i < n; i++) {
                        for (int j = 0; j < n; j++) {
                            m[i][j] = i == j ? (v.length == 1 ? v[0][i] : v[i][0]) : new Expr.Num(0.0);
                        }
                    }
                    return m;
                }
                int n = Math.min(v.length, v[0].length); // matrix -> extract diagonal
                Expr[][] m = new Expr[n][1];
                for (int i = 0; i < n; i++) {
                    m[i][0] = v[i][i];
                }
                return m;
            }
        }
    }

    /** The MATLAB spelling of an element-wise op, for error messages. */
    private static String elementwiseSymbol(char op) {
        return switch (op) {
            case ELEMENT_MUL -> ".*";
            case ELEMENT_DIV -> "./";
            case ELEMENT_LDIV -> ".\\";
            case ELEMENT_POW -> ".^";
            default -> String.valueOf(op);
        };
    }

    /** Element-wise op (.*, ./, .\, .^): apply the base scalar op to each pair of
     * elements, with scalar broadcasting on either side (A .* 2, 2 ./ A). */
    private Expr[][] compileElementwise(char op, Expr left, Expr right, FlattenContext ctx) {
        char base = elementwiseBaseOp(op);
        Expr[][] lMat = compileMatrixExpr(left, ctx);
        Expr[][] rMat = compileMatrixExpr(right, ctx);
        boolean lScalar = lMat.length == 1 && lMat[0].length == 1;
        boolean rScalar = rMat.length == 1 && rMat[0].length == 1;

        int rows;
        int cols;
        if (lScalar) {
            rows = rMat.length;
            cols = rMat[0].length;
        } else if (rScalar) {
            rows = lMat.length;
            cols = lMat[0].length;
        } else {
            if (lMat.length != rMat.length || lMat[0].length != rMat[0].length) {
                throw new ParseException("Matrix dimensions must agree for element-wise '"
                        + elementwiseSymbol(op) + "': " + lMat.length + "x" + lMat[0].length
                        + " vs " + rMat.length + "x" + rMat[0].length);
            }
            rows = lMat.length;
            cols = lMat[0].length;
        }

        Expr[][] result = new Expr[rows][cols];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                Expr a = lScalar ? lMat[0][0] : lMat[i][j];
                Expr b = rScalar ? rMat[0][0] : rMat[i][j];
                // Left divide A .\ B is element-wise B / A (the Evaluator has no
                // scalar '\' op, so emit a normal division with swapped operands).
                result[i][j] = op == ELEMENT_LDIV
                        ? new Expr.BinOp('/', b, a)
                        : new Expr.BinOp(base, a, b);
            }
        }
        return result;
    }

    private Expr[][] compileMatrixExpr(Expr e, FlattenContext ctx) {
        Map<String, Double> loopVars = ctx.loopVars();
        Map<String, Double> constants = ctx.constants();
        Map<String, String> displayNames = ctx.displayNames();
        Map<String, ProcDef> defs = ctx.defs();

        return switch (e) {
            case Expr.ArrayAccess(String name, List<Expr> indices) -> {
                if (indices.size() == 2) {
                    MatrixInfo m = parseMatrixInfo(e, loopVars, constants, displayNames, defs);
                    Expr[][] mat = new Expr[m.rows][m.cols];
                    for (int i = 0; i < m.rows; i++) {
                        System.arraycopy(m.elements[i], 0, mat[i], 0, m.cols);
                    }
                    yield mat;
                } else if (indices.size() == 1) {
                    VectorInfo v = parseVectorInfo(e, loopVars, constants, displayNames, defs);
                    Expr[][] mat = new Expr[v.size][1];
                    for (int i = 0; i < v.size; i++) {
                        mat[i][0] = v.elements[i];
                    }
                    yield mat;
                } else {
                    throw new ParseException("Matrix/vector must have 1 or 2 dimensions: " + name);
                }
            }
            case Expr.ArrayLiteral(List<Expr> elements) -> {
                if (!elements.isEmpty() && elements.get(0) instanceof Expr.ArrayLiteral) {
                    int numRows = elements.size();
                    int numCols = -1;
                    Expr[][] mat = null;
                    for (int i = 0; i < numRows; i++) {
                        if (!(elements.get(i) instanceof Expr.ArrayLiteral rowLit)) {
                            throw new ParseException("Heterogeneous matrix literal: row " + (i+1) + " is not a row literal.");
                        }
                        if (numCols == -1) {
                            numCols = rowLit.elements().size();
                            mat = new Expr[numRows][numCols];
                        } else if (rowLit.elements().size() != numCols) {
                            throw new ParseException("Matrix literal rows must have compatible column dimensions.");
                        }
                        for (int j = 0; j < numCols; j++) {
                            mat[i][j] = expandExpr(rowLit.elements().get(j), loopVars, constants, displayNames, defs);
                        }
                    }
                    yield mat;
                } else {
                    int size = elements.size();
                    Expr[][] mat = new Expr[size][1];
                    for (int i = 0; i < size; i++) {
                        mat[i][0] = expandExpr(elements.get(i), loopVars, constants, displayNames, defs);
                    }
                    yield mat;
                }
            }
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                if (op == '+' || op == '-') {
                    Expr[][] lMat = compileMatrixExpr(left, ctx);
                    Expr[][] rMat = compileMatrixExpr(right, ctx);
                    
                    if (lMat.length == 1 && lMat[0].length == 1) {
                        Expr scalar = lMat[0][0];
                        Expr[][] result = new Expr[rMat.length][rMat[0].length];
                        for (int i = 0; i < rMat.length; i++) {
                            for (int j = 0; j < rMat[0].length; j++) {
                                result[i][j] = new Expr.BinOp(op, scalar, rMat[i][j]);
                            }
                        }
                        yield result;
                    } else if (rMat.length == 1 && rMat[0].length == 1) {
                        Expr scalar = rMat[0][0];
                        Expr[][] result = new Expr[lMat.length][lMat[0].length];
                        for (int i = 0; i < lMat.length; i++) {
                            for (int j = 0; j < lMat[0].length; j++) {
                                result[i][j] = new Expr.BinOp(op, lMat[i][j], scalar);
                            }
                        }
                        yield result;
                    }

                    if (lMat.length != rMat.length || lMat[0].length != rMat[0].length) {
                        throw new ParseException("Matrix dimensions must agree for addition/subtraction: " +
                                lMat.length + "x" + lMat[0].length + " vs " + rMat.length + "x" + rMat[0].length);
                    }
                    int rows = lMat.length;
                    int cols = lMat[0].length;
                    Expr[][] result = new Expr[rows][cols];
                    for (int i = 0; i < rows; i++) {
                        for (int j = 0; j < cols; j++) {
                            result[i][j] = new Expr.BinOp(op, lMat[i][j], rMat[i][j]);
                        }
                    }
                    yield result;
                } else if (op == '*') {
                    Expr[][] lMat = compileMatrixExpr(left, ctx);
                    Expr[][] rMat = compileMatrixExpr(right, ctx);

                    if (lMat.length == 1 && lMat[0].length == 1) {
                        Expr scalar = lMat[0][0];
                        Expr[][] result = new Expr[rMat.length][rMat[0].length];
                        for (int i = 0; i < rMat.length; i++) {
                            for (int j = 0; j < rMat[0].length; j++) {
                                result[i][j] = new Expr.BinOp('*', scalar, rMat[i][j]);
                            }
                        }
                        yield result;
                    } else if (rMat.length == 1 && rMat[0].length == 1) {
                        Expr scalar = rMat[0][0];
                        Expr[][] result = new Expr[lMat.length][lMat[0].length];
                        for (int i = 0; i < lMat.length; i++) {
                            for (int j = 0; j < lMat[0].length; j++) {
                                result[i][j] = new Expr.BinOp('*', lMat[i][j], scalar);
                            }
                        }
                        yield result;
                    }

                    if (lMat[0].length != rMat.length) {
                        throw new ParseException("Inner matrix dimensions must agree: " +
                                lMat.length + "x" + lMat[0].length + " vs " + rMat.length + "x" + rMat[0].length);
                    }
                    int rows = lMat.length;
                    int cols = rMat[0].length;
                    int inner = lMat[0].length;
                    Expr[][] result = new Expr[rows][cols];
                    for (int i = 0; i < rows; i++) {
                        for (int j = 0; j < cols; j++) {
                            Expr term = new Expr.BinOp('*', lMat[i][0], rMat[0][j]);
                            for (int k = 1; k < inner; k++) {
                                term = new Expr.BinOp('+', term, new Expr.BinOp('*', lMat[i][k], rMat[k][j]));
                            }
                            result[i][j] = term;
                        }
                    }
                    yield result;
                } else if (op == '\\') {
                    Expr[][] aMat = compileMatrixExpr(left, ctx);
                    Expr[][] bMat = compileMatrixExpr(right, ctx);
                    if (aMat.length != aMat[0].length) {
                        throw new ParseException("Backslash solver requires square matrix A");
                    }
                    if (bMat.length != aMat.length || bMat[0].length != 1) {
                        throw new ParseException("Backslash solver dimensions mismatch: A is " + aMat.length + "x" + aMat[0].length + ", b is " + bMat.length + "x" + bMat[0].length);
                    }
                    int M = aMat.length;

                    String tempVecName = "backslash_temp_" + ctx.out().size();
                    Expr[][] xMat = new Expr[M][1];
                    for (int i = 0; i < M; i++) {
                        String canonical = tempVecName + "[" + (i + 1) + "]";
                        xMat[i][0] = new Expr.Var(canonical);
                    }

                    for (int i = 0; i < M; i++) {
                        Expr term = new Expr.BinOp('*', aMat[i][0], xMat[0][0]);
                        for (int k = 1; k < M; k++) {
                            term = new Expr.BinOp('+', term, new Expr.BinOp('*', aMat[i][k], xMat[k][0]));
                        }
                        ctx.out().add(new Equation(term, bMat[i][0], "Backslash solve"));
                    }

                    yield xMat;
                } else if (isElementwiseOp(op)) {
                    yield compileElementwise(op, left, right, ctx);
                } else {
                    throw new ParseException("Unsupported binary matrix operator: " + op);
                }
            }
            case Expr.Call(String function, List<Expr> args) -> {
                String fn = function.toLowerCase();
                if (fn.equals("zeros") || fn.equals("ones") || fn.equals("eye")
                        || fn.equals("identity") || fn.equals("diag") || fn.equals("linspace")) {
                    yield compileMatrixGenerator(fn, args, ctx);
                }
                if (fn.equals("transpose")) {
                    Expr[][] mat = compileMatrixExpr(args.get(0), ctx);
                    int rows = mat.length;
                    int cols = mat[0].length;
                    Expr[][] result = new Expr[cols][rows];
                    for (int i = 0; i < rows; i++) {
                        for (int j = 0; j < cols; j++) {
                            result[j][i] = mat[i][j];
                        }
                    }
                    yield result;
                } else if (fn.equals("inverse") || fn.equals("inv")) {
                    Expr[][] aMat = compileMatrixExpr(args.get(0), ctx);
                    if (aMat.length != aMat[0].length) {
                        throw new ParseException("Inverse requires a square matrix");
                    }
                    int M = aMat.length;
                    String tempMatName = "inverse_temp_" + ctx.out().size();
                    Expr[][] invMat = new Expr[M][M];
                    for (int i = 0; i < M; i++) {
                        for (int j = 0; j < M; j++) {
                            String canonical = tempMatName + "[" + (i+1) + "," + (j+1) + "]";
                            invMat[i][j] = new Expr.Var(canonical);
                        }
                    }

                    for (int i = 0; i < M; i++) {
                        for (int j = 0; j < M; j++) {
                            Expr term = new Expr.BinOp('*', aMat[i][0], invMat[0][j]);
                            for (int k = 1; k < M; k++) {
                                term = new Expr.BinOp('+', term, new Expr.BinOp('*', aMat[i][k], invMat[k][j]));
                            }
                            Expr identityVal = new Expr.Num(i == j ? 1.0 : 0.0);
                            ctx.out().add(new Equation(term, identityVal, "Matrix inverse definition"));
                        }
                    }
                    yield invMat;
                } else if (fn.equals("axpy")) {
                    if (args.size() != 3) {
                        throw new ParseException("axpy expects exactly 3 arguments: axpy(alpha, x, y)");
                    }
                    Expr alpha = args.get(0);
                    Expr[][] xMat = compileMatrixExpr(args.get(1), ctx);
                    Expr[][] yMat = compileMatrixExpr(args.get(2), ctx);
                    if (xMat.length != yMat.length || xMat[0].length != yMat[0].length) {
                        throw new ParseException("axpy dimension mismatch: x is " + xMat.length + "x" + xMat[0].length +
                                ", y is " + yMat.length + "x" + yMat[0].length);
                    }
                    int rows = xMat.length;
                    int cols = xMat[0].length;
                    Expr[][] result = new Expr[rows][cols];
                    for (int i = 0; i < rows; i++) {
                        for (int j = 0; j < cols; j++) {
                            result[i][j] = new Expr.BinOp('+', new Expr.BinOp('*', alpha, xMat[i][j]), yMat[i][j]);
                        }
                    }
                    yield result;
                } else if (fn.equals("scal")) {
                    if (args.size() != 2) {
                        throw new ParseException("scal expects exactly 2 arguments: scal(alpha, x)");
                    }
                    Expr alpha = args.get(0);
                    Expr[][] xMat = compileMatrixExpr(args.get(1), ctx);
                    int rows = xMat.length;
                    int cols = xMat[0].length;
                    Expr[][] result = new Expr[rows][cols];
                    for (int i = 0; i < rows; i++) {
                        for (int j = 0; j < cols; j++) {
                            result[i][j] = new Expr.BinOp('*', alpha, xMat[i][j]);
                        }
                    }
                    yield result;
                } else if (fn.equals("gemv")) {
                    if (args.size() != 5) {
                        throw new ParseException("gemv expects exactly 5 arguments: gemv(alpha, A, x, beta, y)");
                    }
                    Expr alpha = args.get(0);
                    Expr[][] aMat = compileMatrixExpr(args.get(1), ctx);
                    Expr[][] xMat = compileMatrixExpr(args.get(2), ctx);
                    Expr beta = args.get(3);
                    Expr[][] yMat = compileMatrixExpr(args.get(4), ctx);

                    if (xMat[0].length != 1) {
                        throw new ParseException("gemv: x must be a column vector (got " + xMat.length + "x" + xMat[0].length + ")");
                    }
                    if (yMat[0].length != 1) {
                        throw new ParseException("gemv: y must be a column vector (got " + yMat.length + "x" + yMat[0].length + ")");
                    }
                    if (aMat[0].length != xMat.length) {
                        throw new ParseException("gemv inner dimension mismatch: A is " + aMat.length + "x" + aMat[0].length +
                                ", x is " + xMat.length + "x" + xMat[0].length);
                    }
                    if (aMat.length != yMat.length) {
                        throw new ParseException("gemv outer dimension mismatch: A is " + aMat.length + "x" + aMat[0].length +
                                ", y is " + yMat.length + "x" + yMat[0].length);
                    }
                    int M = aMat.length;
                    int N = aMat[0].length;
                    Expr[][] result = new Expr[M][1];
                    for (int i = 0; i < M; i++) {
                        Expr sum = new Expr.BinOp('*', aMat[i][0], xMat[0][0]);
                        for (int k = 1; k < N; k++) {
                            sum = new Expr.BinOp('+', sum, new Expr.BinOp('*', aMat[i][k], xMat[k][0]));
                        }
                        result[i][0] = new Expr.BinOp('+', new Expr.BinOp('*', alpha, sum), new Expr.BinOp('*', beta, yMat[i][0]));
                    }
                    yield result;
                } else if (fn.equals("gemm")) {
                    if (args.size() != 5) {
                        throw new ParseException("gemm expects exactly 5 arguments: gemm(alpha, A, B, beta, C)");
                    }
                    Expr alpha = args.get(0);
                    Expr[][] aMat = compileMatrixExpr(args.get(1), ctx);
                    Expr[][] bMat = compileMatrixExpr(args.get(2), ctx);
                    Expr beta = args.get(3);
                    Expr[][] cMat = compileMatrixExpr(args.get(4), ctx);

                    if (aMat[0].length != bMat.length) {
                        throw new ParseException("gemm inner dimension mismatch: A is " + aMat.length + "x" + aMat[0].length +
                                ", B is " + bMat.length + "x" + bMat[0].length);
                    }
                    if (aMat.length != cMat.length || bMat[0].length != cMat[0].length) {
                        throw new ParseException("gemm output dimension mismatch: C must be " + aMat.length + "x" + bMat[0].length +
                                " (got " + cMat.length + "x" + cMat[0].length + ")");
                    }
                    int M = aMat.length;
                    int N = bMat[0].length;
                    int K = aMat[0].length;
                    Expr[][] result = new Expr[M][N];
                    for (int i = 0; i < M; i++) {
                        for (int j = 0; j < N; j++) {
                            Expr sum = new Expr.BinOp('*', aMat[i][0], bMat[0][j]);
                            for (int k = 1; k < K; k++) {
                                sum = new Expr.BinOp('+', sum, new Expr.BinOp('*', aMat[i][k], bMat[k][j]));
                            }
                            result[i][j] = new Expr.BinOp('+', new Expr.BinOp('*', alpha, sum), new Expr.BinOp('*', beta, cMat[i][j]));
                        }
                    }
                    yield result;
                } else if (fn.equals("ger")) {
                    if (args.size() != 4) {
                        throw new ParseException("ger expects exactly 4 arguments: ger(alpha, x, y, A)");
                    }
                    Expr alpha = args.get(0);
                    Expr[][] xMat = compileMatrixExpr(args.get(1), ctx);
                    Expr[][] yMat = compileMatrixExpr(args.get(2), ctx);
                    Expr[][] aMat = compileMatrixExpr(args.get(3), ctx);

                    if (xMat[0].length != 1) {
                        throw new ParseException("ger: x must be a column vector (got " + xMat.length + "x" + xMat[0].length + ")");
                    }
                    if (yMat[0].length != 1) {
                        throw new ParseException("ger: y must be a column vector (got " + yMat.length + "x" + yMat[0].length + ")");
                    }
                    if (aMat.length != xMat.length || aMat[0].length != yMat.length) {
                        throw new ParseException("ger dimension mismatch: A must be " + xMat.length + "x" + yMat.length +
                                " (got " + aMat.length + "x" + aMat[0].length + ")");
                    }
                    int M = aMat.length;
                    int N = aMat[0].length;
                    Expr[][] result = new Expr[M][N];
                    for (int i = 0; i < M; i++) {
                        for (int j = 0; j < N; j++) {
                            result[i][j] = new Expr.BinOp('+',
                                    new Expr.BinOp('*', alpha, new Expr.BinOp('*', xMat[i][0], yMat[j][0])),
                                    aMat[i][j]);
                        }
                    }
                    yield result;
                } else if (fn.equals("copy")) {
                    if (args.size() != 1) {
                        throw new ParseException("copy expects exactly 1 argument: copy(x)");
                    }
                    yield compileMatrixExpr(args.get(0), ctx);
                } else if (fn.equals("solvelinear")) {
                    if (args.size() != 2) {
                        throw new ParseException("solvelinear expects exactly 2 arguments: solvelinear(A, b)");
                    }
                    Expr[][] aMat = compileMatrixExpr(args.get(0), ctx);
                    Expr[][] bMat = compileMatrixExpr(args.get(1), ctx);
                    if (aMat.length != aMat[0].length) {
                        throw new ParseException("solvelinear requires square matrix A");
                    }
                    if (bMat.length != aMat.length || bMat[0].length != 1) {
                        throw new ParseException("solvelinear dimensions mismatch: A is " + aMat.length + "x" + aMat[0].length + ", b is " + bMat.length + "x" + bMat[0].length);
                    }
                    int M = aMat.length;

                    String tempVecName = "solvelinear_temp_" + ctx.out().size();
                    Expr[][] xMat = new Expr[M][1];
                    for (int i = 0; i < M; i++) {
                        String canonical = tempVecName + "[" + (i + 1) + "]";
                        xMat[i][0] = new Expr.Var(canonical);
                    }

                    for (int i = 0; i < M; i++) {
                        Expr term = new Expr.BinOp('*', aMat[i][0], xMat[0][0]);
                        for (int k = 1; k < M; k++) {
                            term = new Expr.BinOp('+', term, new Expr.BinOp('*', aMat[i][k], xMat[k][0]));
                        }
                        ctx.out().add(new Equation(term, bMat[i][0], "SolveLinear solve"));
                    }

                    yield xMat;
                } else {
                    throw new ParseException("Unsupported matrix function: " + function);
                }
            }
            default -> new Expr[][] { { expandExpr(e, loopVars, constants, displayNames, defs) } };
        };
    }
}
