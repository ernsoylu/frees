package com.frees.backend.api;

import com.frees.backend.ast.ComponentInst;
import com.frees.backend.ast.Expr;
import com.frees.backend.parser.AstBuilder;
import com.frees.backend.parser.FreesLexer;
import com.frees.backend.parser.FreesParser;
import org.antlr.v4.runtime.CharStreams;
import org.antlr.v4.runtime.CommonTokenStream;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Builds per-COMPONENT-instance metadata for the Variable Explorer's component
 * datasheet view: the instance name, its type, and the parameters it was built
 * with ({@code UA=UA_chl_r}, {@code SH=5}, {@code fluid$=R1234yf}).
 *
 * <p>The solved port members (`chlr.out.h`, …) already flow through as ordinary
 * variables and the frontend groups them by instance prefix; this supplies the
 * other half — the <em>inputs</em> — which exist only in the AST. Each
 * parameter's bound expression is resolved against the solved variables so a
 * binding like {@code UA=UA_chl_r} shows both the symbol and its value. Shared
 * bindings (one {@code UA_rad} used by several instances) resolve to the same
 * value under each — by design, so the sharing is visible.
 */
public final class ComponentMetadata {

    private ComponentMetadata() {}

    /** Returns one {@link SolveDtos.ComponentDto} per top-level component instance
     *  in {@code source}, or an empty list when there are no components (or the
     *  source no longer parses — metadata never blocks a solve). */
    public static List<SolveDtos.ComponentDto> build(String source, List<SolveDtos.VariableDto> vars) {
        AstBuilder.ProgramResult program;
        try {
            program = parse(source);
        } catch (RuntimeException e) {
            return List.of();
        }
        List<ComponentInst> insts = program.componentInsts();
        if (insts.isEmpty()) {
            return List.of();
        }
        // Index solved variables by lowercase display name for binding lookups
        // (frees names are case-insensitive; Expr.Var names are already lowercase).
        Map<String, SolveDtos.VariableDto> byName = new LinkedHashMap<>();
        for (SolveDtos.VariableDto v : vars) {
            byName.putIfAbsent(v.name().toLowerCase(Locale.ROOT), v);
        }

        List<SolveDtos.ComponentDto> out = new ArrayList<>(insts.size());
        for (ComponentInst inst : insts) {
            List<SolveDtos.ComponentParamDto> params = new ArrayList<>();
            for (Map.Entry<String, Expr> e : inst.params().entrySet()) {
                params.add(resolveParam(e.getKey(), e.getValue(), byName));
            }
            out.add(new SolveDtos.ComponentDto(displayName(inst), displayType(inst), params));
        }
        return out;
    }

    /**
     * Recovers the type's original camelCase spelling (`TwoPhaseEvaporatorUA`),
     * which the AST lowercases for case-insensitive registry lookup. ANTLR's
     * {@code getText()} (the instance source) concatenates the child tokens
     * verbatim, so the type is the leading run of {@code type.length()} chars.
     * Falls back to the lowercased type if the source can't be sliced.
     */
    private static String displayType(ComponentInst inst) {
        return originalCase(inst.sourceText(), 0, inst.type().length(), inst.type());
    }

    /** Recovers the instance name's original case (the run right after the type). */
    private static String displayName(ComponentInst inst) {
        int start = inst.type().length();
        return originalCase(inst.sourceText(), start, start + inst.name().length(), inst.name());
    }

    private static String originalCase(String source, int from, int to, String fallback) {
        if (source == null || from < 0 || to > source.length() || from >= to) {
            return fallback;
        }
        String slice = source.substring(from, to);
        // Only trust the slice when it matches the lowercased token (guards against
        // an unexpected source shape, e.g. hierarchical sub-instances).
        return slice.equalsIgnoreCase(fallback) ? slice : fallback;
    }

    private static SolveDtos.ComponentParamDto resolveParam(String name, Expr value,
                                                            Map<String, SolveDtos.VariableDto> byName) {
        return switch (value) {
            case Expr.Var(String var) -> {
                SolveDtos.VariableDto v = byName.get(var);
                // Show the symbol as the user typed it (original case) when known.
                String ref = v != null ? v.name() : var;
                Double val = v != null ? v.value() : null;
                String units = v != null ? v.units() : null;
                yield new SolveDtos.ComponentParamDto(name, ref, val, units);
            }
            case Expr.Num(double n, String unit, boolean ignored) ->
                    new SolveDtos.ComponentParamDto(name, formatNum(n, unit), n, unit);
            case Expr.Str(String s) ->
                    new SolveDtos.ComponentParamDto(name, s, null, null);
            // Compound expression (e.g. UA = 2*A): show its source-ish text,
            // leave the value unresolved (we don't re-evaluate here).
            default -> new SolveDtos.ComponentParamDto(name, exprText(value), null, null);
        };
    }

    private static String formatNum(double n, String unit) {
        String s = n == Math.rint(n) && !Double.isInfinite(n)
                ? Long.toString((long) n)
                : Double.toString(n);
        return unit != null && !unit.isBlank() ? s + " [" + unit + "]" : s;
    }

    /** Compact, source-like rendering of an expression for display only. */
    private static String exprText(Expr e) {
        return switch (e) {
            case Expr.Num(double n, String unit, boolean ignored) -> formatNum(n, unit);
            case Expr.Str(String s) -> s;
            case Expr.Var(String name) -> name;
            case Expr.Neg(Expr o) -> "-" + exprText(o);
            case Expr.BinOp(char op, Expr l, Expr r) -> exprText(l) + " " + op + " " + exprText(r);
            case Expr.Call(String fn, List<Expr> args) -> {
                List<String> as = new ArrayList<>(args.size());
                for (Expr a : args) {
                    as.add(exprText(a));
                }
                yield fn + "(" + String.join(", ", as) + ")";
            }
            default -> e.toString();
        };
    }

    private static AstBuilder.ProgramResult parse(String source) {
        FreesLexer lexer = new FreesLexer(CharStreams.fromString(source));
        lexer.removeErrorListeners();
        FreesParser parser = new FreesParser(new CommonTokenStream(lexer));
        parser.removeErrorListeners();
        return new AstBuilder().buildProgram(parser.program());
    }
}
