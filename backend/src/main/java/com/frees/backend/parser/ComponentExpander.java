package com.frees.backend.parser;

import com.frees.backend.ast.ComponentDef;
import com.frees.backend.ast.ComponentInst;
import com.frees.backend.ast.ConnectDecl;
import com.frees.backend.ast.DynamicSystem;
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
    private final List<ConnectDecl> connects;
    /** Stream name → its CoolProp fluid (from the attached components' fluid params). */
    private final Map<String, String> streamFluid = new LinkedHashMap<>();
    /** Stream name → display prefix (a synthetic free-port stream {@code inst$port}
     *  shows as {@code inst.port} so member references read naturally). */
    private final Map<String, String> streamDisplay = new LinkedHashMap<>();
    /** Stream name → the set of member names its components reference (e.g.
     *  {@code {p, h, mdot}} for a fluid stream, {@code {t, qdot}} for a heat
     *  stream). Used to give each {@code connect(...)} node its domain rule. */
    private final Map<String, java.util.Set<String>> streamMembers = new LinkedHashMap<>();
    /** Stream → fluid connector type ({@code fluid} / {@code gas} / {@code oil}),
     *  from each component's reserved {@code domain$} parameter (default {@code fluid}).
     *  Only fluid-class streams are tagged; it separates pneumatic, hydraulic and
     *  thermofluid lines that share the same {@code (P, ṁ, h)} bond so a wrong
     *  cross-connection is a hard error rather than a silently-solved nonsense network. */
    private final Map<String, String> streamDomain = new LinkedHashMap<>();
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

    /** The string parameter that selects a component's physics variant (§5.5). */
    private static final String VARIANT_SELECTOR = "model$";

    /** A fully resolved instance: its definition, port→stream map, parameter
     *  values, and the selected physics variant (null when the component has none). */
    private record ResolvedInstance(ComponentInst inst, ComponentDef def,
                                    Map<String, String> portToStream,
                                    Map<String, Expr> numericParams,
                                    Map<String, String> stringParams,
                                    ComponentDef.Variant selectedVariant) {

        /** The shared body plus the selected variant's body (the equations to expand). */
        List<Equation> effectiveBody() {
            if (selectedVariant == null) {
                return def.body();
            }
            List<Equation> all = new ArrayList<>(def.body());
            all.addAll(selectedVariant.body());
            return all;
        }
    }

    public ComponentExpander(List<ComponentDef> builtinDefs, List<ComponentDef> userDefs,
                             List<ComponentInst> componentInsts, Map<String, String> displayNames) {
        this(builtinDefs, userDefs, componentInsts, List.of(), displayNames);
    }

    public ComponentExpander(List<ComponentDef> builtinDefs, List<ComponentDef> userDefs,
                             List<ComponentInst> componentInsts, List<ConnectDecl> connects,
                             Map<String, String> displayNames) {
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
        // Hierarchy: flatten subsystem instances (a COMPONENT built from
        // sub-instances + internal connects) into leaf instances and connects
        // before resolving, so the rest of the expander sees a flat network.
        List<ComponentInst> flatInsts = new ArrayList<>();
        List<ConnectDecl> flatConns = new ArrayList<>(connects);
        for (ComponentInst inst : componentInsts) {
            flattenInstance(inst, flatInsts, flatConns, new java.util.HashSet<>());
        }
        this.connects = flatConns;
        for (ComponentInst inst : flatInsts) {
            ResolvedInstance resolved = resolve(inst);
            if (instancesByName.put(inst.name(), resolved) != null) {
                throw new EquationParser.ParseException(
                        "Component instance '" + inst.name() + "' is declared more than once.");
            }
            instances.add(resolved);
        }
        buildStreamMembers();
        buildStreamFluidMap();
        buildStreamDomainMap();
        propagateFluidAcrossConnects();
    }

    /**
     * Tags each fluid-class stream with its component's reserved {@code domain$}
     * connector type (default {@code fluid}; {@code gas} for pneumatic, {@code oil}
     * for hydraulic built-ins). Two ports of conflicting type bound to the <em>same</em>
     * stream (shared-name misuse) is an immediate error; {@code connect}-bound
     * conflicts are caught per-node in {@link #expandConnects}. Heat/electrical/
     * mechanical streams carry no fluid connector type and are skipped.
     */
    private void buildStreamDomainMap() {
        for (ResolvedInstance ri : instances) {
            String dom = ri.stringParams().getOrDefault("domain$", "fluid");
            for (String stream : ri.portToStream().values()) {
                if (nodeDomain(java.util.List.of(stream)) != Domain.FLUID) {
                    continue;   // only fluid-class ports carry a fluid connector type
                }
                String prev = streamDomain.putIfAbsent(stream, dom);
                if (prev != null && !prev.equals(dom)) {
                    throw new EquationParser.ParseException(
                            "Incompatible fluid connector types on stream '" + stream
                            + "': '" + prev + "' and '" + dom + "' bound to the same stream. "
                            + "Pneumatic ('gas'), hydraulic ('oil') and thermofluid ('fluid') "
                            + "lines are different connector types and cannot share a port.");
                }
            }
        }
    }

    /** Port-reference alias for flattened subsystem boundary ports:
     *  {@code "sub.port"} → the stream that port is bound to. */
    private final Map<String, String> portAlias = new LinkedHashMap<>();

    /**
     * Recursively flattens a (possibly hierarchical) instance into leaf instances
     * and connects. A leaf is appended as-is. A hierarchical subsystem expands its
     * sub-instances (namespaced {@code outer.sub}) and rewrites its internal
     * connects: a reference to an outer port resolves to the stream that port is
     * bound to; a {@code sub.port} reference is namespaced; bare internal stream
     * names are namespaced too.
     */
    private void flattenInstance(ComponentInst inst, List<ComponentInst> outInsts,
                                 List<ConnectDecl> outConns, java.util.Set<String> stack) {
        ComponentDef def = defsByName.get(inst.type());
        if (def == null || !def.isHierarchical()) {
            outInsts.add(inst);
            return;
        }
        if (!stack.add(inst.type())) {
            throw new EquationParser.ParseException("COMPONENT '" + inst.type()
                    + "' instantiates itself (hierarchical cycle).");
        }
        boolean freePorts = inst.portArgs().isEmpty() && !def.ports().isEmpty();
        Map<String, String> portMap = new LinkedHashMap<>();
        for (int i = 0; i < def.ports().size(); i++) {
            String port = def.ports().get(i);
            String stream = freePorts ? inst.name() + "$" + port : inst.portArgs().get(i);
            portMap.put(port, stream);
            portAlias.put(inst.name() + "." + port, stream);
            if (freePorts) {
                streamDisplay.put(stream, inst.name() + "." + port);
            }
        }
        // Resolve the subsystem's own parameter values (override or default) so
        // they can be substituted into the sub-instances' parameter expressions —
        // a cell's UA/fluid can reference the subsystem's UA/fluid.
        Map<String, Expr> outerParams = new LinkedHashMap<>();
        for (ComponentDef.Param p : def.params()) {
            Expr val = inst.params().getOrDefault(p.name(), p.defaultValue());
            if (val != null) {
                outerParams.put(p.name(), val);
            }
        }
        for (ComponentInst sub : def.subInstances()) {
            String subName = inst.name() + "." + sub.name();
            List<String> subPorts = new ArrayList<>();
            for (String pa : sub.portArgs()) {
                subPorts.add(rewriteSubRef(pa, inst.name(), def, portMap));
            }
            Map<String, Expr> subParams = new LinkedHashMap<>();
            for (Map.Entry<String, Expr> e : sub.params().entrySet()) {
                subParams.put(e.getKey(), substituteParams(e.getValue(), outerParams));
            }
            flattenInstance(new ComponentInst(sub.type(), subName, subPorts, subParams,
                    sub.sourceText()), outInsts, outConns, stack);
        }
        for (ConnectDecl sc : def.subConnects()) {
            List<String> refs = new ArrayList<>();
            for (String ref : sc.ports()) {
                refs.add(rewriteSubRef(ref, inst.name(), def, portMap));
            }
            outConns.add(new ConnectDecl(refs, sc.sourceText()));
        }
        stack.remove(inst.type());
    }

    /** Substitutes a subsystem's parameter values into a sub-instance's parameter
     *  expression (e.g. a cell's {@code UA = UA/2} where the outer {@code UA} is a
     *  subsystem parameter). */
    private static Expr substituteParams(Expr e, Map<String, Expr> params) {
        return switch (e) {
            case Expr.Var(String name) -> params.getOrDefault(name, e);
            case Expr.Neg(Expr o) -> new Expr.Neg(substituteParams(o, params));
            case Expr.BinOp(char op, Expr l, Expr r) ->
                    new Expr.BinOp(op, substituteParams(l, params), substituteParams(r, params));
            case Expr.Call(String fn, List<Expr> args) -> {
                List<Expr> na = new ArrayList<>(args.size());
                for (Expr a : args) {
                    na.add(substituteParams(a, params));
                }
                yield new Expr.Call(fn, na);
            }
            default -> e;
        };
    }

    /** Rewrites a reference inside a subsystem body: an outer port → its bound
     *  stream; otherwise (a {@code sub.port} or internal bare stream) → namespaced
     *  with the subsystem instance name. */
    private static String rewriteSubRef(String ref, String prefix, ComponentDef def,
                                        Map<String, String> portMap) {
        String r = ref.toLowerCase();
        if (r.indexOf('.') < 0 && def.ports().contains(r)) {
            return portMap.get(r);
        }
        return prefix + "." + r;
    }

    /**
     * Records, per stream, the member names its components reference in their
     * bodies — so a {@code connect(...)} node can tell a fluid node ({@code mdot})
     * from a heat node ({@code qdot}/{@code t}) and emit the right conservation
     * rule. Walks each instance's effective (variant-selected) body.
     */
    private void buildStreamMembers() {
        for (ResolvedInstance ri : instances) {
            for (Equation eq : ri.effectiveBody()) {
                collectMembers(eq.lhs(), ri);
                collectMembers(eq.rhs(), ri);
            }
        }
    }

    private void collectMembers(Expr e, ResolvedInstance ri) {
        switch (e) {
            case Expr.Var(String name) -> {
                int dot = name.indexOf('.');
                if (dot >= 0) {
                    String port = name.substring(0, dot);
                    String member = name.substring(dot + 1);
                    String stream = ri.portToStream().get(port);
                    if (stream != null && member.indexOf('.') < 0) {
                        streamMembers.computeIfAbsent(stream, k -> new java.util.HashSet<>()).add(member);
                    }
                }
            }
            case Expr.Neg(Expr o) -> collectMembers(o, ri);
            case Expr.Not(Expr o) -> collectMembers(o, ri);
            case Expr.BinOp(char op, Expr l, Expr r) -> { collectMembers(l, ri); collectMembers(r, ri); }
            case Expr.Compare(String op, Expr l, Expr r) -> { collectMembers(l, ri); collectMembers(r, ri); }
            case Expr.Logical(String op, Expr l, Expr r) -> { collectMembers(l, ri); collectMembers(r, ri); }
            case Expr.Range(Expr a, Expr b) -> { collectMembers(a, ri); collectMembers(b, ri); }
            case Expr.Call(String fn, List<Expr> args) -> { for (Expr a : args) collectMembers(a, ri); }
            case Expr.ArrayAccess(String n, List<Expr> idx) -> { for (Expr i : idx) collectMembers(i, ri); }
            case Expr.ArrayLiteral(List<Expr> els) -> { for (Expr el : els) collectMembers(el, ri); }
            case Expr.Num n -> { }
            case Expr.Str s -> { }
        }
    }

    /**
     * Connected streams share a fluid (they share P and h), so a fluid known on
     * one endpoint of a {@code connect} flows to the others — letting derived
     * properties resolve on the synthetic free-port streams of fluid-less
     * components (Boiler/Condenser/…) in a connector-style flowsheet.
     */
    private void propagateFluidAcrossConnects() {
        if (connects.isEmpty()) {
            return;
        }
        UnionFind uf = new UnionFind();
        seedComponentLinks(uf);
        for (ConnectDecl c : connects) {
            List<String> refs = c.ports();
            for (int i = 1; i < refs.size(); i++) {
                uf.union(streamOf(refs.get(0), c), streamOf(refs.get(i), c));
            }
        }
        // Fluid known anywhere in a connected set → assign it to the whole set.
        Map<String, String> rootFluid = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : streamFluid.entrySet()) {
            rootFluid.putIfAbsent(uf.find(e.getKey()), e.getValue());
        }
        for (ConnectDecl c : connects) {
            for (String ref : c.ports()) {
                String stream = streamOf(ref, c);
                String fluid = rootFluid.get(uf.find(stream));
                if (fluid != null) {
                    streamFluid.putIfAbsent(stream, fluid);
                }
            }
        }
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
        // Two instantiation styles: shared-name (every port bound positionally to
        // a stream) or connector (no positional args — ports are "free", bound to
        // synthetic per-instance streams `inst$port` that connect(...) ties).
        boolean freePorts = inst.portArgs().isEmpty() && !def.ports().isEmpty();
        if (!freePorts && inst.portArgs().size() != def.ports().size()) {
            throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                    + ") binds " + inst.portArgs().size() + " port(s) but COMPONENT " + def.name()
                    + " declares " + def.ports().size() + " (" + String.join(", ", def.ports())
                    + "). Bind every port to a stream, or none and wire them with connect(...).");
        }
        Map<String, String> portToStream = new LinkedHashMap<>();
        for (int i = 0; i < def.ports().size(); i++) {
            String port = def.ports().get(i);
            if (freePorts) {
                String synthetic = inst.name() + "$" + port;
                portToStream.put(port, synthetic);
                streamDisplay.put(synthetic, inst.name() + "." + port);
            } else {
                portToStream.put(port, inst.portArgs().get(i));
            }
        }
        // Validate parameter overrides against the declared parameters.
        for (String key : inst.params().keySet()) {
            if (def.param(key) == null) {
                throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                        + "): unknown parameter '" + key + "'.");
            }
        }
        // Physics-variant selection (§5.5): the `model$` parameter picks one
        // VARIANT body to expand. A parameter required only by an *unselected*
        // variant is optional (need not be supplied), so a map-based compressor
        // doesn't demand the isentropic variant's `eta`, and vice versa.
        ComponentDef.Variant selected = selectVariant(inst, def);
        java.util.Set<String> variantParams = new java.util.HashSet<>();
        for (ComponentDef.Variant v : def.variants()) {
            variantParams.addAll(v.require());
        }
        java.util.Set<String> selectedRequire = selected == null
                ? java.util.Set.of() : new java.util.HashSet<>(selected.require());

        Map<String, Expr> numericParams = new LinkedHashMap<>();
        Map<String, String> stringParams = new LinkedHashMap<>();
        for (ComponentDef.Param p : def.params()) {
            Expr override = inst.params().get(p.name());
            Expr value = override != null ? override : p.defaultValue();
            // A parameter listed in some variant's REQUIRE but not the selected
            // one's is optional — skip it silently when unsupplied.
            boolean optional = variantParams.contains(p.name()) && !selectedRequire.contains(p.name());
            if (value == null && optional) {
                continue;
            }
            if (p.isString()) {
                if (value == null) {
                    throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                            + "): string parameter '" + p.name() + "' has no value (give it a default or pass "
                            + p.name() + "=Name)." + variantHint(selected, p.name()));
                }
                stringParams.put(p.name(), stringToken(inst, p.name(), value));
            } else {
                if (value == null) {
                    throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                            + "): parameter '" + p.name() + "' has no value (give it a default or pass "
                            + p.name() + "=value)." + variantHint(selected, p.name()));
                }
                numericParams.put(p.name(), value);
            }
        }
        return new ResolvedInstance(inst, def, portToStream, numericParams, stringParams, selected);
    }

    /**
     * Resolves which physics VARIANT an instance selects via its {@code model$}
     * parameter. Returns null when the component declares no variants. A component
     * that declares variants must declare a {@code model$} selector parameter; an
     * unknown variant name is a hard error listing the valid choices.
     */
    private static ComponentDef.Variant selectVariant(ComponentInst inst, ComponentDef def) {
        if (def.variants().isEmpty()) {
            return null;
        }
        ComponentDef.Param selector = def.param(VARIANT_SELECTOR);
        if (selector == null) {
            throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                    + "): declares VARIANT blocks but no 'PARAM " + VARIANT_SELECTOR
                    + "' selector to choose between them.");
        }
        Expr selExpr = inst.params().getOrDefault(VARIANT_SELECTOR, selector.defaultValue());
        if (selExpr == null) {
            throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                    + "): no variant selected — give '" + VARIANT_SELECTOR + "' a default or pass "
                    + VARIANT_SELECTOR + "=<variant>. Variants: " + variantNames(def) + ".");
        }
        String name = stringToken(inst, VARIANT_SELECTOR, selExpr);
        ComponentDef.Variant v = def.variant(name);
        if (v == null) {
            throw new EquationParser.ParseException("Component '" + inst.name() + "' (" + inst.type()
                    + "): unknown " + VARIANT_SELECTOR + " '" + name + "'. Variants: " + variantNames(def) + ".");
        }
        return v;
    }

    private static String variantNames(ComponentDef def) {
        List<String> names = new ArrayList<>();
        for (ComponentDef.Variant v : def.variants()) {
            names.add(v.name());
        }
        return String.join(", ", names);
    }

    /** Appended to a missing-parameter error to point at the selected variant. */
    private static String variantHint(ComponentDef.Variant selected, String paramName) {
        if (selected != null && selected.require().contains(paramName)) {
            return " (required by the selected '" + selected.name() + "' variant).";
        }
        return "";
    }

    private static String stringToken(ComponentInst inst, String paramName, Expr value) {
        return switch (value) {
            case Expr.Str(String v) -> v.toLowerCase();
            case Expr.Var(String name) -> name;   // already lowercased by Expr.Var
            default -> throw new EquationParser.ParseException("Component '" + inst.name()
                    + "': string parameter '" + paramName + "' must be a name or quoted string.");
        };
    }

    /** Initial conditions declared by storage components via {@code init(member)=…}. */
    private final List<DynamicSystem.InitialCondition> initials = new ArrayList<>();
    /** Whether any component declares transient storage ({@code der(member)=…}). */
    private boolean hasStorage;

    /** Initial conditions collected from {@code init(member)=…} body lines (valid
     *  after {@link #expand()}). */
    public List<DynamicSystem.InitialCondition> componentInitials() {
        return initials;
    }

    /** Whether any component body declares a transient state with {@code der(member)=…}
     *  (valid after {@link #expand()}); such a network is routed into a {@code DYNAMIC}
     *  block rather than the steady equation list. */
    public boolean hasStorage() {
        return hasStorage;
    }

    /** Expands every instance body — and every {@code connect(...)} node — into
     *  flat scalar equations. A component's {@code der(member)=…} line marks a
     *  transient state and stays as a state-derivative equation; an
     *  {@code init(member)=…} line declares that state's initial value and is
     *  lifted out into {@link #componentInitials()} (it is not a solver equation). */
    public List<Equation> expand() {
        List<Equation> out = new ArrayList<>();
        java.util.Set<String> derStates = new java.util.HashSet<>();
        for (ResolvedInstance ri : instances) {
            String prefix = "COMPONENT " + ri.def().name() + " " + ri.inst().name() + ": ";
            for (Equation eq : ri.effectiveBody()) {
                Expr lhs = rewriteBody(eq.lhs(), ri);
                Expr rhs = rewriteBody(eq.rhs(), ri);
                if (lhs instanceof Expr.Call(String fn, List<Expr> args)) {
                    if (fn.equals("init") && args.size() == 1
                            && args.get(0) instanceof Expr.Var(String state)) {
                        initials.add(new DynamicSystem.InitialCondition(state, List.of(), rhs));
                        continue;   // an initial condition, not a solver equation
                    }
                    if (fn.equals("der") && args.size() == 1
                            && args.get(0) instanceof Expr.Var(String state)) {
                        hasStorage = true;
                        derStates.add(state);
                    }
                }
                out.add(new Equation(lhs, rhs, prefix + eq.sourceText()));
            }
        }
        expandConnects(out);
        checkHighIndex(out, derStates);
        return out;
    }

    /**
     * High-index DAE guard (§8.9): two storage states forced equal by an algebraic
     * equation (e.g. two thermal masses tied to one node — `m1.T = m2.T` while both
     * carry `der`) make the system index ≥ 2 and singular. Reject it with an
     * actionable message rather than failing later with a singular matrix.
     */
    private void checkHighIndex(List<Equation> equations, java.util.Set<String> derStates) {
        if (derStates.size() < 2) {
            return;
        }
        for (Equation eq : equations) {
            if (eq.lhs() instanceof Expr.Var(String a) && eq.rhs() instanceof Expr.Var(String b)
                    && derStates.contains(a) && derStates.contains(b) && !a.equals(b)) {
                String da = displayNames.getOrDefault(a, a.replace('$', '.'));
                String db = displayNames.getOrDefault(b, b.replace('$', '.'));
                throw new EquationParser.ParseException("High-index DAE: storage states '" + da
                        + "' and '" + db + "' are rigidly coupled (directly equated) — index ≥ 2. "
                        + "Lump them into one storage element, or insert a small resistance/compliance "
                        + "between them.");
            }
        }
    }

    // ── connect(...) node expansion ──────────────────────────────────────────

    /**
     * Emits the node equations for each {@code connect(...)}: pressure and
     * enthalpy equal across all endpoints, and mass conserved. A union-find over
     * the connection graph keeps the system well-posed: an equality whose two
     * endpoints are <em>already</em> connected (it closes a loop) is dropped as
     * redundant — both the P/h equalities (only spanning-tree edges are emitted)
     * and, for a loop-closing connect, the mass balance (the cyclically
     * dependent Σṁ). This is exactly the closed-cycle over-determination that the
     * shared-name model can't express without rejecting the system.
     */
    private void expandConnects(List<Equation> out) {
        if (connects.isEmpty()) {
            return;
        }
        UnionFind uf = new UnionFind();
        seedComponentLinks(uf);
        for (ConnectDecl c : connects) {
            List<String> refs = c.ports();
            if (refs.size() < 2) {
                throw new EquationParser.ParseException(
                        "connect(...) needs at least two endpoints: " + c.sourceText());
            }
            List<String> sts = new ArrayList<>(refs.size());
            for (String ref : refs) {
                sts.add(streamOf(ref, c));
            }
            String prefix = "CONNECT " + String.join(", ", refs) + ": ";
            checkSingleDomain(sts, refs);
            Domain dom = nodeDomain(sts);
            if (dom == Domain.FLUID) {
                checkFluidConnectorType(sts, refs);
            }

            // Loop closure: do two endpoints already share a connection set?
            boolean loopClosing = false;
            for (int i = 0; i < sts.size() && !loopClosing; i++) {
                for (int j = i + 1; j < sts.size(); j++) {
                    if (uf.find(sts.get(i)).equals(uf.find(sts.get(j)))) {
                        loopClosing = true;
                        break;
                    }
                }
            }

            // Across variables — equal across the node, emitted as spanning-tree
            // equalities (cycle-closing edges are redundant): fluid equates
            // pressure & enthalpy, heat equates temperature, electrical equates
            // potential.
            String root = sts.get(0);
            for (int j = 1; j < sts.size(); j++) {
                String st = sts.get(j);
                if (!uf.find(root).equals(uf.find(st))) {
                    for (String member : acrossMembers(dom)) {
                        out.add(equality(root, member, st, prefix));
                    }
                    uf.union(root, st);
                }
            }

            // Flow conservation. Heat and electrical use a Kirchhoff balance —
            // Σ(flow)=0 over all ports, each flow signed "into the component" — at
            // every node. Fluid: ṁ passes through (2-way equality / signed Σ at a
            // branch), skipped when this connect closes a loop (the loop ṁ balance
            // is then cyclically dependent on the rest of the loop).
            switch (dom) {
                case HEAT -> out.add(kirchhoffBalance(sts, "qdot", prefix));
                case ELECTRICAL -> out.add(kirchhoffBalance(sts, "i", prefix));
                case MECHANICAL -> out.add(kirchhoffBalance(sts, "tau", prefix));
                case TRANSLATIONAL -> out.add(kirchhoffBalance(sts, "f", prefix));
                case FLUID -> {
                    if (!loopClosing) {
                        if (sts.size() == 2) {
                            out.add(equality(sts.get(0), "mdot", sts.get(1), prefix));
                        } else {
                            out.add(massConservation(refs, sts, prefix, c));
                        }
                    }
                }
            }
        }
    }

    /** Σ(outlet ṁ) = Σ(inlet ṁ) for a 3+-port node; inlet/outlet is read from the
     *  port name ('in'/'out'). Throws if an endpoint's direction is unknowable. */
    private Equation massConservation(List<String> refs, List<String> sts, String prefix, ConnectDecl c) {
        Expr outlets = null;
        Expr inlets = null;
        for (int i = 0; i < refs.size(); i++) {
            Expr mdot = streamMember(sts.get(i), "mdot");
            switch (portDirection(refs.get(i))) {
                case OUT -> outlets = outlets == null ? mdot : new Expr.BinOp('+', outlets, mdot);
                case IN -> inlets = inlets == null ? mdot : new Expr.BinOp('+', inlets, mdot);
                case UNKNOWN -> throw new EquationParser.ParseException(
                        "connect(...): cannot tell whether '" + refs.get(i)
                        + "' is an inlet or an outlet for the mass balance — name the port with "
                        + "'in'/'out', or split the flow with a Splitter/Mixer component. " + c.sourceText());
            }
        }
        if (outlets == null || inlets == null) {
            throw new EquationParser.ParseException("connect(...): a branching node needs at least one "
                    + "inlet and one outlet port. " + c.sourceText());
        }
        return new Equation(outlets, inlets, prefix + "sum(mdot_out) = sum(mdot_in)");
    }

    /**
     * Kirchhoff flow balance Σ(flow)=0 over all ports of a heat or electrical
     * node — each flow ({@code qdot} heat rate, {@code i} current) signed into its
     * component, so what leaves one component enters the others.
     */
    private Equation kirchhoffBalance(List<String> sts, String flowMember, String prefix) {
        Expr sum = null;
        for (String st : sts) {
            Expr f = streamMember(st, flowMember);
            sum = sum == null ? f : new Expr.BinOp('+', sum, f);
        }
        return new Equation(sum, new Expr.Num(0), prefix + "sum(" + flowMember + ") = 0");
    }

    private enum Dir { IN, OUT, UNKNOWN }

    /** Inlet/outlet inferred from a port reference's port name ('in'/'out'). */
    private static Dir portDirection(String ref) {
        int dot = ref.lastIndexOf('.');
        String port = dot >= 0 ? ref.substring(dot + 1) : ref;
        if (port.contains("out")) {
            return Dir.OUT;
        }
        if (port.contains("in")) {
            return Dir.IN;
        }
        return Dir.UNKNOWN;
    }

    /**
     * Seeds the connection union-find with each 2-port pass-through instance's
     * internal in↔out link, so a series loop closed by {@code connect} is seen as
     * a cycle (its body carries mass/pressure/enthalpy from one port to the
     * other). 3+-port components (Splitter/Mixer/HX) are not linked — their port
     * topology is not a simple pass-through.
     */
    private void seedComponentLinks(UnionFind uf) {
        for (ResolvedInstance ri : instances) {
            List<String> streams = new ArrayList<>(ri.portToStream().values());
            // Only a *fluid* 2-port component carries its members port→port (a
            // series pass-through). A heat 2-port (conduction/convection) does NOT
            // equate its ports — its two ends are at different temperatures — so it
            // must not seed a loop link.
            if (streams.size() == 2 && isFluidStream(streams.get(0)) && isFluidStream(streams.get(1))) {
                uf.union(streams.get(0), streams.get(1));
            }
        }
    }

    /** Whether a stream is a fluid stream (its components reference {@code mdot}). */
    private boolean isFluidStream(String stream) {
        java.util.Set<String> m = streamMembers.get(stream);
        return m != null && m.contains("mdot");
    }

    /** The physical domain of a connection node, with its node rule. */
    private enum Domain { FLUID, HEAT, ELECTRICAL, MECHANICAL, TRANSLATIONAL }

    /**
     * Classifies a {@code connect} node's domain from the members its streams
     * carry, keyed by the distinctive flow member (then the across member as a
     * fallback for source-only nodes): {@code mdot}⇒fluid, {@code qdot}⇒heat,
     * {@code i}⇒electrical, {@code tau}⇒mechanical (rotational). Fluid is the
     * default, so every existing fluid connect is unaffected. Heat, electrical and
     * mechanical share a Kirchhoff flow rule (Σflow=0); fluid keeps its directional
     * pass-through / branch balance.
     */
    private Domain nodeDomain(List<String> streams) {
        java.util.Set<String> u = new java.util.HashSet<>();
        for (String st : streams) {
            java.util.Set<String> m = streamMembers.get(st);
            if (m != null) {
                u.addAll(m);
            }
        }
        if (u.contains("mdot")) {
            return Domain.FLUID;
        }
        if (u.contains("qdot")) {
            return Domain.HEAT;
        }
        if (u.contains("i")) {
            return Domain.ELECTRICAL;
        }
        if (u.contains("tau")) {
            return Domain.MECHANICAL;
        }
        if (u.contains("f")) {
            return Domain.TRANSLATIONAL;
        }
        if (u.contains("t")) {
            return Domain.HEAT;          // a heat node carrying only temperatures (sources)
        }
        if (u.contains("v")) {
            return Domain.ELECTRICAL;    // an electrical node carrying only potentials
        }
        if (u.contains("w")) {
            return Domain.MECHANICAL;    // a mechanical node carrying only speeds (grounds/sources)
        }
        if (u.contains("vel")) {
            return Domain.TRANSLATIONAL; // a translational node carrying only velocities
        }
        return Domain.FLUID;
    }

    /**
     * Rejects a {@code connect} node that mixes physical (bond-graph) domains.
     * Each endpoint is classified individually ({@link #nodeDomain} on the single
     * stream, so the through-variable wins and a source carrying only an across
     * variable — a thermal source's {@code T}, a ground's {@code V} — is still
     * placed in its domain), and all endpoints must agree. Connecting a heat port
     * to an electrical port, or a fluid line to a mechanical shaft, is a hard error
     * rather than a silently mis-solved network. (A moist-air stream carrying both
     * {@code T} and {@code ṁ} classifies as fluid — the through variable wins — so
     * it is unaffected.) Domains are coupled through a transducer component
     * (a motor, pump, heating resistor, …), never a bare connect.
     */
    private void checkSingleDomain(List<String> sts, List<String> refs) {
        Domain first = null;
        String firstRef = null;
        for (int i = 0; i < sts.size(); i++) {
            java.util.Set<String> m = streamMembers.get(sts.get(i));
            if (m == null || m.isEmpty()) {
                continue;   // a bare stream with no members yet — nothing to classify
            }
            Domain d = nodeDomain(java.util.List.of(sts.get(i)));
            if (first == null) {
                first = d;
                firstRef = refs.get(i);
            } else if (first != d) {
                throw new EquationParser.ParseException(
                        "connect(" + String.join(", ", refs) + "): cannot connect a "
                        + first.name().toLowerCase() + " port (" + firstRef + ") to a "
                        + d.name().toLowerCase() + " port (" + refs.get(i) + ") — different "
                        + "physical domains. Couple domains through a transducer component "
                        + "(a motor, pump, heating resistor, …), not a direct connect.");
            }
        }
    }

    /**
     * Rejects a fluid {@code connect} node whose endpoints are different fluid
     * connector types — a pneumatic ({@code gas}) line tied to a hydraulic
     * ({@code oil}) or thermofluid ({@code fluid}) line. All three share the same
     * {@code (P, ṁ, h)} bond algebra but model incompatible working fluids, so the
     * mistake is caught here instead of silently solving.
     */
    private void checkFluidConnectorType(List<String> sts, List<String> refs) {
        String found = null;
        String foundRef = null;
        for (int i = 0; i < sts.size(); i++) {
            String d = streamDomain.get(sts.get(i));
            if (d == null) {
                continue;
            }
            if (found == null) {
                found = d;
                foundRef = refs.get(i);
            } else if (!found.equals(d)) {
                throw new EquationParser.ParseException(
                        "connect(" + String.join(", ", refs) + "): cannot connect a '" + found
                        + "' line (" + foundRef + ") to a '" + d + "' line (" + refs.get(i) + "). "
                        + "Pneumatic ('gas'), hydraulic ('oil') and thermofluid ('fluid') are "
                        + "incompatible fluid connector types.");
            }
        }
    }

    /** The across (equal-at-node) members for a domain. */
    private static String[] acrossMembers(Domain d) {
        return switch (d) {
            case FLUID -> new String[]{"p", "h"};
            case HEAT -> new String[]{"t"};
            case ELECTRICAL -> new String[]{"v"};
            case MECHANICAL -> new String[]{"w"};
            case TRANSLATIONAL -> new String[]{"vel"};
        };
    }

    /** Resolves a connect endpoint ({@code instance.port} or a bare stream name) to its stream. */
    private String streamOf(String ref, ConnectDecl c) {
        // A flattened subsystem boundary port (e.g. "loop.b" where loop is a
        // hierarchical instance now expanded away) resolves via the alias map.
        String alias = portAlias.get(ref);
        if (alias != null) {
            return alias;
        }
        if (ref.indexOf('$') >= 0) {
            return ref; // already a flat synthetic stream (e.g. a nested subsystem boundary)
        }
        int dot = ref.lastIndexOf('.');   // last dot: instance names may be dotted (sub.sub)
        if (dot < 0) {
            return ref; // a bare stream name
        }
        String instName = ref.substring(0, dot);
        String port = ref.substring(dot + 1);
        ResolvedInstance ri = instancesByName.get(instName);
        if (ri == null || !ri.portToStream().containsKey(port)) {
            throw new EquationParser.ParseException("connect(...): '" + ref + "' is not a port "
                    + "(instance.port) or a stream name. " + c.sourceText());
        }
        return ri.portToStream().get(port);
    }

    private Equation equality(String streamA, String member, String streamB, String prefix) {
        return new Equation(streamMember(streamA, member), streamMember(streamB, member),
                prefix + streamA + "." + member + " = " + streamB + "." + member);
    }

    /** Minimal union-find over stream names for connection-graph cycle detection. */
    private static final class UnionFind {
        private final Map<String, String> parent = new java.util.HashMap<>();

        String find(String x) {
            String p = parent.putIfAbsent(x, x);
            if (p == null || p.equals(x)) {
                return x;
            }
            String root = find(p);
            parent.put(x, root);
            return root;
        }

        void union(String a, String b) {
            parent.put(find(a), find(b));
        }
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
        displayNames.putIfAbsent(flat, streamDisplay.getOrDefault(stream, stream) + "." + member);
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
