package com.frees.backend.api;

import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.cas.CasEngine;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.parser.AstBuilder;
import com.frees.backend.parser.FreesLexer;
import com.frees.backend.parser.FreesParser;
import com.frees.backend.units.Quantity;
import org.antlr.v4.runtime.BaseErrorListener;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.Recognizer;
import org.antlr.v4.runtime.Token;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Evaluates a single REPL line against a cached solved workspace.
 *
 * <p>Reuses the solver's own lexer/parser/AST-builder and {@link Evaluator}, so
 * any expression valid in a frees equation behaves identically here. Beyond
 * plain evaluation it supports:
 * <ul>
 *   <li><b>assignment</b> — {@code A = 356 [kPa]} defines a REPL variable that
 *       persists for the session and is visible to later lines;</li>
 *   <li><b>units</b> — results are labelled with a unit derived from the
 *       operands' dimensions ({@link ReplDimensions});</li>
 *   <li><b>bare-variable echo</b> — a lone variable shows its workspace value.</li>
 * </ul>
 */
@Service
public class ReplEvaluator {

    private static final Logger log = LoggerFactory.getLogger(ReplEvaluator.class);

    /** {@code name = expr} where the '=' isn't part of ==, <=, >=, <>. */
    private static final Pattern ASSIGNMENT =
            Pattern.compile("^\\s*([A-Za-z_][A-Za-z0-9_$]*(?:\\s*\\[[^\\]]+\\])?)\\s*=\\s*(?!=)(.+)$", Pattern.DOTALL);

