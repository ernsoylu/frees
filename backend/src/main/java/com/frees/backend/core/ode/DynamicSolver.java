package com.frees.backend.core.ode;

import com.frees.backend.ast.DynamicSystem;
import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.ast.Statement;
import com.frees.backend.core.SolverException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Orchestrates one {@code DYNAMIC} block after the analytic solve: it builds the
 * vector RHS closure {@code f(t, y) → dy}, the event switching functions and the
 * sampled ODE Table, delegating the numerics to {@link OdeIntegrator}.
 *
 * <p>The block is treated as an index-1 semi-explicit DAE. Each state's
 * derivative is reified as a fresh unknown {@code der$<state>}; every
 * {@code der(X)} reference in the body is rewritten to that unknown, the
 * {@code der(X)=…} equation becomes {@code der$X = …}, and the algebraic
 * auxiliaries keep their {@code name = …} form. At each step the states and time
 * are pinned and this combined algebraic block is solved (the shared per-step
 * inner-solve), yielding both the auxiliaries and the {@code der$} values that
 * are {@code dy}. All states therefore advance on one shared step cursor.
 */
public final class DynamicSolver {

    /**
     * Solves the algebraic block of a DYNAMIC system with a set of variables
     * pinned to fixed values, seeded by {@code warmStart}; returns the full
     * value map. Backed by {@code EquationSystemSolver.solvePinned}.
     */
    @FunctionalInterface
    public interface AlgebraicSolve {
        Map<String, Double> solve(List<Equation> ordinary,
                                  Map<String, Double> pinned,
                                  Map<String, Double> warmStart);
    }

    private final DynamicSystem system;
    private final Map<String, Double> analyticValues;
    private final Map<String, ProcDef> defs;
    private final AlgebraicSolve algebraic;
    private final long deadlineNanos;

    private final String timeVar;
    private final List<String> states = new ArrayList<>();
    private final List<String> auxNames = new ArrayList<>();
    private final List<Equation> algebraicTemplate = new ArrayList<>();
    private double[] y0;
    private Map<String, Double> warmStart;

    public DynamicSolver(DynamicSystem system, Map<String, Double> analyticValues,
                         Map<String, ProcDef> defs, AlgebraicSolve algebraic, long deadlineNanos) {
        this.system = system;
        this.analyticValues = analyticValues;
        this.defs = defs;
        this.algebraic = algebraic;
        this.deadlineNanos = deadlineNanos;
        this.timeVar = system.options().timeVar();
    }

    public OdeTableResult solve() {
        classify();
        // Cap the step (default span/100) so the adaptive controller cannot grow
        // a single step large enough to step over an event — e.g. a high-altitude
        // near-vacuum coast where the dynamics are smooth would otherwise let one
        // giant step skip the apogee crossing and integrate into descent.
        DynamicSystem.Options o = system.options();
        Double maxStep = o.maxStep() != null ? o.maxStep() : (o.tf() - o.t0()) / 100.0;
        OdeProblem problem = new OdeProblem(
                o.method(), o.t0(), o.tf(), y0, this::rhs, o.points(), o.step(),
                o.rtol(), o.atol(), maxStep, buildEvents(), deadlineNanos);
        OdeResult result = new OdeIntegrator().integrate(problem);
        return buildTable(result);
    }

    // ── Structural classification ───────────────────────────────────────────

