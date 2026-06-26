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
    /** Delegates control-systems CALL flattening (Epic 12) so this class stays
     * focused on parsing and scalar/matrix flattening. Holds a back-reference to
     * this parser for the shared index/shape helpers. */
    private final ControlSystemsFlattener csFlattener = new ControlSystemsFlattener(this);


    /**
     * Canonical prefix for the throwaway "sink" variables that back ignored
     * ({@code ~}) or omitted trailing outputs of a multi-output CALL/destructuring.
     * A leading {@code ~} can never appear in a user identifier (lexer rule
     * {@code IDENT : [a-zA-Z][a-zA-Z0-9_]*}), so these names are unforgeable and
     * are filtered out of every surfaced result by {@code EquationSystemSolver}.
     */
    public static final String IGNORED_OUTPUT_PREFIX = "~ignored~";

    /** Monotonic counter giving each ignored/omitted output slot a unique sink name. */
    private static final java.util.concurrent.atomic.AtomicLong IGNORED_SINK_SEQ =
            new java.util.concurrent.atomic.AtomicLong();

    /** Mints a fresh, unique sink variable for an ignored or omitted output slot. */
    public static Expr.Var newIgnoredSink() {
        return new Expr.Var(IGNORED_OUTPUT_PREFIX + IGNORED_SINK_SEQ.getAndIncrement());
    }

    /** True if a canonical variable name is an internal ignored-output sink. */
    public static boolean isIgnoredSink(String canonicalName) {
        return canonicalName != null && canonicalName.startsWith(IGNORED_OUTPUT_PREFIX);
    }

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

    static class CollectingErrorListener extends BaseErrorListener {
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

        // Acausal COMPONENT layer: expand instances into flat scalar equations
        // and rewrite dotted port/stream member references in the remaining
        // top-level statements so they unify with the component bodies.
        ComponentExpander components = new ComponentExpander(
                ComponentLibrary.builtins(), programResult.componentDefs(),
                programResult.componentInsts(), programResult.connects(), displayNames);
        List<Equation> componentEquations = components.expand();
        statements = components.rewriteStatements(statements);

        Map<String, Double> constants = extractConstants(statements);

        // Counter for module instance namespacing
        AtomicInteger moduleCounter = new AtomicInteger(0);

        List<Equation> equations = new ArrayList<>(componentEquations);
        Set<String> symbolicVars = collectSymbolic(statements);
        flatten(statements, new HashMap<>(), constants, displayNames, equations, defs, moduleCounter, symbolicVars);

        // String variables (R$ = 'R134a') are compile-time constants:
        // substitute their values and drop the definition equations.
        equations = StringVariables.resolve(equations, displayNames);

        return new ParseResult(equations, displayNames, defs, programResult.parametricTables(),
                programResult.plots(), programResult.stateTables(), programResult.dynamicSystems());
    }



    public List<Equation> parse(String source) {
        return parseResult(source).equations();
    }

    record FlattenContext(Map<String, Double> loopVars,
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

    static void registerShape(String name, int rows, int cols, FlattenContext ctx) {
        ctx.shapes().put(name.toLowerCase(), new int[]{rows, cols});
    }

    /**
     * As {@link #registerShape(String, int, int, FlattenContext)} but records the
     * declared dimensionality ({@code dims}: 1 for a vector, 2 for a matrix) so a
     * bare reference resolves to the form the author wrote — a 1×n or n×1 matrix
     * declared with two subscripts stays 2-D instead of collapsing to a vector.
     */
    static void registerShape(String name, int rows, int cols, int dims, FlattenContext ctx) {
        ctx.shapes().put(name.toLowerCase(), new int[]{rows, cols, dims});
    }

    private static Expr rangeAccess(String name, int[] shape) {
        List<Expr> idx = new ArrayList<>();
        boolean vector = shape.length >= 3
                ? shape[2] == 1                 // declared dimensionality wins when known
                : (shape[0] == 1 || shape[1] == 1); // legacy heuristic for 2-element shapes
        if (vector) {
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
        inferElementwiseShapes(statements, ctx);
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

    /**
     * Pre-registers the shape of matrices/vectors declared element-by-element
     * (e.g. {@code A[1,1]=..; A[2,2]=..}) by taking the maximum constant index
     * seen per base name. Without this, a bare reference to such a matrix — e.g.
     * passing {@code A} to a CALL like {@code [L] = lqe(A, ...)} — would not
     * resolve to its explicit {@code A[1:r,1:c]} form (only wholesale literal
     * assignments and CALL outputs register a shape), leaving control / linear-
     * algebra intrinsics mis-sized and the system spuriously underspecified.
     * Only constant-indexed, top-level subscript assignments are inferred; range
     * slices and loop-variable indices are skipped, and an explicitly registered
     * shape is never overridden.
     */
    private void inferElementwiseShapes(List<Statement> statements, FlattenContext ctx) {
        // Names assigned as a bare scalar (e.g. k = 1000). Because names are
        // case-insensitive, a scalar k and a matrix K[i,j] share one key; the
        // scalar must keep its meaning, so such names are never matrix-resolved.
        Set<String> scalarNames = new HashSet<>();
        for (Statement stmt : statements) {
            if (stmt instanceof Statement.Eq(Expr lhs, Expr ignoredR, String ignoredS)
                    && lhs instanceof Expr.Var(String sname)) {
                scalarNames.add(sname.toLowerCase());
            }
        }
        Map<String, int[]> maxIdx = new HashMap<>(); // name -> {maxRow, maxCol, dims}
        for (Statement stmt : statements) {
            if (!(stmt instanceof Statement.Eq(Expr lhs, Expr ignoredRhs, String ignoredSrc))
                    || !(lhs instanceof Expr.ArrayAccess(String name, List<Expr> indices))) {
                continue;
            }
            if (scalarNames.contains(name.toLowerCase())) {
                continue; // ambiguous: a scalar of the same name exists
            }
            if (indices.size() != 1 && indices.size() != 2) {
                continue;
            }
            if (indices.stream().anyMatch(ix -> ix instanceof Expr.Range)) {
                continue; // a range slice declares its own shape; not an element write
            }
            int row;
            int col;
            try {
                row = constIndex(indices.get(0), ctx);
                col = indices.size() == 2 ? constIndex(indices.get(1), ctx) : 1;
            } catch (ParseException | ArithmeticException ignored) {
                continue; // non-constant index (e.g. a loop variable) — skip
            }
            int[] cur = maxIdx.computeIfAbsent(name.toLowerCase(), k -> new int[]{0, 0, indices.size()});
            cur[0] = Math.max(cur[0], row);
            cur[1] = Math.max(cur[1], col);
            cur[2] = Math.max(cur[2], indices.size()); // promote to 2-D if any access is 2-D
        }
        for (Map.Entry<String, int[]> e : maxIdx.entrySet()) {
            if (ctx.shapes().containsKey(e.getKey())) {
                continue; // explicit shape wins
            }
            int[] v = e.getValue();
            if (v[0] <= 0) {
                continue;
            }
            int dims = v[2];
            int cols = dims == 2 ? v[1] : 1;
            if (cols <= 0) {
                continue;
            }
            registerShape(e.getKey(), v[0], cols, dims, ctx);
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
        if (func.equals("dot") || func.equals("norm") || func.equals("nrm2") || func.equals(FN_DETERMINANT) || func.equals("asum")
                || func.equals("trace") || func.equals("matrixnorm") || func.equals("fronorm")) {
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
            case "trace" -> matrixTrace(args, ctx);
            case "matrixnorm", "fronorm" -> matrixFrobeniusNorm(args, ctx);
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

    /** Trace: sum of the diagonal entries of a square matrix. */
    private Expr matrixTrace(List<Expr> args, FlattenContext ctx) {
        MatrixInfo m = parseMatrixInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (m.rows != m.cols) {
            throw new ParseException("Trace requires a square matrix.");
        }
        Expr sum = null;
        for (int i = 0; i < m.rows; i++) {
            sum = sum == null ? m.elements[i][i] : new Expr.BinOp('+', sum, m.elements[i][i]);
        }
        return sum;
    }

    /** Frobenius norm: sqrt of the sum of squares of all entries. */
    private Expr matrixFrobeniusNorm(List<Expr> args, FlattenContext ctx) {
        MatrixInfo m = parseMatrixInfo(args.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr sumSq = null;
        for (int i = 0; i < m.rows; i++) {
            for (int j = 0; j < m.cols; j++) {
                Expr term = new Expr.BinOp('*', m.elements[i][j], m.elements[i][j]);
                sumSq = sumSq == null ? term : new Expr.BinOp('+', sumSq, term);
            }
        }
        return new Expr.Call("sqrt", List.of(sumSq));
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

    /** Default root-locus gain-sweep resolution when {@code K} is given as a bare name. */
    private static final int DEFAULT_RLOCUS_POINTS = 100;

    /**
     * Pads a partial output list (fewer targets than the intrinsic produces) with hidden sink
     * variables so MATLAB-style trailing omission — {@code [A, B] = tf2ss(num, den)} — works:
     * the dropped outputs are still computed into sinks the solver determines but never surfaces.
     * Only fixed-shape CALL intrinsics are padded (via {@link #expectedOutputCount}); user
     * PROCEDURE/MODULE calls and unknown names return {@code -1} and keep their own arity checks.
     */
    private void padOmittedOutputs(String defName, List<Expr> inputs, List<Expr> outputs, FlattenContext ctx) {
        if (outputs.isEmpty()) {
            return; // nothing to destructure into
        }
        int expected = expectedOutputCount(defName, inputs);
        while (expected > 0 && outputs.size() < expected) {
            outputs.add(newIgnoredSink());
        }
    }

    /**
     * The number of outputs a fixed-shape CALL intrinsic produces, used to pad MATLAB-style
     * trailing omission. Returns {@code -1} for user-defined PROCEDURE/MODULE calls and for
     * intrinsics whose output count must be stated explicitly (so they are never auto-padded).
     * Interconnection ops ({@code series}/{@code parallel}/{@code feedback}) yield 4 outputs in
     * their state-space form (≥8 inputs) and 2 in their transfer-function form.
     */
    private int expectedOutputCount(String defName, List<Expr> inputs) {
        return switch (defName) {
            case "eigenvalues" -> 1;
            case "eigen" -> 2;
            case "ludecompose" -> 2;
            case "eulerrotate" -> 1;
            case "eulerdecompose" -> 3;
            case "ss2ss" -> 3;
            case "ss2tf", "ss2tfij", "zp2tf", "c2d", "d2c", "pade",
                 "pole", "zero", "bode", "nyquist", "nichols" -> 2;
            case "tf2ss" -> 4;
            case "tf2zp" -> 5;
            case "series", "parallel", "feedback" -> inputs.size() >= 8 ? 4 : 2;
            case "margin", "stepinfo" -> 4;
            case "rlocus", "errorconst", "pidtune", "balreal", "linfit" -> 3;
            case "qr", "fft", "ifft" -> 2;
            case "svd" -> 3;
            // Single-output intrinsics need no padding (only one slot to fill).
            // residue (5/6) is variadic; leave its count explicit so the optional
            // repeated-pole order vector is never silently materialised.
            default -> -1;
        };
    }

    /**
     * Expand bare-name CALL outputs into full {@code 1..size} slices, sizing them from the
     * inputs exactly as the corresponding flattener does, so callers (notably the REPL) don't
     * have to restate a length the system already determines. Only acts when at least one output
     * is a bare {@link Expr.Var}; explicit slices are left as written, as are outputs whose count
     * is genuinely value-dependent (the finite-zero counts of {@code zero}/{@code tf2zp}). If the
     * inputs aren't in a sliceable form yet, it silently does nothing and lets the flattener
     * report the precise error.
     */
    private void autoSizeCallOutputs(String name, List<Expr> inputs, List<Expr> outputs, FlattenContext ctx) {
        if (outputs.stream().noneMatch(o -> o instanceof Expr.Var)) {
            return;
        }
        try {
            switch (name) {
                case "eigenvalues" -> setVec(outputs, 0, inMatRows(inputs, 0, ctx));
                case "eigen" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    setVec(outputs, 0, n);
                    setMat(outputs, 1, n, n);
                }
                case "ludecompose" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    setMat(outputs, 0, n, n);
                    setMat(outputs, 1, n, n);
                }
                case "eulerrotate" -> setMat(outputs, 0, 3, 3);

                case "ss2ss" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    setMat(outputs, 0, n, n);
                    setVec(outputs, 1, n);
                    setVec(outputs, 2, n);
                }
                case "ss2tf", "ss2tfij" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    setVec(outputs, 0, n + 1);
                    setVec(outputs, 1, n + 1);
                }
                case "tf2ss" -> {
                    int n = inVecLen(inputs, 1, ctx) - 1;
                    setMat(outputs, 0, n, n);
                    setVec(outputs, 1, n);
                    setVec(outputs, 2, n);
                }
                case "zp2tf" -> {
                    int np = inVecLen(inputs, 2, ctx);
                    setVec(outputs, 0, np + 1);
                    setVec(outputs, 1, np + 1);
                }
                case "tf2zp" -> {
                    // pr/pi follow the denominator degree; zr/zi (finite-zero count) stay explicit.
                    int np = inVecLen(inputs, 1, ctx) - 1;
                    setVec(outputs, 2, np);
                    setVec(outputs, 3, np);
                }
                case "pole" -> {
                    int n = inputs.size() == 1 ? inMatRows(inputs, 0, ctx) : inVecLen(inputs, 1, ctx) - 1;
                    setVec(outputs, 0, n);
                    setVec(outputs, 1, n);
                }
                case "zero" -> {
                    // Transfer-function form: the finite-zero count follows the
                    // numerator degree (mirrors pole's denominator-degree sizing).
                    // State-space (A,B,C,D) zero counts stay explicit.
                    if (inputs.size() == 2) {
                        int nz = inVecLen(inputs, 0, ctx) - 1;
                        setVec(outputs, 0, nz);
                        setVec(outputs, 1, nz);
                    }
                }
                case "series", "parallel", "feedback" -> {
                    if (inputs.size() >= 8) { // state-space combination
                        int n = inMatRows(inputs, 0, ctx) + inMatRows(inputs, 4, ctx);
                        setMat(outputs, 0, n, n);
                        setVec(outputs, 1, n);
                        setVec(outputs, 2, n);
                    } else { // transfer-function combination
                        int len = inVecLen(inputs, 0, ctx) + inVecLen(inputs, 2, ctx) - 1;
                        setVec(outputs, 0, len);
                        setVec(outputs, 1, len);
                    }
                }
                case "bode", "nyquist", "nichols" -> {
                    int nf = inVecLen(inputs, inputs.size() - 1, ctx);
                    setVec(outputs, 0, nf);
                    setVec(outputs, 1, nf);
                }
                case "lsim" -> setVec(outputs, 0, inVecLen(inputs, inputs.size() - 1, ctx));
                case "step", "impulse" -> {
                    // (num,den)/(A,B,C,D) -> default grid; trailing t -> match t.
                    int modelInputs = inputs.size() >= 4 ? 4 : 2;
                    boolean hasTime = inputs.size() == modelInputs + 1;
                    int n = hasTime ? inVecLen(inputs, inputs.size() - 1, ctx)
                                    : ControlSystemsFlattener.DEFAULT_TIME_POINTS;
                    setVec(outputs, 0, n);
                    if (outputs.size() == 2) {
                        setVec(outputs, 1, n); // [y, t] captures the auto-generated grid
                    }
                }
                case "residue" -> {
                    int n = inVecLen(inputs, 1, ctx) - 1;
                    setVec(outputs, 0, n);
                    setVec(outputs, 1, n);
                    setVec(outputs, 2, n);
                    setVec(outputs, 3, n);
                    if (outputs.size() == 6) {
                        setVec(outputs, 4, n); // repeated-pole order vector
                    }
                }
                case "lqr", "dlqr", "place", "acker" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    int m = inMatCols(inputs, 1, ctx);
                    // Single-input systems take a 1×n gain; size it as a plain n-vector K[1:n]
                    // (how SISO gains are written and used downstream, e.g. A - B*K) so bare/
                    // destructured outputs [K] = lqr(...) match. MIMO keeps the m×n matrix.
                    if (m == 1) {
                        setVec(outputs, 0, n);
                    } else {
                        setMat(outputs, 0, m, n);
                    }
                }
                case "dare", "lyap", "dlyap", "gram" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    setMat(outputs, 0, n, n);
                }
                case "lqe" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    int p = inMatRows(inputs, 2, ctx); // C is p×n
                    setMat(outputs, 0, n, p);
                }
                case "balreal" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    int m = inMatCols(inputs, 1, ctx); // B is n×m
                    int p = inMatRows(inputs, 2, ctx); // C is p×n
                    setMat(outputs, 0, n, n);
                    setMat(outputs, 1, n, m);
                    setMat(outputs, 2, p, n);
                }
                case "ctrb" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    int m = inMatCols(inputs, 1, ctx);
                    setMat(outputs, 0, n, n * m);
                }
                case "obsv" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    int p = inMatRows(inputs, 1, ctx);
                    setMat(outputs, 0, n * p, n);
                }
                case "pade" -> {
                    int m = inScalarInt(inputs, 1, ctx) + 1;
                    setVec(outputs, 0, m);
                    setVec(outputs, 1, m);
                }
                case "c2d", "d2c" -> {
                    int len = inVecLen(inputs, 1, ctx);
                    setVec(outputs, 0, len);
                    setVec(outputs, 1, len);
                }
                case "rlocus" -> {
                    int order = inVecLen(inputs, 1, ctx) - 1;
                    setVec(outputs, 0, DEFAULT_RLOCUS_POINTS);
                    setMat(outputs, 1, DEFAULT_RLOCUS_POINTS, order);
                    setMat(outputs, 2, DEFAULT_RLOCUS_POINTS, order);
                }
                case "qr" -> {
                    int m = inMatRows(inputs, 0, ctx);
                    setMat(outputs, 0, m, m);
                    setMat(outputs, 1, m, inMatCols(inputs, 0, ctx));
                }
                case "cholesky", "matexp" -> {
                    int n = inMatRows(inputs, 0, ctx);
                    setMat(outputs, 0, n, n);
                }
                case "singularvalues" -> setVec(outputs, 0,
                        Math.min(inMatRows(inputs, 0, ctx), inMatCols(inputs, 0, ctx)));
                case "svd" -> {
                    int m = inMatRows(inputs, 0, ctx);
                    int n = inMatCols(inputs, 0, ctx);
                    int p = Math.min(m, n);
                    setMat(outputs, 0, m, p);
                    setMat(outputs, 1, p, p);
                    setMat(outputs, 2, n, p);
                }
                case "fft", "ifft" -> {
                    int n = inVecLen(inputs, 0, ctx);
                    setVec(outputs, 0, n);
                    setVec(outputs, 1, n);
                }
                case "convolve" -> setVec(outputs, 0,
                        inVecLen(inputs, 0, ctx) + inVecLen(inputs, 1, ctx) - 1);
                case "polyfit" -> setVec(outputs, 0, inScalarInt(inputs, 2, ctx) + 1);
                default -> { /* scalar-output or value-declared outputs: leave as written */ }
            }
        } catch (ParseException ignored) {
            // Inputs not sliceable yet — defer to the flattener's own (more specific) error.
        }
    }

    private static void setVec(List<Expr> outputs, int i, int size) {
        if (i < outputs.size() && outputs.get(i) instanceof Expr.Var v && size > 0) {
            outputs.set(i, new Expr.ArrayAccess(v.name(), List.of(rangeOneTo(size))));
        }
    }

    private static void setMat(List<Expr> outputs, int i, int rows, int cols) {
        if (i < outputs.size() && outputs.get(i) instanceof Expr.Var v && rows > 0 && cols > 0) {
            outputs.set(i, new Expr.ArrayAccess(v.name(), List.of(rangeOneTo(rows), rangeOneTo(cols))));
        }
    }

    private static Expr.Range rangeOneTo(int n) {
        return new Expr.Range(new Expr.Num(1.0), new Expr.Num((double) n));
    }

    private int inVecLen(List<Expr> inputs, int idx, FlattenContext ctx) {
        return parseVectorInfo(inputs.get(idx), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()).size;
    }

    private int inMatRows(List<Expr> inputs, int idx, FlattenContext ctx) {
        Expr expr = inputs.get(idx);
        if (expr instanceof Expr.ArrayAccess aa) {
            if (aa.indices().size() == 2) return parseMatrixInfo(expr, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()).rows;
            if (aa.indices().size() == 1) return parseVectorInfo(expr, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()).size;
        }
        return 1;
    }

    private int inMatCols(List<Expr> inputs, int idx, FlattenContext ctx) {
        Expr expr = inputs.get(idx);
        if (expr instanceof Expr.ArrayAccess aa) {
            if (aa.indices().size() == 2) return parseMatrixInfo(expr, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs()).cols;
            if (aa.indices().size() == 1) return 1;
        }
        return 1;
    }

    private int inScalarInt(List<Expr> inputs, int idx, FlattenContext ctx) {
        return constIndex(inputs.get(idx), ctx);
    }

    /** Evaluates a compile-time integer (e.g. a 1-based channel index for MIMO ss2tf). */
    int constIndex(Expr e, FlattenContext ctx) {
        Expr ex = expandExpr(e, ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        return (int) Math.round(evalIndexExpr(ex, ctx.loopVars(), ctx.constants(), ctx.defs()));
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

        // MATLAB-style trailing-output omission: [A, B] = tf2ss(num, den) keeps only the
        // first outputs and discards the rest. Pad the missing trailing slots with hidden
        // sink variables up to the intrinsic's full arity so the flattener still computes
        // (and the solver still determines) every output; the sinks are filtered from results.
        padOmittedOutputs(defName, inputs, outputs, ctx);

        // Let callers write bare output names (CALL Eigenvalues(A : lambda)); size them from the
        // inputs the same way each flattener does. Explicit slices and value-dependent counts
        // (zero/tf2zp zeros) are left untouched.
        autoSizeCallOutputs(defName, inputs, outputs, ctx);

        if (defName.equals("eigenvalues") || defName.equals("eigen")) {
            flattenEigen(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ludecompose") || defName.equals("eulerdecompose") || defName.equals("eulerrotate")) {
            flattenDecomposeOrRotate(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (LIN_ALG_SIGNAL_STATS_CALLS.contains(defName)) {
            flattenLinAlgSignalStats(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ss2tf")) {
            csFlattener.flattenSs2tf(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ss2tfij")) {
            csFlattener.flattenSs2tfMimo(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("tf2ss")) {
            csFlattener.flattenTf2ss(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("zp2tf")) {
            csFlattener.flattenZp2tf(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("tf2zp")) {
            csFlattener.flattenTf2zp(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("series")) {
            if (inputs.size() == 8) {
                csFlattener.flattenSsSeries(inputs, outputs, sourceText, ctx);
            } else {
                csFlattener.flattenSeries(inputs, outputs, sourceText, ctx);
            }
            return;
        }
        if (defName.equals("parallel")) {
            if (inputs.size() == 8) {
                csFlattener.flattenSsParallel(inputs, outputs, sourceText, ctx);
            } else {
                csFlattener.flattenParallel(inputs, outputs, sourceText, ctx);
            }
            return;
        }
        if (defName.equals("feedback")) {
            if (inputs.size() == 8 || inputs.size() == 9) {
                csFlattener.flattenSsFeedback(inputs, outputs, sourceText, ctx);
            } else {
                csFlattener.flattenFeedback(inputs, outputs, sourceText, ctx);
            }
            return;
        }
        if (defName.equals("pole")) {
            csFlattener.flattenPole(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("zero")) {
            csFlattener.flattenZero(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("bode")) {
            csFlattener.flattenBode(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("nyquist")) {
            csFlattener.flattenNyquist(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("margin")) {
            csFlattener.flattenMargin(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("step") || defName.equals("impulse")) {
            csFlattener.flattenTimeResponse(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("lsim")) {
            csFlattener.flattenLsim(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("lqr")) {
            csFlattener.flattenLqr(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("dlqr")) {
            csFlattener.flattenDlqr(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("dare")) {
            csFlattener.flattenDare(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("lyap")) {
            csFlattener.flattenLyap(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("dlyap")) {
            csFlattener.flattenDlyap(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("place") || defName.equals("acker")) {
            csFlattener.flattenPlace(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("lqe")) {
            csFlattener.flattenLqe(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("gram")) {
            csFlattener.flattenGram(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("balreal")) {
            csFlattener.flattenBalreal(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("pidtune")) {
            csFlattener.flattenPidtune(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("rank")) {
            csFlattener.flattenRank(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ctrb")) {
            csFlattener.flattenCtrb(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("obsv")) {
            csFlattener.flattenObsv(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("ss2ss")) {
            csFlattener.flattenSs2ss(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("stepinfo")) {
            csFlattener.flattenStepInfo(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("pade")) {
            csFlattener.flattenPade(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("rlocus")) {
            csFlattener.flattenRlocus(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("routh")) {
            csFlattener.flattenRouth(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("c2d") || defName.equals("d2c")) {
            csFlattener.flattenDiscretize(defName, inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("residue")) {
            csFlattener.flattenResidue(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("nichols")) {
            csFlattener.flattenNichols(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("errorconst")) {
            csFlattener.flattenErrorConst(inputs, outputs, sourceText, ctx);
            return;
        }
        if (defName.equals("mason")) {
            csFlattener.flattenMason(inputs, outputs, sourceText, ctx);
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

    /** CALL intrinsics for dense linear algebra, signal processing and regression
     *  whose results are computed numerically from resolved (known) entries —
     *  mirroring the eigendecomposition path. */
    static final java.util.Set<String> LIN_ALG_SIGNAL_STATS_CALLS = java.util.Set.of(
            "qr", "cholesky", "matexp", "singularvalues", "svd",
            "fft", "ifft", "convolve",
            "linfit", "polyfit", "interp2");

    private void flattenLinAlgSignalStats(String defName, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        switch (defName) {
            case "qr" -> flattenQr(inputs, outputs, sourceText, ctx);
            case "cholesky" -> flattenCholesky(inputs, outputs, sourceText, ctx);
            case "matexp" -> flattenMatExp(inputs, outputs, sourceText, ctx);
            case "singularvalues" -> flattenSingularValues(inputs, outputs, sourceText, ctx);
            case "svd" -> flattenSvd(inputs, outputs, sourceText, ctx);
            case "fft" -> flattenFft(false, inputs, outputs, sourceText, ctx);
            case "ifft" -> flattenFft(true, inputs, outputs, sourceText, ctx);
            case "convolve" -> flattenConvolve(inputs, outputs, sourceText, ctx);
            case "linfit" -> flattenLinFit(inputs, outputs, sourceText, ctx);
            case "polyfit" -> flattenPolyFit(inputs, outputs, sourceText, ctx);
            case "interp2" -> flattenInterp2(inputs, outputs, sourceText, ctx);
            default -> throw new ParseException("Unsupported linear-algebra/signal/stats CALL: " + defName);
        }
    }

    private static List<Expr> matrixEntries(MatrixInfo m) {
        List<Expr> entries = new ArrayList<>(m.rows * m.cols);
        for (int i = 0; i < m.rows; i++) {
            entries.addAll(Arrays.asList(m.elements[i]));
        }
        return entries;
    }

    private void flattenQr(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 2) {
            throw new ParseException("QR expects 1 input matrix and 2 output matrices, e.g. CALL QR(A[1:3,1:3] : Q[1:3,1:3], R[1:3,1:3])");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo q = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo r = parseMatrixInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int m = a.rows;
        int n = a.cols;
        if (q.rows != m || q.cols != m) {
            throw new ParseException("QR requires Q to be " + m + "x" + m + " (m x m for an m x n input).");
        }
        if (r.rows != m || r.cols != n) {
            throw new ParseException("QR requires R to match the input shape (" + m + "x" + n + ").");
        }
        List<Expr> entries = matrixEntries(a);
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < m; j++) {
                ctx.out().add(new Equation(q.elements[i][j],
                        new Expr.Call("qr$q$" + i + "$" + j + "$" + m + "$" + n, entries), sourceText));
            }
        }
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(r.elements[i][j],
                        new Expr.Call("qr$r$" + i + "$" + j + "$" + m + "$" + n, entries), sourceText));
            }
        }
    }

    private void flattenCholesky(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 1) {
            throw new ParseException("Cholesky expects 1 input matrix and 1 output matrix, e.g. CALL Cholesky(A[1:3,1:3] : L[1:3,1:3])");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo l = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (a.rows != a.cols || l.rows != a.rows || l.cols != a.cols) {
            throw new ParseException("Cholesky requires square matrices of identical size.");
        }
        int n = a.rows;
        List<Expr> entries = matrixEntries(a);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(l.elements[i][j],
                        new Expr.Call("chol$l$" + i + "$" + j + "$" + n, entries), sourceText));
            }
        }
    }

    private void flattenMatExp(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 1) {
            throw new ParseException("MatExp expects 1 input matrix and 1 output matrix, e.g. CALL MatExp(A[1:2,1:2] : E[1:2,1:2])");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo e = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (a.rows != a.cols || e.rows != a.rows || e.cols != a.cols) {
            throw new ParseException("MatExp requires square matrices of identical size.");
        }
        int n = a.rows;
        List<Expr> entries = matrixEntries(a);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                ctx.out().add(new Equation(e.elements[i][j],
                        new Expr.Call("expm$" + i + "$" + j + "$" + n, entries), sourceText));
            }
        }
    }

    private void flattenSingularValues(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 1) {
            throw new ParseException("SingularValues expects 1 input matrix and 1 output vector, e.g. CALL SingularValues(A[1:3,1:2] : s[1:2])");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo s = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int m = a.rows;
        int n = a.cols;
        if (s.size != Math.min(m, n)) {
            throw new ParseException("SingularValues requires an output vector of length min(rows, cols) = " + Math.min(m, n) + ".");
        }
        List<Expr> entries = matrixEntries(a);
        for (int k = 0; k < s.size; k++) {
            ctx.out().add(new Equation(s.elements[k],
                    new Expr.Call("svd$s$" + k + "$" + m + "$" + n, entries), sourceText));
        }
    }

    private void flattenSvd(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 1 || outputs.size() != 3) {
            throw new ParseException("SVD expects 1 input matrix and 3 output matrices, e.g. CALL SVD(A : U, S, V)");
        }
        MatrixInfo a = parseMatrixInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo u = parseMatrixInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo s = parseMatrixInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo v = parseMatrixInfo(outputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());

        int m = a.rows;
        int n = a.cols;
        int p = Math.min(m, n);
        if (u.rows != m || u.cols != p || s.rows != p || s.cols != p || v.rows != n || v.cols != p) {
            throw new ParseException(String.format("SVD of a %dx%d matrix requires outputs U (%dx%d), S (%dx%d), and V (%dx%d).",
                    m, n, m, p, p, p, n, p));
        }

        List<Expr> entries = matrixEntries(a);

        // U matrix
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < p; j++) {
                ctx.out().add(new Equation(u.elements[i][j],
                        new Expr.Call("svd$u$" + i + "$" + j + "$" + m + "$" + n, entries), sourceText));
            }
        }
        // S matrix
        for (int i = 0; i < p; i++) {
            for (int j = 0; j < p; j++) {
                ctx.out().add(new Equation(s.elements[i][j],
                        new Expr.Call("svd$smat$" + i + "$" + j + "$" + m + "$" + n, entries), sourceText));
            }
        }
        // V matrix
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < p; j++) {
                ctx.out().add(new Equation(v.elements[i][j],
                        new Expr.Call("svd$v$" + i + "$" + j + "$" + m + "$" + n, entries), sourceText));
            }
        }
    }

    private void flattenFft(boolean inverse, List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        String name = inverse ? "IFFT" : "FFT";
        if (inputs.size() != 2 || outputs.size() != 2) {
            throw new ParseException(name + " expects 2 input vectors (real, imag) and 2 output vectors, e.g. CALL " + name + "(re[1:n], im[1:n] : outRe[1:n], outIm[1:n])");
        }
        VectorInfo re = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo im = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo outRe = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo outIm = parseVectorInfo(outputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = re.size;
        if (im.size != n || outRe.size != n || outIm.size != n) {
            throw new ParseException(name + " requires all four vectors to have the same length.");
        }
        List<Expr> entries = new ArrayList<>(2 * n);
        entries.addAll(Arrays.asList(re.elements));
        entries.addAll(Arrays.asList(im.elements));
        String prefix = inverse ? "ifft" : "fft";
        for (int k = 0; k < n; k++) {
            ctx.out().add(new Equation(outRe.elements[k],
                    new Expr.Call(prefix + "$re$" + k + "$" + n, entries), sourceText));
            ctx.out().add(new Equation(outIm.elements[k],
                    new Expr.Call(prefix + "$im$" + k + "$" + n, entries), sourceText));
        }
    }

    private void flattenConvolve(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 1) {
            throw new ParseException("Convolve expects 2 input vectors and 1 output vector, e.g. CALL Convolve(a[1:m], b[1:n] : c[1:m+n-1])");
        }
        VectorInfo a = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo b = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo c = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int m = a.size;
        int n = b.size;
        if (c.size != m + n - 1) {
            throw new ParseException("Convolve requires the output length to be m + n - 1 = " + (m + n - 1) + ".");
        }
        List<Expr> entries = new ArrayList<>(m + n);
        entries.addAll(Arrays.asList(a.elements));
        entries.addAll(Arrays.asList(b.elements));
        for (int k = 0; k < c.size; k++) {
            ctx.out().add(new Equation(c.elements[k],
                    new Expr.Call("conv$" + k + "$" + m + "$" + n, entries), sourceText));
        }
    }

    private void flattenLinFit(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 2 || outputs.size() != 3) {
            throw new ParseException("LinFit expects 2 input vectors and 3 outputs (slope, intercept, r2), e.g. CALL LinFit(x[1:n], y[1:n] : slope, intercept, r2)");
        }
        VectorInfo x = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo y = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int n = x.size;
        if (y.size != n) {
            throw new ParseException("LinFit requires x and y of equal length.");
        }
        List<Expr> entries = new ArrayList<>(2 * n);
        entries.addAll(Arrays.asList(x.elements));
        entries.addAll(Arrays.asList(y.elements));
        String[] parts = {"slope", "intercept", "r2"};
        for (int k = 0; k < 3; k++) {
            Expr out = expandExpr(outputs.get(k), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
            ctx.out().add(new Equation(out, new Expr.Call("linfit$" + parts[k] + "$" + n, entries), sourceText));
        }
    }

    private void flattenPolyFit(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 3 || outputs.size() != 1) {
            throw new ParseException("PolyFit expects 2 input vectors and a degree, plus 1 output coefficient vector, e.g. CALL PolyFit(x[1:n], y[1:n], 2 : c[1:3])");
        }
        VectorInfo x = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo y = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int degree = inScalarInt(inputs, 2, ctx);
        int n = x.size;
        if (y.size != n) {
            throw new ParseException("PolyFit requires x and y of equal length.");
        }
        if (degree < 0) {
            throw new ParseException("PolyFit degree must be >= 0.");
        }
        VectorInfo c = parseVectorInfo(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        if (c.size != degree + 1) {
            throw new ParseException("PolyFit requires a coefficient vector of length degree + 1 = " + (degree + 1) + ".");
        }
        List<Expr> entries = new ArrayList<>(2 * n);
        entries.addAll(Arrays.asList(x.elements));
        entries.addAll(Arrays.asList(y.elements));
        for (int k = 0; k <= degree; k++) {
            ctx.out().add(new Equation(c.elements[k],
                    new Expr.Call("polyfit$" + k + "$" + degree + "$" + n, entries), sourceText));
        }
    }

    private void flattenInterp2(List<Expr> inputs, List<Expr> outputs, String sourceText, FlattenContext ctx) {
        if (inputs.size() != 5 || outputs.size() != 1) {
            throw new ParseException("Interp2 expects (x[1:m], y[1:n], Z[1:m,1:n], xq, yq : zq), e.g. CALL Interp2(x, y, Z, 1.5, 2.5 : zq)");
        }
        VectorInfo x = parseVectorInfo(inputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        VectorInfo y = parseVectorInfo(inputs.get(1), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        MatrixInfo z = parseMatrixInfo(inputs.get(2), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        int m = x.size;
        int n = y.size;
        if (z.rows != m || z.cols != n) {
            throw new ParseException("Interp2 requires Z to be m x n (" + m + "x" + n + ") matching x and y.");
        }
        Expr xq = expandExpr(inputs.get(3), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        Expr yq = expandExpr(inputs.get(4), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        List<Expr> entries = new ArrayList<>(m + n + m * n + 2);
        entries.addAll(Arrays.asList(x.elements));
        entries.addAll(Arrays.asList(y.elements));
        entries.addAll(matrixEntries(z));
        entries.add(xq);
        entries.add(yq);
        Expr out = expandExpr(outputs.get(0), ctx.loopVars(), ctx.constants(), ctx.displayNames(), ctx.defs());
        ctx.out().add(new Equation(out, new Expr.Call("interp2$" + m + "$" + n, entries), sourceText));
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

    Expr expandExpr(Expr e, Map<String, Double> loopVars,
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

    double evalIndexExpr(Expr e, Map<String, Double> loopVars,
                                  Map<String, Double> constants, Map<String, ProcDef> defs) {
        Map<String, Double> combined = new HashMap<>(constants);
        combined.putAll(loopVars);
        try {
            return Evaluator.eval(e, combined, defs);
        } catch (Exception ex) {
            throw new ParseException("Array index expression cannot be evaluated to a constant: " + e);
        }
    }

    static class MatrixInfo {
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

    MatrixInfo parseMatrixInfo(Expr expr, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, String> displayNames, Map<String, ProcDef> defs) {
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

    static class VectorInfo {
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

    VectorInfo parseVectorInfo(Expr expr, Map<String, Double> loopVars, Map<String, Double> constants, Map<String, String> displayNames, Map<String, ProcDef> defs) {
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
