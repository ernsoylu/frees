package com.frees.backend.core.ode;

import com.frees.backend.ast.DynamicSystem;
import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.ast.Statement;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.dae.DaeAssembly;
import com.frees.backend.core.dae.DaeResidual;
import com.frees.backend.core.dae.DaeRootFn;
import com.frees.backend.core.dae.IdaDaeSolver;
import com.frees.backend.core.dae.SundialsIda;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

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

    /** The numerically-linearized state-space model of this block at its
     *  initial-condition operating point: {@code A=∂ẋ/∂x}, {@code B=∂ẋ/∂u},
     *  {@code C=∂y/∂x}, {@code D=∂y/∂u} (states in der() order). */
    public record Linearization(List<String> states, List<String> inputs, List<String> outputs,
                                double[][] a, double[][] b, double[][] c, double[][] d) {
        // equals/hashCode/toString consider matrix contents — java:S6218.
        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Linearization other)) {
                return false;
            }
            return Objects.equals(states, other.states)
                    && Objects.equals(inputs, other.inputs)
                    && Objects.equals(outputs, other.outputs)
                    && Arrays.deepEquals(a, other.a)
                    && Arrays.deepEquals(b, other.b)
                    && Arrays.deepEquals(c, other.c)
                    && Arrays.deepEquals(d, other.d);
        }

        @Override
        public int hashCode() {
            int result = Objects.hash(states, inputs, outputs);
            result = 31 * result + Arrays.deepHashCode(a);
            result = 31 * result + Arrays.deepHashCode(b);
            result = 31 * result + Arrays.deepHashCode(c);
            result = 31 * result + Arrays.deepHashCode(d);
            return result;
        }

        @Override
        public String toString() {
            return "Linearization[states=" + states + ", inputs=" + inputs + ", outputs=" + outputs
                    + ", a=" + Arrays.deepToString(a) + ", b=" + Arrays.deepToString(b)
                    + ", c=" + Arrays.deepToString(c) + ", d=" + Arrays.deepToString(d) + "]";
        }
    }

    /**
     * Linearizes the block about its initial-condition operating point by finite
     * differences, reusing the per-step algebraic solve {@code ẋ = f(x, u)}:
     * perturbing each state gives the A and C columns, each input the B and D
     * columns. For a linear plant the result is exact at any point. Inputs are
     * exogenous values pinned in the analytic environment (e.g. a source value);
     * outputs are any solved variables of the network (flat names).
     */
    public Linearization linearize(List<String> inputs, List<String> outputs) {
        if (states.isEmpty()) {
            classify();
        }
        double t0 = system.options().t0();
        int n = states.size();
        int m = inputs.size();
        int p = outputs.size();
        double[] x0 = y0.clone();
        Map<String, Double> base = solveForLinearization(t0, x0, null);
        double[] f0 = derValuesOf(base);
        double[] y0v = outputValuesOf(base, outputs);

        double[][] a = new double[n][n];
        double[][] c = new double[p][n];
        for (int j = 0; j < n; j++) {
            double eps = 1e-6 * Math.max(Math.abs(x0[j]), 1.0);
            double[] xp = x0.clone();
            xp[j] += eps;
            Map<String, Double> v = solveForLinearization(t0, xp, null);
            double[] fp = derValuesOf(v);
            double[] yp = outputValuesOf(v, outputs);
            for (int i = 0; i < n; i++) {
                a[i][j] = (fp[i] - f0[i]) / eps;
            }
            for (int k = 0; k < p; k++) {
                c[k][j] = (yp[k] - y0v[k]) / eps;
            }
        }
        double[][] b = new double[n][m];
        double[][] d = new double[p][m];
        for (int q = 0; q < m; q++) {
            String u = inputs.get(q);
            double u0 = analyticValues.getOrDefault(u, 0.0);
            double eps = 1e-6 * Math.max(Math.abs(u0), 1.0);
            Map<String, Double> v = solveForLinearization(t0, x0, Map.of(u, u0 + eps));
            double[] fp = derValuesOf(v);
            double[] yp = outputValuesOf(v, outputs);
            for (int i = 0; i < n; i++) {
                b[i][q] = (fp[i] - f0[i]) / eps;
            }
            for (int k = 0; k < p; k++) {
                d[k][q] = (yp[k] - y0v[k]) / eps;
            }
        }
        return new Linearization(new ArrayList<>(states), inputs, outputs, a, b, c, d);
    }

    private Map<String, Double> solveForLinearization(double t, double[] y, Map<String, Double> overrides) {
        Map<String, Double> pinned = new LinkedHashMap<>(analyticValues);
        if (overrides != null) {
            pinned.putAll(overrides);
        }
        pinned.put(timeVar, t);
        for (int k = 0; k < states.size(); k++) {
            pinned.put(states.get(k), y[k]);
        }
        return algebraic.solve(algebraicTemplate, pinned, null);
    }

    private double[] derValuesOf(Map<String, Double> values) {
        double[] f = new double[states.size()];
        for (int i = 0; i < states.size(); i++) {
            f[i] = values.getOrDefault(derVar(states.get(i)), 0.0);
        }
        return f;
    }

    private double[] outputValuesOf(Map<String, Double> values, List<String> outputs) {
        double[] y = new double[outputs.size()];
        for (int i = 0; i < outputs.size(); i++) {
            Double val = values.get(outputs.get(i));
            if (val == null) {
                throw new SolverException("LINEARIZE: output '" + outputs.get(i)
                        + "' is not a variable of the network '" + system.name() + "'.");
            }
            y[i] = val;
        }
        return y;
    }

    public OdeTableResult solve() {
        classify();
        if (isIdaMethod(system.options().method())) {
            return solveWithIda();
        }
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

    // ── SUNDIALS IDA DAE path (Phase S1) ─────────────────────────────────────

    /** Above this dimension the IDA path switches from dense to KLU sparse. */
    private static final int SPARSE_THRESHOLD = 24;

    static boolean isIdaMethod(String method) {
        if (method == null) {
            return false;
        }
        return switch (method.toLowerCase()) {
            case "ida", "idas", "ida15s", "dae" -> true;
            default -> false;
        };
    }

    /**
     * Assembles this classified {@code DYNAMIC} block into an implicit DAE
     * {@code F(t,y,y')=0} for SUNDIALS IDA. The state vector is {@code y =
     * [states ; auxiliaries]}; each reified {@code der$X} maps to
     * {@code y'[stateIndex(X)]}, so every equation of {@link #algebraicTemplate}
     * becomes one residual and the system is square and index-1. Auxiliary and
     * derivative initial guesses are seeded from a single inner algebraic solve at
     * {@code t0} where possible (IDA's {@code IDACalcIC} then makes them
     * consistent); a failure there leaves zeros for IDA to resolve.
     */
    public DaeAssembly assembleDae() {
        if (states.isEmpty()) {
            classify();
        }
        int ns = states.size();
        int n = ns + auxNames.size();
        if (algebraicTemplate.size() != n) {
            throw new SolverException("DYNAMIC " + system.name() + ": DAE assembly is non-square ("
                    + algebraicTemplate.size() + " equations for " + n + " unknowns).");
        }

        List<String> variables = new ArrayList<>(states);
        variables.addAll(auxNames);
        Map<String, Integer> column = new HashMap<>();
        for (int k = 0; k < variables.size(); k++) {
            column.put(variables.get(k), k);
        }

        double[] id = new double[n];
        for (int k = 0; k < ns; k++) {
            id[k] = 1.0; // differential
        }

        List<Equation> template = new ArrayList<>(algebraicTemplate);
        DaeResidual residual = (t, y, yp, res) -> {
            Map<String, Double> v = daeValues(t, y, yp);
            // Transient property guarding: a stiff corrector probes states that
            // briefly leave the fluid table; clamp args + finite fallback so the
            // residual stays finite (else CoolProp throws -> IDASolve -9).
            boolean prev = com.frees.backend.props.PropertyFunctions.enterLenient();
            try {
                for (int i = 0; i < template.size(); i++) {
                    Equation eq = template.get(i);
                    res[i] = Evaluator.eval(eq.lhs(), v, defs) - Evaluator.eval(eq.rhs(), v, defs);
                }
            } finally {
                com.frees.backend.props.PropertyFunctions.exitLenient(prev);
            }
        };

        double[] y0full = new double[n];
        double[] yp0full = new double[n];
        System.arraycopy(y0, 0, y0full, 0, ns);
        try {
            Map<String, Double> seed = solveAlgebraicAt(system.options().t0(), y0);
            for (int k = 0; k < ns; k++) {
                yp0full[k] = seed.getOrDefault(derVar(states.get(k)), 0.0);
            }
            for (int j = 0; j < auxNames.size(); j++) {
                y0full[ns + j] = seed.getOrDefault(auxNames.get(j), 0.0);
            }
        } catch (RuntimeException ignored) {
            // IDACalcIC will resolve the auxiliaries / derivatives from zeros.
        }

        int[][] sparsity = buildSparsity(template, column, ns);
        DaeRootFn rootFn = buildRootFn();
        List<String> eventNames = new ArrayList<>();
        List<Boolean> stops = new ArrayList<>();
        for (DynamicSystem.Event ev : system.events()) {
            eventNames.add(ev.name());
            stops.add("stop".equals(ev.action()));
        }
        boolean[] eventStops = new boolean[stops.size()];
        for (int i = 0; i < stops.size(); i++) {
            eventStops[i] = stops.get(i);
        }

        return new DaeAssembly(n, variables, new ArrayList<>(states), new ArrayList<>(auxNames),
                id, residual, y0full, yp0full, sparsity,
                eventNames.isEmpty() ? null : rootFn, eventNames, eventStops);
    }

    /** Builds the name→value map for the DAE residual/roots: params, time, states
     *  (y), auxiliaries (y), and each {@code der$X} bound to {@code y'[idx(X)]}. */
    private Map<String, Double> daeValues(double t, double[] y, double[] yp) {
        Map<String, Double> v = new HashMap<>(analyticValues);
        v.put(timeVar, t);
        int ns = states.size();
        for (int k = 0; k < ns; k++) {
            v.put(states.get(k), y[k]);
            v.put(derVar(states.get(k)), yp[k]);
        }
        for (int j = 0; j < auxNames.size(); j++) {
            v.put(auxNames.get(j), y[ns + j]);
        }
        return v;
    }

    /** Per-row column dependency lists: a variable hits its own column; a
     *  {@code der$X} reference hits state X's column (the {@code ∂F/∂y'} term
     *  shares the column with {@code ∂F/∂y} in IDA's combined system matrix). */
    private int[][] buildSparsity(List<Equation> template, Map<String, Integer> column, int ns) {
        int[][] sparsity = new int[template.size()][];
        for (int i = 0; i < template.size(); i++) {
            java.util.TreeSet<Integer> cols = new java.util.TreeSet<>();
            Equation eq = template.get(i);
            addColumns(eq.lhs(), column, ns, cols);
            addColumns(eq.rhs(), column, ns, cols);
            int[] arr = new int[cols.size()];
            int c = 0;
            for (int col : cols) {
                arr[c++] = col;
            }
            sparsity[i] = arr;
        }
        return sparsity;
    }

    private void addColumns(Expr e, Map<String, Integer> column, int ns, java.util.Set<Integer> cols) {
        for (String var : e.variables()) {
            Integer col = column.get(var);
            if (col != null) {
                cols.add(col);
            } else if (var.startsWith("der$")) {
                Integer sc = column.get(var.substring("der$".length()));
                if (sc != null && sc < ns) {
                    cols.add(sc);
                }
            }
        }
    }

    private DaeRootFn buildRootFn() {
        if (system.events().isEmpty()) {
            return null;
        }
        List<Expr> lhs = new ArrayList<>();
        List<Expr> rhs = new ArrayList<>();
        for (DynamicSystem.Event ev : system.events()) {
            lhs.add(substituteDer(ev.lhs()));
            rhs.add(substituteDer(ev.rhs()));
        }
        return (t, y, yp, gout) -> {
            Map<String, Double> v = daeValues(t, y, yp);
            for (int r = 0; r < lhs.size(); r++) {
                gout[r] = Evaluator.eval(lhs.get(r), v, defs) - Evaluator.eval(rhs.get(r), v, defs);
            }
        };
    }

    private OdeTableResult solveWithIda() {
        if (!SundialsIda.isAvailable()) {
            throw new SolverException("DYNAMIC " + system.name() + ": method '"
                    + system.options().method() + "' needs the SUNDIALS IDA native library. "
                    + "Set the SUNDIALS_LIBRARY environment variable (and put its dependencies on "
                    + "LD_LIBRARY_PATH), or pick a built-in method (ode45/ode23s/ode15s).");
        }
        DaeAssembly dae = assembleDae();
        DynamicSystem.Options o = system.options();
        int points = o.points() != null ? o.points() : DynamicSystem.Options.DEFAULT_POINTS;
        double[] times = linspace(o.t0(), o.tf(), points);

        List<String> columns = new ArrayList<>();
        columns.add(timeVar);
        columns.addAll(states);
        columns.addAll(auxNames);
        List<List<Double>> rows = new ArrayList<>();
        List<OdeTableResult.EventHit> hits = new ArrayList<>();

        try (IdaDaeSolver s = new IdaDaeSolver(dae.n(), dae.residual())) {
            s.setTolerances(o.rtol(), o.atol());
            s.setVariableId(dae.id());
            if (dae.eventCount() > 0) {
                s.setRoots(dae.eventCount(), dae.rootFn());
            }
            // Engage KLU sparse only where it pays (many-cell distributed models);
            // small lumped/few-cell networks stay on the dense solver.
            if (dae.n() > SPARSE_THRESHOLD) {
                s.setSparsity(dae.sparsity());
            }
            s.init(o.t0(), dae.y0(), dae.yp0());
            double span = o.tf() - o.t0();
            // IDACalcIC refines the initial (y,y') to satisfy the algebraic
            // constraints. Its line search can fail (-12) on a stiff coupled DAE
            // even when the assembled initial state — already seeded from the inner
            // algebraic solve at t0 (DaeAssembly), with the Phase-A consistent
            // enthalpies — is itself near-consistent. In that case fall back to
            // integrating from the seeded state rather than aborting the solve;
            // IDA's first BDF step will absorb any small residual.
            try {
                s.calcConsistentIc(SundialsIda.IDA_YA_YDP_INIT, o.t0() + span * 1e-3);
            } catch (IllegalStateException icFailed) {
                s.reinit(o.t0(), dae.y0(), dae.yp0());
            }
            rows.add(rowOf(o.t0(), s.currentState()));

            for (int i = 1; i < times.length; i++) {
                double tout = times[i];
                IdaDaeSolver.Step step = advanceTo(s, tout, dae, hits);
                if (step == null) { // a stop event fired
                    double tStop = hits.get(hits.size() - 1).time();
                    rows.add(rowOf(tStop, s.currentState()));
                    return new OdeTableResult(system.name(), columns, rows, hits,
                            o.method(), true, tStop);
                }
                rows.add(rowOf(tout, step.y()));
            }
        }
        return new OdeTableResult(system.name(), columns, rows, hits, o.method(), false, o.tf());
    }

    /** Integrates to {@code tout}, recording any non-stop root crossings and
     *  continuing; returns {@code null} if a stop event fired. */
    private IdaDaeSolver.Step advanceTo(IdaDaeSolver s, double tout, DaeAssembly dae,
                                        List<OdeTableResult.EventHit> hits) {
        while (true) {
            IdaDaeSolver.Step step = s.step(tout);
            if (step.rootReturn()) {
                int[] found = step.rootsFound();
                for (int r = 0; r < found.length; r++) {
                    if (found[r] != 0) {
                        hits.add(new OdeTableResult.EventHit(dae.eventNames().get(r), step.t()));
                        if (dae.eventStops()[r]) {
                            return null;
                        }
                    }
                }
                if (step.t() >= tout) {
                    return step;
                }
                continue;
            }
            return step;
        }
    }

    private List<Double> rowOf(double t, double[] y) {
        List<Double> row = new ArrayList<>(y.length + 1);
        row.add(t);
        for (double v : y) {
            row.add(v);
        }
        return row;
    }

    private static double[] linspace(double a, double b, int n) {
        double[] g = new double[Math.max(n, 2)];
        for (int i = 0; i < g.length; i++) {
            g[i] = a + (b - a) * i / (g.length - 1);
        }
        return g;
    }

    // ── Structural classification ───────────────────────────────────────────

    private void classify() {
        // Expand method-of-lines FOR loops and array indices against the solved
        // constants (e.g. N), turning der(T[i]) into concrete scalar states
        // der(T[1]), der(T[2]), … keyed as "t[1]", "t[2]", … — the same naming
        // the analytic array/FOR machinery uses.
        List<Equation> auxEquations = new ArrayList<>();
        Map<String, Expr> derRhs = collectStateRhs(auxEquations);

        java.util.Set<String> implicitStates = new java.util.LinkedHashSet<>();
        for (Equation eq : auxEquations) {
            collectAllDers(eq.lhs(), implicitStates);
            collectAllDers(eq.rhs(), implicitStates);
        }

        if (derRhs.isEmpty() && implicitStates.isEmpty()) {
            throw new SolverException("DYNAMIC " + system.name()
                    + ": no der(X) equation found — a DYNAMIC block needs at least one state.");
        }
        
        states.addAll(derRhs.keySet());
        for (String is : implicitStates) {
            if (!states.contains(is)) {
                states.add(is);
            }
        }
        auxNames.removeAll(states);
        initializeStateVector();

        // Reify derivatives: der(X) -> der$X; build the combined algebraic block.
        for (String s : states) {
            if (derRhs.containsKey(s)) {
                algebraicTemplate.add(new Equation(new Expr.Var(derVar(s)),
                        substituteDer(derRhs.get(s)), "der$" + s));
            }
        }
        for (Equation aux : auxEquations) {
            algebraicTemplate.add(new Equation(substituteDer(aux.lhs()),
                    substituteDer(aux.rhs()), aux.sourceText()));
        }
        registerImplicitAuxiliaries();
        validateReferences();
    }

    /**
     * Promotes to auxiliaries every non-state variable the algebraic block
     * references, not just simple {@code name = expr} assignment targets. An
     * expanded component network defines variables <em>implicitly</em> through
     * constraint equations (e.g. {@code a.Qdot + b.Qdot = 0} or {@code mass.T =
     * wall.T}); these are still per-step unknowns the coupled algebraic solve
     * determines, so they must be registered (and emitted as output columns)
     * rather than rejected as undefined. A genuinely undefined reference instead
     * makes the block non-square and surfaces at the per-step solve.
     */
    private void registerImplicitAuxiliaries() {
        java.util.Set<String> known = new java.util.HashSet<>(analyticValues.keySet());
        known.add(timeVar);
        for (String s : states) {
            known.add(s);
            known.add(derVar(s));
        }
        java.util.LinkedHashSet<String> aux = new java.util.LinkedHashSet<>(auxNames);
        for (Equation eq : algebraicTemplate) {
            for (String v : eq.lhs().variables()) {
                if (!known.contains(v)) {
                    aux.add(v);
                }
            }
            for (String v : eq.rhs().variables()) {
                if (!known.contains(v)) {
                    aux.add(v);
                }
            }
        }
        auxNames.clear();
        auxNames.addAll(aux);
    }

    private void collectAllDers(Expr e, java.util.Set<String> found) {
        if (e instanceof Expr.Call c) {
            if (c.function().equals("der") && c.args().size() == 1 && c.args().get(0) instanceof Expr.Var v) {
                found.add(v.name());
            }
            for (Expr a : c.args()) {
                collectAllDers(a, found);
            }
        } else if (e instanceof Expr.BinOp b) {
            collectAllDers(b.left(), found);
            collectAllDers(b.right(), found);
        } else if (e instanceof Expr.Neg n) {
            collectAllDers(n.operand(), found);
        } else if (e instanceof Expr.Compare c) {
            collectAllDers(c.left(), found);
            collectAllDers(c.right(), found);
        } else if (e instanceof Expr.Logical l) {
            collectAllDers(l.left(), found);
            collectAllDers(l.right(), found);
        } else if (e instanceof Expr.Not n) {
            collectAllDers(n.operand(), found);
        } else if (e instanceof Expr.ArrayAccess a) {
            for (Expr idx : a.indices()) {
                collectAllDers(idx, found);
            }
        }
    }

    /** Splits the expanded body into state RHS (der equations) and auxiliary
     *  equations; aux equations are appended to {@code auxOut} and their names
     *  recorded. Returns the per-state der() right-hand sides. */
    private Map<String, Expr> collectStateRhs(List<Equation> auxOut) {
        Map<String, Expr> derRhs = new LinkedHashMap<>();
        for (Equation eq : expandBody()) {
            String explicitState = derStateName(eq.lhs());
            java.util.Set<String> rhsDers = new java.util.LinkedHashSet<>();
            collectAllDers(eq.rhs(), rhsDers);
            if (explicitState != null && rhsDers.isEmpty()) {
                if (derRhs.containsKey(explicitState)) {
                    throw new SolverException("DYNAMIC " + system.name() + ": state '" + explicitState
                            + "' has more than one explicit der() equation.");
                }
                derRhs.put(explicitState, eq.rhs());
            } else {
                auxOut.add(eq);
                String auxName = simpleVarName(eq.lhs());
                if (auxName != null && !auxNames.contains(auxName)) {
                    auxNames.add(auxName);
                }
            }
        }
        return derRhs;
    }

    /** Resolves one initial condition per state (array initials expand over
     *  their range) and populates the {@code y0} initial-state vector. */
    private void initializeStateVector() {
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

    /** Expands one initial condition (scalar, single element, or a {@code 1:N}
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
