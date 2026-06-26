package com.frees.backend.parser;

import com.frees.backend.ast.ComponentDef;
import com.frees.backend.ast.ComponentInst;
import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.Statement;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Expands acausal {@code COMPONENT}/instantiation pairs into flat scalar
 * equations for the existing Newton/Tarjan solver — the only genuinely new
 * machinery the system-modeling layer needs (mirroring the matrix/CALL/MODULE
 * expansion already in {@link EquationParser}).
 *
 * <p><b>Connection model (Phase 1):</b> shared-name. A component instance binds
 * its ports, in declaration order, to <em>stream</em> names; two instances that
 * name the same stream are connected because they read and write the same flat
 * stream variables. A stream {@code s}'s members become solver variables
 * {@code s$P}, {@code s$h}, {@code s$mdot}, … so a series chain conserves mass
 * and energy with no extra equations.
 *
 * <p>For each instance the body is cloned with three rewrites:
 * <ul>
 *   <li>dotted port member {@code port.member} → {@code <boundStream>$member};</li>
 *   <li>a bare local/output name → {@code <instance>$name} (per-instance namespacing,
 *       exactly like MODULE);</li>
 *   <li>a parameter name → its value; a string (fluid) parameter is baked into the
 *       encoded {@code prop$} property-call function names.</li>
 * </ul>
 *
 * <p>Top-level statements (boundary conditions, probes) referencing
 * {@code stream.member}, {@code instance.port.member}, or {@code instance.output}
 * are rewritten to the same flat names so they unify with the component bodies.
 */
public final class ComponentExpander {

    private final Map<String, ComponentDef> defsByName = new LinkedHashMap<>();
    private final Map<String, ResolvedInstance> instancesByName = new LinkedHashMap<>();
    private final List<ResolvedInstance> instances = new ArrayList<>();
    private final Map<String, String> displayNames;

    /** A fully resolved instance: its definition, port→stream map, and parameter values. */
    private record ResolvedInstance(ComponentInst inst, ComponentDef def,
                                    Map<String, String> portToStream,
                                    Map<String, Expr> numericParams,
                                    Map<String, String> stringParams) {}

    public ComponentExpander(List<ComponentDef> componentDefs, List<ComponentInst> componentInsts,
                             Map<String, String> displayNames) {
        this.displayNames = displayNames;
        for (ComponentDef d : componentDefs) {
            if (defsByName.put(d.name(), d) != null) {
                throw new EquationParser.ParseException(
                        "COMPONENT '" + d.name() + "' is defined more than once.");
            }
        }
        for (ComponentInst inst : componentInsts) {
            ResolvedInstance resolved = resolve(inst);
            if (instancesByName.put(inst.name(), resolved) != null) {
                throw new EquationParser.ParseException(
                        "Component instance '" + inst.name() + "' is declared more than once.");
            }
            instances.add(resolved);
        }
    }

    /** Whether any component definitions or instances are present. */
    public boolean isEmpty() {
        return defsByName.isEmpty() && instances.isEmpty();
    }