    private void classify() {
        // Expand method-of-lines FOR loops and array indices against the solved
        // constants (e.g. N), turning der(T[i]) into concrete scalar states
        // der(T[1]), der(T[2]), … keyed as "t[1]", "t[2]", … — the same naming
        // the analytic array/FOR machinery uses.
        Map<String, Expr> derRhs = new LinkedHashMap<>();
        List<Equation> auxEquations = new ArrayList<>();
        for (Equation eq : expandBody()) {
            String state = derStateName(eq.lhs());
            if (state != null) {
                if (derRhs.containsKey(state)) {
                    throw new SolverException("DYNAMIC " + system.name() + ": state '" + state
                            + "' has more than one der() equation.");
                }
                derRhs.put(state, eq.rhs());
            } else {
                auxEquations.add(eq);
                String auxName = simpleVarName(eq.lhs());
                if (auxName != null && !auxNames.contains(auxName)) {
                    auxNames.add(auxName);
                }
            }
        }
        if (derRhs.isEmpty()) {
            throw new SolverException("DYNAMIC " + system.name()
                    + ": no der(X) equation found — a DYNAMIC block needs at least one state.");
        }
        states.addAll(derRhs.keySet());

        // Initial conditions, one per state (array initials expand over their range).
        Map<String, Double> initial = new LinkedHashMap<>();
        for (DynamicSystem.InitialCondition ic : system.initials()) {
            expandInitial(ic, initial);
        }
        for (String s : states) {
            if (!initial.containsKey(s)) {
                throw new SolverException("DYNAMIC " + system.name() + ": state '" + s
                        + "' has no initial condition (" + s + "(" + fmt(system.options().t0()) + ") = …).");
            }
        }
        y0 = new double[states.size()];
        for (int k = 0; k < states.size(); k++) {
            y0[k] = initial.get(states.get(k));
        }

        // Reify derivatives: der(X) -> der$X; build the combined algebraic block.
        for (String s : states) {
            algebraicTemplate.add(new Equation(new Expr.Var(derVar(s)),
                    substituteDer(derRhs.get(s)), "der$" + s));
        }
        for (Equation aux : auxEquations) {
            algebraicTemplate.add(new Equation(substituteDer(aux.lhs()),
                    substituteDer(aux.rhs()), aux.sourceText()));
        }
        validateReferences();
    }

    // ── Method-of-lines expansion ────────────────────────────────────────────

    /** Top-level body equations plus every FOR loop expanded against the solved
     *  constants; array accesses become scalar {@code name[idx]} variables. */
    private List<Equation> expandBody() {
        List<Equation> out = new ArrayList<>();
        Map<String, Double> noLoop = Map.of();
        for (Equation eq : system.bodyEquations()) {
            out.add(new Equation(resolve(eq.lhs(), noLoop), resolve(eq.rhs(), noLoop), eq.sourceText()));
        }
        for (Statement.For fb : system.forBlocks()) {
            expandFor(fb, new HashMap<>(), out);
        }
        return out;
    }

    private void expandFor(Statement.For fb, Map<String, Double> loopVars, List<Equation> out) {
        int lo = (int) Math.round(evalIndex(fb.start(), loopVars));
        int hi = (int) Math.round(evalIndex(fb.end(), loopVars));
        int step = lo <= hi ? 1 : -1;
        for (int i = lo; lo <= hi ? i <= hi : i >= hi; i += step) {
            Map<String, Double> lv = new HashMap<>(loopVars);
            lv.put(fb.varName().toLowerCase(), (double) i);
            for (Statement st : fb.body()) {
                if (st instanceof Statement.Eq(Expr l, Expr r, String src)) {
                    out.add(new Equation(resolve(l, lv), resolve(r, lv), src));
                } else if (st instanceof Statement.For inner) {
                    expandFor(inner, lv, out);
                }
            }
            if (out.size() > 200_000) {
                throw new SolverException("DYNAMIC " + system.name()
                        + ": FOR expansion produced too many equations (reduce the node count).");
            }
        }
    }

    /** Substitutes loop variables and lowers constant-index array accesses
     *  {@code T[expr]} to scalar variables {@code t[k]}. */
    private Expr resolve(Expr e, Map<String, Double> loopVars) {
        return switch (e) {
            case Expr.Var(String name) ->
                    loopVars.containsKey(name) ? new Expr.Num(loopVars.get(name)) : e;
            case Expr.ArrayAccess(String name, List<Expr> indices) -> {
                StringBuilder key = new StringBuilder(name).append("[");
                for (int k = 0; k < indices.size(); k++) {
                    if (k > 0) {
                        key.append(",");
                    }
                    key.append(Math.round(evalIndex(indices.get(k), loopVars)));
                }
                yield new Expr.Var(key.append("]").toString());
            }
            case Expr.BinOp(char op, Expr l, Expr r) ->
                    new Expr.BinOp(op, resolve(l, loopVars), resolve(r, loopVars));
            case Expr.Neg(Expr o) -> new Expr.Neg(resolve(o, loopVars));
            case Expr.Call(String fn, List<Expr> args) -> {
                List<Expr> mapped = new ArrayList<>(args.size());
                for (Expr a : args) {
                    mapped.add(resolve(a, loopVars));
                }
                yield new Expr.Call(fn, mapped);
            }
            case Expr.Compare(String op, Expr l, Expr r) ->
                    new Expr.Compare(op, resolve(l, loopVars), resolve(r, loopVars));
            case Expr.Logical(String op, Expr l, Expr r) ->
                    new Expr.Logical(op, resolve(l, loopVars), resolve(r, loopVars));
            case Expr.Not(Expr o) -> new Expr.Not(resolve(o, loopVars));
            default -> e;
        };
    }

