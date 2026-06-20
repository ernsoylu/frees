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

import com.frees.backend.cas.CasEngine;
import com.frees.backend.cas.CasIdentity;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.atomic.AtomicInteger;


/**
 * Parses frees source text into a list of equations using the ANTLR-generated
 * lexer/parser and an AST-building visitor.
 */
public final class EquationParser {

    private static final String FN_INVERSE = "inverse";
    private static final String FN_DETERMINANT = "determinant";
    private static final String FN_TRANSPOSE = "transpose";
    private static final String FN_SOLVELINEAR = "solvelinear";
    private static final String FN_ZEROS = "zeros";
    private static final String FN_IDENTITY = "identity";
    private static final String FN_LINSPACE = "linspace";

    /** Largest span a single FOR loop or array range (1:N) may expand to, and
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
            List<com.frees.backend.ast.PlotDef> plots,
            List<com.frees.backend.ast.StateTableDef> stateTables,
            List<com.frees.backend.ast.DynamicSystem> dynamicSystems) {

        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames,
                           java.util.Map<String, ProcDef> defs,
                           List<com.frees.backend.ast.ParametricTable> parametricTables,
                           List<com.frees.backend.ast.PlotDef> plots,
                           List<com.frees.backend.ast.StateTableDef> stateTables) {
            this(equations, displayNames, defs, parametricTables, plots, stateTables, List.of());
        }

        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames,
                           java.util.Map<String, ProcDef> defs,
                           List<com.frees.backend.ast.ParametricTable> parametricTables,
                           List<com.frees.backend.ast.PlotDef> plots) {
            this(equations, displayNames, defs, parametricTables, plots, List.of(), List.of());
        }

        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames,
                           java.util.Map<String, ProcDef> defs,
                           List<com.frees.backend.ast.ParametricTable> parametricTables) {
            this(equations, displayNames, defs, parametricTables, List.of(), List.of(), List.of());
        }

        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames,
                           java.util.Map<String, ProcDef> defs) {
            this(equations, displayNames, defs, List.of(), List.of(), List.of(), List.of());
        }

        /** Backward-compat constructor for callers that don't need defs. */
        public ParseResult(List<Equation> equations, java.util.Map<String, String> displayNames) {
            this(equations, displayNames, Map.of(), List.of(), List.of(), List.of(), List.of());
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
        Set<String> symbolicVars = collectSymbolic(statements);
        flatten(statements, new HashMap<>(), constants, displayNames, equations, defs, moduleCounter, symbolicVars);

        // String variables (R$ = 'R134a') are compile-time constants:
        // substitute their values and drop the definition equations.
        equations = StringVariables.resolve(equations, displayNames);

        return new ParseResult(equations, displayNames, defs, programResult.parametricTables(),
                programResult.plots(), programResult.stateTables(), programResult.dynamicSystems());
    }

    public static String toLatexEquation(String eqStr, Map<String, String> displayNames) {
        try {
            CollectingErrorListener errorListener = new CollectingErrorListener();
            FreesLexer lexer = new FreesLexer(CharStreams.fromString(eqStr));
            lexer.removeErrorListeners();
            lexer.addErrorListener(errorListener);

            FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
            parser.removeErrorListeners();
            parser.addErrorListener(errorListener);

            FreesParser.EquationContext eqCtx = parser.equation();
            if (!errorListener.errors.isEmpty()) {
                return eqStr;
            }

            AstBuilder builder = new AstBuilder();
            Statement.Eq eq = builder.buildEquation(eqCtx);

            Expr lhs = com.frees.backend.cas.TransferFunction.expandCalls(eq.lhs(), "s");
            Expr rhs = com.frees.backend.cas.TransferFunction.expandCalls(eq.rhs(), "s");

            return LatexConverter.toLatex(lhs, displayNames) + " = " + LatexConverter.toLatex(rhs, displayNames);
        } catch (Exception ex) {
            return eqStr;
        }
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
                                  // resolves to the explicit A[1:r,1:c] form.
                                  Map<String, int[]> shapes,
                                  // Independent symbolic variables declared with SYMBOLIC;
                                  // equations involving one are treated as CAS identities.
                                  Set<String> symbolicVars) {}

    private static void registerShape(String name, int rows, int cols, FlattenContext ctx) {
        ctx.shapes().put(name.toLowerCase(), new int[]{rows, cols});
    }

    private static Expr rangeAccess(String name, int[] shape) {
        List<Expr> idx = new ArrayList<>();
        if (shape[0] == 1 || shape[1] == 1) { // vector: single 1:n index
            int n = Math.max(shape[0], shape[1]);
            idx.add(new Expr.Range(new Expr.Num(1), new Expr.Num(n)));
        } else {
            idx.add(new Expr.Range(new Expr.Num(1), new Expr.Num(shape[0])));
            idx.add(new Expr.Range(new Expr.Num(1), new Expr.Num(shape[1])));
        }
        return new Expr.ArrayAccess(name, idx);
    }