    private ResolvedInstance resolve(ComponentInst inst) {
        ComponentDef def = defsByName.get(inst.type());
        if (def == null) {
            throw new EquationParser.ParseException("Unknown component type '" + inst.type()
                    + "' for instance '" + inst.name() + "'. Define it with COMPONENT "
                    + inst.type() + "(...).");
        }
        if (inst.portArgs().size() != def.ports().size()) {
            throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                    + ") binds " + inst.portArgs().size() + " port(s) but COMPONENT " + def.name()
                    + " declares " + def.ports().size() + " (" + String.join(", ", def.ports()) + ").");
        }
        Map<String, String> portToStream = new LinkedHashMap<>();
        for (int i = 0; i < def.ports().size(); i++) {
            portToStream.put(def.ports().get(i), inst.portArgs().get(i));
        }
        // Validate parameter overrides against the declared parameters.
        for (String key : inst.params().keySet()) {
            if (def.param(key) == null) {
                throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                        + "): unknown parameter '" + key + "'.");
            }
        }
        Map<String, Expr> numericParams = new LinkedHashMap<>();
        Map<String, String> stringParams = new LinkedHashMap<>();
        for (ComponentDef.Param p : def.params()) {
            Expr override = inst.params().get(p.name());
            if (p.isString()) {
                Expr value = override != null ? override : p.defaultValue();
                if (value == null) {
                    throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                            + "): string parameter '" + p.name() + "' has no value (give it a default or pass "
                            + p.name() + "=Name).");
                }
                stringParams.put(p.name(), stringToken(inst, p.name(), value));
            } else {
                Expr value = override != null ? override : p.defaultValue();
                if (value == null) {
                    throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                            + "): parameter '" + p.name() + "' has no value (give it a default or pass "
                            + p.name() + "=value).");
                }
                numericParams.put(p.name(), value);
            }
        }
        return new ResolvedInstance(inst, def, portToStream, numericParams, stringParams);
    }

    private static String stringToken(ComponentInst inst, String paramName, Expr value) {
        return switch (value) {
            case Expr.Str(String v) -> v.toLowerCase();
            case Expr.Var(String name) -> name;   // already lowercased by Expr.Var
            default -> throw new EquationParser.ParseException("Component '" + inst.name()
                    + "': string parameter '" + paramName + "' must be a name or quoted string.");
        };
    }

    /** Expands every instance body into flat scalar equations. */
    public List<Equation> expand() {
        List<Equation> out = new ArrayList<>();
        for (ResolvedInstance ri : instances) {
            String prefix = "COMPONENT " + ri.def().name() + " " + ri.inst().name() + ": ";
            for (Equation eq : ri.def().body()) {
                Expr lhs = rewriteBody(eq.lhs(), ri);
                Expr rhs = rewriteBody(eq.rhs(), ri);
                out.add(new Equation(lhs, rhs, prefix + eq.sourceText()));
            }
        }
        return out;
    }

    /** Rewrites the dotted member references in top-level statements to flat names. */
    public List<Statement> rewriteStatements(List<Statement> statements) {
        if (instancesByName.isEmpty() && defsByName.isEmpty()) {
            return statements;
        }
        List<Statement> out = new ArrayList<>(statements.size());
        for (Statement s : statements) {
            out.add(rewriteStatement(s));
        }
        return out;
    }

    private Statement rewriteStatement(Statement s) {
        return switch (s) {
            case Statement.Eq(Expr lhs, Expr rhs, String src) ->
                    new Statement.Eq(rewriteTop(lhs), rewriteTop(rhs), src);
            case Statement.For(String v, Expr start, Expr end, List<Statement> body) -> {
                List<Statement> nb = new ArrayList<>(body.size());
                for (Statement b : body) {
                    nb.add(rewriteStatement(b));
                }
                yield new Statement.For(v, rewriteTop(start), rewriteTop(end), nb);
            }
            default -> s;
        };
    }

    // ── Body rewriting (port → stream, local → instance$local, params) ────────

    private Expr rewriteBody(Expr e, ResolvedInstance ri) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Str s -> s;
            case Expr.Var(String name) -> rewriteBodyVar(name, ri);
            case Expr.Neg(Expr o) -> new Expr.Neg(rewriteBody(o, ri));
            case Expr.BinOp(char op, Expr l, Expr r) ->
                    new Expr.BinOp(op, rewriteBody(l, ri), rewriteBody(r, ri));
            case Expr.Call(String fn, List<Expr> args) -> {
                List<Expr> na = new ArrayList<>(args.size());
                for (Expr a : args) {
                    na.add(rewriteBody(a, ri));
                }
                yield new Expr.Call(bakeFluid(fn, ri.stringParams()), na);
            }
            case Expr.ArrayAccess(String name, List<Expr> idx) -> {
                List<Expr> ni = new ArrayList<>(idx.size());
                for (Expr i : idx) {
                    ni.add(rewriteBody(i, ri));
                }
                yield new Expr.ArrayAccess(namespaceLocal(name, ri), ni);
            }
            case Expr.Range(Expr a, Expr b) -> new Expr.Range(rewriteBody(a, ri), rewriteBody(b, ri));
            case Expr.ArrayLiteral(List<Expr> els) -> {
                List<Expr> ne = new ArrayList<>(els.size());
                for (Expr el : els) {
                    ne.add(rewriteBody(el, ri));
                }
                yield new Expr.ArrayLiteral(ne);
            }
            case Expr.Compare(String op, Expr l, Expr r) ->
                    new Expr.Compare(op, rewriteBody(l, ri), rewriteBody(r, ri));
            case Expr.Logical(String op, Expr l, Expr r) ->
                    new Expr.Logical(op, rewriteBody(l, ri), rewriteBody(r, ri));
            case Expr.Not(Expr o) -> new Expr.Not(rewriteBody(o, ri));
        };
    }

    private Expr rewriteBodyVar(String name, ResolvedInstance ri) {
        if (name.indexOf('.') >= 0) {
            String[] segs = name.split("\\.");
            String port = segs[0];
            String stream = ri.portToStream().get(port);
            if (stream == null) {
                throw new EquationParser.ParseException("Component '" + ri.def().name()
                        + "': '" + name + "' references unknown port '" + port + "'. Ports: "
                        + String.join(", ", ri.def().ports()) + ".");
            }
            if (segs.length < 2) {
                throw new EquationParser.ParseException("Component '" + ri.def().name()
                        + "': port reference '" + name + "' needs a member (e.g. " + port + ".P).");
            }
            return streamMember(stream, segs[1]);
        }
        Expr paramValue = ri.numericParams().get(name);
        if (paramValue != null) {
            return paramValue;
        }
        if (ri.stringParams().containsKey(name)) {
            throw new EquationParser.ParseException("Component '" + ri.def().name() + "': string parameter '"
                    + name + "' can only be used as a fluid argument, not in arithmetic.");
        }
        return new Expr.Var(namespaceLocal(name, ri));
    }

    private String namespaceLocal(String name, ResolvedInstance ri) {
        if (name.indexOf('.') >= 0 || ri.numericParams().containsKey(name)
                || ri.stringParams().containsKey(name)) {
            // dotted handled elsewhere; params substituted elsewhere
            return name;
        }
        String flat = ri.inst().name() + "$" + name;
        displayNames.putIfAbsent(flat, ri.inst().name() + "." + name);
        return flat;
    }

    private Expr streamMember(String stream, String member) {
        String flat = stream + "$" + member;
        displayNames.putIfAbsent(flat, stream + "." + member);
        return new Expr.Var(flat);
    }

    // ── Top-level rewriting (instance.port.member / instance.output / stream.member) ──

    private Expr rewriteTop(Expr e) {
        return switch (e) {
            case Expr.Num n -> n;
            case Expr.Str s -> s;
            case Expr.Var(String name) -> rewriteTopVar(name);
            case Expr.Neg(Expr o) -> new Expr.Neg(rewriteTop(o));
            case Expr.BinOp(char op, Expr l, Expr r) -> new Expr.BinOp(op, rewriteTop(l), rewriteTop(r));
            case Expr.Call(String fn, List<Expr> args) -> {
                List<Expr> na = new ArrayList<>(args.size());
                for (Expr a : args) {
                    na.add(rewriteTop(a));
                }
                yield new Expr.Call(fn, na);
            }
            case Expr.ArrayAccess(String name, List<Expr> idx) -> {
                List<Expr> ni = new ArrayList<>(idx.size());
                for (Expr i : idx) {
                    ni.add(rewriteTop(i));
                }
                yield new Expr.ArrayAccess(name, ni);
            }
            case Expr.Range(Expr a, Expr b) -> new Expr.Range(rewriteTop(a), rewriteTop(b));
            case Expr.ArrayLiteral(List<Expr> els) -> {
                List<Expr> ne = new ArrayList<>(els.size());
                for (Expr el : els) {
                    ne.add(rewriteTop(el));
                }
                yield new Expr.ArrayLiteral(ne);
            }
            case Expr.Compare(String op, Expr l, Expr r) -> new Expr.Compare(op, rewriteTop(l), rewriteTop(r));
            case Expr.Logical(String op, Expr l, Expr r) -> new Expr.Logical(op, rewriteTop(l), rewriteTop(r));
            case Expr.Not(Expr o) -> new Expr.Not(rewriteTop(o));
        };
    }

    private Expr rewriteTopVar(String name) {
        if (name.indexOf('.') < 0) {
            return new Expr.Var(name);
        }
        String[] segs = name.split("\\.");
        ResolvedInstance ri = instancesByName.get(segs[0]);
        if (ri != null) {
            if (segs.length >= 2 && ri.portToStream().containsKey(segs[1])) {
                String stream = ri.portToStream().get(segs[1]);
                if (segs.length < 3) {
                    throw new EquationParser.ParseException("Reference '" + name + "' to port '"
                            + segs[1] + "' of component '" + segs[0] + "' needs a member (e.g. " + name + ".P).");
                }
                return streamMember(stream, segs[2]);
            }
            // instance output / local: inst.output
            if (segs.length != 2) {
                throw new EquationParser.ParseException("Reference '" + name + "' to component '"
                        + segs[0] + "' is not a port member or named output.");
            }
            String flat = segs[0] + "$" + segs[1];
            displayNames.putIfAbsent(flat, segs[0] + "." + segs[1]);
            return new Expr.Var(flat);
        }
        // A stream member: stream.member
        String flat = String.join("$", segs);
        displayNames.putIfAbsent(flat, String.join(".", segs));
        return new Expr.Var(flat);
    }

    // ── Fluid baking for encoded prop$ property calls ─────────────────────────

    /**
     * Bakes a string (fluid) parameter into an encoded property-call function
     * name. AstBuilder encodes {@code Enthalpy(fluid$, P=.., h=..)} as
     * {@code prop$enthalpy$fluid$$p$h} (the param's trailing '$' yields an empty
     * segment after it). If the fluid segment matches one of this instance's
     * string parameters, rebuild with the concrete value; otherwise leave it for
     * the global {@link StringVariables} pass (e.g. a document-level {@code R$}).
     */
    private static String bakeFluid(String function, Map<String, String> stringParams) {
        if (!function.startsWith("prop$")) {
            return function;
        }
        String[] parts = function.split("\\$", -1);
        if (parts.length < 4 || !parts[3].isEmpty()) {
            return function;
        }
        String fluidVar = parts[2] + "$";
        String value = stringParams.get(fluidVar);
        if (value == null) {
            return function;
        }
        StringBuilder rebuilt = new StringBuilder("prop$")
                .append(parts[1]).append('$').append(value.toLowerCase());
        for (int i = 4; i < parts.length; i++) {
            rebuilt.append('$').append(parts[i]);
        }
        return rebuilt.toString();
    }
}
