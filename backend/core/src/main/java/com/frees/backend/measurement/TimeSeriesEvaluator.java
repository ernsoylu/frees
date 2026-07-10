package com.frees.backend.measurement;

import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.parser.AstBuilder;
import com.frees.backend.parser.FreesLexer;
import com.frees.backend.parser.FreesParser;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.antlr.v4.runtime.BaseErrorListener;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;
import org.antlr.v4.runtime.RecognitionException;
import org.antlr.v4.runtime.Recognizer;
import org.antlr.v4.runtime.Token;

/**
 * Per-sample formula evaluation over a merged raster — the calculated-signal
 * engine (todo.md Phase 4). Reuses the frees expression language: the full
 * function library including units-aware CoolProp property functions works on
 * measured data, which is the differentiator over the C-like calc engines of
 * conventional measurement-analysis tools.
 *
 * <h2>GC contract (Phase 4 design contract)</h2>
 * The formula AST is COMPILED once into a tree of primitive lambdas: a
 * variable read is {@code slots[i]} on a reused {@code double[]} — no Map, no
 * Double boxing, no allocation per point. Only {@code Call} nodes (function
 * calls — the general library incl. CoolProp) fall back to the existing
 * {@link Evaluator} through ONE reused HashMap whose entries are overwritten
 * per point; that boxing is dwarfed by the native property-call cost on the
 * formulas that have it (quantified in CalcPreSpikeTest).
 *
 * <h2>Time operators</h2>
 * {@code delta(x)}, {@code integral(x)}, {@code movavg(x, window)} and
 * {@code delay(x, tau)} apply to an INPUT variable and are rewritten in a
 * pre-pass into synthetic input series computed over the raster, so the
 * per-point evaluation stays pure.
 */
public final class TimeSeriesEvaluator {

    private TimeSeriesEvaluator() {
    }

    @FunctionalInterface
    private interface Compiled {
        double eval(double[] slots);
    }

    /** Parse a single frees expression (the calc formula). */
    public static Expr parseFormula(String source) throws MeasurementParseException {
        var errors = new BaseErrorListener() {
            final List<String> messages = new ArrayList<>();

            @Override
            public void syntaxError(Recognizer<?, ?> recognizer, Object offendingSymbol,
                                    int line, int charPositionInLine, String msg,
                                    RecognitionException e) {
                messages.add("column " + (charPositionInLine + 1) + ": " + msg);
            }
        };
        FreesLexer lexer = new FreesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        lexer.addErrorListener(errors);
        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        parser.addErrorListener(errors);
        // boolExpr is the superset entry point: plain arithmetic falls through
        // (BoolTruthy) and top-level conditions (speed > 25 AND gear = 3) parse
        // too — those become the boolean calc channels the Event List consumes.
        FreesParser.BoolExprContext ctx = parser.boolExpr();
        if (!errors.messages.isEmpty()) {
            throw new MeasurementParseException("Formula error: " + String.join("; ", errors.messages));
        }
        if (parser.getCurrentToken() != null && parser.getCurrentToken().getType() != Token.EOF) {
            throw new MeasurementParseException(
                    "Formula error: unexpected '" + parser.getCurrentToken().getText() + "'");
        }
        return new AstBuilder().buildBoolExpr(ctx);
    }

    /** True when the formula contains any function call (property functions
     *  included) — the slow class that gets a lower raster cap upstream. */
    public static boolean containsCall(Expr e) {
        return switch (e) {
            case Expr.Call c -> true;
            case Expr.BinOp b -> containsCall(b.left()) || containsCall(b.right());
            case Expr.Neg n -> containsCall(n.operand());
            case Expr.Compare c -> containsCall(c.left()) || containsCall(c.right());
            case Expr.Logical l -> containsCall(l.left()) || containsCall(l.right());
            case Expr.Not n -> containsCall(n.operand());
            default -> false;
        };
    }

    /**
     * Evaluate the formula at every raster point. Inputs are addressed by
     * their formula variable name (lowercase). The reserved variable
     * {@code time} resolves to the raster point itself.
     */
    public static double[] evaluate(Expr formula, double[] raster, Map<String, SampledSeries> inputs)
            throws MeasurementParseException {
        // Sample every input once on the raster (arrays reused across points).
        Map<String, double[]> sampled = new LinkedHashMap<>();
        for (Map.Entry<String, SampledSeries> in : inputs.entrySet()) {
            sampled.put(in.getKey().toLowerCase(), in.getValue().sampleOn(raster));
        }

        // Pre-pass: rewrite time operators into synthetic sampled inputs.
        Expr rewritten = rewriteTimeOps(formula, raster, inputs, sampled);

        // Slot assignment: time is slot 0, then each sampled series.
        Map<String, Integer> slots = new HashMap<>();
        slots.put("time", 0);
        List<double[]> columns = new ArrayList<>();
        for (Map.Entry<String, double[]> s : sampled.entrySet()) {
            slots.put(s.getKey(), columns.size() + 1);
            columns.add(s.getValue());
        }

        Map<String, Double> callScratch = new HashMap<>();
        Compiled compiled = compile(rewritten, slots, callScratch);

        double[] slotValues = new double[columns.size() + 1];
        double[] out = new double[raster.length];
        for (int i = 0; i < raster.length; i++) {
            slotValues[0] = raster[i];
            for (int c = 0; c < columns.size(); c++) {
                slotValues[c + 1] = columns.get(c)[i];
            }
            try {
                out[i] = compiled.eval(slotValues);
            } catch (RuntimeException e) {
                throw new MeasurementParseException(
                        "Formula failed at t = " + raster[i] + ": " + e.getMessage(), e);
            }
        }
        return out;
    }