    private double evalIndex(Expr e, Map<String, Double> loopVars) {
        Map<String, Double> env = new HashMap<>(analyticValues);
        env.putAll(loopVars);
        return Evaluator.eval(resolve(e, loopVars), env, defs);
    }

    /** Expands one initial condition (scalar, single element, or a {@code 1..N}
     *  range) into per-state initial values. */
    private void expandInitial(DynamicSystem.InitialCondition ic, Map<String, Double> initial) {
        if (ic.indices().isEmpty()) {
            requireState(ic.state());
            initial.put(ic.state(), Evaluator.eval(ic.value(), analyticValues, defs));
            return;
        }
        if (ic.indices().size() != 1) {
            throw new SolverException("DYNAMIC " + system.name()
                    + ": multi-dimensional array initial conditions are not supported.");
        }
        double value = Evaluator.eval(resolve(ic.value(), Map.of()), analyticValues, defs);
        Expr index = ic.indices().get(0);
        if (index instanceof Expr.Range(Expr start, Expr end)) {
            int lo = (int) Math.round(evalIndex(start, Map.of()));
            int hi = (int) Math.round(evalIndex(end, Map.of()));
            int step = lo <= hi ? 1 : -1;
            for (int i = lo; lo <= hi ? i <= hi : i >= hi; i += step) {
                String key = ic.state() + "[" + i + "]";
                requireState(key);
                initial.put(key, value);
            }
        } else {
            String key = ic.state() + "[" + Math.round(evalIndex(index, Map.of())) + "]";
            requireState(key);
            initial.put(key, value);
        }
    }

    private void requireState(String name) {
        if (!states.contains(name)) {
            throw new SolverException("DYNAMIC " + system.name() + ": initial condition for '"
                    + name + "' which is not a state (no der(" + name + ") equation).");
        }
    }

    /**
     * Verifies that every variable the block reads is either a state, an
     * auxiliary, the time variable, a reified derivative, or a parameter resolved
     * by the analytic solve. A leftover (e.g. a body that uses {@code time} while
     * the header declares {@code t}) would otherwise surface as a confusing
     * "underspecified system" from the inner solve.
     */
    private void validateReferences() {
        java.util.Set<String> known = new java.util.HashSet<>(analyticValues.keySet());
        known.add(timeVar);
        for (String s : states) {
            known.add(s);
            known.add(derVar(s));
        }
        known.addAll(auxNames);
        java.util.Set<String> unknown = new java.util.TreeSet<>();
        for (Equation eq : algebraicTemplate) {
            for (String v : eq.lhs().variables()) {
                if (!known.contains(v)) {
                    unknown.add(v);
                }
            }
            for (String v : eq.rhs().variables()) {
                if (!known.contains(v)) {
                    unknown.add(v);
                }
            }
        }
        if (!unknown.isEmpty()) {
            throw new SolverException("DYNAMIC " + system.name()
                    + ": references undefined variable(s) " + unknown
                    + ". They are not states, auxiliaries, the time variable '" + timeVar
                    + "', or parameters from the analytic solve. If you meant the time variable, "
                    + "match the header (" + timeVar + " = t0 .. tf).");
        }
    }

    // ── RHS closure (one shared step cursor across all states) ───────────────

    private double[] rhs(double t, double[] y) {
        Map<String, Double> values = solveAlgebraicAt(t, y);
        double[] dy = new double[states.size()];
        for (int k = 0; k < states.size(); k++) {
            Double d = values.get(derVar(states.get(k)));
            if (d == null) {
                throw new SolverException("DYNAMIC " + system.name()
                        + ": failed to resolve der(" + states.get(k) + ") at " + timeVar + " = " + t);
            }
            dy[k] = d;
        }
        return dy;
    }