    /** Rewrites bare references to a registered matrix/vector variable into the
     * explicit A[1:r,1:c] form, so MATLAB-style bare names work in operations. */
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
     * return the explicit v[1:size] form; otherwise return it unchanged. */
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
                         AtomicInteger moduleCounter, Set<String> symbolicVars) {
        FlattenContext ctx = new FlattenContext(loopVars, constants, displayNames, out, defs, moduleCounter,
                new HashMap<>(), symbolicVars);
        for (Statement stmt : statements) {
            switch (stmt) {
                case Statement.For(String varName, Expr start, Expr end, List<Statement> body) ->
                    flattenFor(varName, start, end, body, ctx);
                case Statement.Eq(Expr lhs, Expr rhs, String sourceText) ->
                    flattenEq(lhs, rhs, sourceText, ctx);
                case Statement.CallProc(String name, List<Expr> inputs, List<Expr> outputs, String sourceText) ->
                    flattenCallProc(name, inputs, outputs, sourceText, ctx);
                case Statement.Symbolic ignored -> {
                    // Declaration only; the names are pre-collected into symbolicVars.
                }
            }
        }
    }

    /** Recursively gathers all SYMBOLIC-declared variable names (lowercased). */
    private static Set<String> collectSymbolic(List<Statement> statements) {
        Set<String> names = new HashSet<>();
        for (Statement s : statements) {
            if (s instanceof Statement.Symbolic sym) {
                names.addAll(sym.names());
            } else if (s instanceof Statement.For f) {
                names.addAll(collectSymbolic(f.body()));
            }
        }
        return names;
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
            flatten(body, newLoopVars, ctx.constants(), ctx.displayNames(), ctx.out(), ctx.defs(), ctx.moduleCounter(), ctx.symbolicVars());
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
        // An equation that involves a SYMBOLIC variable is a CAS identity: solve
        // it for the remaining coefficients (e.g. partial-fraction residues)
        // rather than treating the symbolic variable as a numeric unknown.
        String symbolicVar = identityVariable(lhs, rhs, ctx);
        if (symbolicVar != null) {
            flattenIdentity(lhs, rhs, symbolicVar, sourceText, ctx);
            return;
        }

        // Rewrite bare references to known matrix/vector variables (e.g. the A, b
        // in SolveLinear(A, b)) into their explicit A[1:r,1:c] form.
        lhs = resolveShapes(lhs, ctx);
        rhs = resolveShapes(rhs, ctx);

        // Dedicated matrix-function handlers run first: they write the output
        // directly (no helper temp variable leaks into the solution).
        if (tryFlattenMatrixFunction(lhs, rhs, sourceText, ctx)) {
            return;
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
            flattenMatrixAssignment(lhs, rhs, sourceText, ctx);
        } else {
            Expr expandedLhs = expandExpr(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr expandedRhs = expandExpr(rhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            ctx.out().add(new Equation(expandedLhs, expandedRhs, sourceText));
        }
    }

    /**
     * Returns the single SYMBOLIC variable appearing in this equation, or null
     * if none do. Throws if more than one symbolic variable is present, since an
     * identity is solved with respect to one independent variable.
     */
    private String identityVariable(Expr lhs, Expr rhs, FlattenContext ctx) {
        if (ctx.symbolicVars().isEmpty()) {
            return null;
        }
        Set<String> present = new TreeSet<>(lhs.variables());
        present.addAll(rhs.variables());
        present.retainAll(ctx.symbolicVars());
        if (present.isEmpty()) {
            return null;
        }
        if (present.size() > 1) {
            throw new ParseException(
                    "An identity may involve only one SYMBOLIC variable, but found: " + present);
        }
        return present.iterator().next();
    }

    /**
     * Solves a CAS identity (an equation that must hold for all values of the
     * symbolic variable) for its coefficients and emits each as a concrete
     * {@code name = value} equation so the regular solver reports it.
     */
    private void flattenIdentity(Expr lhs, Expr rhs, String symbolicVar, String sourceText, FlattenContext ctx) {
        Map<String, Double> coeffs;
        try {
            coeffs = CasIdentity.solveCoefficients(lhs, rhs, symbolicVar);
        } catch (CasEngine.CasException e) {
            throw new ParseException(e.getMessage());
        }
        for (Map.Entry<String, Double> entry : coeffs.entrySet()) {
            ctx.out().add(new Equation(new Expr.Var(entry.getKey()),
                    new Expr.Num(entry.getValue()), sourceText));
        }
    }

    /** Routes {@code lhs = f(args)} to a dedicated matrix-function handler when
     *  {@code f} is one (inverse/transpose/dot/norm/det/cross/solvelinear).
     *  Returns true when handled. */
    private boolean tryFlattenMatrixFunction(Expr lhs, Expr rhs, String sourceText, FlattenContext ctx) {
        if (!(rhs instanceof Expr.Call(String function, List<Expr> args))) {
            return false;
        }
        String func = switch (function.toLowerCase()) {
            case "inv" -> FN_INVERSE;          // MATLAB aliases
            case "det" -> FN_DETERMINANT;
            default -> function.toLowerCase();
        };
        if (func.equals(FN_INVERSE) || func.equals(FN_TRANSPOSE)) {
            flattenMatrixTransform(func, lhs, args.get(0), sourceText, ctx);
            return true;
        }
        if (func.equals("dot") || func.equals("norm") || func.equals("nrm2") || func.equals(FN_DETERMINANT) || func.equals("asum")) {
            flattenVectorOrDet(func, lhs, args, sourceText, ctx);
            return true;
        }
        if (func.equals("cross")) {
            flattenCrossProduct(lhs, args, sourceText, ctx);
            return true;
        }
        if (func.equals(FN_SOLVELINEAR)) {
            flattenSolveLinear(lhs, args, sourceText, ctx);
            return true;
        }
        return false;
    }

    /** Compiles a general matrix/elementwise assignment into per-element equations. */
    private void flattenMatrixAssignment(Expr lhs, Expr rhs, String sourceText, FlattenContext ctx) {
        Expr[][] lhsMat = compileMatrixExpr(lhs, ctx);
        Expr[][] rhsMat = compileMatrixExpr(rhs, ctx);
        // Remember an explicitly-dimensioned LHS (A[1:r,1:c] = ...) so a
        // later bare reference to it resolves.
        if (lhs instanceof Expr.ArrayAccess(String ln, List<Expr> li) && !li.isEmpty()) {
            registerShape(ln, lhsMat.length, lhsMat[0].length, ctx);
        }
        rhsMat = conformRhsToLhs(lhsMat, rhsMat);
        for (int i = 0; i < lhsMat.length; i++) {
            for (int j = 0; j < lhsMat[0].length; j++) {
                ctx.out().add(new Equation(lhsMat[i][j], rhsMat[i][j], sourceText));
            }
        }
    }

    /** Broadcasts a scalar RHS to the LHS shape, transposes a flipped row/column
     *  vector, or throws on a genuine dimension mismatch. */
    private static Expr[][] conformRhsToLhs(Expr[][] lhsMat, Expr[][] rhsMat) {
        if (rhsMat.length == 1 && rhsMat[0].length == 1) {
            Expr scalarVal = rhsMat[0][0];
            Expr[][] out = new Expr[lhsMat.length][lhsMat[0].length];
            for (int i = 0; i < lhsMat.length; i++) {
                for (int j = 0; j < lhsMat[0].length; j++) {
                    out[i][j] = scalarVal;
                }
            }
            return out;
        }
        if (lhsMat.length == rhsMat.length && lhsMat[0].length == rhsMat[0].length) {
            return rhsMat;
        }
        if (lhsMat.length == rhsMat[0].length && lhsMat[0].length == rhsMat.length && (lhsMat.length == 1 || lhsMat[0].length == 1)) {
            Expr[][] transposedRhs = new Expr[lhsMat.length][lhsMat[0].length];
            for (int i = 0; i < lhsMat.length; i++) {
                for (int j = 0; j < lhsMat[0].length; j++) {
                    transposedRhs[i][j] = rhsMat[j][i];
                }
            }
            return transposedRhs;
        }
        throw new ParseException("Matrix assignment dimension mismatch: LHS is " +
                lhsMat.length + "x" + lhsMat[0].length + ", but RHS is " +
                rhsMat.length + "x" + rhsMat[0].length);
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
        int outRows = func.equals(FN_TRANSPOSE) ? rhsMat.cols : rhsMat.rows;
        int outCols = func.equals(FN_TRANSPOSE) ? rhsMat.rows : rhsMat.cols;
        lhs = explicitMatrixOutput(lhs, outRows, outCols, ctx);
        MatrixInfo lhsMat = parseMatrixInfo(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (func.equals(FN_TRANSPOSE)) {
            emitTransposeEquations(lhsMat, rhsMat, sourceText, ctx);
        } else { // func is FN_INVERSE — the only other transform routed here
            emitInverseEquations(lhsMat, rhsMat, sourceText, ctx);
        }
    }

    private void emitTransposeEquations(MatrixInfo lhsMat, MatrixInfo rhsMat, String sourceText, FlattenContext ctx) {
        if (lhsMat.rows != rhsMat.cols || lhsMat.cols != rhsMat.rows) {
            throw new ParseException("Dimension mismatch for Transpose: LHS is " + lhsMat.rows + "x" + lhsMat.cols + ", RHS is " + rhsMat.cols + "x" + rhsMat.rows);
        }
        for (int i = 0; i < lhsMat.rows; i++) {
            for (int j = 0; j < lhsMat.cols; j++) {
                ctx.out().add(new Equation(lhsMat.elements[i][j], rhsMat.elements[j][i], sourceText));
            }
        }
    }

    /** Emits the defining equations of an inverse: (RHS · LHS)[i,j] = δ(i,j). */
    private void emitInverseEquations(MatrixInfo lhsMat, MatrixInfo rhsMat, String sourceText, FlattenContext ctx) {
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
                ctx.out().add(new Equation(sum, new Expr.Num(kroneckerDelta(i, j)), sourceText));
            }
        }
    }

    /** Kronecker delta: 1 on the diagonal (matching indices), 0 off it — the entries of the identity matrix. */
    private static double kroneckerDelta(int a, int b) {
        return a == b ? 1.0 : 0.0;
    }

    private void flattenVectorOrDet(String func, Expr lhs, List<Expr> args, String sourceText, FlattenContext ctx) {
        Expr expandedLhs = expandExpr(lhs, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr rhs = switch (func) {
            case "dot" -> dotProduct(args, ctx);
            case "norm", "nrm2" -> vectorNorm(args, ctx);
            case "asum" -> vectorAbsSum(args, ctx);
            case FN_DETERMINANT -> matrixDeterminant(args, ctx);
            default -> throw new ParseException("Unsupported vector/scalar function: " + func);
        };
        ctx.out().add(new Equation(expandedLhs, rhs, sourceText));
    }

    private Expr dotProduct(List<Expr> args, FlattenContext ctx) {
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
        return sum;
    }

    private Expr vectorNorm(List<Expr> args, FlattenContext ctx) {
        VectorInfo v = parseVectorInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr sumSq = null;
        for (int i = 0; i < v.size; i++) {
            Expr term = new Expr.BinOp('*', v.elements[i], v.elements[i]);
            sumSq = sumSq == null ? term : new Expr.BinOp('+', sumSq, term);
        }
        return new Expr.Call("sqrt", List.of(sumSq));
    }

    private Expr vectorAbsSum(List<Expr> args, FlattenContext ctx) {
        VectorInfo v = parseVectorInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr sumAbs = null;
        for (int i = 0; i < v.size; i++) {
            Expr term = new Expr.Call("abs", List.of(v.elements[i]));
            sumAbs = sumAbs == null ? term : new Expr.BinOp('+', sumAbs, term);
        }
        return sumAbs;
    }

    private Expr matrixDeterminant(List<Expr> args, FlattenContext ctx) {
        MatrixInfo m = parseMatrixInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (m.rows != m.cols) {
            throw new ParseException("Determinant requires a square matrix.");
        }
        return expandDeterminant(m.elements);
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
        List<Expr> resolvedInputs = new ArrayList<>();
        for (Expr input : inputs) {
            resolvedInputs.add(resolveShapes(input, ctx));
        }
        List<Expr> resolvedOutputs = new ArrayList<>();
        for (Expr output : outputs) {
            resolvedOutputs.add(resolveShapes(output, ctx));
        }
        inputs = resolvedInputs;
        outputs = resolvedOutputs;

        if (defName.equals("eigenvalues") || defName.equals("eigen")) {
            flattenEigen(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ludecompose") || defName.equals("eulerdecompose") || defName.equals("eulerrotate")) {
            flattenDecomposeOrRotate(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ss2tf")) {
            flattenSs2tf(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("tf2ss")) {
            flattenTf2ss(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("zp2tf")) {
            flattenZp2tf(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("tf2zp")) {
            flattenTf2zp(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("series")) {
            if (inputs.size() == 8) {
                flattenSsSeries(inputs, outputs, sourceText, ctx);
            } else {
                flattenSeries(inputs, outputs, sourceText, ctx);
            }
            return;
        }
        if (defName.equals("parallel")) {
            if (inputs.size() == 8) {
                flattenSsParallel(inputs, outputs, sourceText, ctx);
            } else {
                flattenParallel(inputs, outputs, sourceText, ctx);
            }
            return;
        }
        if (defName.equals("feedback")) {
            if (inputs.size() == 8 || inputs.size() == 9) {
                flattenSsFeedback(inputs, outputs, sourceText, ctx);
            } else {
                flattenFeedback(inputs, outputs, sourceText, ctx);
            }
            return;
        }
        if (defName.equals("pole")) {
            flattenPole(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("zero")) {
            flattenZero(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("bode")) {
            flattenBode(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("nyquist")) {
            flattenNyquist(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("margin")) {
            flattenMargin(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("step") || defName.equals("impulse")) {
            flattenTimeResponse(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("lsim")) {
            flattenLsim(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("lqr")) {
            flattenLqr(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("place")) {
            flattenPlace(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("pidtune")) {
            flattenPidtune(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("rank")) {
            flattenRank(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ctrb")) {
            flattenCtrb(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("obsv")) {
            flattenObsv(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ss2ss")) {
            flattenSs2ss(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("stepinfo")) {
            flattenStepInfo(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("pade")) {
            flattenPade(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("rlocus")) {
            flattenRlocus(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("routh")) {
            flattenRouth(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("c2d") || defName.equals("d2c")) {
            flattenDiscretize(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("residue")) {
            flattenResidue(inputs, outputs, sourceText, ctx);
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

    private void flattenRank(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 1) {
            throw new ParseException("rank expects 1 input (M) and 1 output (r), e.g. CALL rank(M[1:3,1:3] : r)");
        }
        MatrixInfo m = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int rows = m.rows;
        int cols = m.cols;
        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < rows; i++) {
            entries.addAll(Arrays.asList(m.elements[i]));
        }
        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("rank$" + rows + "$" + cols, entries), sourceText));
    }

    private void flattenCtrb(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 1) {
            throw new ParseException("ctrb expects 2 inputs (A, B) and 1 output (Ctrb), e.g. CALL ctrb(A, B : Ctrb)");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new ParseException("ctrb: A must be square");
        }
        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        MatrixInfo ctrb = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (ctrb.rows != n || ctrb.cols != n) {
            throw new ParseException("ctrb: Output Ctrb must be " + n + "x" + n);
        }
        registerShape(ctrb.name, n, n, ctx);
        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(bElements);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(ctrb.elements[i][j],
                        new Expr.Call("ctrb$" + i + "$" + j + "$" + n + "$1", entries), sourceText));
            }
        }
    }

    private void flattenObsv(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 1) {
            throw new ParseException("obsv expects 2 inputs (A, C) and 1 output (Obsv), e.g. CALL obsv(A, C : Obsv)");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new ParseException("obsv: A must be square");
        }
        List<Expr> cElements = getVectorElements(inputs.get(1), n, ctx);
        MatrixInfo obsv = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (obsv.rows != n || obsv.cols != n) {
            throw new ParseException("obsv: Output Obsv must be " + n + "x" + n);
        }
        registerShape(obsv.name, n, n, ctx);
        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(cElements);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(obsv.elements[i][j],
                        new Expr.Call("obsv$" + i + "$" + j + "$" + n + "$1", entries), sourceText));
            }
        }
    }

    private void flattenSs2ss(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 5 || outputs.size() != 4) {
            throw new ParseException("ss2ss expects 5 inputs (A, B, C, D, P) and 4 outputs (An, Bn, Cn, Dn), "
                    + "e.g. CALL ss2ss(A, B, C, D, P : An, Bn, Cn, Dn)");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) throw new ParseException("ss2ss: A must be square");
        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        List<Expr> cElements = getVectorElements(inputs.get(2), n, ctx);
        Expr d = getScalarElement(inputs.get(3), ctx);
        MatrixInfo transform = parseMatrixInfo(inputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (transform.rows != n || transform.cols != n) {
            throw new ParseException("ss2ss: transform matrix P must be " + n + "x" + n);
        }
        MatrixInfo an = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (an.rows != n || an.cols != n) throw new ParseException("ss2ss: An must be " + n + "x" + n);
        List<Expr> bnElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cnElements = getVectorElements(outputs.get(2), n, ctx);
        Expr dn = getScalarElement(outputs.get(3), ctx);

        registerShape(an.name, n, n, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) entries.addAll(Arrays.asList(a.elements[i]));
        entries.addAll(bElements);
        entries.addAll(cElements);
        entries.add(d);
        for (int i = 0; i < n; i++) entries.addAll(Arrays.asList(transform.elements[i]));

        String suffix = "$" + n + "$1$1"; // m=1, p=1
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(an.elements[i][j],
                        new Expr.Call("ss2ss$a$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(bnElements.get(i),
                    new Expr.Call("ss2ss$b$" + i + "$0" + suffix, entries), sourceText));
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(cnElements.get(i),
                    new Expr.Call("ss2ss$c$" + i + "$0" + suffix, entries), sourceText));
        }
        ctx.out().add(new Equation(dn, new Expr.Call("ss2ss$d" + suffix, entries), sourceText));
    }

    private void flattenSs2tf(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 2) {
            throw new ParseException("ss2tf expects 4 inputs (A, B, C, D) and 2 outputs (num, den), "
                    + "e.g. CALL ss2tf(A[1:2,1:2], B[1:2], C[1:2], D : num[1:3], den[1:3])");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new ParseException("ss2tf: A must be square (got " + a.rows + "x" + a.cols + ")");
        }

        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
        Expr dElement = getScalarElement(inputs.get(3), ctx);

        // Serialize entries in the order the Evaluator reconstructs them:
        // A row-major, then B, then C, then D.
        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(bElements);
        entries.addAll(cElements);
        entries.add(dElement);

        VectorInfo num = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != n + 1 || den.size != n + 1) {
            throw new ParseException("ss2tf: num and den outputs must each have length n+1 = " + (n + 1)
                    + " (e.g. num[1:" + (n + 1) + "], den[1:" + (n + 1) + "])");
        }
        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n + 1, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n + 1, 1, ctx);
        }
        for (int k = 0; k < n + 1; k++) {
            ctx.out().add(new Equation(num.elements[k],
                    new Expr.Call("ss2tf$num$" + k + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(den.elements[k],
                    new Expr.Call("ss2tf$den$" + k + "$" + n, entries), sourceText));
        }
    }

    private void flattenTf2ss(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 4) {
            throw new ParseException("tf2ss expects 2 inputs (num, den) and 4 outputs (A, B, C, D), "
                    + "e.g. CALL tf2ss(num[1:3], den[1:3] : A[1:2,1:2], B[1:2], C[1:2], D)");
        }
        VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != den.size) {
            throw new ParseException("tf2ss: num and den must have the same length");
        }
        int np = den.size;
        int n = np - 1;

        MatrixInfo a = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (a.rows != n || a.cols != n) {
            throw new ParseException("tf2ss: A must be n x n = " + n + "x" + n);
        }
        List<Expr> bElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cElements = getRowVectorElements(outputs.get(2), n, ctx);
        Expr dElement = getScalarElement(outputs.get(3), ctx);

        registerShape(a.name, a.rows, a.cols, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(a.elements[i][j],
                        new Expr.Call("tf2ss$a$" + i + "$" + j + "$" + n, entries), sourceText));
            }
            ctx.out().add(new Equation(bElements.get(i),
                    new Expr.Call("tf2ss$b$" + i + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(cElements.get(i),
                    new Expr.Call("tf2ss$c$" + i + "$" + n, entries), sourceText));
        }
        ctx.out().add(new Equation(dElement,
                new Expr.Call("tf2ss$d$" + n, entries), sourceText));
    }

    private void flattenZp2tf(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 5 || outputs.size() != 2) {
            throw new ParseException("zp2tf expects 5 inputs (z_r, z_i, p_r, p_i, k) and 2 outputs (num, den), "
                    + "e.g. CALL zp2tf(z_r[1:2], z_i[1:2], p_r[1:2], p_i[1:2], k : num[1:3], den[1:3])");
        }
        VectorInfo zr = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo zi = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo pr = parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo pi = parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr kExpr = getScalarElement(inputs.get(4), ctx);

        if (zr.size != zi.size) {
            throw new ParseException("zp2tf: z_r and z_i must have the same length");
        }
        if (pr.size != pi.size) {
            throw new ParseException("zp2tf: p_r and p_i must have the same length");
        }

        int nz = zr.size;
        int np = pr.size;

        VectorInfo num = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num.size != np + 1 || den.size != np + 1) {
            throw new ParseException("zp2tf: num and den must have length np + 1 = " + (np + 1));
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), np + 1, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), np + 1, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(zr.elements));
        entries.addAll(Arrays.asList(zi.elements));
        entries.addAll(Arrays.asList(pr.elements));
        entries.addAll(Arrays.asList(pi.elements));
        entries.add(kExpr);

        for (int i = 0; i <= np; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call("zp2tf$num$" + i + "$" + nz + "$" + np, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call("zp2tf$den$" + i + "$" + nz + "$" + np, entries), sourceText));
        }
    }

    private void flattenTf2zp(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 5) {
            throw new ParseException("tf2zp expects 2 inputs (num, den) and 5 outputs (z_r, z_i, p_r, p_i, k), "
                    + "e.g. CALL tf2zp(num[1:3], den[1:3] : z_r[1:2], z_i[1:2], p_r[1:2], p_i[1:2], k)");
        }
        VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        int np = den.size - 1; // denominator degree

        VectorInfo zr = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo zi = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo pr = parseVectorInfo(outputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo pi = parseVectorInfo(outputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr kExpr = getScalarElement(outputs.get(4), ctx);

        if (zr.size != zi.size) {
            throw new ParseException("tf2zp: z_r and z_i outputs must have the same length");
        }
        if (pr.size != pi.size) {
            throw new ParseException("tf2zp: p_r and p_i outputs must have the same length");
        }

        int nz = zr.size;
        if (pr.size != np) {
            throw new ParseException("tf2zp: p_r/p_i length must match denominator degree np = " + np);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), nz, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), nz, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), np, 1, ctx);
        }
        if (outputs.get(3) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), np, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        for (int i = 0; i < nz; i++) {
            ctx.out().add(new Equation(zr.elements[i],
                    new Expr.Call("tf2zp$zr$" + i + "$" + nz + "$" + np, entries), sourceText));
            ctx.out().add(new Equation(zi.elements[i],
                    new Expr.Call("tf2zp$zi$" + i + "$" + nz + "$" + np, entries), sourceText));
        }
        for (int i = 0; i < np; i++) {
            ctx.out().add(new Equation(pr.elements[i],
                    new Expr.Call("tf2zp$pr$" + i + "$" + nz + "$" + np, entries), sourceText));
            ctx.out().add(new Equation(pi.elements[i],
                    new Expr.Call("tf2zp$pi$" + i + "$" + nz + "$" + np, entries), sourceText));
        }
        ctx.out().add(new Equation(kExpr,
                new Expr.Call("tf2zp$k$" + nz + "$" + np, entries), sourceText));
    }

    private void flattenSeries(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 2) {
            throw new ParseException("series expects 4 inputs (num1, den1, num2, den2) and 2 outputs (num, den), "
                    + "e.g. CALL series(num1[1:2], den1[1:2], num2[1:2], den2[1:2] : num[1:3], den[1:3])");
        }
        VectorInfo num1 = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den1 = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo num2 = parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den2 = parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num1.size != den1.size) {
            throw new ParseException("series: num1 and den1 must have the same length");
        }
        if (num2.size != den2.size) {
            throw new ParseException("series: num2 and den2 must have the same length");
        }

        int L1 = num1.size;
        int L2 = num2.size;
        int expectedLen = L1 + L2 - 1;

        VectorInfo num = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num.size != expectedLen || den.size != expectedLen) {
            throw new ParseException("series: outputs num and den must have length L1 + L2 - 1 = " + expectedLen);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), expectedLen, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), expectedLen, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num1.elements));
        entries.addAll(Arrays.asList(den1.elements));
        entries.addAll(Arrays.asList(num2.elements));
        entries.addAll(Arrays.asList(den2.elements));

        for (int i = 0; i < expectedLen; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call("series$num$" + i + "$" + L1 + "$" + L2, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call("series$den$" + i + "$" + L1 + "$" + L2, entries), sourceText));
        }
    }

    private void flattenParallel(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 2) {
            throw new ParseException("parallel expects 4 inputs (num1, den1, num2, den2) and 2 outputs (num, den), "
                    + "e.g. CALL parallel(num1[1:2], den1[1:2], num2[1:2], den2[1:2] : num[1:3], den[1:3])");
        }
        VectorInfo num1 = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den1 = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo num2 = parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den2 = parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num1.size != den1.size) {
            throw new ParseException("parallel: num1 and den1 must have the same length");
        }
        if (num2.size != den2.size) {
            throw new ParseException("parallel: num2 and den2 must have the same length");
        }

        int L1 = num1.size;
        int L2 = num2.size;
        int expectedLen = L1 + L2 - 1;

        VectorInfo num = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num.size != expectedLen || den.size != expectedLen) {
            throw new ParseException("parallel: outputs num and den must have length L1 + L2 - 1 = " + expectedLen);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), expectedLen, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), expectedLen, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num1.elements));
        entries.addAll(Arrays.asList(den1.elements));
        entries.addAll(Arrays.asList(num2.elements));
        entries.addAll(Arrays.asList(den2.elements));

        for (int i = 0; i < expectedLen; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call("parallel$num$" + i + "$" + L1 + "$" + L2, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call("parallel$den$" + i + "$" + L1 + "$" + L2, entries), sourceText));
        }
    }

    private void flattenFeedback(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 4 && inputs.size() != 5) || outputs.size() != 2) {
            throw new ParseException("feedback expects 4 or 5 inputs (num1, den1, num2, den2, [sign]) and 2 outputs (num, den), "
                    + "e.g. CALL feedback(num1[1:2], den1[1:2], num2[1:2], den2[1:2] : num[1:3], den[1:3])");
        }
        VectorInfo num1 = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den1 = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo num2 = parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den2 = parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        Expr signExpr = (inputs.size() == 5) ? getScalarElement(inputs.get(4), ctx) : new Expr.Num(1.0);

        if (num1.size != den1.size) {
            throw new ParseException("feedback: num1 and den1 must have the same length");
        }
        if (num2.size != den2.size) {
            throw new ParseException("feedback: num2 and den2 must have the same length");
        }

        int L1 = num1.size;
        int L2 = num2.size;
        int expectedLen = L1 + L2 - 1;

        VectorInfo num = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        if (num.size != expectedLen || den.size != expectedLen) {
            throw new ParseException("feedback: outputs num and den must have length L1 + L2 - 1 = " + expectedLen);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), expectedLen, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), expectedLen, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num1.elements));
        entries.addAll(Arrays.asList(den1.elements));
        entries.addAll(Arrays.asList(num2.elements));
        entries.addAll(Arrays.asList(den2.elements));
        entries.add(signExpr);

        for (int i = 0; i < expectedLen; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call("feedback$num$" + i + "$" + L1 + "$" + L2, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call("feedback$den$" + i + "$" + L1 + "$" + L2, entries), sourceText));
        }
    }

    private void flattenSsSeries(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 8 || outputs.size() != 4) {
            throw new ParseException("series for state-space expects 8 inputs (A1, B1, C1, D1, A2, B2, C2, D2) and 4 outputs (A, B, C, D)");
        }
        MatrixInfo a1 = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n1 = a1.rows;
        if (a1.cols != n1) throw new ParseException("series: A1 must be square");
        List<Expr> b1Elements = getVectorElements(inputs.get(1), n1, ctx);
        List<Expr> c1Elements = getVectorElements(inputs.get(2), n1, ctx);
        Expr d1 = getScalarElement(inputs.get(3), ctx);

        MatrixInfo a2 = parseMatrixInfo(inputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n2 = a2.rows;
        if (a2.cols != n2) throw new ParseException("series: A2 must be square");
        List<Expr> b2Elements = getVectorElements(inputs.get(5), n2, ctx);
        List<Expr> c2Elements = getVectorElements(inputs.get(6), n2, ctx);
        Expr d2 = getScalarElement(inputs.get(7), ctx);

        int n = n1 + n2;
        MatrixInfo an = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (an.rows != n || an.cols != n) throw new ParseException("series: Output A must be " + n + "x" + n);
        List<Expr> bnElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cnElements = getVectorElements(outputs.get(2), n, ctx);
        Expr dn = getScalarElement(outputs.get(3), ctx);

        registerShape(an.name, n, n, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n1; i++) entries.addAll(Arrays.asList(a1.elements[i]));
        entries.addAll(b1Elements);
        entries.addAll(c1Elements);
        entries.add(d1);
        for (int i = 0; i < n2; i++) entries.addAll(Arrays.asList(a2.elements[i]));
        entries.addAll(b2Elements);
        entries.addAll(c2Elements);
        entries.add(d2);

        String suffix = "$" + n1 + "$" + n2;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(an.elements[i][j],
                        new Expr.Call("ss_series$a$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(bnElements.get(i),
                    new Expr.Call("ss_series$b$" + i + "$0" + suffix, entries), sourceText));
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(cnElements.get(i),
                    new Expr.Call("ss_series$c$" + i + "$0" + suffix, entries), sourceText));
        }
        ctx.out().add(new Equation(dn, new Expr.Call("ss_series$d" + suffix, entries), sourceText));
    }

    private void flattenSsParallel(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 8 || outputs.size() != 4) {
            throw new ParseException("parallel for state-space expects 8 inputs (A1, B1, C1, D1, A2, B2, C2, D2) and 4 outputs (A, B, C, D)");
        }
        MatrixInfo a1 = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n1 = a1.rows;
        if (a1.cols != n1) throw new ParseException("parallel: A1 must be square");
        List<Expr> b1Elements = getVectorElements(inputs.get(1), n1, ctx);
        List<Expr> c1Elements = getVectorElements(inputs.get(2), n1, ctx);
        Expr d1 = getScalarElement(inputs.get(3), ctx);

        MatrixInfo a2 = parseMatrixInfo(inputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n2 = a2.rows;
        if (a2.cols != n2) throw new ParseException("parallel: A2 must be square");
        List<Expr> b2Elements = getVectorElements(inputs.get(5), n2, ctx);
        List<Expr> c2Elements = getVectorElements(inputs.get(6), n2, ctx);
        Expr d2 = getScalarElement(inputs.get(7), ctx);

        int n = n1 + n2;
        MatrixInfo an = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (an.rows != n || an.cols != n) throw new ParseException("parallel: Output A must be " + n + "x" + n);
        List<Expr> bnElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cnElements = getVectorElements(outputs.get(2), n, ctx);
        Expr dn = getScalarElement(outputs.get(3), ctx);

        registerShape(an.name, n, n, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n1; i++) entries.addAll(Arrays.asList(a1.elements[i]));
        entries.addAll(b1Elements);
        entries.addAll(c1Elements);
        entries.add(d1);
        for (int i = 0; i < n2; i++) entries.addAll(Arrays.asList(a2.elements[i]));
        entries.addAll(b2Elements);
        entries.addAll(c2Elements);
        entries.add(d2);

        String suffix = "$" + n1 + "$" + n2;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(an.elements[i][j],
                        new Expr.Call("ss_parallel$a$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(bnElements.get(i),
                    new Expr.Call("ss_parallel$b$" + i + "$0" + suffix, entries), sourceText));
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(cnElements.get(i),
                    new Expr.Call("ss_parallel$c$" + i + "$0" + suffix, entries), sourceText));
        }
        ctx.out().add(new Equation(dn, new Expr.Call("ss_parallel$d" + suffix, entries), sourceText));
    }

    private void flattenSsFeedback(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 8 && inputs.size() != 9) || outputs.size() != 4) {
            throw new ParseException("feedback for state-space expects 8 or 9 inputs (A1, B1, C1, D1, A2, B2, C2, D2 [, sign]) and 4 outputs (A, B, C, D)");
        }
        MatrixInfo a1 = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n1 = a1.rows;
        if (a1.cols != n1) throw new ParseException("feedback: A1 must be square");
        List<Expr> b1Elements = getVectorElements(inputs.get(1), n1, ctx);
        List<Expr> c1Elements = getVectorElements(inputs.get(2), n1, ctx);
        Expr d1 = getScalarElement(inputs.get(3), ctx);

        MatrixInfo a2 = parseMatrixInfo(inputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n2 = a2.rows;
        if (a2.cols != n2) throw new ParseException("feedback: A2 must be square");
        List<Expr> b2Elements = getVectorElements(inputs.get(5), n2, ctx);
        List<Expr> c2Elements = getVectorElements(inputs.get(6), n2, ctx);
        Expr d2 = getScalarElement(inputs.get(7), ctx);

        Expr signExpr = inputs.size() == 9 ? inputs.get(8) : new Expr.Num(1.0);

        int n = n1 + n2;
        MatrixInfo an = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (an.rows != n || an.cols != n) throw new ParseException("feedback: Output A must be " + n + "x" + n);
        List<Expr> bnElements = getVectorElements(outputs.get(1), n, ctx);
        List<Expr> cnElements = getVectorElements(outputs.get(2), n, ctx);
        Expr dn = getScalarElement(outputs.get(3), ctx);

        registerShape(an.name, n, n, ctx);
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(2) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), 1, n, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n1; i++) entries.addAll(Arrays.asList(a1.elements[i]));
        entries.addAll(b1Elements);
        entries.addAll(c1Elements);
        entries.add(d1);
        for (int i = 0; i < n2; i++) entries.addAll(Arrays.asList(a2.elements[i]));
        entries.addAll(b2Elements);
        entries.addAll(c2Elements);
        entries.add(d2);
        entries.add(signExpr);

        String suffix = "$" + n1 + "$" + n2;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(an.elements[i][j],
                        new Expr.Call("ss_feedback$a$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(bnElements.get(i),
                    new Expr.Call("ss_feedback$b$" + i + "$0" + suffix, entries), sourceText));
        }
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(cnElements.get(i),
                    new Expr.Call("ss_feedback$c$" + i + "$0" + suffix, entries), sourceText));
        }
        ctx.out().add(new Equation(dn, new Expr.Call("ss_feedback$d" + suffix, entries), sourceText));
    }

    private void flattenPole(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 1 && inputs.size() != 2) || outputs.size() != 2) {
            throw new ParseException("pole expects 1 input (A) or 2 inputs (num, den) and 2 outputs (pr, pi), "
                    + "e.g. CALL pole(num, den : pr[1:3], pi[1:3])");
        }
        int n;
        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 1) {
            MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (a.rows != a.cols) {
                throw new ParseException("pole: A must be square");
            }
            n = a.rows;
            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
        } else {
            VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new ParseException("pole: num and den must have the same length");
            }
            n = den.size - 1; // degree
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        }

        VectorInfo pr = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo pi = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (pr.size != n || pi.size != n) {
            throw new ParseException("pole: output vectors pr and pi must have length n = " + n);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }

        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(pr.elements[i],
                    new Expr.Call("pole$pr$" + i + "$" + inputs.size() + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(pi.elements[i],
                    new Expr.Call("pole$pi$" + i + "$" + inputs.size() + "$" + n, entries), sourceText));
        }
    }

    private void flattenZero(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 2 && inputs.size() != 4) || outputs.size() != 2) {
            throw new ParseException("zero expects 2 inputs (num, den) or 4 inputs (A, B, C, D) and 2 outputs (zr, zi), "
                    + "e.g. CALL zero(num, den : zr[1:2], zi[1:2])");
        }
        VectorInfo zr = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo zi = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (zr.size != zi.size) {
            throw new ParseException("zero: zr and zi outputs must have the same length");
        }
        int nz = zr.size;

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 2) {
            VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new ParseException("zero: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new ParseException("zero: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), nz, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), nz, 1, ctx);
        }

        for (int i = 0; i < nz; i++) {
            ctx.out().add(new Equation(zr.elements[i],
                    new Expr.Call("zero$zr$" + i + "$" + inputs.size() + "$" + nz, entries), sourceText));
            ctx.out().add(new Equation(zi.elements[i],
                    new Expr.Call("zero$zi$" + i + "$" + inputs.size() + "$" + nz, entries), sourceText));
        }
    }

    private void flattenBode(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 5) || outputs.size() != 2) {
            throw new ParseException("bode expects 3 inputs (num, den, omega) or 5 inputs (A, B, C, D, omega) and 2 outputs (mag, phase), "
                    + "e.g. CALL bode(num, den, omega : mag[1:50], phase[1:50])");
        }
        VectorInfo omega = parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = omega.size;

        VectorInfo mag = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo phase = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (mag.size != N || phase.size != N) {
            throw new ParseException("bode: outputs mag and phase must have the same size N as omega = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 3) {
            VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new ParseException("bode: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new ParseException("bode: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(omega.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), N, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(mag.elements[i],
                    new Expr.Call("bode$mag$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
            ctx.out().add(new Equation(phase.elements[i],
                    new Expr.Call("bode$phase$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    private void flattenNyquist(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 5) || outputs.size() != 2) {
            throw new ParseException("nyquist expects 3 inputs (num, den, omega) or 5 inputs (A, B, C, D, omega) and 2 outputs (real, imag), "
                    + "e.g. CALL nyquist(num, den, omega : real[1:50], imag[1:50])");
        }
        VectorInfo omega = parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = omega.size;

        VectorInfo real = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo imag = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (real.size != N || imag.size != N) {
            throw new ParseException("nyquist: outputs real and imag must have the same size N as omega = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 3) {
            VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new ParseException("nyquist: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new ParseException("nyquist: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(omega.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), N, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(real.elements[i],
                    new Expr.Call("nyquist$real$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
            ctx.out().add(new Equation(imag.elements[i],
                    new Expr.Call("nyquist$imag$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    private void flattenMargin(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 2 && inputs.size() != 4) || outputs.size() != 4) {
            throw new ParseException("margin expects 2 inputs (num, den) or 4 inputs (A, B, C, D) and 4 scalar outputs (gm, pm, w_cg, w_cp), "
                    + "e.g. CALL margin(num, den : gm, pm, w_cg, w_cp)");
        }
        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 2) {
            VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new ParseException("margin: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new ParseException("margin: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("margin$gm$" + inputs.size(), entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("margin$pm$" + inputs.size(), entries), sourceText));
        ctx.out().add(new Equation(outputs.get(2),
                new Expr.Call("margin$wcg$" + inputs.size(), entries), sourceText));
        ctx.out().add(new Equation(outputs.get(3),
                new Expr.Call("margin$wcp$" + inputs.size(), entries), sourceText));
    }

    /**
     * Flattens the Routh-Hurwitz test: 1 input (the characteristic polynomial
     * coefficients, descending powers) and 2 scalar outputs (nRHP = number of
     * right-half-plane poles, stable = 1 if stable else 0). The polynomial
     * coefficients are serialized as the synthetic call's arguments.
     */
    private void flattenRouth(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 2) {
            throw new ParseException("routh expects 1 input (den) and 2 scalar outputs (nRHP, stable), "
                    + "e.g. CALL routh(den[1:4] : nRHP, stable)");
        }
        VectorInfo den = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        List<Expr> entries = new ArrayList<>(Arrays.asList(den.elements));

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("routh$nrhp$" + den.size, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("routh$stable$" + den.size, entries), sourceText));
    }

    /**
     * Flattens {@code residue}: 2 inputs (num, den) and 5 outputs
     * (r_r, r_i, p_r, p_i, k) — the partial-fraction residues (real/imag),
     * the matching poles (real/imag), and the scalar direct term. This is the
     * numeric inverse-Laplace path: the residues appear in the Solution window
     * as ordinary variables.
     */
    private void flattenResidue(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 5) {
            throw new ParseException("residue expects 2 inputs (num, den) and 5 outputs (r_r, r_i, p_r, p_i, k), "
                    + "e.g. CALL residue(num[1:1], den[1:3] : r_r[1:2], r_i[1:2], p_r[1:2], p_i[1:2], k)");
        }
        VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = den.size - 1; // number of poles = denominator degree

        VectorInfo rr = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo ri = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo pr = parseVectorInfo(outputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo pi = parseVectorInfo(outputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (rr.size != n || ri.size != n || pr.size != n || pi.size != n) {
            throw new ParseException("residue: output vectors r_r, r_i, p_r, p_i must have length n = " + n);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        for (Expr out : new Expr[]{outputs.get(0), outputs.get(1), outputs.get(2), outputs.get(3)}) {
            if (out instanceof Expr.ArrayAccess aa) {
                registerShape(aa.name(), n, 1, ctx);
            }
        }

        int numLen = num.size;
        for (int i = 0; i < n; i++) {
            ctx.out().add(new Equation(rr.elements[i],
                    new Expr.Call("residue$rr$" + i + "$" + numLen + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(ri.elements[i],
                    new Expr.Call("residue$ri$" + i + "$" + numLen + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(pr.elements[i],
                    new Expr.Call("residue$pr$" + i + "$" + numLen + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(pi.elements[i],
                    new Expr.Call("residue$pi$" + i + "$" + numLen + "$" + n, entries), sourceText));
        }
        ctx.out().add(new Equation(outputs.get(4),
                new Expr.Call("residue$k$" + numLen + "$" + n, entries), sourceText));
    }

    /**
     * Flattens {@code c2d}/{@code d2c}: 4 inputs (num, den, Ts, method$) and 2
     * output vectors (numz, denz) of the same length as den. The conversion
     * method is encoded into the synthetic call name; the model coefficients and
     * Ts are serialized as arguments.
     */
    private void flattenDiscretize(String name, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 4) || outputs.size() != 2) {
            throw new ParseException(name + " expects 3 inputs (num, den, Ts) or 4 inputs (num, den, Ts, method$) "
                    + "and 2 outputs (numz, denz), e.g. CALL " + name + "(num[1:2], den[1:2], Ts, 'tustin' : numz[1:2], denz[1:2])");
        }
        String method = "tustin";
        if (inputs.size() == 4) {
            if (!(inputs.get(3) instanceof Expr.Str(String methodRaw))) {
                throw new ParseException(name + ": the fourth argument must be a quoted method, 'tustin' or 'zoh'");
            }
            method = methodRaw.toLowerCase();
            if (!method.equals("tustin") && !method.equals("bilinear") && !method.equals("zoh")) {
                throw new ParseException(name + ": method must be 'tustin' or 'zoh' (got '" + methodRaw + "')");
            }
            if (name.equals("d2c") && method.equals("zoh")) {
                throw new ParseException("d2c: only the 'tustin' method is supported");
            }
        }
        VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != den.size) {
            throw new ParseException(name + ": num and den must have the same length (pad the numerator with leading zeros)");
        }
        Expr ts = getScalarElement(inputs.get(2), ctx);

        int outLen = den.size;
        VectorInfo numz = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo denz = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (numz.size != outLen || denz.size != outLen) {
            throw new ParseException(name + ": outputs numz and denz must have the same length as den = " + outLen);
        }
        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), outLen, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), outLen, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));
        entries.add(ts);

        int L = den.size;
        for (int i = 0; i < outLen; i++) {
            ctx.out().add(new Equation(numz.elements[i],
                    new Expr.Call(name + "$num$" + method + "$" + i + "$" + L, entries), sourceText));
            ctx.out().add(new Equation(denz.elements[i],
                    new Expr.Call(name + "$den$" + method + "$" + i + "$" + L, entries), sourceText));
        }
    }

    /**
     * Flattens {@code step} / {@code impulse}: 3 inputs (num, den, t) or 5 inputs
     * (A, B, C, D, t), and one output vector y the same length as t. Each y[i] is
     * emitted as a synthetic call {@code <name>$<i>$<numInputs>$<N>} whose
     * arguments are the serialized model entries followed by the time samples.
     */
    private void flattenTimeResponse(String name, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 3 && inputs.size() != 5) || outputs.size() != 1) {
            throw new ParseException(name + " expects 3 inputs (num, den, t) or 5 inputs (A, B, C, D, t) and 1 output (y), "
                    + "e.g. CALL " + name + "(num, den, t : y[1:50])");
        }
        VectorInfo time = parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = time.size;

        VectorInfo y = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (y.size != N) {
            throw new ParseException(name + ": output y must have the same size N as t = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 3) {
            VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new ParseException(name + ": num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new ParseException(name + ": A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(time.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(y.elements[i],
                    new Expr.Call(name + "$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    /**
     * Flattens {@code lsim}: 4 inputs (num, den, u, t) or 6 inputs (A, B, C, D, u, t)
     * and one output vector y the same length as t. The input signal u and time
     * vector t must both have length N. Serialized arguments are the model entries
     * followed by the u samples then the t samples.
     */
    private void flattenLsim(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if ((inputs.size() != 4 && inputs.size() != 6) || outputs.size() != 1) {
            throw new ParseException("lsim expects 4 inputs (num, den, u, t) or 6 inputs (A, B, C, D, u, t) and 1 output (y), "
                    + "e.g. CALL lsim(num, den, u, t : y[1:50])");
        }
        VectorInfo input = parseVectorInfo(inputs.get(inputs.size() - 2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo time = parseVectorInfo(inputs.get(inputs.size() - 1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = time.size;
        if (input.size != N) {
            throw new ParseException("lsim: input u and time t must have the same size N = " + N);
        }

        VectorInfo y = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (y.size != N) {
            throw new ParseException("lsim: output y must have the same size N as t = " + N);
        }

        List<Expr> entries = new ArrayList<>();
        if (inputs.size() == 4) {
            VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (num.size != den.size) {
                throw new ParseException("lsim: num and den must have the same length");
            }
            entries.addAll(Arrays.asList(num.elements));
            entries.addAll(Arrays.asList(den.elements));
        } else {
            MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            int n = a.rows;
            if (a.cols != n) throw new ParseException("lsim: A must be square");
            List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
            List<Expr> cElements = getRowVectorElements(inputs.get(2), n, ctx);
            Expr dElement = getScalarElement(inputs.get(3), ctx);

            for (int i = 0; i < n; i++) {
                entries.addAll(Arrays.asList(a.elements[i]));
            }
            entries.addAll(bElements);
            entries.addAll(cElements);
            entries.add(dElement);
        }
        entries.addAll(Arrays.asList(input.elements));
        entries.addAll(Arrays.asList(time.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), N, 1, ctx);
        }

        for (int i = 0; i < N; i++) {
            ctx.out().add(new Equation(y.elements[i],
                    new Expr.Call("lsim$" + i + "$" + inputs.size() + "$" + N, entries), sourceText));
        }
    }

    /**
     * Flattens {@code lqr(A, B, Q, R : K)}: single-input continuous-time LQR.
     * A and Q are n×n, B is an n-vector, R is a scalar, and the gain K is an
     * n-element row vector. Serialized arguments: A row-major, then B, then Q
     * row-major, then R.
     */
    private void flattenLqr(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 1) {
            throw new ParseException("lqr expects 4 inputs (A, B, Q, R) and 1 output (K), "
                    + "e.g. CALL lqr(A[1:2,1:2], B[1:2], Q[1:2,1:2], R : K[1:2])");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new ParseException("lqr: A must be square (got " + a.rows + "x" + a.cols + ")");
        }
        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        MatrixInfo q = parseMatrixInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (q.rows != n || q.cols != n) {
            throw new ParseException("lqr: Q must be n x n = " + n + "x" + n);
        }
        Expr rElement = getScalarElement(inputs.get(3), ctx);

        VectorInfo k = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (k.size != n) {
            throw new ParseException("lqr: output K must have length n = " + n);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(bElements);
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(q.elements[i]));
        }
        entries.add(rElement);

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }
        for (int j = 0; j < n; j++) {
            ctx.out().add(new Equation(k.elements[j],
                    new Expr.Call("lqr$" + j + "$" + n, entries), sourceText));
        }
    }

    /**
     * Flattens {@code place(A, B, pr, pi : K)}: SISO Ackermann pole placement.
     * A is n×n, B is an n-vector, and the desired closed-loop poles are given as
     * real/imag arrays pr, pi (each length n). The gain K is an n-element row
     * vector. Serialized arguments: A row-major, then B, then pr, then pi.
     */
    private void flattenPlace(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 1) {
            throw new ParseException("place expects 4 inputs (A, B, pr, pi) and 1 output (K), "
                    + "e.g. CALL place(A[1:2,1:2], B[1:2], pr[1:2], pi[1:2] : K[1:2])");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = a.rows;
        if (a.cols != n) {
            throw new ParseException("place: A must be square (got " + a.rows + "x" + a.cols + ")");
        }
        List<Expr> bElements = getVectorElements(inputs.get(1), n, ctx);
        VectorInfo pr = parseVectorInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo pi = parseVectorInfo(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (pr.size != n || pi.size != n) {
            throw new ParseException("place: desired pole arrays pr and pi must each have length n = " + n);
        }

        VectorInfo k = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (k.size != n) {
            throw new ParseException("place: output K must have length n = " + n);
        }

        List<Expr> entries = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            entries.addAll(Arrays.asList(a.elements[i]));
        }
        entries.addAll(bElements);
        entries.addAll(Arrays.asList(pr.elements));
        entries.addAll(Arrays.asList(pi.elements));

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), n, 1, ctx);
        }
        for (int j = 0; j < n; j++) {
            ctx.out().add(new Equation(k.elements[j],
                    new Expr.Call("place$" + j + "$" + n, entries), sourceText));
        }
    }

    /**
     * Flattens {@code pidtune(num, den, type$, wc : Kp, Ki, Kd)}: loop-shaping
     * PID design for a SISO plant {@code num/den} with a gain crossover at wc and
     * a 60° target phase margin. {@code type$} is a quoted 'P' / 'PI' / 'PID'.
     * The controller type is encoded into the synthetic call name; serialized
     * arguments are num, then den, then wc.
     */
    private void flattenPidtune(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 4 || outputs.size() != 3) {
            throw new ParseException("pidtune expects 4 inputs (num, den, type$, wc) and 3 outputs (Kp, Ki, Kd), "
                    + "e.g. CALL pidtune(num, den, 'PID', wc : Kp, Ki, Kd)");
        }
        if (!(inputs.get(2) instanceof Expr.Str(String typeRaw))) {
            throw new ParseException("pidtune: the third argument must be a quoted controller type, "
                    + "one of 'P', 'PI', or 'PID'");
        }
        String type = typeRaw.toLowerCase();
        if (!type.equals("p") && !type.equals("pi") && !type.equals("pid")) {
            throw new ParseException("pidtune: controller type must be 'P', 'PI', or 'PID' (got '" + typeRaw + "')");
        }
        VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != den.size) {
            throw new ParseException("pidtune: num and den must have the same length");
        }
        Expr wc = getScalarElement(inputs.get(3), ctx);

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));
        entries.add(wc);

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("pidtune$kp$" + type, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("pidtune$ki$" + type, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(2),
                new Expr.Call("pidtune$kd$" + type, entries), sourceText));
    }

    private void flattenStepInfo(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 4) {
            throw new ParseException("stepinfo expects 2 inputs (t, y) and 4 scalar outputs (Tr, Tp, Ts, OS), "
                    + "e.g. CALL stepinfo(t[1:50], y[1:50] : Tr, Tp, Ts, OS)");
        }
        VectorInfo t = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int N = t.size;
        VectorInfo y = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (y.size != N) {
            throw new ParseException("stepinfo: inputs t and y must have the same length (got t: " + N + ", y: " + y.size + ")");
        }

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(t.elements));
        entries.addAll(Arrays.asList(y.elements));

        ctx.out().add(new Equation(outputs.get(0),
                new Expr.Call("stepinfo$tr$" + N, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(1),
                new Expr.Call("stepinfo$tp$" + N, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(2),
                new Expr.Call("stepinfo$ts$" + N, entries), sourceText));
        ctx.out().add(new Equation(outputs.get(3),
                new Expr.Call("stepinfo$os$" + N, entries), sourceText));
    }

    private void flattenPade(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 2) {
            throw new ParseException("pade expects 2 inputs (Td, order) and 2 vector outputs (num_delay, den_delay), "
                    + "e.g. CALL pade(Td, order : num_delay[1:3], den_delay[1:3])");
        }
        Expr expandedOrder = expandExpr(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int order = (int) Math.round(evalIndexExpr(expandedOrder, ctx.loopVars(), ctx.constants(), ctx.defs()));
        if (order < 1) {
            throw new ParseException("pade: order must be >= 1");
        }
        int M = order + 1;
        VectorInfo num = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size != M || den.size != M) {
            throw new ParseException("pade: outputs num_delay and den_delay must have size " + M + " (order + 1) for a Padé approximation of order " + order);
        }

        if (outputs.get(0) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), M, 1, ctx);
        }
        if (outputs.get(1) instanceof Expr.ArrayAccess aa) {
            registerShape(aa.name(), M, 1, ctx);
        }

        List<Expr> entries = new ArrayList<>();
        entries.add(inputs.get(0));
        entries.add(inputs.get(1));

        for (int i = 0; i < M; i++) {
            ctx.out().add(new Equation(num.elements[i],
                    new Expr.Call("pade$num$" + i + "$" + order, entries), sourceText));
            ctx.out().add(new Equation(den.elements[i],
                    new Expr.Call("pade$den$" + i + "$" + order, entries), sourceText));
        }
    }

    private void flattenRlocus(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 3) {
            throw new ParseException("rlocus expects 2 inputs (num, den) and 3 outputs (K[1:M], cpr[1:M, 1:N], cpi[1:M, 1:N]), "
                    + "e.g. CALL rlocus(num, den : K[1:100], cpr[1:100, 1:4], cpi[1:100, 1:4])");
        }
        VectorInfo num = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo den = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (num.size > den.size) {
            throw new ParseException("rlocus: system must be proper (numerator order <= denominator order)");
        }

        VectorInfo kOut = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int M = kOut.size;

        MatrixInfo cpr = parseMatrixInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo cpi = parseMatrixInfo(outputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        int N = den.size - 1; // system order
        if (cpr.rows != M || cpr.cols != N) {
            throw new ParseException("rlocus: cpr must be a matrix of size " + M + "x" + N + " (got " + cpr.rows + "x" + cpr.cols + ")");
        }
        if (cpi.rows != M || cpi.cols != N) {
            throw new ParseException("rlocus: cpi must be a matrix of size " + M + "x" + N + " (got " + cpi.rows + "x" + cpi.cols + ")");
        }

        registerShape(kOut.name, M, 1, ctx);
        registerShape(cpr.name, M, N, ctx);
        registerShape(cpi.name, M, N, ctx);

        List<Expr> entries = new ArrayList<>();
        entries.addAll(Arrays.asList(num.elements));
        entries.addAll(Arrays.asList(den.elements));

        String suffix = "$" + num.size + "$" + den.size + "$" + M + "$" + N;

        for (int i = 0; i < M; i++) {
            ctx.out().add(new Equation(kOut.elements[i],
                    new Expr.Call("rlocus$k$" + i + suffix, entries), sourceText));
        }

        for (int i = 0; i < M; i++) {
            for (int j = 0; j < N; j++) {
                ctx.out().add(new Equation(cpr.elements[i][j],
                        new Expr.Call("rlocus$cpr$" + i + "$" + j + suffix, entries), sourceText));
                ctx.out().add(new Equation(cpi.elements[i][j],
                        new Expr.Call("rlocus$cpi$" + i + "$" + j + suffix, entries), sourceText));
            }
        }
    }

    private List<Expr> getVectorElements(Expr e, int expectedSize, FlattenContext ctx) {
        if (e instanceof Expr.ArrayAccess aa && aa.indices().size() == 2) {
            MatrixInfo m = parseMatrixInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (m.rows != expectedSize || m.cols != 1) {
                throw new ParseException("ss2tf: B must be a vector of size " + expectedSize + "x1 (got " + m.rows + "x" + m.cols + ")");
            }
            List<Expr> res = new ArrayList<>();
            for (int i = 0; i < expectedSize; i++) {
                res.add(m.elements[i][0]);
            }
            return res;
        } else {
            VectorInfo v = parseVectorInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (v.size != expectedSize) {
                throw new ParseException("ss2tf: B must be a vector of size " + expectedSize + " (got size " + v.size + ")");
            }
            return Arrays.asList(v.elements);
        }
    }

    private List<Expr> getRowVectorElements(Expr e, int expectedSize, FlattenContext ctx) {
        if (e instanceof Expr.ArrayAccess aa && aa.indices().size() == 2) {
            MatrixInfo m = parseMatrixInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (m.rows != 1 || m.cols != expectedSize) {
                throw new ParseException("ss2tf: C must be a row vector of size 1x" + expectedSize + " (got " + m.rows + "x" + m.cols + ")");
            }
            List<Expr> res = new ArrayList<>();
            for (int j = 0; j < expectedSize; j++) {
                res.add(m.elements[0][j]);
            }
            return res;
        } else {
            VectorInfo v = parseVectorInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            if (v.size != expectedSize) {
                throw new ParseException("ss2tf: C must be a vector of size " + expectedSize + " (got size " + v.size + ")");
            }
            return Arrays.asList(v.elements);
        }
    }

    private Expr getScalarElement(Expr e, FlattenContext ctx) {
        if (e instanceof Expr.ArrayAccess aa) {
            if (aa.indices().size() == 2) {
                MatrixInfo m = parseMatrixInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
                if (m.rows != 1 || m.cols != 1) {
                    throw new ParseException("ss2tf: D must be a 1x1 matrix (got " + m.rows + "x" + m.cols + ")");
                }
                return m.elements[0][0];
            } else {
                Expr idxExpr = expandExpr(aa.indices().get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
                if (idxExpr instanceof Expr.Range) {
                    VectorInfo v = parseVectorInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
                    if (v.size != 1) {
                        throw new ParseException("ss2tf: D must be a size-1 vector (got size " + v.size + ")");
                    }
                    return v.elements[0];
                } else {
                    return expandExpr(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
                }
            }
        }
        return expandExpr(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
    }

    private void flattenEigen(String defName, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        boolean wantVectors = defName.equals("eigen");
        int expectedOutputs = wantVectors ? 2 : 1;
        if (inputs.size() != 1 || outputs.size() != expectedOutputs) {
            throw new ParseException(wantVectors
                    ? "Eigen expects 1 input matrix and 2 outputs (eigenvalue vector, eigenvector matrix), e.g. CALL Eigen(A[1:3,1:3] : lambda[1:3], V[1:3,1:3])"
                    : "Eigenvalues expects 1 input matrix and 1 output vector, e.g. CALL Eigenvalues(A[1:3,1:3] : lambda[1:3])");
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
            emitEigenvectors(outputs, n, entries, sourceText, ctx);
        }
    }

    private void emitEigenvectors(List<Expr> outputs, int n, List<Expr> entries, String sourceText, FlattenContext ctx) {
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

    private void flattenDecomposeOrRotate(String defName, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        switch (defName) {
            case "ludecompose" -> flattenLuDecompose(inputs, outputs, sourceText, ctx);
            case "eulerrotate" -> flattenEulerRotate(inputs, outputs, sourceText, ctx);
            case "eulerdecompose" -> flattenEulerDecompose(inputs, outputs, sourceText, ctx);
            default -> { /* not a decompose/rotate intrinsic */ }
        }
    }

    private void flattenLuDecompose(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 2) {
            throw new ParseException("LUDecompose expects exactly 1 input matrix and 2 output matrices, e.g. CALL LUDecompose(A[1:3,1:3] : L[1:3,1:3], U[1:3,1:3])");
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
                emitLuTriangularEntry(l, u, i, j, sourceText, ctx);
                Expr sum = null;
                for (int k = 0; k < n; k++) {
                    Expr term = new Expr.BinOp('*', l.elements[i][k], u.elements[k][j]);
                    sum = sum == null ? term : new Expr.BinOp('+', sum, term);
                }
                ctx.out().add(new Equation(sum, a.elements[i][j], sourceText));
            }
        }
    }

    /** Pins the fixed triangular structure of an LU factorization: L is unit
     *  lower-triangular (0 above, 1 on the diagonal) and U is upper-triangular (0 below). */
    private void emitLuTriangularEntry(MatrixInfo l, MatrixInfo u, int i, int j, String sourceText, FlattenContext ctx) {
        if (i < j) {
            ctx.out().add(new Equation(l.elements[i][j], new Expr.Num(0.0), sourceText));
        } else if (i == j) {
            ctx.out().add(new Equation(l.elements[i][j], new Expr.Num(1.0), sourceText));
        }
        if (i > j) {
            ctx.out().add(new Equation(u.elements[i][j], new Expr.Num(0.0), sourceText));
        }
    }

    private void flattenEulerRotate(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 3 || outputs.size() != 1) {
            throw new ParseException("EulerRotate expects 3 angles (phi, theta, psi) and 1 output matrix, e.g. CALL EulerRotate(phi, theta, psi : R[1:3,1:3])");
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
    }

    private void flattenEulerDecompose(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 3) {
            throw new ParseException("EulerDecompose expects 1 input matrix and 3 output variables, e.g. CALL EulerDecompose(R[1:3,1:3] : phi, theta, psi)");
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
                indexPossibilities.add(expandRangeIndex(startExpr, endExpr, loopVars, constants, defs));
            } else {
                double val = evalIndexExpr(expandedIdx, loopVars, constants, defs);
                indexPossibilities.add(List.of((int) Math.round(val)));
            }
        }
        return indexPossibilities;
    }

    /** Materializes a {@code start:end} index range into the explicit list of
     *  indices it covers (ascending or descending), bounded by MAX_RANGE_SPAN. */
    private List<Integer> expandRangeIndex(Expr startExpr, Expr endExpr, Map<String, Double> loopVars,
                                           Map<String, Double> constants, Map<String, ProcDef> defs) {
        int start = (int) Math.round(evalIndexExpr(startExpr, loopVars, constants, defs));
        int end = (int) Math.round(evalIndexExpr(endExpr, loopVars, constants, defs));
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
        return rangeVals;
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
            throw new ParseException("Expected matrix array access: e.g. A[1:3, 1:3]");
        }
        if (indices.size() != 2) {
            throw new ParseException("Matrix must have exactly 2 dimensions: " + name);
        }
        Expr r0 = expandExpr(indices.get(0), loopVars, constants, displayNames, defs);
        Expr r1 = expandExpr(indices.get(1), loopVars, constants, displayNames, defs);
        if (!(r0 instanceof Expr.Range(Expr start0, Expr end0)) || !(r1 instanceof Expr.Range(Expr start1, Expr end1))) {
            throw new ParseException("Matrix indices must specify ranges: e.g. A[1:3, 1:3]");
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
            throw new ParseException("Expected vector array access: e.g. v[1:3]");
        }
        if (indices.size() != 1) {
            throw new ParseException("Vector must have exactly 1 dimension: " + name);
        }
        Expr r0 = expandExpr(indices.get(0), loopVars, constants, displayNames, defs);
        if (!(r0 instanceof Expr.Range(Expr start, Expr end))) {
            throw new ParseException("Vector index must specify a range: e.g. v[1:3]");
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
            FN_TRANSPOSE, FN_INVERSE, "inv", FN_SOLVELINEAR,
            "axpy", "scal", "gemv", "gemm", "ger", "copy",
            FN_ZEROS, "ones", "eye", FN_IDENTITY, "diag", FN_LINSPACE);

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
        java.util.function.ToDoubleFunction<Expr> num = a ->
                evalIndexExpr(expandExpr(a, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()),
                        ctx.loopVars(), ctx.constants(), ctx.defs());
        return switch (fn) {
            case FN_ZEROS, "ones" -> genConstant(fn, args, num);
            case "eye", FN_IDENTITY -> genIdentity(fn, args, num);
            case FN_LINSPACE -> genLinspace(fn, args, num);
            default -> genDiag(args, ctx); // diag
        };
    }

    private Expr[][] genConstant(String fn, List<Expr> args, java.util.function.ToDoubleFunction<Expr> num) {
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

    private Expr[][] genIdentity(String fn, List<Expr> args, java.util.function.ToDoubleFunction<Expr> num) {
        int r = (int) Math.round(num.applyAsDouble(args.get(0)));
        int c = args.size() > 1 ? (int) Math.round(num.applyAsDouble(args.get(1))) : r;
        checkGeneratorSize(r, c, fn);
        Expr[][] m = new Expr[r][c];
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                m[i][j] = new Expr.Num(kroneckerDelta(i, j));
            }
        }
        return m;
    }

    private Expr[][] genLinspace(String fn, List<Expr> args, java.util.function.ToDoubleFunction<Expr> num) {
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

    private Expr[][] genDiag(List<Expr> args, FlattenContext ctx) {
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
        int[] dims = elementwiseDims(op, lMat, rMat, lScalar, rScalar);
        int rows = dims[0];
        int cols = dims[1];

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

    /** Resolves the result shape of an element-wise op, broadcasting a scalar side
     *  or requiring identical dimensions; returns {@code [rows, cols]}. */
    private int[] elementwiseDims(char op, Expr[][] lMat, Expr[][] rMat, boolean lScalar, boolean rScalar) {
        if (lScalar) {
            return new int[] { rMat.length, rMat[0].length };
        }
        if (rScalar) {
            return new int[] { lMat.length, lMat[0].length };
        }
        if (lMat.length != rMat.length || lMat[0].length != rMat[0].length) {
            throw new ParseException("Matrix dimensions must agree for element-wise '"
                    + elementwiseSymbol(op) + "': " + lMat.length + "x" + lMat[0].length
                    + " vs " + rMat.length + "x" + rMat[0].length);
        }
        return new int[] { lMat.length, lMat[0].length };
    }

    private Expr[][] compileMatrixExpr(Expr e, FlattenContext ctx) {
        return switch (e) {
            case Expr.ArrayAccess(String name, List<Expr> indices) -> matrixFromArrayAccess(e, name, indices, ctx);
            case Expr.ArrayLiteral(List<Expr> elements) -> matrixFromLiteral(elements, ctx);
            case Expr.BinOp(char op, Expr left, Expr right) -> compileMatrixBinOp(op, left, right, ctx);
            case Expr.Call(String function, List<Expr> args) -> compileMatrixCall(function, args, ctx);
            default -> new Expr[][] { { expandExpr(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()) } };
        };
    }

    private Expr[][] matrixFromArrayAccess(Expr e, String name, List<Expr> indices, FlattenContext ctx) {
        if (indices.size() == 2) {
            MatrixInfo m = parseMatrixInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr[][] mat = new Expr[m.rows][m.cols];
            for (int i = 0; i < m.rows; i++) {
                System.arraycopy(m.elements[i], 0, mat[i], 0, m.cols);
            }
            return mat;
        } else if (indices.size() == 1) {
            VectorInfo v = parseVectorInfo(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            Expr[][] mat = new Expr[v.size][1];
            for (int i = 0; i < v.size; i++) {
                mat[i][0] = v.elements[i];
            }
            return mat;
        } else {
            throw new ParseException("Matrix/vector must have 1 or 2 dimensions: " + name);
        }
    }

    private Expr[][] matrixFromLiteral(List<Expr> elements, FlattenContext ctx) {
        if (!elements.isEmpty() && elements.get(0) instanceof Expr.ArrayLiteral) {
            return matrixFromRowLiterals(elements, ctx);
        }
        int size = elements.size();
        Expr[][] mat = new Expr[size][1];
        for (int i = 0; i < size; i++) {
            mat[i][0] = expandExpr(elements.get(i), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        }
        return mat;
    }

    private Expr[][] matrixFromRowLiterals(List<Expr> elements, FlattenContext ctx) {
        int numRows = elements.size();
        int numCols = -1;
        Expr[][] mat = null;
        for (int i = 0; i < numRows; i++) {
            if (!(elements.get(i) instanceof Expr.ArrayLiteral rowLit)) {
                throw new ParseException("Heterogeneous matrix literal: row " + (i + 1) + " is not a row literal.");
            }
            if (numCols == -1) {
                numCols = rowLit.elements().size();
                mat = new Expr[numRows][numCols];
            } else if (rowLit.elements().size() != numCols) {
                throw new ParseException("Matrix literal rows must have compatible column dimensions.");
            }
            for (int j = 0; j < numCols; j++) {
                mat[i][j] = expandExpr(rowLit.elements().get(j), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            }
        }
        return mat;
    }

    // ── Matrix binary operators ───────────────────────────────────────────────

    private Expr[][] compileMatrixBinOp(char op, Expr left, Expr right, FlattenContext ctx) {
        if (op == '+' || op == '-') {
            return matrixAddSub(op, left, right, ctx);
        } else if (op == '*') {
            return matrixMultiply(left, right, ctx);
        } else if (op == '\\') {
            return matrixBackslash(left, right, ctx);
        } else if (isElementwiseOp(op)) {
            return compileElementwise(op, left, right, ctx);
        } else {
            throw new ParseException("Unsupported binary matrix operator: " + op);
        }
    }

    private static boolean is1x1(Expr[][] m) {
        return m.length == 1 && m[0].length == 1;
    }

    /** {@code scalar op mat} (scalarOnLeft) or {@code mat op scalar}, broadcasting the scalar. */
    private static Expr[][] broadcastScalar(char op, Expr scalar, Expr[][] mat, boolean scalarOnLeft) {
        Expr[][] result = new Expr[mat.length][mat[0].length];
        for (int i = 0; i < mat.length; i++) {
            for (int j = 0; j < mat[0].length; j++) {
                result[i][j] = scalarOnLeft
                        ? new Expr.BinOp(op, scalar, mat[i][j])
                        : new Expr.BinOp(op, mat[i][j], scalar);
            }
        }
        return result;
    }

    private Expr[][] matrixAddSub(char op, Expr left, Expr right, FlattenContext ctx) {
        Expr[][] lMat = compileMatrixExpr(left, ctx);
        Expr[][] rMat = compileMatrixExpr(right, ctx);
        if (is1x1(lMat)) {
            return broadcastScalar(op, lMat[0][0], rMat, true);
        }
        if (is1x1(rMat)) {
            return broadcastScalar(op, rMat[0][0], lMat, false);
        }
        if (lMat.length != rMat.length || lMat[0].length != rMat[0].length) {
            throw new ParseException("Matrix dimensions must agree for addition/subtraction: " +
                    lMat.length + "x" + lMat[0].length + " vs " + rMat.length + "x" + rMat[0].length);
        }
        Expr[][] result = new Expr[lMat.length][lMat[0].length];
        for (int i = 0; i < lMat.length; i++) {
            for (int j = 0; j < lMat[0].length; j++) {
                result[i][j] = new Expr.BinOp(op, lMat[i][j], rMat[i][j]);
            }
        }
        return result;
    }

    private Expr[][] matrixMultiply(Expr left, Expr right, FlattenContext ctx) {
        Expr[][] lMat = compileMatrixExpr(left, ctx);
        Expr[][] rMat = compileMatrixExpr(right, ctx);
        if (is1x1(lMat)) {
            return broadcastScalar('*', lMat[0][0], rMat, true);
        }
        if (is1x1(rMat)) {
            return broadcastScalar('*', rMat[0][0], lMat, false);
        }
        if (lMat[0].length != rMat.length) {
            throw new ParseException("Inner matrix dimensions must agree: " +
                    lMat.length + "x" + lMat[0].length + " vs " + rMat.length + "x" + rMat[0].length);
        }
        return matMul(lMat, rMat);
    }

    private static Expr[][] matMul(Expr[][] lMat, Expr[][] rMat) {
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
        return result;
    }

    private Expr[][] matrixBackslash(Expr left, Expr right, FlattenContext ctx) {
        Expr[][] aMat = compileMatrixExpr(left, ctx);
        Expr[][] bMat = compileMatrixExpr(right, ctx);
        if (aMat.length != aMat[0].length) {
            throw new ParseException("Backslash solver requires square matrix A");
        }
        if (bMat.length != aMat.length || bMat[0].length != 1) {
            throw new ParseException("Backslash solver dimensions mismatch: A is " + aMat.length + "x" + aMat[0].length + ", b is " + bMat.length + "x" + bMat[0].length);
        }
        return emitLinearSolve(aMat, bMat, "backslash_temp_", "Backslash solve", ctx);
    }

    /** Introduces a fresh unknown vector x and emits A·x = b row equations, returning x. */
    private Expr[][] emitLinearSolve(Expr[][] aMat, Expr[][] bMat, String prefix, String label, FlattenContext ctx) {
        int m = aMat.length;
        String tempVecName = prefix + ctx.out().size();
        Expr[][] xMat = new Expr[m][1];
        for (int i = 0; i < m; i++) {
            xMat[i][0] = new Expr.Var(tempVecName + "[" + (i + 1) + "]");
        }
        for (int i = 0; i < m; i++) {
            Expr term = new Expr.BinOp('*', aMat[i][0], xMat[0][0]);
            for (int k = 1; k < m; k++) {
                term = new Expr.BinOp('+', term, new Expr.BinOp('*', aMat[i][k], xMat[k][0]));
            }
            ctx.out().add(new Equation(term, bMat[i][0], label));
        }
        return xMat;
    }

    // ── Matrix function calls ─────────────────────────────────────────────────

    private Expr[][] compileMatrixCall(String function, List<Expr> args, FlattenContext ctx) {
        String fn = function.toLowerCase();
        return switch (fn) {
            case FN_ZEROS, "ones", "eye", FN_IDENTITY, "diag", FN_LINSPACE -> compileMatrixGenerator(fn, args, ctx);
            case FN_TRANSPOSE -> matrixTranspose(args, ctx);
            case FN_INVERSE, "inv" -> matrixInverse(args, ctx);
            case "axpy" -> matrixAxpy(args, ctx);
            case "scal" -> matrixScal(args, ctx);
            case "gemv" -> matrixGemv(args, ctx);
            case "gemm" -> matrixGemm(args, ctx);
            case "ger" -> matrixGer(args, ctx);
            case "copy" -> matrixCopy(args, ctx);
            case FN_SOLVELINEAR -> matrixSolveLinear(args, ctx);
            default -> throw new ParseException("Unsupported matrix function: " + function);
        };
    }

    private Expr[][] matrixTranspose(List<Expr> args, FlattenContext ctx) {
        Expr[][] mat = compileMatrixExpr(args.get(0), ctx);
        int rows = mat.length;
        int cols = mat[0].length;
        Expr[][] result = new Expr[cols][rows];
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                result[j][i] = mat[i][j];
            }
        }
        return result;
    }

    private Expr[][] matrixInverse(List<Expr> args, FlattenContext ctx) {
        Expr[][] aMat = compileMatrixExpr(args.get(0), ctx);
        if (aMat.length != aMat[0].length) {
            throw new ParseException("Inverse requires a square matrix");
        }
        int m = aMat.length;
        String tempMatName = "inverse_temp_" + ctx.out().size();
        Expr[][] invMat = new Expr[m][m];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < m; j++) {
                invMat[i][j] = new Expr.Var(tempMatName + "[" + (i + 1) + "," + (j + 1) + "]");
            }
        }
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < m; j++) {
                Expr term = new Expr.BinOp('*', aMat[i][0], invMat[0][j]);
                for (int k = 1; k < m; k++) {
                    term = new Expr.BinOp('+', term, new Expr.BinOp('*', aMat[i][k], invMat[k][j]));
                }
                ctx.out().add(new Equation(term, new Expr.Num(kroneckerDelta(i, j)), "Matrix inverse definition"));
            }
        }
        return invMat;
    }

    private Expr[][] matrixAxpy(List<Expr> args, FlattenContext ctx) {
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
        Expr[][] result = new Expr[xMat.length][xMat[0].length];
        for (int i = 0; i < xMat.length; i++) {
            for (int j = 0; j < xMat[0].length; j++) {
                result[i][j] = new Expr.BinOp('+', new Expr.BinOp('*', alpha, xMat[i][j]), yMat[i][j]);
            }
        }
        return result;
    }

    private Expr[][] matrixScal(List<Expr> args, FlattenContext ctx) {
        if (args.size() != 2) {
            throw new ParseException("scal expects exactly 2 arguments: scal(alpha, x)");
        }
        Expr alpha = args.get(0);
        Expr[][] xMat = compileMatrixExpr(args.get(1), ctx);
        return broadcastScalar('*', alpha, xMat, true);
    }

    private Expr[][] matrixGemv(List<Expr> args, FlattenContext ctx) {
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
        int m = aMat.length;
        int n = aMat[0].length;
        Expr[][] result = new Expr[m][1];
        for (int i = 0; i < m; i++) {
            Expr sum = new Expr.BinOp('*', aMat[i][0], xMat[0][0]);
            for (int k = 1; k < n; k++) {
                sum = new Expr.BinOp('+', sum, new Expr.BinOp('*', aMat[i][k], xMat[k][0]));
            }
            result[i][0] = new Expr.BinOp('+', new Expr.BinOp('*', alpha, sum), new Expr.BinOp('*', beta, yMat[i][0]));
        }
        return result;
    }

    private Expr[][] matrixGemm(List<Expr> args, FlattenContext ctx) {
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
        int m = aMat.length;
        int n = bMat[0].length;
        int k = aMat[0].length;
        Expr[][] result = new Expr[m][n];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                Expr sum = new Expr.BinOp('*', aMat[i][0], bMat[0][j]);
                for (int p = 1; p < k; p++) {
                    sum = new Expr.BinOp('+', sum, new Expr.BinOp('*', aMat[i][p], bMat[p][j]));
                }
                result[i][j] = new Expr.BinOp('+', new Expr.BinOp('*', alpha, sum), new Expr.BinOp('*', beta, cMat[i][j]));
            }
        }
        return result;
    }

    private Expr[][] matrixGer(List<Expr> args, FlattenContext ctx) {
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
        int m = aMat.length;
        int n = aMat[0].length;
        Expr[][] result = new Expr[m][n];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                result[i][j] = new Expr.BinOp('+',
                        new Expr.BinOp('*', alpha, new Expr.BinOp('*', xMat[i][0], yMat[j][0])),
                        aMat[i][j]);
            }
        }
        return result;
    }

    private Expr[][] matrixCopy(List<Expr> args, FlattenContext ctx) {
        if (args.size() != 1) {
            throw new ParseException("copy expects exactly 1 argument: copy(x)");
        }
        return compileMatrixExpr(args.get(0), ctx);
    }

    private Expr[][] matrixSolveLinear(List<Expr> args, FlattenContext ctx) {
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
        return emitLinearSolve(aMat, bMat, "solvelinear_temp_", "SolveLinear solve", ctx);
    }
}