    // ------------------------------------------------------------------
    // Time-operator rewrite
    // ------------------------------------------------------------------

    private static Expr rewriteTimeOps(Expr e, double[] raster,
                                       Map<String, SampledSeries> inputs,
                                       Map<String, double[]> sampled)
            throws MeasurementParseException {
        switch (e) {
            case Expr.Call c when isTimeOp(c.function()) -> {
                if (c.args().isEmpty() || !(c.args().get(0) instanceof Expr.Var(String inputName))) {
                    throw new MeasurementParseException(
                            c.function() + "() takes an input signal as its first argument.");
                }
                double[] base = sampled.get(inputName);
                if (base == null) {
                    throw new MeasurementParseException(
                            c.function() + "(): unknown input \"" + inputName + "\".");
                }
                double param = 0;
                if (c.args().size() > 1) {
                    if (!(c.args().get(1) instanceof Expr.Num(double value, String u, boolean im))) {
                        throw new MeasurementParseException(
                                c.function() + "(): the second argument must be a numeric constant.");
                    }
                    param = value;
                }
                String synthName = "__" + c.function() + "_" + inputName + "_" + sampled.size();
                double[] series = switch (c.function()) {
                    case "delta" -> delta(base);
                    case "integral" -> integral(raster, base);
                    case "movavg" -> movavg(raster, base, requirePositive(c.function(), param));
                    case "delay" -> delay(raster, inputs.get(findOriginalKey(inputs, inputName)), param);
                    default -> throw new IllegalStateException(c.function());
                };
                sampled.put(synthName, series);
                return new Expr.Var(synthName);
            }
            case Expr.Call c -> {
                List<Expr> args = new ArrayList<>(c.args().size());
                for (Expr a : c.args()) {
                    args.add(rewriteTimeOps(a, raster, inputs, sampled));
                }
                return new Expr.Call(c.function(), args);
            }
            case Expr.BinOp b -> {
                return new Expr.BinOp(b.op(),
                        rewriteTimeOps(b.left(), raster, inputs, sampled),
                        rewriteTimeOps(b.right(), raster, inputs, sampled));
            }
            case Expr.Neg n -> {
                return new Expr.Neg(rewriteTimeOps(n.operand(), raster, inputs, sampled));
            }
            case Expr.Compare cp -> {
                return new Expr.Compare(cp.op(),
                        rewriteTimeOps(cp.left(), raster, inputs, sampled),
                        rewriteTimeOps(cp.right(), raster, inputs, sampled));
            }
            case Expr.Logical lg -> {
                return new Expr.Logical(lg.op(),
                        rewriteTimeOps(lg.left(), raster, inputs, sampled),
                        rewriteTimeOps(lg.right(), raster, inputs, sampled));
            }
            case Expr.Not nt -> {
                return new Expr.Not(rewriteTimeOps(nt.operand(), raster, inputs, sampled));
            }
            default -> {
                return e;
            }
        }
    }

    private static boolean isTimeOp(String fn) {
        return fn.equals("delta") || fn.equals("integral") || fn.equals("movavg") || fn.equals("delay");
    }

    private static double requirePositive(String fn, double x) throws MeasurementParseException {
        if (!(x > 0)) {
            throw new MeasurementParseException(fn + "(): the window/delay must be > 0 seconds.");
        }
        return x;
    }

    private static String findOriginalKey(Map<String, SampledSeries> inputs, String lower) {
        for (String k : inputs.keySet()) {
            if (k.toLowerCase().equals(lower)) {
                return k;
            }
        }
        return lower;
    }

    /** Sample-to-sample difference on the raster; first point is 0. */
    static double[] delta(double[] v) {
        double[] out = new double[v.length];
        for (int i = 1; i < v.length; i++) {
            out[i] = v[i] - v[i - 1];
        }
        return out;
    }

    /** Cumulative trapezoid; NaN segments contribute nothing (gap = flat). */
    static double[] integral(double[] t, double[] v) {
        double[] out = new double[v.length];
        double acc = 0;
        for (int i = 1; i < v.length; i++) {
            double a = v[i - 1];
            double b = v[i];
            if (!Double.isNaN(a) && !Double.isNaN(b)) {
                acc += 0.5 * (a + b) * (t[i] - t[i - 1]);
            }
            out[i] = acc;
        }
        return out;
    }