    /** A {@code CALL name(inputs : outputs)} statement — the procedure/library form. */
    private static final Pattern CALL_PREFIX = Pattern.compile("^\\s*CALL\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern CALL_SIG =
            Pattern.compile("^\\s*CALL\\s+([A-Za-z_][A-Za-z0-9_$]*)\\s*\\((.*)\\)\\s*$",
                    Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern IDENTIFIER = Pattern.compile("[A-Za-z_][A-Za-z0-9_$]*");

    /** A symbolic CAS function call: {@code Factor(x^2-1)}, {@code Apart(expr, s)}, {@code Laplace(f, t, s)}. */
    private static final Pattern CAS_CALL = Pattern.compile(
            "^\\s*(factor|expand|simplify|together|cancel|apart|laplace|inverselaplace|ilaplace"
                    + "|numerator|denominator|collect|diff|integrate)\\s*\\((.*)\\)\\s*$",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    /** Symja-backed computer algebra (symbolic factor/expand/simplify/partial-fractions/Laplace). */
    private final CasEngine cas = new CasEngine();
    /** A CALL output: a bare name, or a sized slice like {@code lambda[1:2]} / {@code V[1:2,1:2]}. */
    private static final Pattern OUTPUT_TOKEN =
            Pattern.compile("[A-Za-z_][A-Za-z0-9_$]*\\s*(?:\\[[^\\]]*\\])?");

    /** Shares the singleton solver so CALL lines flatten/solve exactly as the document pipeline does. */
    private final EquationSystemSolver solver;

    public ReplEvaluator(EquationSystemSolver solver) {
        this.solver = solver;
    }

    /** Result of evaluating one REPL line. {@code text} is the formatted line to print.
     *  {@code assignedName} is set (display spelling) when the line defined a variable,
     *  so the frontend can reflect it in the Variable Explorer / Solution. */
    public record Outcome(boolean success, Double value, String text,
                          String unit, Double uncertainty, String error, String assignedName,
                          List<ReplController.ReplVarDto> assignedVariables) {
        static Outcome ok(double value, String text, String unit, Double uncertainty) {
            return new Outcome(true, value, text, unit, uncertainty, null, null, null);
        }

        static Outcome fail(String error) {
            return new Outcome(false, null, null, null, null, error, null, null);
        }

        Outcome named(String name) {
            return new Outcome(success, value, text, unit, uncertainty, error, name, assignedVariables);
        }

        Outcome withVariables(List<ReplController.ReplVarDto> vars) {
            return new Outcome(success, value, text, unit, uncertainty, error, assignedName, vars);
        }
    }

    private static final Pattern RANGE_PATTERN =
            Pattern.compile("^\\s*\\[?\\s*(.+?)\\s*:\\s*(.+?)\\s*(?::\\s*(.+?)\\s*)?\\]?\\s*$");

    public Outcome evaluate(String input, SolveContextCache.Session session) {
        if (input == null || input.isBlank()) {
            return Outcome.fail("Empty expression.");
        }
        if (session == null) {
            return Outcome.fail("No solved context for this session yet — solve the document first.");
        }

        Matcher casCall = CAS_CALL.matcher(input.trim());
        if (casCall.matches()) {
            return evaluateCas(casCall.group(1), casCall.group(2));
        }

        if (CALL_PREFIX.matcher(input).find()) {
            return evaluateCall(input.trim(), session);
        }

        Matcher assign = ASSIGNMENT.matcher(input.trim());
        if (assign.matches()) {
            return assignment(assign.group(1), assign.group(2), session);
        }

        final Expr expr;
        try {
            expr = parseExpression(input.trim());
        } catch (ParseError e) {
            // Check if it's a bare range vector (like [1:2:10] or 1:2:10)
            List<Double> rangeValues = new ArrayList<>();
            if (tryParseAndEvaluateRange(input, session, rangeValues)) {
                int size = rangeValues.size();
                double[][] mat = new double[1][size];
                List<ReplController.ReplVarDto> assignedList = new ArrayList<>();
                session.clearVariable("ans");
                for (int i = 0; i < size; i++) {
                    double val = rangeValues.get(i);
                    mat[0][i] = val;
                    String canonical = "ans[" + (i + 1) + "]";
                    session.define(canonical, val, new SolveContextCache.ReplVar(val, "", null));
                    assignedList.add(new ReplController.ReplVarDto(canonical, val, "", null));
                }
                String body = formatMatrix(mat);
                return Outcome.ok(0.0, body, "", null)
                        .named("ans")
                        .withVariables(assignedList);
            }
            return Outcome.fail("Syntax error: " + e.getMessage());
        }

        // Check if it is a bare matrix/vector literal (like [3 4 5; 2 4 5])
        if (expr instanceof Expr.ArrayLiteral literal) {
            try {
                double[][] mat = evaluateMatrixLiteral(literal, session);
                int rows = mat.length;
                int cols = rows > 0 ? mat[0].length : 0;
                boolean vector = rows == 1 || cols == 1;
                List<ReplController.ReplVarDto> assignedList = new ArrayList<>();
                session.clearVariable("ans");
                for (int i = 0; i < rows; i++) {
                    for (int j = 0; j < cols; j++) {
                        String canonical = vector
                                ? "ans[" + (Math.max(i, j) + 1) + "]"
                                : "ans[" + (i + 1) + "," + (j + 1) + "]";
                        double val = mat[i][j];
                        session.define(canonical, val, new SolveContextCache.ReplVar(val, "", null));
                        assignedList.add(new ReplController.ReplVarDto(canonical, val, "", null));
                    }
                }
                String body = formatMatrix(mat);
                return Outcome.ok(0.0, body, "", null)
                        .named("ans")
                        .withVariables(assignedList);
            } catch (Exception ex) {
                return Outcome.fail(ex.getMessage() != null ? ex.getMessage() : "Could not evaluate matrix literal.");
            }
        }

        Expr resolvedExpr = resolveArrayAccesses(expr, session);
        Map<String, int[]> shapes = getVarShapes(session);

        // Check if it is a matrix expression
        if (containsMatrixExpr(resolvedExpr, shapes)) {
            try {
                Expr[][] matExpr = compileReplMatrix(resolvedExpr, shapes, session);
                int rows = matExpr.length;
                int cols = matExpr[0].length;
                double[][] mat = new double[rows][cols];

                // Determine unit
                Quantity dim = null;
                if (rows > 0 && cols > 0) {
                    dim = ReplDimensions.dimensionOf(matExpr[0][0], session::unitOf, session.siValues(), session.defs());
                }
                Object[] disp = ReplDimensions.toDisplay(1.0, dim, session.system());
                String unit = disp != null ? (String) disp[1] : "";

                boolean vector = rows == 1 || cols == 1;
                for (int i = 0; i < rows; i++) {
                    for (int j = 0; j < cols; j++) {
                        mat[i][j] = Evaluator.eval(lowercaseVars(matExpr[i][j]), session.siValues(), session.defs());
                    }
                }

                session.clearVariable("ans");
                List<ReplController.ReplVarDto> assignedList = new ArrayList<>();
                for (int i = 0; i < rows; i++) {
                    for (int j = 0; j < cols; j++) {
                        String canonical = vector
                                ? "ans[" + (Math.max(i, j) + 1) + "]"
                                : "ans[" + (i + 1) + "," + (j + 1) + "]";
                        session.define(canonical, mat[i][j], new SolveContextCache.ReplVar(mat[i][j], unit, null));
                        assignedList.add(new ReplController.ReplVarDto(canonical, mat[i][j], unit, null));
                    }
                }

                String body = formatMatrix(mat);
                if (unit != null && !unit.isBlank() && !unit.equals("-")) {
                    body += " [" + unit + "]";
                }

                return Outcome.ok(0.0, body, unit, null)
                        .named("ans")
                        .withVariables(assignedList);
            } catch (Exception ex) {
                return Outcome.fail(ex.getMessage() != null ? ex.getMessage() : "Could not evaluate matrix expression.");
            }
        }

        // A bare variable query echoes exactly what the workspace shows, and saves it to 'ans'.
        if (resolvedExpr instanceof Expr.Var v) {
            String lowerName = v.name().toLowerCase();
            SolveContextCache.ReplVar known = session.displayOf(lowerName);
            if (known != null) {
                Double siVal = session.siValues().get(lowerName);
                double si = siVal != null ? siVal : known.value();
                session.define("ans", si, known);
                return Outcome.ok(known.value(),
                        format(known.value(), known.unit(), known.uncertainty()),
                        known.unit(), known.uncertainty()).named("ans");
            }
        }

        // Check if expr is a comparison: left = right
        if (resolvedExpr instanceof Expr.Compare cmp && "=".equals(cmp.op())) {
            Set<String> allVars = new TreeSet<>();
            allVars.addAll(cmp.left().variables());
            allVars.addAll(cmp.right().variables());

            List<String> unknowns = allVars.stream()
                    .filter(v -> !session.siValues().containsKey(v.toLowerCase()))
                    .toList();

            if (unknowns.size() == 1) {
                String unknownVar = unknowns.get(0).toLowerCase();

                Double solvedSi = solveForUnknown(cmp.left(), cmp.right(), unknownVar, session);
                if (solvedSi == null) {
                    return Outcome.fail("Could not solve equation for " + unknownVar);
                }

                Quantity unknownDim = findDimensionForCompare(cmp.left(), cmp.right(), unknownVar, session);

                Object[] disp = ReplDimensions.toDisplay(solvedSi, unknownDim, session.system());
                double shown = disp != null ? (double) disp[0] : solvedSi;
                String unit = disp != null ? (String) disp[1] : "";

                String originalSpelling = getOriginalSpelling(input, unknownVar);
                originalSpelling = findOriginalCasing(originalSpelling, session);

                String body = format(shown, unit, null);

                session.clearVariable(originalSpelling.toLowerCase());
                session.define(originalSpelling.toLowerCase(),
                        solvedSi,
                        new SolveContextCache.ReplVar(shown, unit, null));

                return Outcome.ok(shown, originalSpelling + " = " + body, unit, null).named(originalSpelling);
            }
        }

        return evaluated(resolvedExpr, session, null);
    }

    /** Evaluates {@code name = rhs}, recording the result as a session variable. */
    /**
     * Evaluate a symbolic CAS call — {@code Factor(x^2-1)}, {@code Expand((x+1)^3)},
     * {@code Simplify(...)}, {@code Together/Cancel(...)}, {@code Apart(expr, var)},
     * {@code Laplace(f, t, s)}, {@code InverseLaplace(F, s, t)} — via the Symja engine. The
     * argument is taken verbatim (any free variables stay symbolic, so no solved context is
     * needed), and the transformed expression is returned as text.
     */
    private Outcome evaluateCas(String fnRaw, String argsText) {
        String fn = fnRaw.toLowerCase();
        List<String> args = splitTopLevelCommas(argsText);
        if (args.isEmpty() || args.get(0).isBlank()) {
            return Outcome.fail(fnRaw + " needs an expression, e.g. " + fnRaw + "(x^2 - 1)");
        }
        String expr = stripQuotes(args.get(0));
        try {
            CasEngine.CasResult r;
            String head; // Symja head; used to detect an unevaluated (no-closed-form) result
            switch (fn) {
                case "factor" -> { r = cas.factor(expr); head = "Factor"; }
                case "expand" -> { r = cas.expand(expr); head = "Expand"; }
                case "simplify" -> { r = cas.simplify(expr); head = "Simplify"; }
                case "together" -> { r = cas.apply("Together", expr); head = "Together"; }
                case "cancel" -> { r = cas.apply("Cancel", expr); head = "Cancel"; }
                case "numerator" -> { r = cas.apply("Numerator", expr); head = "Numerator"; }
                case "denominator" -> { r = cas.apply("Denominator", expr); head = "Denominator"; }
                case "apart" -> {
                    if (args.size() < 2) {
                        return Outcome.fail("apart needs a variable: apart(expr, var), "
                                + "e.g. apart((s+3)/(s^2+3*s+2), s)");
                    }
                    r = cas.apart(expr, stripQuotes(args.get(1)));
                    head = "Apart";
                }
                case "collect" -> {
                    if (args.size() < 2) return Outcome.fail("collect needs a variable: collect(expr, var)");
                    r = cas.applyWithVariable("Collect", expr, stripQuotes(args.get(1)));
                    head = "Collect";
                }
                case "diff" -> {
                    if (args.size() < 2) return Outcome.fail("diff needs a variable: diff(expr, var)");
                    r = cas.applyWithVariable("D", expr, stripQuotes(args.get(1)));
                    head = "D";
                }
                case "integrate" -> {
                    if (args.size() < 2) return Outcome.fail("integrate needs a variable: integrate(expr, var)");
                    r = cas.applyWithVariable("Integrate", expr, stripQuotes(args.get(1)));
                    head = "Integrate";
                }
                case "laplace" -> {
                    String t = args.size() > 1 ? stripQuotes(args.get(1)) : "t";
                    String s = args.size() > 2 ? stripQuotes(args.get(2)) : "s";
                    r = cas.laplace(expr, t, s);
                    head = "LaplaceTransform";
                }
                case "inverselaplace", "ilaplace" -> {
                    String s = args.size() > 1 ? stripQuotes(args.get(1)) : "s";
                    String t = args.size() > 2 ? stripQuotes(args.get(2)) : "t";
                    r = cas.inverseLaplace(expr, s, t);
                    head = "InverseLaplaceTransform";
                }
                default -> { return Outcome.fail("Unknown CAS function: " + fnRaw); }
            }
            // Symja returns the call unchanged when it has no closed form — surface that plainly
            // instead of echoing the unevaluated expression back to the user.
            if (isUnevaluated(r, head)) {
                return Outcome.fail(fnRaw + ": no closed form found for this input.");
            }
            return Outcome.ok(0.0, casDisplay(r), "", null);
        } catch (CasEngine.CasException e) {
            return Outcome.fail("CAS: " + e.getMessage());
        }
    }

    /** True when Symja echoed the call back (same head) rather than transforming it. */
    private static boolean isUnevaluated(CasEngine.CasResult r, String symjaHead) {
        String out = r.symjaOutput().replaceAll("\\s", "");
        return out.regionMatches(true, 0, symjaHead + "(", 0, symjaHead.length() + 1);
    }

    /** Plain-text form of a CAS result (Symja infix with frees-friendly log names). */
    private static String casDisplay(CasEngine.CasResult r) {
        return r.symjaOutput().replace("Log10(", "log10(").replace("Log(", "ln(");
    }

    /** Drop one layer of surrounding single/double quotes, if present. */
    private static String stripQuotes(String s) {
        String t = s.trim();
        if (t.length() >= 2) {
            char a = t.charAt(0);
            char b = t.charAt(t.length() - 1);
            if ((a == '\'' && b == '\'') || (a == '"' && b == '"')) {
                return t.substring(1, t.length() - 1).trim();
            }
        }
        return t;
    }

    /**
     * Evaluate a {@code CALL name(inputs : outputs)} line — the procedure/control-systems
     * library (Eigen, Bode, Routh, Residue, LQR, c2d, …) that the bare expression evaluator
     * cannot reach because CALL is a statement, not an expression.
     *
     * <p>Strategy: synthesize a self-contained mini-document — seed the input variables the
     * CALL references from the current session (scalars and array elements alike), append the
     * CALL line verbatim, then run the real {@link EquationSystemSolver}. This reuses the exact
     * flatten/solve path of the document pipeline, so every CALL function behaves identically
     * here. The named outputs are read back from the solve and stored as REPL overlays.
     */
    private Outcome evaluateCall(String input, SolveContextCache.Session session) {
        Matcher sig = CALL_SIG.matcher(input);
        if (!sig.matches()) {
            return Outcome.fail("Malformed CALL — expected: CALL name(inputs : outputs)");
        }
        String fnName = sig.group(1);
        String argBody = sig.group(2);

        int colon = topLevelColon(argBody);
        if (colon < 0) {
            return Outcome.fail("CALL " + fnName + " needs ':' separating inputs from outputs, e.g. "
                    + "CALL " + fnName + "(in1, in2 : out1, out2)");
        }
        String inputPart = argBody.substring(0, colon);
        // Outputs are kept verbatim (a bare name, or an explicitly sized slice such as
        // lambda[1:2] that array-returning functions like Eigen require — same as a document).
        List<String> outputTokens = splitTopLevelCommas(argBody.substring(colon + 1));
        if (outputTokens.isEmpty()) {
            return Outcome.fail("CALL " + fnName + " declares no output variables after ':'.");
        }
        List<String> outputBases = new ArrayList<>();
        for (String out : outputTokens) {
            if (!OUTPUT_TOKEN.matcher(out).matches()) {
                return Outcome.fail("Invalid CALL output: '" + out + "' (expected name or name[1:n])");
            }
            outputBases.add(baseName(out).trim());
        }

        // Seed every session variable the input arguments reference (scalars + array elements).
        Set<String> referenced = collectIdentifiers(inputPart);
        StringBuilder doc = new StringBuilder();
        for (Map.Entry<String, Double> e : session.siValues().entrySet()) {
            String key = e.getKey();
            double v = e.getValue();
            if (referenced.contains(baseName(key)) && !Double.isNaN(v) && !Double.isInfinite(v)) {
                doc.append(key).append(" = ").append(Double.toString(v)).append('\n');
            }
        }

        // The control/CALL flatteners want explicit slice access (A[1:n,1:n], v[1:n]), not a
        // bare array name, so rewrite any bare-identifier argument that names a session array.
        List<String> rebuiltArgs = new ArrayList<>();
        for (String arg : splitTopLevelCommas(inputPart)) {
            String slice = IDENTIFIER.matcher(arg).matches() ? sliceFor(arg, session) : null;
            rebuiltArgs.add(slice != null ? slice : arg);
        }
        String callLine = "CALL " + fnName + "(" + String.join(", ", rebuiltArgs)
                + " : " + String.join(", ", outputTokens) + ")";
        doc.append(callLine).append('\n');

        final EquationSystemSolver.Result result;
        try {
            result = solver.solve(doc.toString(), SolverSettings.DEFAULTS, Map.of(), session.defs());
        } catch (Exception ex) {
            String msg = ex.getMessage();
            return Outcome.fail("CALL " + fnName + " failed: " + (msg != null ? msg : ex.getClass().getSimpleName()));
        }

        List<ReplController.ReplVarDto> assigned = new ArrayList<>();
        StringBuilder text = new StringBuilder();
        boolean producedAny = false;
        for (String out : outputBases) {
            boolean ok = materializeOutput(out, result.variables(), session, assigned, text);
            producedAny = producedAny || ok;
        }
        if (!producedAny) {
            return Outcome.fail("CALL " + fnName + " produced no value for the requested outputs ("
                    + String.join(", ", outputBases) + "). Check the argument count and shapes.");
        }
        // Strip the trailing newline so the printed block is tidy.
        if (text.length() > 0 && text.charAt(text.length() - 1) == '\n') {
            text.setLength(text.length() - 1);
        }
        return Outcome.ok(0.0, text.toString(), "", null).withVariables(assigned);
    }

    /** Reconstruct one named output (scalar or array) from the solved variable map and store it
     *  as a REPL overlay; appends a printable "name = …" line. Returns false if nothing matched. */
    private boolean materializeOutput(String outName, Map<String, Double> vars,
                                      SolveContextCache.Session session,
                                      List<ReplController.ReplVarDto> assigned, StringBuilder text) {
        String lo = outName.toLowerCase();
        if (vars.containsKey(lo)) {
            double v = vars.get(lo);
            session.clearVariable(lo);
            session.define(lo, v, new SolveContextCache.ReplVar(v, "", null));
            assigned.add(new ReplController.ReplVarDto(outName, v, "", null));
            text.append(outName).append(" = ").append(number(v)).append('\n');
            return true;
        }

        // Array output: gather lo[i] / lo[i,j] keys and infer the shape.
        String prefix = lo + "[";
        int maxR = 0;
        int maxC = 0;
        boolean twoD = false;
        boolean found = false;
        for (String k : vars.keySet()) {
            if (!k.startsWith(prefix) || !k.endsWith("]")) continue;
            String[] parts = k.substring(prefix.length(), k.length() - 1).split(",");
            try {
                if (parts.length == 2) {
                    twoD = true;
                    maxR = Math.max(maxR, Integer.parseInt(parts[0].trim()));
                    maxC = Math.max(maxC, Integer.parseInt(parts[1].trim()));
                } else if (parts.length == 1) {
                    maxC = Math.max(maxC, Integer.parseInt(parts[0].trim()));
                }
                found = true;
            } catch (NumberFormatException ignored) {
                // non-numeric index — not part of this array output
            }
        }
        if (!found) return false;

        int rows = twoD ? maxR : 1;
        int cols = maxC;
        double[][] mat = new double[rows][cols];
        session.clearVariable(lo);
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                String canonical = twoD ? lo + "[" + (i + 1) + "," + (j + 1) + "]" : lo + "[" + (j + 1) + "]";
                Double v = vars.get(canonical);
                double val = v != null ? v : 0.0;
                mat[i][j] = val;
                String display = twoD ? outName + "[" + (i + 1) + "," + (j + 1) + "]" : outName + "[" + (j + 1) + "]";
                session.define(canonical, val, new SolveContextCache.ReplVar(val, "", null));
                assigned.add(new ReplController.ReplVarDto(display, val, "", null));
            }
        }
        text.append(outName).append(" = ").append(formatMatrix(mat)).append('\n');
        return true;
    }

    /** Index of the first {@code ':'} at bracket/paren depth 0 (so range literals like
     *  {@code [0.1:0.1:100]} inside the inputs are not mistaken for the input/output separator). */
    private static int topLevelColon(String s) {
        int depth = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '[' || c == '(' || c == '{') depth++;
            else if (c == ']' || c == ')' || c == '}') depth--;
            else if (c == ':' && depth == 0) return i;
        }
        return -1;
    }

    /** Split on commas at bracket/paren depth 0, trimming and dropping blanks. */
    private static List<String> splitTopLevelCommas(String s) {
        List<String> out = new ArrayList<>();
        int depth = 0;
        int start = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '[' || c == '(' || c == '{') depth++;
            else if (c == ']' || c == ')' || c == '}') depth--;
            else if (c == ',' && depth == 0) {
                String tok = s.substring(start, i).trim();
                if (!tok.isEmpty()) out.add(tok);
                start = i + 1;
            }
        }
        String tail = s.substring(start).trim();
        if (!tail.isEmpty()) out.add(tail);
        return out;
    }

    /** Lowercased identifier tokens appearing in a fragment (used to pick which session
     *  variables to seed). Function names that aren't session variables match nothing and are
     *  harmless. */
    private static Set<String> collectIdentifiers(String s) {
        Set<String> ids = new java.util.HashSet<>();
        Matcher m = IDENTIFIER.matcher(s);
        while (m.find()) ids.add(m.group().toLowerCase());
        return ids;
    }

    /** Base name of a canonical key: {@code a[1,2] -> a}, {@code x -> x}. */
    private static String baseName(String canonical) {
        int b = canonical.indexOf('[');
        return b > 0 ? canonical.substring(0, b) : canonical;
    }

    /** Full-range slice for a session array, e.g. {@code A[1:2,1:2]} or {@code den[1:4]};
     *  {@code null} if {@code base} is not an array in the session. */
    private static String sliceFor(String base, SolveContextCache.Session session) {
        String prefix = base.toLowerCase() + "[";
        int maxR = 0;
        int maxC = 0;
        boolean twoD = false;
        boolean found = false;
        for (String k : session.siValues().keySet()) {
            if (!k.startsWith(prefix) || !k.endsWith("]")) continue;
            String[] p = k.substring(prefix.length(), k.length() - 1).split(",");
            try {
                if (p.length == 2) {
                    twoD = true;
                    maxR = Math.max(maxR, Integer.parseInt(p[0].trim()));
                    maxC = Math.max(maxC, Integer.parseInt(p[1].trim()));
                } else if (p.length == 1) {
                    maxC = Math.max(maxC, Integer.parseInt(p[0].trim()));
                }
                found = true;
            } catch (NumberFormatException ignored) {
                // non-numeric index — ignore
            }
        }
        if (!found) return null;
        return twoD ? base + "[1:" + maxR + ",1:" + maxC + "]" : base + "[1:" + maxC + "]";
    }

    private Outcome assignment(String name, String rhs, SolveContextCache.Session session) {
        final String targetName;
        try {
            Expr parsedLhs = parseExpression(name.trim());
            Expr resolvedLhs = resolveArrayAccesses(parsedLhs, session);
            if (resolvedLhs instanceof Expr.Var v) {
                targetName = v.name();
            } else {
                return Outcome.fail("Invalid assignment target: " + name);
            }
        } catch (Exception e) {
            return Outcome.fail("Invalid assignment target: " + name);
        }

        String preservedTarget = preserveCasing(targetName, name);

        // 1. Check if it's a range vector creation: A = [1:2:10] or A = 1:2:10
        List<Double> rangeValues = new ArrayList<>();
        if (tryParseAndEvaluateRange(rhs, session, rangeValues)) {
            try {
                int size = rangeValues.size();
                double[][] mat = new double[1][size];
                session.clearVariable(targetName.toLowerCase());
                List<ReplController.ReplVarDto> assignedList = new ArrayList<>();
                for (int i = 0; i < size; i++) {
                    double val = rangeValues.get(i);
                    mat[0][i] = val;
                    String canonical = targetName.toLowerCase() + "[" + (i + 1) + "]";
                    String canonicalDisplay = preservedTarget + "[" + (i + 1) + "]";
                    session.define(canonical, val, new SolveContextCache.ReplVar(val, "", null));
                    assignedList.add(new ReplController.ReplVarDto(canonicalDisplay, val, "", null));
                }
                String body = formatMatrix(mat);
                return Outcome.ok(0.0, preservedTarget + " = " + body, "", null)
                        .named(preservedTarget)
                        .withVariables(assignedList);
            } catch (Exception e) {
                return Outcome.fail(e.getMessage() != null ? e.getMessage() : "Could not define range variable.");
            }
        }

        final Expr expr;
        try {
            expr = parseExpression(rhs.trim());
        } catch (ParseError e) {
            return Outcome.fail("Syntax error: " + e.getMessage());
        }

        // 2. Check if it is a matrix/vector literal (like A = [3 4 5; 2 4 5])
        if (expr instanceof Expr.ArrayLiteral literal) {
            try {
                double[][] mat = evaluateMatrixLiteral(literal, session);
                int rows = mat.length;
                int cols = rows > 0 ? mat[0].length : 0;
                boolean vector = rows == 1 || cols == 1;
                session.clearVariable(targetName.toLowerCase());
                List<ReplController.ReplVarDto> assignedList = new ArrayList<>();
                for (int i = 0; i < rows; i++) {
                    for (int j = 0; j < cols; j++) {
                        String canonical = vector
                                ? targetName.toLowerCase() + "[" + (Math.max(i, j) + 1) + "]"
                                : targetName.toLowerCase() + "[" + (i + 1) + "," + (j + 1) + "]";
                        String canonicalDisplay = vector
                                ? preservedTarget + "[" + (Math.max(i, j) + 1) + "]"
                                : preservedTarget + "[" + (i + 1) + "," + (j + 1) + "]";
                        double val = mat[i][j];
                        session.define(canonical, val, new SolveContextCache.ReplVar(val, "", null));
                        assignedList.add(new ReplController.ReplVarDto(canonicalDisplay, val, "", null));
                    }
                }
                String body = formatMatrix(mat);
                return Outcome.ok(0.0, preservedTarget + " = " + body, "", null)
                        .named(preservedTarget)
                        .withVariables(assignedList);
            } catch (Exception e) {
                return Outcome.fail(e.getMessage() != null ? e.getMessage() : "Could not evaluate matrix literal.");
            }
        }

        Expr resolvedExpr = resolveArrayAccesses(expr, session);
        Map<String, int[]> shapes = getVarShapes(session);

        // 3. Matrix/Vector expression assignment
        if (containsMatrixExpr(resolvedExpr, shapes) || shapes.containsKey(targetName.toLowerCase())) {
            try {
                Expr[][] matExpr = compileReplMatrix(resolvedExpr, shapes, session);
                int rows = matExpr.length;
                int cols = matExpr[0].length;
                double[][] mat = new double[rows][cols];

                // Determine unit
                Quantity dim = null;
                if (rows > 0 && cols > 0) {
                    dim = ReplDimensions.dimensionOf(matExpr[0][0], session::unitOf, session.siValues(), session.defs());
                }
                Object[] disp = ReplDimensions.toDisplay(1.0, dim, session.system());
                String unit = disp != null ? (String) disp[1] : "";

                boolean vector = rows == 1 || cols == 1;

                for (int i = 0; i < rows; i++) {
                    for (int j = 0; j < cols; j++) {
                        mat[i][j] = Evaluator.eval(lowercaseVars(matExpr[i][j]), session.siValues(), session.defs());
                    }
                }

                session.clearVariable(targetName.toLowerCase());
                List<ReplController.ReplVarDto> assignedList = new ArrayList<>();

                for (int i = 0; i < rows; i++) {
                    for (int j = 0; j < cols; j++) {
                        String canonical = vector
                                ? targetName.toLowerCase() + "[" + (Math.max(i, j) + 1) + "]"
                                : targetName.toLowerCase() + "[" + (i + 1) + "," + (j + 1) + "]";
                        String canonicalDisplay = vector
                                ? preservedTarget + "[" + (Math.max(i, j) + 1) + "]"
                                : preservedTarget + "[" + (i + 1) + "," + (j + 1) + "]";
                        session.define(canonical, mat[i][j], new SolveContextCache.ReplVar(mat[i][j], unit, null));
                        assignedList.add(new ReplController.ReplVarDto(canonicalDisplay, mat[i][j], unit, null));
                    }
                }

                String body = formatMatrix(mat);
                if (unit != null && !unit.isBlank() && !unit.equals("-")) {
                    body += " [" + unit + "]";
                }

                return Outcome.ok(0.0, preservedTarget + " = " + body, unit, null)
                        .named(preservedTarget)
                        .withVariables(assignedList);
            } catch (Exception ex) {
                return Outcome.fail(ex.getMessage() != null ? ex.getMessage() : "Could not evaluate matrix assignment.");
            }
        }

        // Find unknowns in the RHS expression:
        Set<String> rhsVars = resolvedExpr.variables();
        List<String> unknowns = rhsVars.stream()
                .filter(v -> !session.siValues().containsKey(v.toLowerCase()))
                .toList();

        boolean lhsKnown = session.siValues().containsKey(targetName.toLowerCase());

        if (unknowns.size() == 1 && lhsKnown) {
            String unknownVar = unknowns.get(0).toLowerCase();

            Double solvedSi = solveForUnknown(new Expr.Var(targetName), resolvedExpr, unknownVar, session);
            if (solvedSi == null) {
                return Outcome.fail("Could not solve equation for " + unknownVar);
            }

            Quantity lhsDim = ReplDimensions.dimensionOf(new Expr.Var(targetName), session::unitOf, session.siValues(), session.defs());
            Quantity unknownDim = null;
            if (lhsDim != null) {
                unknownDim = findDimensionOfUnknown(resolvedExpr, lhsDim, unknownVar, session::unitOf, session.siValues(), session.defs());
            }

            Object[] disp = ReplDimensions.toDisplay(solvedSi, unknownDim, session.system());
            double shown = disp != null ? (double) disp[0] : solvedSi;
            String unit = disp != null ? (String) disp[1] : "";

            String originalSpelling = getOriginalSpelling(rhs, unknownVar);
            originalSpelling = findOriginalCasing(originalSpelling, session);

            String body = format(shown, unit, null);

            session.clearVariable(originalSpelling.toLowerCase());
            session.define(originalSpelling.toLowerCase(),
                    solvedSi,
                    new SolveContextCache.ReplVar(shown, unit, null));

            return Outcome.ok(shown, originalSpelling + " = " + body, unit, null).named(originalSpelling);
        }

        Outcome value = evaluated(resolvedExpr, session, preservedTarget);
        if (!value.success()) return value;
        session.clearVariable(targetName.toLowerCase());
        session.define(targetName.toLowerCase(),
                Evaluator.eval(lowercaseVars(resolvedExpr), session.siValues(), session.defs()),
                new SolveContextCache.ReplVar(value.value(), value.unit() == null ? "" : value.unit(), null));
        return value.named(preservedTarget);
    }

    private static boolean is1x1(Expr[][] m) {
        return m.length == 1 && m[0].length == 1;
    }

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

    private Map<String, int[]> getVarShapes(SolveContextCache.Session session) {
        Map<String, int[]> shapes = new HashMap<>();
        for (String key : session.siValues().keySet()) {
            int bracket = key.indexOf('[');
            if (bracket > 0 && key.endsWith("]")) {
                String base = key.substring(0, bracket).toLowerCase();
                String indicesStr = key.substring(bracket + 1, key.length() - 1);
                String[] parts = indicesStr.split(",");
                if (parts.length == 1) {
                    try {
                        int idx = Integer.parseInt(parts[0].trim());
                        int[] cur = shapes.get(base);
                        if (cur == null) {
                            shapes.put(base, new int[]{1, idx});
                        } else {
                            cur[1] = Math.max(cur[1], idx);
                        }
                    } catch (NumberFormatException ignored) {}
                } else if (parts.length == 2) {
                    try {
                        int r = Integer.parseInt(parts[0].trim());
                        int c = Integer.parseInt(parts[1].trim());
                        int[] cur = shapes.get(base);
                        if (cur == null) {
                            shapes.put(base, new int[]{r, c});
                        } else {
                            cur[0] = Math.max(cur[0], r);
                            cur[1] = Math.max(cur[1], c);
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }
        return shapes;
    }

    private boolean containsMatrixExpr(Expr e, Map<String, int[]> shapes) {
        return switch (e) {
            case Expr.Var(String name) -> shapes.containsKey(name.toLowerCase());
            case Expr.ArrayLiteral literal -> true;
            case Expr.Neg(Expr operand) -> containsMatrixExpr(operand, shapes);
            case Expr.BinOp(char op, Expr left, Expr right) ->
                op == '⊙' || op == '⊘' || op == '∖' || op == '↑' || containsMatrixExpr(left, shapes) || containsMatrixExpr(right, shapes);
            case Expr.Call(String fn, List<Expr> args) ->
                fn.equalsIgnoreCase("transpose") || args.stream().anyMatch(arg -> containsMatrixExpr(arg, shapes));
            default -> false;
        };
    }

    private Expr[][] compileReplMatrix(Expr e, Map<String, int[]> shapes, SolveContextCache.Session session) {
        return switch (e) {
            case Expr.Var(String name) -> {
                String lower = name.toLowerCase();
                if (shapes.containsKey(lower)) {
                    int[] dim = shapes.get(lower);
                    int rows = dim[0];
                    int cols = dim[1];
                    Expr[][] result = new Expr[rows][cols];
                    if (rows == 1 || cols == 1) {
                        int size = Math.max(rows, cols);
                        for (int i = 0; i < size; i++) {
                            String canonical = lower + "[" + (i + 1) + "]";
                            if (rows == 1) {
                                result[0][i] = new Expr.Var(canonical);
                            } else {
                                result[i][0] = new Expr.Var(canonical);
                            }
                        }
                    } else {
                        for (int r = 0; r < rows; r++) {
                            for (int c = 0; c < cols; c++) {
                                String canonical = lower + "[" + (r + 1) + "," + (c + 1) + "]";
                                result[r][c] = new Expr.Var(canonical);
                            }
                        }
                    }
                    yield result;
                } else {
                    yield new Expr[][] { { e } };
                }
            }
            case Expr.ArrayAccess(String name, List<Expr> idx) -> {
                yield new Expr[][] { { e } };
            }
            case Expr.ArrayLiteral literal -> {
                List<Expr> elements = literal.elements();
                if (elements.isEmpty()) {
                    yield new Expr[0][0];
                }
                if (elements.get(0) instanceof Expr.ArrayLiteral) {
                    int rows = elements.size();
                    int cols = -1;
                    Expr[][] mat = null;
                    for (int i = 0; i < rows; i++) {
                        if (!(elements.get(i) instanceof Expr.ArrayLiteral rowLit)) {
                            throw new IllegalArgumentException("Heterogeneous matrix literal: row " + (i + 1) + " is not a row literal.");
                        }
                        if (cols == -1) {
                            cols = rowLit.elements().size();
                            mat = new Expr[rows][cols];
                        } else if (rowLit.elements().size() != cols) {
                            throw new IllegalArgumentException("Matrix literal rows must have compatible column dimensions.");
                        }
                        for (int j = 0; j < cols; j++) {
                            Expr[][] el = compileReplMatrix(rowLit.elements().get(j), shapes, session);
                            if (!is1x1(el)) {
                                throw new IllegalArgumentException("Matrix elements must be scalars.");
                            }
                            mat[i][j] = el[0][0];
                        }
                    }
                    yield mat;
                } else {
                    int cols = elements.size();
                    Expr[][] mat = new Expr[1][cols];
                    for (int j = 0; j < cols; j++) {
                        Expr[][] el = compileReplMatrix(elements.get(j), shapes, session);
                        if (!is1x1(el)) {
                            throw new IllegalArgumentException("Matrix elements must be scalars.");
                        }
                        mat[0][j] = el[0][0];
                    }
                    yield mat;
                }
            }
            case Expr.Neg(Expr operand) -> {
                Expr[][] mat = compileReplMatrix(operand, shapes, session);
                Expr[][] result = new Expr[mat.length][mat[0].length];
                for (int i = 0; i < mat.length; i++) {
                    for (int j = 0; j < mat[0].length; j++) {
                        result[i][j] = new Expr.Neg(mat[i][j]);
                    }
                }
                yield result;
            }
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                Expr[][] lMat = compileReplMatrix(left, shapes, session);
                Expr[][] rMat = compileReplMatrix(right, shapes, session);
                
                boolean isElem = op == '+' || op == '-' || op == '⊙' || op == '⊘' || op == '∖' || op == '↑';
                if (isElem) {
                    char base = (op == '⊙') ? '*' : (op == '⊘') ? '/' : (op == '↑') ? '^' : op;
                    boolean swap = (op == '∖');
                    if (base == '∖') {
                        base = '/';
                        swap = true;
                    }
                    if (is1x1(lMat)) {
                        yield swap ? broadcastScalar(base, lMat[0][0], rMat, false)
                                   : broadcastScalar(base, lMat[0][0], rMat, true);
                    }
                    if (is1x1(rMat)) {
                        yield swap ? broadcastScalar(base, rMat[0][0], lMat, true)
                                   : broadcastScalar(base, rMat[0][0], lMat, false);
                    }
                    if (lMat.length != rMat.length || lMat[0].length != rMat[0].length) {
                        throw new IllegalArgumentException("Matrix dimensions must agree for element-wise operation: " +
                                lMat.length + "x" + lMat[0].length + " vs " + rMat.length + "x" + rMat[0].length);
                    }
                    Expr[][] result = new Expr[lMat.length][lMat[0].length];
                    for (int i = 0; i < lMat.length; i++) {
                        for (int j = 0; j < lMat[0].length; j++) {
                            result[i][j] = swap
                                ? new Expr.BinOp(base, rMat[i][j], lMat[i][j])
                                : new Expr.BinOp(base, lMat[i][j], rMat[i][j]);
                        }
                    }
                    yield result;
                } else if (op == '*') {
                    if (is1x1(lMat)) {
                        yield broadcastScalar('*', lMat[0][0], rMat, true);
                    }
                    if (is1x1(rMat)) {
                        yield broadcastScalar('*', rMat[0][0], lMat, false);
                    }
                    int m = lMat.length;
                    int p = lMat[0].length;
                    int n = rMat[0].length;
                    if (p != rMat.length) {
                        throw new IllegalArgumentException("Matrix dimensions must agree for multiplication: A column count (" + p + ") must match B row count (" + rMat.length + ")");
                    }
                    Expr[][] result = new Expr[m][n];
                    for (int i = 0; i < m; i++) {
                        for (int j = 0; j < n; j++) {
                            Expr sum = null;
                            for (int k = 0; k < p; k++) {
                                Expr term = new Expr.BinOp('*', lMat[i][k], rMat[k][j]);
                                if (sum == null) {
                                    sum = term;
                                } else {
                                    sum = new Expr.BinOp('+', sum, term);
                                }
                            }
                            result[i][j] = sum;
                        }
                    }
                    yield result;
                } else if (op == '/' || op == '^') {
                    if (is1x1(lMat)) {
                        yield broadcastScalar(op, lMat[0][0], rMat, true);
                    }
                    if (is1x1(rMat)) {
                        yield broadcastScalar(op, rMat[0][0], lMat, false);
                    }
                    if (lMat.length != rMat.length || lMat[0].length != rMat[0].length) {
                        throw new IllegalArgumentException("Matrix dimensions must agree for element-wise operation: " +
                                lMat.length + "x" + lMat[0].length + " vs " + rMat.length + "x" + rMat[0].length);
                    }
                    Expr[][] result = new Expr[lMat.length][lMat[0].length];
                    for (int i = 0; i < lMat.length; i++) {
                        for (int j = 0; j < lMat[0].length; j++) {
                            result[i][j] = new Expr.BinOp(op, lMat[i][j], rMat[i][j]);
                        }
                    }
                    yield result;
                } else {
                    yield new Expr[][] { { e } };
                }
            }
            case Expr.Call(String function, List<Expr> args) -> {
                String fn = function.toLowerCase();
                if (fn.equals("transpose")) {
                    Expr[][] mat = compileReplMatrix(args.get(0), shapes, session);
                    int rows = mat.length;
                    int cols = mat[0].length;
                    Expr[][] result = new Expr[cols][rows];
                    for (int i = 0; i < rows; i++) {
                        for (int j = 0; j < cols; j++) {
                            result[j][i] = mat[i][j];
                        }
                    }
                    yield result;
                }
                yield new Expr[][] { { e } };
            }
            default -> new Expr[][] { { e } };
        };
    }

    /** Shared path: evaluate an expression in SI, then label it with a unit.
     *  When {@code assignTo} is non-null the printed line is prefixed "name = ". */
    private Outcome evaluated(Expr expr, SolveContextCache.Session session, String assignTo) {
        final double si;
        try {
            si = Evaluator.eval(lowercaseVars(expr), session.siValues(), session.defs());
        } catch (IllegalStateException e) {
            return Outcome.fail(e.getMessage());
        } catch (RuntimeException e) {
            log.debug("REPL expression evaluation failed", e);
            return Outcome.fail(e.getMessage() != null ? e.getMessage() : "Could not evaluate expression.");
        }
        if (Double.isNaN(si)) {
            return Outcome.fail("Result is undefined (NaN).");
        }

        Quantity dim = ReplDimensions.dimensionOf(expr, session::unitOf, session.siValues(), session.defs());
        Object[] disp = ReplDimensions.toDisplay(si, dim, session.system());
        double shown = disp != null ? (double) disp[0] : si;
        String unit = disp != null ? (String) disp[1] : "";
        String body = format(shown, unit, null);

        if (assignTo == null) {
            session.define("ans", si, new SolveContextCache.ReplVar(shown, unit, null));
            return Outcome.ok(shown, body, unit, null).named("ans");
        }

        return Outcome.ok(shown, assignTo + " = " + body, unit, null);
    }

    private double siValueOf(Expr expr, SolveContextCache.Session session) {
        return Evaluator.eval(resolveArrayAccesses(expr, session), session.siValues(), session.defs());
    }

    private static Expr resolveArrayAccesses(Expr e, SolveContextCache.Session session) {
        return resolveArrayAccesses(e, session.siValues(), session.defs());
    }

    private static Expr resolveArrayAccesses(Expr e, Map<String, Double> values, Map<String, ProcDef> defs) {
        return switch (e) {
            case Expr.Var(String name) -> new Expr.Var(name);
            case Expr.Neg(Expr operand) -> new Expr.Neg(resolveArrayAccesses(operand, values, defs));
            case Expr.BinOp(char op, Expr l, Expr r) -> new Expr.BinOp(op, resolveArrayAccesses(l, values, defs), resolveArrayAccesses(r, values, defs));
            case Expr.Compare(String op, Expr l, Expr r) -> new Expr.Compare(op, resolveArrayAccesses(l, values, defs), resolveArrayAccesses(r, values, defs));
            case Expr.Logical(String op, Expr l, Expr r) -> new Expr.Logical(op, resolveArrayAccesses(l, values, defs), resolveArrayAccesses(r, values, defs));
            case Expr.Not(Expr operand) -> new Expr.Not(resolveArrayAccesses(operand, values, defs));
            case Expr.Call(String fn, List<Expr> args) ->
                    new Expr.Call(fn, args.stream().map(arg -> resolveArrayAccesses(arg, values, defs)).toList());
            case Expr.ArrayAccess(String name, List<Expr> idx) -> {
                List<Integer> evalIndices = new ArrayList<>();
                try {
                    for (Expr indexExpr : idx) {
                        Expr resolvedIdx = resolveArrayAccesses(indexExpr, values, defs);
                        double val = Evaluator.eval(lowercaseVars(resolvedIdx), values, defs);
                        evalIndices.add((int) Math.round(val));
                    }
                    StringBuilder sb = new StringBuilder(name);
                    sb.append("[");
                    for (int i = 0; i < evalIndices.size(); i++) {
                        if (i > 0) sb.append(",");
                        sb.append(evalIndices.get(i));
                    }
                    sb.append("]");
                    yield new Expr.Var(sb.toString());
                } catch (Exception ex) {
                    yield new Expr.ArrayAccess(name,
                            idx.stream().map(arg -> resolveArrayAccesses(arg, values, defs)).toList());
                }
            }
            default -> e;
        };
    }

    private boolean tryParseAndEvaluateRange(String rhs, SolveContextCache.Session session, List<Double> outValues) {
        Matcher m = RANGE_PATTERN.matcher(rhs.trim());
        if (!m.matches()) {
            return false;
        }
        String startStr = m.group(1);
        String middleStr = m.group(2);
        String endStr = m.group(3);

        String stepStr = endStr != null ? middleStr : "1";
        String stopStr = endStr != null ? endStr : middleStr;

        try {
            Expr startExpr = parseExpression(startStr);
            Expr stepExpr = parseExpression(stepStr);
            Expr stopExpr = parseExpression(stopStr);

            double start = Evaluator.eval(lowercaseVars(resolveArrayAccesses(startExpr, session)), session.siValues(), session.defs());
            double step = Evaluator.eval(lowercaseVars(resolveArrayAccesses(stepExpr, session)), session.siValues(), session.defs());
            double stop = Evaluator.eval(lowercaseVars(resolveArrayAccesses(stopExpr, session)), session.siValues(), session.defs());

            if (step == 0.0) {
                return false;
            }
            if ((stop - start) * step < 0) {
                return false;
            }
            long count = (long) Math.floor((stop - start) / step + 1e-9) + 1;
            if (count <= 0 || count > 10000) {
                return false;
            }
            for (int i = 0; i < count; i++) {
                outValues.add(start + i * step);
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private double[][] evaluateMatrixLiteral(Expr.ArrayLiteral literal, SolveContextCache.Session session) {
        List<Expr> elements = literal.elements();
        if (elements.isEmpty()) {
            return new double[0][0];
        }
        if (elements.get(0) instanceof Expr.ArrayLiteral) {
            int rows = elements.size();
            int cols = -1;
            double[][] mat = null;
            for (int i = 0; i < rows; i++) {
                if (!(elements.get(i) instanceof Expr.ArrayLiteral rowLit)) {
                    throw new IllegalArgumentException("Heterogeneous matrix literal: row " + (i + 1) + " is not a row literal.");
                }
                if (cols == -1) {
                    cols = rowLit.elements().size();
                    mat = new double[rows][cols];
                } else if (rowLit.elements().size() != cols) {
                    throw new IllegalArgumentException("Matrix literal rows must have compatible column dimensions.");
                }
                for (int j = 0; j < cols; j++) {
                    mat[i][j] = Evaluator.eval(lowercaseVars(resolveArrayAccesses(rowLit.elements().get(j), session)), session.siValues(), session.defs());
                }
            }
            return mat;
        } else {
            int cols = elements.size();
            double[][] mat = new double[1][cols];
            for (int j = 0; j < cols; j++) {
                mat[0][j] = Evaluator.eval(lowercaseVars(resolveArrayAccesses(elements.get(j), session)), session.siValues(), session.defs());
            }
            return mat;
        }
    }

    private String formatMatrix(double[][] mat) {
        if (mat.length == 0) return "[]";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < mat.length; i++) {
            if (i > 0) sb.append("; ");
            for (int j = 0; j < mat[i].length; j++) {
                if (j > 0) sb.append(" ");
                sb.append(number(mat[i][j]));
            }
        }
        sb.append("]");
        return sb.toString();
    }

    private static String preserveCasing(String targetName, String originalLhs) {
        if (!targetName.contains("[")) {
            if (targetName.equalsIgnoreCase(originalLhs.trim())) {
                return originalLhs.trim();
            }
            return targetName;
        }
        int bracketIndex = originalLhs.indexOf('[');
        if (bracketIndex > 0) {
            String base = originalLhs.substring(0, bracketIndex).trim();
            int targetBracket = targetName.indexOf('[');
            if (targetBracket > 0) {
                return base + targetName.substring(targetBracket);
            }
        }
        return targetName;
    }

    // --- parsing -----------------------------------------------------------

    private Expr parseExpression(String src) {
        try {
            return parseExprOnly(src);
        } catch (ParseError e) {
            if (src.contains("=")) {
                try {
                    return parseEquationAsCompare(src);
                } catch (ParseError ignored) {
                    throw e;
                }
            }
            throw e;
        }
    }

    private Expr parseExprOnly(String src) {
        CollectingErrors errors = new CollectingErrors();

        FreesLexer lexer = new FreesLexer(CharStreams.fromString(src));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errors);

        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errors);

        FreesParser.ExprContext ctx = parser.expr();
        if (!errors.messages.isEmpty()) {
            throw new ParseError(String.join("; ", errors.messages));
        }
        if (parser.getCurrentToken() != null && parser.getCurrentToken().getType() != Token.EOF) {
            throw new ParseError("unexpected '" + parser.getCurrentToken().getText() + "'");
        }

        Expr expr = new AstBuilder().visitExpr(ctx);
        if (expr == null) {
            throw new ParseError("could not parse expression");
        }
        return expr;
    }

    private Expr parseEquationAsCompare(String src) {
        CollectingErrors errors = new CollectingErrors();

        FreesLexer lexer = new FreesLexer(CharStreams.fromString(src));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errors);

        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errors);

        FreesParser.EquationContext ctx = parser.equation();
        if (!errors.messages.isEmpty()) {
            throw new ParseError(String.join("; ", errors.messages));
        }
        if (parser.getCurrentToken() != null && parser.getCurrentToken().getType() != Token.EOF) {
            throw new ParseError("unexpected '" + parser.getCurrentToken().getText() + "'");
        }

        AstBuilder builder = new AstBuilder();
        Expr lhs = builder.visit(ctx.expr(0));
        Expr rhs = builder.visit(ctx.expr(1));
        if (lhs == null || rhs == null) {
            throw new ParseError("could not parse equation");
        }
        return new Expr.Compare("=", lhs, rhs);
    }

    /** Lowercases variable names so a REPL reference matches the cached (lowercased)
     *  values regardless of how it was typed — frees names are case-insensitive. */
    private static Expr lowercaseVars(Expr e) {
        return switch (e) {
            case Expr.Var(String name) -> new Expr.Var(name.toLowerCase());
            case Expr.Neg(Expr operand) -> new Expr.Neg(lowercaseVars(operand));
            case Expr.BinOp(char op, Expr l, Expr r) -> new Expr.BinOp(op, lowercaseVars(l), lowercaseVars(r));
            case Expr.Compare(String op, Expr l, Expr r) -> new Expr.Compare(op, lowercaseVars(l), lowercaseVars(r));
            case Expr.Logical(String op, Expr l, Expr r) -> new Expr.Logical(op, lowercaseVars(l), lowercaseVars(r));
            case Expr.Not(Expr operand) -> new Expr.Not(lowercaseVars(operand));
            case Expr.Call(String fn, List<Expr> args) ->
                    new Expr.Call(fn, args.stream().map(ReplEvaluator::lowercaseVars).toList());
            case Expr.ArrayAccess(String name, List<Expr> idx) ->
                    new Expr.ArrayAccess(name.toLowerCase(), idx.stream().map(ReplEvaluator::lowercaseVars).toList());
            default -> e;
        };
    }

    // --- formatting --------------------------------------------------------

    private static String format(double value, String unit, Double uncertainty) {
        StringBuilder sb = new StringBuilder(number(value));
        if (uncertainty != null && uncertainty != 0.0 && !Double.isNaN(uncertainty)) {
            sb.append(" ± ").append(number(uncertainty));
        }
        // "-" is the dimensionless marker, not a real unit — don't bracket it.
        if (unit != null && !unit.isBlank() && !unit.equals("-")) {
            sb.append(' ').append('[').append(unit).append(']');
        }
        return sb.toString();
    }

    /** Compact numeric rendering: integers without a decimal point, others to 6
     *  significant figures with trailing zeros trimmed. */
    private static String number(double v) {
        if (v == Math.rint(v) && !Double.isInfinite(v) && Math.abs(v) < 1e15) {
            return Long.toString((long) v);
        }
        String s = String.format("%.6g", v);
        if (s.contains(".") && !s.contains("e") && !s.contains("E")) {
            s = s.replaceAll("0+$", "").replaceAll("\\.$", "");
        }
        return s;
    }

    private Double solveForUnknown(Expr left, Expr right, String unknownVar, SolveContextCache.Session session) {
        java.util.function.Function<Double, Double> f = (x) -> {
            try {
                Map<String, Double> tempValues = new HashMap<>(session.siValues());
                tempValues.put(unknownVar, x);
                double leftVal = Evaluator.eval(lowercaseVars(left), tempValues, session.defs());
                double rightVal = Evaluator.eval(lowercaseVars(right), tempValues, session.defs());
                return leftVal - rightVal;
            } catch (Exception e) {
                return Double.NaN;
            }
        };

        double scale = 1.0;
        try {
            Map<String, Double> tempValues = new HashMap<>(session.siValues());
            tempValues.put(unknownVar, 1.0);
            double leftVal = Evaluator.eval(lowercaseVars(left), tempValues, session.defs());
            scale = Math.max(Math.abs(leftVal), 1.0);
        } catch (Exception ignored) {}

        double[][] guessPairs = {
            {1.0, 1.01},
            {0.0, 0.01},
            {-1.0, -1.01},
            {100.0, 101.0},
            {1e-5, 1.01e-5},
            {1e5, 1.01e5}
        };

        for (double[] pair : guessPairs) {
            double x0 = pair[0];
            double x1 = pair[1];
            double y0 = f.apply(x0);
            double y1 = f.apply(x1);
            if (!Double.isFinite(y0) || !Double.isFinite(y1)) {
                continue;
            }

            double xPrev = x0;
            double yPrev = y0;
            double xCurr = x1;
            double yCurr = y1;

            for (int iter = 0; iter < 100; iter++) {
                if (Math.abs(yCurr) / scale < 1e-9) {
                    double finalY = f.apply(xCurr);
                    if (Math.abs(finalY) / scale < 1e-6) {
                        return xCurr;
                    }
                }
                double diffY = yCurr - yPrev;
                if (Math.abs(diffY) < 1e-30) {
                    break;
                }
                double xNext = xCurr - yCurr * (xCurr - xPrev) / diffY;
                if (!Double.isFinite(xNext)) {
                    break;
                }
                if (Math.abs(xNext - xCurr) < 1e-12 * Math.max(Math.abs(xCurr), 1.0)) {
                    double yNext = f.apply(xNext);
                    if (Math.abs(yNext) / scale < 1e-8) {
                        return xNext;
                    }
                }
                xPrev = xCurr;
                yPrev = yCurr;
                xCurr = xNext;
                yCurr = f.apply(xCurr);
                if (!Double.isFinite(yCurr)) {
                    break;
                }
            }
        }
        return null;
    }

    private Quantity findDimensionForCompare(Expr left, Expr right, String unknownVar, SolveContextCache.Session session) {
        boolean unknownInLeft = left.variables().contains(unknownVar);
        boolean unknownInRight = right.variables().contains(unknownVar);

        if (unknownInLeft) {
            Quantity dr = ReplDimensions.dimensionOf(right, session::unitOf, session.siValues(), session.defs());
            if (dr != null) {
                return findDimensionOfUnknown(left, dr, unknownVar, session::unitOf, session.siValues(), session.defs());
            }
        } else if (unknownInRight) {
            Quantity dl = ReplDimensions.dimensionOf(left, session::unitOf, session.siValues(), session.defs());
            if (dl != null) {
                return findDimensionOfUnknown(right, dl, unknownVar, session::unitOf, session.siValues(), session.defs());
            }
        }
        return null;
    }

    private Quantity findDimensionOfUnknown(Expr e, Quantity expectedDim, String unknownVar,
                                            java.util.function.Function<String, String> unitOf,
                                            Map<String, Double> values, Map<String, ProcDef> defs) {
        if (expectedDim == null) return null;

        return switch (e) {
            case Expr.Var(String name) -> {
                if (name.equalsIgnoreCase(unknownVar)) {
                    yield expectedDim;
                }
                yield null;
            }
            case Expr.Neg(Expr operand) -> {
                yield findDimensionOfUnknown(operand, expectedDim, unknownVar, unitOf, values, defs);
            }
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                boolean unknownInLeft = left.variables().contains(unknownVar);
                boolean unknownInRight = right.variables().contains(unknownVar);

                if (unknownInLeft) {
                    Quantity dr = ReplDimensions.dimensionOf(right, unitOf, values, defs);
                    if (dr == null) yield null;

                    yield switch (op) {
                        case '*' -> findDimensionOfUnknown(left, expectedDim.divide(dr), unknownVar, unitOf, values, defs);
                        case '/' -> findDimensionOfUnknown(left, expectedDim.multiply(dr), unknownVar, unitOf, values, defs);
                        case '+', '-' -> findDimensionOfUnknown(left, expectedDim, unknownVar, unitOf, values, defs);
                        case '^' -> {
                            try {
                                double p = Evaluator.eval(lowercaseVars(right), values, defs);
                                yield findDimensionOfUnknown(left, expectedDim.pow(1.0 / p), unknownVar, unitOf, values, defs);
                            } catch (Exception ex) {
                                yield null;
                            }
                        }
                        default -> null;
                    };
                } else if (unknownInRight) {
                    Quantity dl = ReplDimensions.dimensionOf(left, unitOf, values, defs);
                    if (dl == null) yield null;

                    yield switch (op) {
                        case '*' -> findDimensionOfUnknown(right, expectedDim.divide(dl), unknownVar, unitOf, values, defs);
                        case '/' -> findDimensionOfUnknown(right, dl.divide(expectedDim), unknownVar, unitOf, values, defs);
                        case '+', '-' -> findDimensionOfUnknown(right, expectedDim, unknownVar, unitOf, values, defs);
                        default -> null;
                    };
                }
                yield null;
            }
            case Expr.Call(String fn, List<Expr> args) -> {
                String lowerFn = fn.toLowerCase();
                for (int i = 0; i < args.size(); i++) {
                    Expr arg = args.get(i);
                    if (arg.variables().contains(unknownVar)) {
                        if (i == 0 && ("abs".equals(lowerFn) || "min".equals(lowerFn) || "max".equals(lowerFn) ||
                                "sum".equals(lowerFn) || "average".equals(lowerFn) || "avg".equals(lowerFn))) {
                            yield findDimensionOfUnknown(arg, expectedDim, unknownVar, unitOf, values, defs);
                        }
                        if (i == 0 && "sqrt".equals(lowerFn)) {
                            yield findDimensionOfUnknown(arg, expectedDim.multiply(expectedDim), unknownVar, unitOf, values, defs);
                        }
                    }
                }
                yield null;
            }
            default -> null;
        };
    }

    private String getOriginalSpelling(String rawInput, String lowercaseVar) {
        try {
            Pattern p = Pattern.compile("\\b" + Pattern.quote(lowercaseVar) + "\\b", Pattern.CASE_INSENSITIVE);
            Matcher m = p.matcher(rawInput);
            if (m.find()) {
                return m.group();
            }
        } catch (Exception e) {
            // Cosmetic only: fall back to the lowercase spelling if the variable
            // name can't be matched back to its original casing.
            log.debug("Could not recover original casing for '{}'", lowercaseVar, e);
        }
        return lowercaseVar;
    }

    private String findOriginalCasing(String name, SolveContextCache.Session session) {
        for (String existing : session.completionNames()) {
            if (existing.equalsIgnoreCase(name)) {
                return existing;
            }
        }
        return name;
    }

    // --- helpers -----------------------------------------------------------

    private static final class ParseError extends RuntimeException {
        ParseError(String message) {
            super(message);
        }
    }

    /** Collects ANTLR syntax errors instead of printing them to stderr. */
    private static final class CollectingErrors extends BaseErrorListener {
        final List<String> messages = new ArrayList<>();

        @Override
        public void syntaxError(Recognizer<?, ?> recognizer, Object offendingSymbol,
                                int line, int charPositionInLine, String msg,
                                RecognitionException e) {
            messages.add(msg);
        }
    }
}