    /** Solve the algebraic block with time and the state vector pinned. */
    private Map<String, Double> solveAlgebraicAt(double t, double[] y) {
        Map<String, Double> pinned = new LinkedHashMap<>(analyticValues);
        pinned.put(timeVar, t);
        for (int k = 0; k < states.size(); k++) {
            pinned.put(states.get(k), y[k]);
        }
        Map<String, Double> values = algebraic.solve(algebraicTemplate, pinned, warmStart);
        warmStart = values;
        return values;
    }

    // ── Events ──────────────────────────────────────────────────────────────

    private List<OdeEvent> buildEvents() {
        List<OdeEvent> out = new ArrayList<>();
        for (DynamicSystem.Event ev : system.events()) {
            Expr lhs = substituteDer(ev.lhs());
            Expr rhs = substituteDer(ev.rhs());
            OdeScalarFn g = (t, y) -> {
                Map<String, Double> values = solveAlgebraicAt(t, y);
                return Evaluator.eval(lhs, values, defs) - Evaluator.eval(rhs, values, defs);
            };
            out.add(new OdeEvent(ev.name(), g, OdeEvent.directionFromKeyword(ev.direction()),
                    "stop".equals(ev.action())));
        }
        return out;
    }

    // ── ODE Table assembly ──────────────────────────────────────────────────

    private OdeTableResult buildTable(OdeResult result) {
        List<String> columns = new ArrayList<>();
        columns.add(timeVar);
        columns.addAll(states);
        columns.addAll(auxNames);

        List<List<Double>> rows = new ArrayList<>();
        for (int i = 0; i < result.times().length; i++) {
            double t = result.times()[i];
            double[] yi = result.states()[i];
            Map<String, Double> values = solveAlgebraicAt(t, yi);
            List<Double> row = new ArrayList<>();
            row.add(t);
            for (int k = 0; k < states.size(); k++) {
                row.add(yi[k]);
            }
            for (String aux : auxNames) {
                row.add(values.get(aux));
            }
            rows.add(row);
        }

        List<OdeTableResult.EventHit> events = new ArrayList<>();
        for (OdeResult.EventRecord er : result.events()) {
            events.add(new OdeTableResult.EventHit(er.name(), er.time()));
        }
        return new OdeTableResult(system.name(), columns, rows, events,
                system.options().method(), result.stopped(), result.endTime());
    }

    // ── der() reification ───────────────────────────────────────────────────

    /** If {@code lhs} is {@code der(stateVar)}, returns the (lowercased) state
     *  name; otherwise null. */
    private static String derStateName(Expr lhs) {
        if (lhs instanceof Expr.Call(String fn, List<Expr> args)
                && fn.equals("der") && args.size() == 1
                && args.get(0) instanceof Expr.Var(String name)) {
            return name;
        }
        return null;
    }

    private static String simpleVarName(Expr lhs) {
        return lhs instanceof Expr.Var(String name) ? name : null;
    }

    private static String derVar(String state) {
        return "der$" + state;
    }

    /** Rewrites every {@code der(X)} call to the reified unknown {@code der$X}. */
    private Expr substituteDer(Expr e) {
        return switch (e) {
            case Expr.Call(String fn, List<Expr> args) -> {
                if (fn.equals("der") && args.size() == 1 && args.get(0) instanceof Expr.Var(String name)) {
                    yield new Expr.Var(derVar(name));
                }
                List<Expr> mapped = new ArrayList<>(args.size());
                for (Expr a : args) {
                    mapped.add(substituteDer(a));
                }
                yield new Expr.Call(fn, mapped);
            }
            case Expr.BinOp(char op, Expr l, Expr r) ->
                    new Expr.BinOp(op, substituteDer(l), substituteDer(r));
            case Expr.Neg(Expr o) -> new Expr.Neg(substituteDer(o));
            case Expr.Compare(String op, Expr l, Expr r) ->
                    new Expr.Compare(op, substituteDer(l), substituteDer(r));
            case Expr.Logical(String op, Expr l, Expr r) ->
                    new Expr.Logical(op, substituteDer(l), substituteDer(r));
            case Expr.Not(Expr o) -> new Expr.Not(substituteDer(o));
            default -> e;
        };
    }

    private static String fmt(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }
}
