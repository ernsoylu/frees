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
    /** Stream name → its CoolProp fluid (from the attached components' fluid params). */
    private final Map<String, String> streamFluid = new LinkedHashMap<>();
    private final Map<String, String> displayNames;

    /**
     * Stream member → CoolProp property-function name for <em>derived</em> state
     * properties. A stream carries canonical members {@code (P, h, mdot)}; any
     * other thermodynamic property referenced at top level (e.g. {@code s3.T},
     * {@code s1.x}) is rewritten to the matching property call on
     * {@code (P, h)} so the user can specify states naturally. {@code p}, {@code h},
     * {@code mdot} are deliberately absent (they are the solver's own variables).
     */
    private static final Map<String, String> DERIVED_PROPS = Map.ofEntries(
            Map.entry("t", "temperature"), Map.entry("s", "entropy"),
            Map.entry("x", "quality"), Map.entry("v", "volume"),
            Map.entry("rho", "density"), Map.entry("d", "density"),
            Map.entry("u", "intenergy"), Map.entry("cp", "cp"), Map.entry("cv", "cv"));

    /** A fully resolved instance: its definition, port→stream map, and parameter values. */
    private record ResolvedInstance(ComponentInst inst, ComponentDef def,
                                    Map<String, String> portToStream,
                                    Map<String, Expr> numericParams,
                                    Map<String, String> stringParams) {}

    public ComponentExpander(List<ComponentDef> builtinDefs, List<ComponentDef> userDefs,
                             List<ComponentInst> componentInsts, Map<String, String> displayNames) {
        this.displayNames = displayNames;
        // Built-in standard-library components are curated; a user definition of
        // the same name overrides the built-in. Two user definitions collide.
        for (ComponentDef d : builtinDefs) {
            defsByName.put(d.name(), d);
        }
        java.util.Set<String> userNames = new java.util.HashSet<>();
        for (ComponentDef d : userDefs) {
            if (!userNames.add(d.name())) {
                throw new EquationParser.ParseException(
                        "COMPONENT '" + d.name() + "' is defined more than once.");
            }
            defsByName.put(d.name(), d);
        }
        for (ComponentInst inst : componentInsts) {
            ResolvedInstance resolved = resolve(inst);
            if (instancesByName.put(inst.name(), resolved) != null) {
                throw new EquationParser.ParseException(
                        "Component instance '" + inst.name() + "' is declared more than once.");
            }
            instances.add(resolved);
        }
        buildStreamFluidMap();
    }

    /**
     * Associates each stream with its CoolProp fluid. A fluid-bearing component
     * assigns its ports directly (per-port: a multi-fluid HX maps hot ports →
     * {@code hot$}, cold ports → {@code cold$}). A fluid-less pass-through
     * component (Boiler, Condenser, Throttle, Splitter, Mixer) carries the same
     * fluid on all its ports, so it propagates a neighbour's fluid to its other
     * streams — iterated to a fixpoint so fluid flows the length of a circuit.
     */
    private void buildStreamFluidMap() {
        for (ResolvedInstance ri : instances) {
            for (Map.Entry<String, String> e : ri.portToStream().entrySet()) {
                String fluid = portFluid(e.getKey(), ri.stringParams());
                if (fluid != null) {
                    streamFluid.putIfAbsent(e.getValue(), fluid);
                }
            }
        }
        boolean changed = true;
        while (changed) {
            changed = false;
            for (ResolvedInstance ri : instances) {
                // Skip fluid-bearing components — portFluid already assigned their
                // streams (and a multi-fluid component must not cross-contaminate).
                if (definesFluid(ri)) {
                    continue;
                }
                String known = null;
                for (String stream : ri.portToStream().values()) {
                    if (streamFluid.containsKey(stream)) {
                        known = streamFluid.get(stream);
                        break;
                    }
                }
                if (known == null) {
                    continue;
                }
                for (String stream : ri.portToStream().values()) {
                    if (streamFluid.putIfAbsent(stream, known) == null) {
                        changed = true;
                    }
                }
            }
        }
    }

    /** Whether the component declares a fluid for any of its ports. */
    private static boolean definesFluid(ResolvedInstance ri) {
        for (String port : ri.def().ports()) {
            if (portFluid(port, ri.stringParams()) != null) {
                return true;
            }
        }
        return false;
    }

    /** Whether any component definitions or instances are present. */
    public boolean isEmpty() {
        return defsByName.isEmpty() && instances.isEmpty();
    }

    /** Stream → fluid map (for derived-member resolution and, later, §6 state binding). */
    public Map<String, String> streamFluids() {
        return streamFluid;
    }

    /**
     * The fluid a given port draws on: an exact {@code fluid$} parameter applies
     * to all ports; otherwise a string parameter whose base name is {@code fluid}
     * or is a prefix of the port name (so {@code hot$} ⇒ {@code hot_in},
     * {@code hot_out}). Non-fluid string parameters (e.g. an HX {@code arr$}
     * arrangement) match nothing. Returns null when the component has no fluid.
     */
    private static String portFluid(String port, Map<String, String> stringParams) {
        String direct = stringParams.get("fluid$");
        if (direct != null) {
            return direct;
        }
        for (Map.Entry<String, String> e : stringParams.entrySet()) {
            String base = e.getKey().substring(0, e.getKey().length() - 1);   // strip trailing '$'
            if (base.equals("fluid") || port.startsWith(base)) {
                return e.getValue();
            }
        }
        return null;
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
        // A string parameter used as a *fluid* argument is already baked into the
        // encoded prop$ call name (it never reaches here as a bare Var). Anywhere
        // else — e.g. an arrangement string `hx_effectiveness(arr$, …)` — it
        // substitutes to its literal value.
        String stringValue = ri.stringParams().get(name);
        if (stringValue != null) {
            return new Expr.Str(stringValue);
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
                return topStreamMember(stream, segs[2]);
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
        if (segs.length == 2) {
            return topStreamMember(segs[0], segs[1]);
        }
        String flat = String.join("$", segs);
        displayNames.putIfAbsent(flat, String.join(".", segs));
        return new Expr.Var(flat);
    }

    /**
     * Resolves a top-level {@code stream.member}. On a stream that has a fluid,
     * canonical members ({@code P, h, mdot}) stay flat solver variables while a
     * derived state property ({@code .T, .s, .x, .v, .rho, .cp, …}) is rewritten
     * to the matching CoolProp call on the stream's {@code (P, h)} — so the user
     * can write {@code s3.T = 753 [K]} and the solver inverts it for the
     * enthalpy. On a fluid-less stream (a generic carrier with no attached fluid
     * component) <em>every</em> member is an opaque rider variable, so a name
     * like {@code .x} is not mistaken for thermodynamic quality.
     */
    private Expr topStreamMember(String stream, String member) {
        String prop = DERIVED_PROPS.get(member);
        String fluid = streamFluid.get(stream);
        if (prop != null && fluid != null) {
            Expr p = streamMember(stream, "p");
            Expr h = streamMember(stream, "h");
            return new Expr.Call("prop$" + prop + "$" + fluid.toLowerCase() + "$p$h", List.of(p, h));
        }
        return streamMember(stream, member);
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