    /** Trailing time-window mean over [t-window, t]; NaN samples skipped. */
    static double[] movavg(double[] t, double[] v, double window) {
        double[] out = new double[v.length];
        int start = 0;
        double sum = 0;
        int count = 0;
        for (int i = 0; i < v.length; i++) {
            if (!Double.isNaN(v[i])) {
                sum += v[i];
                count++;
            }
            while (t[start] < t[i] - window) {
                if (!Double.isNaN(v[start])) {
                    sum -= v[start];
                    count--;
                }
                start++;
            }
            out[i] = count > 0 ? sum / count : Double.NaN;
        }
        return out;
    }

    /** The input's own series evaluated at (t - tau), with its interp mode. */
    static double[] delay(double[] raster, SampledSeries source, double tau) {
        double[] out = new double[raster.length];
        for (int i = 0; i < raster.length; i++) {
            out[i] = source == null ? Double.NaN : source.at(raster[i] - tau);
        }
        return out;
    }

    // ------------------------------------------------------------------
    // Compilation (array-backed primitive resolver)
    // ------------------------------------------------------------------

    private static Compiled compile(Expr e, Map<String, Integer> slots, Map<String, Double> callScratch)
            throws MeasurementParseException {
        switch (e) {
            case Expr.Num n -> {
                double c = n.value();
                return s -> c;
            }
            case Expr.Var v -> {
                Integer idx = slots.get(v.name());
                if (idx == null) {
                    throw new MeasurementParseException(
                            "Unknown variable \"" + v.name() + "\" — bind it to a signal input.");
                }
                int i = idx;
                return s -> s[i];
            }
            case Expr.Neg n -> {
                Compiled a = compile(n.operand(), slots, callScratch);
                return s -> -a.eval(s);
            }
            case Expr.BinOp b -> {
                Compiled l = compile(b.left(), slots, callScratch);
                Compiled r = compile(b.right(), slots, callScratch);
                return switch (b.op()) {
                    case '+' -> s -> l.eval(s) + r.eval(s);
                    case '-' -> s -> l.eval(s) - r.eval(s);
                    case '*' -> s -> l.eval(s) * r.eval(s);
                    case '/' -> s -> l.eval(s) / r.eval(s);
                    case '^' -> s -> Math.pow(l.eval(s), r.eval(s));
                    default -> throw new MeasurementParseException("Unsupported operator: " + b.op());
                };
            }
            case Expr.Compare c -> {
                Compiled l = compile(c.left(), slots, callScratch);
                Compiled r = compile(c.right(), slots, callScratch);
                return switch (c.op()) {
                    case "<" -> s -> l.eval(s) < r.eval(s) ? 1.0 : 0.0;
                    case ">" -> s -> l.eval(s) > r.eval(s) ? 1.0 : 0.0;
                    case "<=" -> s -> l.eval(s) <= r.eval(s) ? 1.0 : 0.0;
                    case ">=" -> s -> l.eval(s) >= r.eval(s) ? 1.0 : 0.0;
                    case "<>" -> s -> l.eval(s) != r.eval(s) ? 1.0 : 0.0;
                    case "=" -> s -> l.eval(s) == r.eval(s) ? 1.0 : 0.0;
                    default -> throw new MeasurementParseException("Unsupported comparison: " + c.op());
                };
            }
            case Expr.Logical lg -> {
                Compiled l = compile(lg.left(), slots, callScratch);
                Compiled r = compile(lg.right(), slots, callScratch);
                if (lg.op().equalsIgnoreCase("and")) {
                    return s -> l.eval(s) != 0.0 && r.eval(s) != 0.0 ? 1.0 : 0.0;
                }
                return s -> l.eval(s) != 0.0 || r.eval(s) != 0.0 ? 1.0 : 0.0;
            }
            case Expr.Not n -> {
                Compiled a = compile(n.operand(), slots, callScratch);
                return s -> a.eval(s) == 0.0 ? 1.0 : 0.0;
            }
            case Expr.Call c -> {
                // Fallback: the full frees function library (incl. CoolProp)
                // through the existing Evaluator, over ONE reused scratch map.
                // Bind every slot each point — named property arguments make
                // subtree variable analysis unreliable, and the map write is
                // negligible next to the function-call cost.
                String[] names = slots.keySet().toArray(new String[0]);
                int[] idx = new int[names.length];
                for (int k = 0; k < names.length; k++) {
                    idx[k] = slots.get(names[k]);
                }
                return s -> {
                    for (int k = 0; k < names.length; k++) {
                        callScratch.put(names[k], s[idx[k]]);
                    }
                    return Evaluator.eval(c, callScratch);
                };
            }
            default -> throw new MeasurementParseException(
                    "This construct is not supported in calculated signals: " + e);
        }
    }
}
