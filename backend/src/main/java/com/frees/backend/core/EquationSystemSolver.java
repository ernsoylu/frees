package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.units.UnitChecker;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.DecompositionSolver;
import org.apache.commons.math3.linear.RealVector;
import org.apache.commons.math3.linear.SingularValueDecomposition;

/**
 * Orchestrates the full solve pipeline:
 * parse -> extract variables (guess 1.0, bounds ±infinity) -> block -> solve.
 */
@Service
public class EquationSystemSolver {

    private static final Logger log = LoggerFactory.getLogger(EquationSystemSolver.class);

    public static final double DEFAULT_GUESS = 1.0;
    private static final String UNCERTAINTY_OF_FN = "uncertaintyof$";

    private final EquationParser parser = new EquationParser();
    private final Blocker blocker = new Blocker();

    public record EquationResidual(String equation, double residual) {}

    public record Stats(int equationCount,
                        int unknownCount,
                        int blockCount,
                        int iterations,
                        long elapsedMillis,
                        double maxResidual) {}

    public record Solution(Map<String, Double> variables,
                           List<EquationResidual> residuals,
                           double maxResidual) {}

    /**
     * variables/residuals describe the first solution (single-solve returns
     * exactly one); solutions lists every distinct solution found.
     * displayNames maps canonical (lowercase) variable names to the spelling
     * of their first appearance, used for display.
     */
    public record Result(Map<String, Double> variables,
                         List<Block> blocks,
                         List<EquationResidual> residuals,
                         Stats stats,
                         List<Solution> solutions,
                         Map<String, String> displayNames,
                         Map<String, Double> uncertainties,
                         List<com.frees.backend.core.ode.OdeTableResult> odeTables,
                         List<com.frees.backend.api.SolveDtos.ResidueExpansionDto> residueExpansions) {

        public Result(Map<String, Double> variables,
                      List<Block> blocks,
                      List<EquationResidual> residuals,
                      Stats stats,
                      List<Solution> solutions,
                      Map<String, String> displayNames,
                      Map<String, Double> uncertainties,
                      List<com.frees.backend.core.ode.OdeTableResult> odeTables) {
            this(variables, blocks, residuals, stats, solutions, displayNames, uncertainties,
                    odeTables, List.of());
        }

        public Result(Map<String, Double> variables,
                      List<Block> blocks,
                      List<EquationResidual> residuals,
                      Stats stats,
                      List<Solution> solutions,
                      Map<String, String> displayNames) {
            this(variables, blocks, residuals, stats, solutions, displayNames, Map.of(), List.of());
        }
    }

    public record CheckResult(boolean solvable,
                              int equationCount,
                              int unknownCount,
                              List<String> variables,
                              String message) {}

    /**
     * Check/Format: verifies syntax and reports equation/variable counts,
     * then verifies the system is structurally solvable (zero degrees of
     * freedom and an independent equation-to-variable assignment). Does not
     * solve anything.
     */
    /**
     * Parse a source once so callers can thread the {@link EquationParser.ParseResult}
     * into the {@code check}/{@code deriveUnits}/{@code inferUnits}/{@code checkUnits}
     * overloads, instead of re-parsing the same text for each call.
     */
    public EquationParser.ParseResult parse(String source) {
        return parser.parseResult(source);
    }

    public CheckResult check(String source) {
        return check(source, false);
    }

    public CheckResult check(String source, boolean complexMode) {
        return check(source, complexMode, Map.of());
    }

    /** extraDefs adds externally supplied definitions (Curve Tables) to the
     * source-defined functions; source definitions win on name collision. */
    public CheckResult check(String source, boolean complexMode,
                             Map<String, ProcDef> extraDefs) {
        return check(parser.parseResult(source), complexMode, extraDefs);
    }

    /** Overload reusing an already-parsed source (avoids re-parsing on the check/solve path). */
    public CheckResult check(EquationParser.ParseResult base, boolean complexMode,
                             Map<String, ProcDef> extraDefs) {
        EquationParser.ParseResult parsed = withExtraDefs(base, extraDefs);
        List<Equation> equations = IntegralSolver.hoistNested(parsed.equations());
        ExtractedUncertainties ext = extractUncertaintyEquations(equations);
        equations = ext.activeEquations();
        try {
            requireComplexModeForImaginaryLiterals(equations, complexMode);
            List<IntegralSolver.IntegralEquation> integrals =
                    findIntegrals(equations, parsed.defs(), complexMode);
            if (!integrals.isEmpty()) {
                // Structure-only view: the integral pins its result variable
                // and drives the integration variable internally.
                equations = IntegralSolver.structuralView(equations, integrals);
            } else if (complexMode) {
                equations = com.frees.backend.parser.ComplexExpansion.expand(
                        equations, parsed.displayNames());
            }
        } catch (SolverException e) {
            TreeSet<String> vars = collectVariables(equations);
            return new CheckResult(false, equations.size(), vars.size(),
                    displayNamesOf(vars, parsed), e.getMessage());
        }

        // A document whose only content is DYNAMIC block(s) has no analytic
        // equations — the ODE system is self-contained and solvable directly.
        if (equations.isEmpty() && !parsed.dynamicSystems().isEmpty()) {
            int dynEqs = parsed.dynamicSystems().stream()
                    .mapToInt(ds -> ds.bodyEquations().size() + ds.initials().size())
                    .sum();
            return new CheckResult(true, dynEqs, dynEqs, List.of(),
                    String.format("No syntax errors were detected. DYNAMIC system with %d equation(s).",
                            dynEqs));
        }

        TreeSet<String> allVars = collectVariables(equations);
        List<String> variables = displayNamesOf(allVars, parsed);
        int surfacedVars = surfacedVarCount(allVars);
        // Ignored/omitted output sinks add a matching equation per variable, so hide them
        // from both reported counts to keep the displayed equation/variable balance honest.
        int surfacedEqs = equations.size() - (allVars.size() - surfacedVars);
        try {
            blocker.verifyStructure(equations);
        } catch (SolverException e) {
            return new CheckResult(false, surfacedEqs, surfacedVars, variables,
                    e.getMessage());
        }

        return new CheckResult(true, surfacedEqs, surfacedVars, variables,
                String.format(
                        "No syntax errors were detected. There are %d equations and %d variables.",
                        surfacedEqs, surfacedVars));
    }

    private static EquationParser.ParseResult withExtraDefs(
            EquationParser.ParseResult parsed, Map<String, ProcDef> extraDefs) {
        if (extraDefs.isEmpty()) {
            return parsed;
        }
        Map<String, ProcDef> merged = new HashMap<>(extraDefs);
        merged.putAll(parsed.defs());
        return new EquationParser.ParseResult(
                parsed.equations(), parsed.displayNames(), merged,
                parsed.parametricTables(), parsed.plots(), parsed.stateTables(),
                parsed.dynamicSystems());
    }

    /** Imaginary literals are meaningless in real mode; fail with guidance. */
    private static void requireComplexModeForImaginaryLiterals(List<Equation> equations,
                                                               boolean complexMode) {
        if (!complexMode
                && com.frees.backend.parser.ComplexExpansion.mentionsImaginary(equations)) {
            throw new SolverException("The equations contain complex literals "
                    + "(e.g. 1i): enable Complex mode to solve them.");
        }
    }

    private static TreeSet<String> collectVariables(List<Equation> equations) {
        TreeSet<String> vars = new TreeSet<>();
        for (Equation eq : equations) {
            vars.addAll(eq.variables());
        }
        return vars;
    }

    private static List<String> displayNamesOf(TreeSet<String> vars,
                                               EquationParser.ParseResult parsed) {
        return vars.stream()
                .filter(v -> !EquationParser.isIgnoredSink(v))
                .map(v -> parsed.displayNames().getOrDefault(v, v))
                .toList();
    }

    /** Number of variables that surface to the user — excludes hidden ignored-output sinks. */
    private static int surfacedVarCount(TreeSet<String> vars) {
        return (int) vars.stream().filter(v -> !EquationParser.isIgnoredSink(v)).count();
    }

    /**
     * Integral equations of the system, or an empty list when none exist.
     * Detection runs on the raw parsed equations (before complex expansion).
     */
    private static List<IntegralSolver.IntegralEquation> findIntegrals(
            List<Equation> equations, Map<String, ProcDef> defs, boolean complexMode) {
        boolean mentions = equations.stream().anyMatch(eq ->
                IntegralSolver.mentionsIntegral(eq.lhs())
                        || IntegralSolver.mentionsIntegral(eq.rhs()));
        if (!mentions) {
            return List.of();
        }
        if (complexMode) {
            throw new SolverException("Integral is not supported in complex mode.");
        }
        return IntegralSolver.extract(equations, defs);
    }

    public Result solve(String source) {
        return solve(source, SolverSettings.DEFAULTS, Map.of());
    }

    public Result solve(String source, SolverSettings settings) {
        return solve(source, settings, Map.of());
    }

    public Result solve(String source, SolverSettings settings,
                        Map<String, VariableSpec> specs) {
        return solve(source, settings, specs, Map.of());
    }

    public Result solve(String source, SolverSettings settings,
                        Map<String, VariableSpec> specs,
                        Map<String, ProcDef> extraDefs) {
        long startNanos = System.nanoTime();
        long deadlineNanos = startNanos + (long) (settings.elapsedTimeSeconds() * 1.0e9);
        EquationParser.ParseResult parsed =
                withExtraDefs(parser.parseResult(source), extraDefs);
        requireComplexModeForImaginaryLiterals(parsed.equations(), settings.complexMode());
        List<Equation> equations = IntegralSolver.hoistNested(parsed.equations());
        ExtractedUncertainties ext = extractUncertaintyEquations(equations);
        equations = ext.activeEquations();
        List<IntegralSolver.IntegralEquation> integrals =
                findIntegrals(equations, parsed.defs(), settings.complexMode());
        if (!integrals.isEmpty()) {
            return solveWithIntegrals(parsed, equations, ext.uncertaintyExprs(), integrals, settings, specs,
                    startNanos, deadlineNanos);
        }

        if (settings.complexMode()) {
            equations = com.frees.backend.parser.ComplexExpansion.expand(equations, parsed.displayNames());
        }

        // Plant → control coupling (Phase 4): numerically linearize each named
        // component network about its operating point and inject the resulting
        // A/B/C/D matrix entries as equations, so the control suite (CALL ss/lqr/
        // place/…) consumes them in the same solve.
        if (!parsed.linearizeSystems().isEmpty()) {
            equations = injectLinearizations(parsed, equations, settings, specs, deadlineNanos);
        }

        // A document whose only content is DYNAMIC block(s) (all parameters inline)
        // has no analytic equations to block/solve — run the ODE blocks directly.
        if (equations.isEmpty() && !parsed.dynamicSystems().isEmpty()) {
            List<com.frees.backend.core.ode.OdeTableResult> odeOnly =
                    solveDynamicSystems(parsed, new HashMap<>(), settings, specs, deadlineNanos);
            return buildResult(equations, List.of(), List.of(Map.of()), 0, startNanos,
                    parsed, Map.of(), odeOnly);
        }

        boolean odeAccessors = !parsed.dynamicSystems().isEmpty()
                && com.frees.backend.core.ode.OdeAccessors.containsAccessor(equations);
        SolverSettings solveSettings = settings;
        if (odeAccessors) {
            Map<String, String> displayToFlat = invertDisplayNames(parsed.displayNames());
            equations = augmentAccessorDependencies(equations, parsed.dynamicSystems(), displayToFlat);
            installAccessorContext(parsed, settings, specs, deadlineNanos, displayToFlat);
            // The accessor constraint residual rides on the ODE/FD noise floor.
            solveSettings = relaxedOdeSettings(settings, 1e-4);
        }
        try {
        InnerSolve solved = solveEquationList(equations, solveSettings, specs,
                parsed.defs(), deadlineNanos, null);
        Map<String, VariableSpec> mutableSpecs = new HashMap<>(specs);
        applyUncertaintySpecs(ext.uncertaintyExprs(), solved.values(), mutableSpecs, parsed.defs());
        Map<String, Double> uncertainties = propagateUncertainty(equations, solved.values(), mutableSpecs, parsed.defs());
        if (mentionsUncertaintyOf(equations)) {
            UncertaintyPass pass = resolveUncertaintySecondPass(equations, solved, uncertainties,
                    ext.uncertaintyExprs(), mutableSpecs, parsed, settings, deadlineNanos);
            solved = pass.solved();
            uncertainties = pass.uncertainties();
        }
        List<com.frees.backend.core.ode.OdeTableResult> odeTables =
                solveDynamicSystems(parsed, solved.values(), settings, specs, deadlineNanos);
        return buildResult(equations, solved.blocks(), List.of(solved.values()),
                solved.iterations(), startNanos, parsed, uncertainties, odeTables);
        } finally {
            if (odeAccessors) {
                com.frees.backend.core.ode.DynamicAccessorContext.clear();
            }
        }
    }

    /** Evaluates each {@code UncertaintyOf(X) = expr} at the solved state and pins
     *  the resulting uncertainty into that variable's spec (silently skipping any
     *  expression that cannot yet be evaluated). */
    private void applyUncertaintySpecs(Map<String, Expr> uncertaintyExprs, Map<String, Double> values,
                                       Map<String, VariableSpec> mutableSpecs, Map<String, ProcDef> defs) {
        for (Map.Entry<String, Expr> entry : uncertaintyExprs.entrySet()) {
            String varName = entry.getKey();
            try {
                double val = Evaluator.eval(entry.getValue(), values, defs);
                VariableSpec old = mutableSpecs.get(varName);
                mutableSpecs.put(varName, new VariableSpec(
                        varName,
                        old != null ? old.guess() : 1.0,
                        old != null ? old.lower() : Double.NEGATIVE_INFINITY,
                        old != null ? old.upper() : Double.POSITIVE_INFINITY,
                        val
                ));
            } catch (Exception ignored) {
                // Expression not yet resolvable at this state; leave the spec as-is.
            }
        }
    }

    /** Publishes computed uncertainties into the value map as {@code uncertaintyof$<var>}
     *  so {@code UncertaintyOf(X)} queries in active equations can read them. */
    private void injectUncertaintyValues(Map<String, Double> values, Map<String, Double> uncertainties) {
        for (Map.Entry<String, Double> entry : uncertainties.entrySet()) {
            values.put(UNCERTAINTY_OF_FN + entry.getKey().toLowerCase(), entry.getValue());
        }
    }

    private record UncertaintyPass(InnerSolve solved, Map<String, Double> uncertainties) {}

    /** Second solve pass when active equations query {@code UncertaintyOf(X)}: feed
     *  the first-pass uncertainties back in, re-solve, then re-propagate. */
    private UncertaintyPass resolveUncertaintySecondPass(List<Equation> equations, InnerSolve solved,
            Map<String, Double> uncertainties, Map<String, Expr> uncertaintyExprs,
            Map<String, VariableSpec> mutableSpecs, EquationParser.ParseResult parsed,
            SolverSettings settings, long deadlineNanos) {
        injectUncertaintyValues(solved.values(), uncertainties);
        InnerSolve resolved = solveEquationList(equations, settings, mutableSpecs,
                parsed.defs(), deadlineNanos, solved.values());
        applyUncertaintySpecs(uncertaintyExprs, resolved.values(), mutableSpecs, parsed.defs());
        Map<String, Double> newUncertainties = propagateUncertainty(equations, resolved.values(), mutableSpecs, parsed.defs());
        injectUncertaintyValues(resolved.values(), newUncertainties);
        return new UncertaintyPass(resolved, newUncertainties);
    }

    /**
     * Installs the thread-bound accessor context so ODE Table accessors evaluate
     * live against the current Newton iterate during this solve.
     */
    /**
     * Linearizes each {@code LINEARIZE} block's component network about its
     * operating point and appends the A/B/C/D matrix entries as
     * {@code name[i,j] = value} equations (plus a 1-D form for single-column B/D),
     * so a following {@code CALL lqr/place/ss(...)} reads them. The operating
     * point's exogenous inputs are taken from the document's scalar constants.
     */
    private List<Equation> injectLinearizations(EquationParser.ParseResult parsed, List<Equation> equations,
                                                SolverSettings settings, Map<String, VariableSpec> specs,
                                                long deadlineNanos) {
        Map<String, Double> constants = extractScalarConstants(equations);
        Map<String, String> displayToFlat = invertDisplayNames(parsed.displayNames());
        SolverSettings inner = relaxedOdeSettings(settings, 1e-7);
        com.frees.backend.core.ode.DynamicSolver.AlgebraicSolve algebraic =
                (ordinary, pinned, warmStart) -> solvePinned(ordinary, pinned, inner, specs,
                        parsed.defs(), deadlineNanos, warmStart).values();
        List<Equation> out = new ArrayList<>(equations);
        for (com.frees.backend.ast.LinearizeSystem ls : parsed.linearizeSystems()) {
            com.frees.backend.ast.DynamicSystem ds = null;
            for (com.frees.backend.ast.DynamicSystem d : parsed.dynamicSystems()) {
                if (d.name().equalsIgnoreCase(ls.dynamicName())) {
                    ds = d;
                    break;
                }
            }
            if (ds == null) {
                throw new SolverException("LINEARIZE " + ls.name() + ": no DYNAMIC block named '"
                        + ls.dynamicName() + "' (it names the transient component network to linearize).");
            }
            List<String> inputs = ls.inputs().stream()
                    .map(s -> displayToFlat.getOrDefault(s, s)).toList();
            List<String> outputs = ls.outputs().stream()
                    .map(s -> displayToFlat.getOrDefault(s, s)).toList();
            com.frees.backend.core.ode.DynamicSolver.Linearization lin =
                    new com.frees.backend.core.ode.DynamicSolver(ds, constants, parsed.defs(),
                            algebraic, deadlineNanos).linearize(inputs, outputs);
            emitMatrix(out, ls.aName(), lin.a(), parsed.displayNames());
            emitMatrix(out, ls.bName(), lin.b(), parsed.displayNames());
            emitMatrix(out, ls.cName(), lin.c(), parsed.displayNames());
            emitMatrix(out, ls.dName(), lin.d(), parsed.displayNames());
        }
        return out;
    }

    /** Emits {@code name[i,j] = value} equations for a matrix (1-indexed); a
     *  single-column matrix also gets the 1-D {@code name[i]} form so SISO control
     *  calls (e.g. {@code B[1:n]}) resolve. */
    private static void emitMatrix(List<Equation> out, String name, double[][] m,
                                   Map<String, String> displayNames) {
        String lower = name.toLowerCase();
        int rows = m.length;
        int cols = rows > 0 ? m[0].length : 0;
        for (int i = 0; i < rows; i++) {
            for (int j = 0; j < cols; j++) {
                String k2 = lower + "[" + (i + 1) + "," + (j + 1) + "]";
                out.add(new Equation(new Expr.Var(k2), new Expr.Num(m[i][j]), k2 + " (linearized)"));
                displayNames.putIfAbsent(k2, name + "[" + (i + 1) + "," + (j + 1) + "]");
                if (cols == 1) {
                    String k1 = lower + "[" + (i + 1) + "]";
                    out.add(new Equation(new Expr.Var(k1), new Expr.Num(m[i][0]), k1 + " (linearized)"));
                    displayNames.putIfAbsent(k1, name + "[" + (i + 1) + "]");
                }
            }
        }
    }

    /** Scalar constant assignments ({@code var = number}) from the equation list,
     *  used as the linearization's exogenous (input) operating-point values. */
    private static Map<String, Double> extractScalarConstants(List<Equation> equations) {
        Map<String, Double> c = new HashMap<>();
        for (Equation e : equations) {
            if (e.lhs() instanceof Expr.Var(String n)
                    && e.rhs() instanceof Expr.Num(double v, String u, boolean im) && !im) {
                c.put(n.toLowerCase(), v);
            }
        }
        return c;
    }

    private void installAccessorContext(EquationParser.ParseResult parsed, SolverSettings settings,
                                        Map<String, VariableSpec> specs, long deadlineNanos,
                                        Map<String, String> displayToFlat) {
        SolverSettings inner = relaxedOdeSettings(settings, 1e-7);
        com.frees.backend.core.ode.DynamicAccessorContext.BlockRunner runner = (ds, values) -> {
            com.frees.backend.core.ode.DynamicSolver.AlgebraicSolve algebraic =
                    (ordinary, pinned, warmStart) -> solvePinned(ordinary, pinned, inner, specs,
                            parsed.defs(), deadlineNanos, warmStart).values();
            return new com.frees.backend.core.ode.DynamicSolver(
                    ds, values, parsed.defs(), algebraic, deadlineNanos).solve();
        };
        com.frees.backend.core.ode.DynamicAccessorContext.install(
                parsed.dynamicSystems(), displayToFlat, runner);
    }

    /**
     * Inverts the flat→display name map into display→flat (both lowercased) so an
     * ODE accessor can address a component's transient state by its natural
     * dotted display name ({@code 'm.port.t'}) rather than the internal flat name
     * ({@code 'm$port$t'}); plain DYNAMIC states keep working (they are absent
     * from the map, so the column passes through unchanged).
     */
    private static Map<String, String> invertDisplayNames(Map<String, String> displayNames) {
        Map<String, String> inv = new HashMap<>();
        for (Map.Entry<String, String> e : displayNames.entrySet()) {
            inv.put(e.getValue().toLowerCase(), e.getKey().toLowerCase());
        }
        return inv;
    }

    /**
     * Looser tolerances for ODE-coupled solves. The per-step algebraic block and
     * the analytic solve of an accessor constraint both sit on a finite-difference
     * / integration noise floor, so the default {@code 1e-12} residual target is
     * physically unreachable; the loosened target is still far tighter than any
     * engineering tolerance.
     */
    private static SolverSettings relaxedOdeSettings(SolverSettings base, double relTol) {
        return new SolverSettings(base.maxIterations(), relTol,
                Math.max(base.changeInVariables(), 1e-9),
                base.elapsedTimeSeconds(), base.complexMode());
    }

    /**
     * Adds zero-valued terms {@code + 0·v} (for each input variable {@code v} of
     * the DYNAMIC block an accessor reads) to every accessor-bearing equation, so
     * Tarjan blocking and the Newton Jacobian see the coupling between the
     * constraint and the analytic variables that feed the ODE. Only variables
     * already present in the analytic system are linked (so no new unknowns are
     * introduced); the added terms are identically zero and never change a
     * residual.
     */
    private List<Equation> augmentAccessorDependencies(List<Equation> equations,
                                                       List<com.frees.backend.ast.DynamicSystem> systems,
                                                       Map<String, String> displayToFlat) {
        TreeSet<String> analyticVars = collectVariables(equations);
        List<Equation> out = new ArrayList<>(equations.size());
        for (Equation eq : equations) {
            java.util.LinkedHashSet<String> cols = new java.util.LinkedHashSet<>();
            collectAccessorColumns(eq.lhs(), cols);
            collectAccessorColumns(eq.rhs(), cols);
            if (cols.isEmpty()) {
                out.add(eq);
                continue;
            }
            java.util.LinkedHashSet<String> deps = new java.util.LinkedHashSet<>();
            for (String col : cols) {
                String flatCol = displayToFlat.getOrDefault(col.toLowerCase(), col);
                for (String v : com.frees.backend.core.ode.DynamicAccessorContext
                        .inputVarsForColumn(systems, flatCol)) {
                    if (analyticVars.contains(v)) {
                        deps.add(v);
                    }
                }
            }
            Expr lhs = eq.lhs();
            for (String v : deps) {
                lhs = new Expr.BinOp('+', lhs,
                        new Expr.BinOp('*', new Expr.Num(0.0), new Expr.Var(v)));
            }
            out.add(new Equation(lhs, eq.rhs(), eq.sourceText()));
        }
        return out;
    }

    private static void collectAccessorColumns(Expr e, java.util.Set<String> cols) {
        switch (e) {
            case Expr.Call(String fn, List<Expr> args) -> {
                if (com.frees.backend.core.ode.OdeAccessors.isAccessor(fn) && !args.isEmpty()) {
                    if (args.get(0) instanceof Expr.Str(String s)) {
                        cols.add(s.toLowerCase());
                    } else if (args.get(0) instanceof Expr.Var(String n)) {
                        cols.add(n.toLowerCase());
                    }
                }
                for (Expr a : args) {
                    collectAccessorColumns(a, cols);
                }
            }
            case Expr.BinOp(char op, Expr l, Expr r) -> {
                collectAccessorColumns(l, cols);
                collectAccessorColumns(r, cols);
            }
            case Expr.Neg(Expr o) -> collectAccessorColumns(o, cols);
            case Expr.Compare(String op, Expr l, Expr r) -> {
                collectAccessorColumns(l, cols);
                collectAccessorColumns(r, cols);
            }
            case Expr.Logical(String op, Expr l, Expr r) -> {
                collectAccessorColumns(l, cols);
                collectAccessorColumns(r, cols);
            }
            case Expr.Not(Expr o) -> collectAccessorColumns(o, cols);
            default -> { /* leaf */ }
        }
    }

    /**
     * Permissive variant of solve() for parametric-table row solves. Unlike
     * solve(), this does NOT enforce global structural solvability: independent
     * equation blocks that are not covered by the table's columns stay at their
     * initial guesses instead of causing the whole row to fail. Only the blocks
     * that include at least one variable matched by the bipartite assignment are
     * solved by Newton's method.
     */
    public Result solvePermissive(String source, SolverSettings settings,
                                  Map<String, VariableSpec> specs,
                                  Map<String, ProcDef> extraDefs) {
        long startNanos = System.nanoTime();
        long deadlineNanos = startNanos + (long) (settings.elapsedTimeSeconds() * 1.0e9);
        EquationParser.ParseResult parsed =
                withExtraDefs(parser.parseResult(source), extraDefs);
        requireComplexModeForImaginaryLiterals(parsed.equations(), settings.complexMode());
        List<Equation> equations = IntegralSolver.hoistNested(parsed.equations());
        ExtractedUncertainties ext = extractUncertaintyEquations(equations);
        equations = ext.activeEquations();
        if (settings.complexMode()) {
            equations = com.frees.backend.parser.ComplexExpansion.expand(equations, parsed.displayNames());
        }
        InnerSolve solved = solveEquationListPermissive(equations, settings, specs, parsed.defs(), deadlineNanos);
        return buildResult(equations, solved.blocks(), List.of(solved.values()),
                solved.iterations(), startNanos, parsed, Map.of());
    }

    private InnerSolve solveEquationListPermissive(List<Equation> equations,
                                                   SolverSettings settings,
                                                   Map<String, VariableSpec> specs,
                                                   Map<String, ProcDef> defs,
                                                   long deadlineNanos) {
        TreeSet<String> allVars = collectVariables(equations);
        Map<String, VariableSpec> expandedSpecs = new HashMap<>(expandSpecs(allVars, specs, settings.complexMode()));
        seedPropertyArgumentGuesses(equations, expandedSpecs);
        checkAndAdjustGuesses(equations, defs, expandedSpecs, null);
        Map<String, Double> values = new HashMap<>();
        for (String name : allVars) {
            values.put(name, initialGuess(name, expandedSpecs, null));
        }
        NewtonSolver newtonSolver = new NewtonSolver(settings, defs);
        NewtonSolver retrySolver = new NewtonSolver(retrySettings(settings), defs);
        NewtonSolver polisher = new NewtonSolver(polishSettings(settings), defs);
        SolveConfig config = new SolveConfig(deadlineNanos, expandedSpecs, null, newtonSolver, retrySolver, polisher, defs);
        List<Block> blocks = blocker.blockPermissive(equations);
        int totalIterations = 0;
        Set<Integer> skipIndices = new HashSet<>();
        for (int bi = 0; bi < blocks.size(); bi++) {
            if (skipIndices.contains(bi)) continue;
            totalIterations += solveBlockWithFallback(bi, blocks, values, config, skipIndices);
        }
        return new InnerSolve(values, blocks, totalIterations);
    }

    private record SolveConfig(
            long deadlineNanos,
            Map<String, VariableSpec> specs,
            Map<String, Double> warmStart,
            NewtonSolver newton,
            NewtonSolver retry,
            NewtonSolver polisher,
            Map<String, ProcDef> defs
    ) {}

    private record InnerSolve(Map<String, Double> values, List<Block> blocks,
                              int iterations) {}

    private static double initialGuess(String name, Map<String, VariableSpec> specs,
                                       Map<String, Double> warmStart) {
        if (warmStart != null && warmStart.containsKey(name)) {
            return warmStart.get(name);
        }
        VariableSpec spec = specs.get(name);
        return spec != null ? spec.guess() : DEFAULT_GUESS;
    }

    /**
     * Domain-aware nominal guesses for CoolProp property-call arguments, keyed by
     * the encoded input indicator ({@code prop$enthalpy$water$p$h} → args carry
     * indicators {@code p}, {@code h}). A property argument left at the default
     * guess 1.0 means 1 Pa / 1 J/kg / 1 K — below every fluid's valid table
     * range — so the very first residual is NaN and the solve never starts.
     */
    private static final Map<String, Double> PROP_ARG_NOMINAL = Map.of(
            "p", 1.0e5,    // pressure ~1 bar
            "t", 300.0,    // temperature ~ambient
            "h", 1.0e5,    // enthalpy — inside the liquid range of most fluids
            "s", 1.0e3,    // entropy
            "u", 1.0e5,    // internal energy
            "d", 1.0,      // density
            "x", 0.5,      // quality (two-phase)
            "q", 0.5,      // quality (CoolProp 'Q')
            "v", 1.0e-3);  // specific volume

    /**
     * Seeds an initial guess for any unknown that appears as a bare argument of a
     * CoolProp property call and still sits at the default guess 1.0 (todo §8.5).
     * This puts an implicit-property base point inside the table's valid box so
     * the first residual evaluates, which is what monotonic inversions
     * (supercritical/single-phase Temperature(P,h)=T, Density(T,P)=ρ, …) need to
     * converge. User/GUI guesses always win — only an untouched DEFAULT_GUESS is
     * replaced. (Two-phase dome-crossing inversions, where dT/dh≈0, still need
     * the §8.7 homotopy work; this only fixes the invalid-base-point class.)
     */
    private static void seedPropertyArgumentGuesses(List<Equation> equations,
                                                    Map<String, VariableSpec> specs) {
        for (Equation eq : equations) {
            seedPropArgsIn(eq.lhs(), specs);
            seedPropArgsIn(eq.rhs(), specs);
        }
    }

    private static void seedPropArgsIn(Expr e, Map<String, VariableSpec> specs) {
        switch (e) {
            case Expr.Call(String fn, List<Expr> args) -> {
                if (fn.startsWith("prop$")) {
                    String[] tok = fn.split("\\$");
                    int n = args.size();
                    // The encoded call ends with one name token per argument
                    // (…$p$h for two args); map each to its argument expression.
                    for (int k = 0; k < n; k++) {
                        int ti = tok.length - n + k;
                        if (ti < 0) {
                            continue;
                        }
                        Double nominal = PROP_ARG_NOMINAL.get(tok[ti]);
                        if (nominal != null && args.get(k) instanceof Expr.Var(String vn)) {
                            applyNominalGuess(vn.toLowerCase(), nominal, specs);
                        }
                    }
                }
                args.forEach(a -> seedPropArgsIn(a, specs));
            }
            case Expr.BinOp(char op, Expr l, Expr r) -> {
                seedPropArgsIn(l, specs);
                seedPropArgsIn(r, specs);
            }
            case Expr.Neg(Expr o) -> seedPropArgsIn(o, specs);
            default -> {
                // leaf or non-arithmetic node: no property argument to seed
            }
        }
    }

    private static void applyNominalGuess(String var, double nominal,
                                          Map<String, VariableSpec> specs) {
        VariableSpec spec = specs.get(var);
        if (spec == null) {
            // No spec yet (the common case — most unknowns carry no user info):
            // create one so the nominal becomes the variable's initial guess.
            specs.put(var, new VariableSpec(var, nominal,
                    Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY));
            return;
        }
        if (spec.guess() != DEFAULT_GUESS) {
            return; // a user/GUI guess is already set — it always wins
        }
        double seeded = Math.clamp(nominal, spec.lower(), spec.upper());
        specs.put(var, new VariableSpec(var, seeded, spec.lower(), spec.upper(), spec.uncertainty()));
    }

    private static SolverSettings polishSettings(SolverSettings settings) {
        // Near-zero residual tolerance so the polisher keeps iterating until
        // variable change drops below 1e-15.  This is critical for multiple
        // roots where residual ≈ error^m drops below tolerance long before
        // the variable has converged.
        return new SolverSettings(50, 1e-30, 1e-15,
                settings.elapsedTimeSeconds(), settings.complexMode());
    }

    /** Blocks and solves one equation list; warmStart seeds initial guesses. */
    private InnerSolve solveEquationList(List<Equation> equations,
                                         SolverSettings settings,
                                         Map<String, VariableSpec> specs,
                                         Map<String, ProcDef> defs,
                                         long deadlineNanos,
                                         Map<String, Double> warmStart) {
        TreeSet<String> allVars = collectVariables(equations);
        Map<String, VariableSpec> expandedSpecs = new HashMap<>(
                expandSpecs(allVars, specs, settings.complexMode()));
        seedPropertyArgumentGuesses(equations, expandedSpecs);
        Map<String, Double> mutableWarmStart = warmStart != null ? new HashMap<>(warmStart) : null;

        checkAndAdjustGuesses(equations, defs, expandedSpecs, mutableWarmStart);

        Map<String, Double> values = new HashMap<>();
        for (String name : allVars) {
            values.put(name, initialGuess(name, expandedSpecs, mutableWarmStart));
        }
        if (mutableWarmStart != null) {
            for (Map.Entry<String, Double> entry : mutableWarmStart.entrySet()) {
                if (entry.getKey().startsWith(UNCERTAINTY_OF_FN)) {
                    values.put(entry.getKey(), entry.getValue());
                }
            }
        }
        NewtonSolver newtonSolver = new NewtonSolver(settings, defs);
        NewtonSolver retrySolver = new NewtonSolver(retrySettings(settings), defs);
        NewtonSolver polisher = new NewtonSolver(polishSettings(settings), defs);
        SolveConfig config = new SolveConfig(deadlineNanos, expandedSpecs, mutableWarmStart, newtonSolver, retrySolver, polisher, defs);

        List<Block> blocks = blocker.block(equations);
        int totalIterations = 0;
        Set<Integer> skipIndices = new HashSet<>();
        for (int bi = 0; bi < blocks.size(); bi++) {
            if (skipIndices.contains(bi)) continue;
            totalIterations += solveBlockWithFallback(bi, blocks, values, config, skipIndices);
        }
        return new InnerSolve(values, blocks, totalIterations);
    }

    private int solveBlockWithFallback(int bi, List<Block> blocks, Map<String, Double> values,
                                       SolveConfig config, Set<Integer> skipIndices) {
        Block block = blocks.get(bi);
        Block actualSolved = block;
        int iterations = 0;
        try {
            iterations += config.newton().solveBlock(block, values, config.deadlineNanos(), config.specs());
        } catch (SolverException ex) {
            // First resort when a block fails: retry it alone from
            // transformed guesses. This is local and cheap, and keeps the
            // solutions of all other blocks intact.
            int retryIterations = retryWithTransformedGuesses(config.retry(), block,
                    values, config.deadlineNanos(), config.specs(), config.warmStart());
            int bracketIterations;
            if (retryIterations >= 0) {
                iterations += retryIterations;
            } else if ((bracketIterations =
                    tryUnivariateBracketingSolve(block, values, config)) >= 0) {
                // Second resort for a single-unknown block: a bracketing root-find
                // (Brent). Newton needs a non-zero gradient, but an implicit
                // property inversion across the two-phase dome is flat there
                // (dT/dh≈0) while still monotonic overall (§8.7) — a sign-bracketed
                // solve crosses it where Newton stalls. Only accepted if it drives
                // the residual within tolerance, so it can never mask a wrong root.
                iterations += bracketIterations;
            } else {
                // Third resort: merge with connected blocks in both
                // directions and re-solve the combined system.
                List<Integer> mergedIndices = new ArrayList<>();
                Block merged = tryMergeBidirectional(blocks, bi, block, mergedIndices, skipIndices);
                if (merged != null && merged.variables().size() > block.variables().size()) {
                    // Reset ALL variables in the merged block to initial guesses.
                    // Previously solved blocks may have incorrect values from
                    // SVD fallback on rank-deficient Jacobians.
                    for (String v : merged.variables()) {
                        values.put(v, initialGuess(v, config.specs(), null));
                    }
                    iterations += config.newton().solveBlock(merged, values, config.deadlineNanos(), config.specs());
                    skipIndices.addAll(mergedIndices);
                    actualSolved = merged;
                } else {
                    throw ex;
                }
            }
        }
        try {
            iterations += config.polisher().solveBlock(actualSolved, values, config.deadlineNanos(), config.specs());
        } catch (SolverException ignored) {
            // Polishing is best-effort; the main solution is still valid.
        }
        return iterations;
    }

    /** Relative tolerance for accepting a bracketed root: |resid|/max(|lhs|,1). */
    private static final double BRACKET_RESIDUAL_TOL = 1.0e-6;

    /**
     * Bracketing root-find for a one-equation, one-unknown block that Newton
     * could not solve. Newton needs a non-zero gradient; an implicit property
     * inversion crossing the two-phase dome is flat there ({@code dT/dh≈0}) yet
     * the overall residual is monotonic and sign-changing (§8.7), so a
     * sign-bracketed bisection crosses the plateau where Newton stalls. The root
     * is written back only if it drives the residual within tolerance, so a
     * wrong or extraneous root can never be silently accepted. Returns the work
     * done (≥0) on success, or -1 if no valid bracket/root was found.
     */
    private int tryUnivariateBracketingSolve(Block block, Map<String, Double> values,
                                             SolveConfig config) {
        if (block.variables().size() != 1 || block.equations().size() != 1) {
            return -1;
        }
        Equation eq = block.equations().get(0);
        // Scope this resort to property inversions — the case it exists for (a
        // CoolProp call flat across the two-phase dome). For ordinary algebra a
        // bracketing rescue would bypass the user's Newton iteration-limit stop
        // criterion and could pick a different root than Newton's basin.
        if (!usesPropertyCall(eq)) {
            return -1;
        }
        String var = block.variables().get(0);
        Map<String, ProcDef> defs = config.defs();
        VariableSpec spec = config.specs().get(var);
        double lo = spec != null ? spec.lower() : Double.NEGATIVE_INFINITY;
        double hi = spec != null ? spec.upper() : Double.POSITIVE_INFINITY;

        double saved = values.getOrDefault(var, DEFAULT_GUESS);
        double x0 = Double.isFinite(saved) ? saved
                : (spec != null && Double.isFinite(spec.guess()) ? spec.guess() : 1.0);
        x0 = Math.clamp(x0, lo, hi);

        // Residual of the single equation with var=x; NaN inside an invalid region.
        java.util.function.DoubleUnaryOperator f = x -> {
            values.put(var, x);
            try {
                return Evaluator.eval(eq.lhs(), values, defs)
                        - Evaluator.eval(eq.rhs(), values, defs);
            } catch (com.frees.backend.props.PropertyEvaluationException e) {
                return Double.NaN;
            }
        };

        try {
            // Sample x0 plus geometrically growing symmetric offsets (clamped to
            // the box); keep only finite (in-range) evaluations.
            double m = Math.max(Math.abs(x0), 1.0);
            TreeMap<Double, Double> samples = new TreeMap<>();
            recordSample(samples, x0, f);
            for (double mult = 0.125; mult <= 1.0e9; mult *= 2.0) {
                if (System.nanoTime() > config.deadlineNanos()) {
                    break;
                }
                double step = m * mult;
                recordSample(samples, Math.clamp(x0 + step, lo, hi), f);
                recordSample(samples, Math.clamp(x0 - step, lo, hi), f);
            }

            // Pick the adjacent finite-sample pair straddling zero whose midpoint
            // is nearest x0 (bias toward the local root).
            double a = Double.NaN;
            double b = Double.NaN;
            double bestDist = Double.POSITIVE_INFINITY;
            Map.Entry<Double, Double> prev = null;
            for (Map.Entry<Double, Double> cur : samples.entrySet()) {
                if (prev != null && prev.getValue() * cur.getValue() < 0.0) {
                    double mid = 0.5 * (prev.getKey() + cur.getKey());
                    double dist = Math.abs(mid - x0);
                    if (dist < bestDist) {
                        bestDist = dist;
                        a = prev.getKey();
                        b = cur.getKey();
                    }
                }
                prev = cur;
            }
            if (Double.isNaN(a)) {
                values.put(var, saved);
                return -1;
            }

            // Bisection on the bracket to a tight relative width.
            double fa = f.applyAsDouble(a);
            int iters = 0;
            for (; iters < 200; iters++) {
                double c = 0.5 * (a + b);
                double fc = f.applyAsDouble(c);
                if (!Double.isFinite(fc)) {
                    break;
                }
                if (fc == 0.0 || (b - a) <= 1.0e-12 * Math.max(Math.abs(c), 1.0)) {
                    a = c;
                    b = c;
                    break;
                }
                if (fa * fc < 0.0) {
                    b = c;
                } else {
                    a = c;
                    fa = fc;
                }
            }

            // Validate the root against the residual before committing.
            double root = 0.5 * (a + b);
            values.put(var, root);
            double lhs = Evaluator.eval(eq.lhs(), values, defs);
            double resid = lhs - Evaluator.eval(eq.rhs(), values, defs);
            double scale = Math.max(Math.abs(lhs), 1.0);
            if (Double.isFinite(resid) && Math.abs(resid) / scale <= BRACKET_RESIDUAL_TOL) {
                return iters + 1;
            }
            values.put(var, saved);
            return -1;
        } catch (com.frees.backend.props.PropertyEvaluationException e) {
            values.put(var, saved);
            return -1;
        }
    }

    /** True if either side of the equation contains a CoolProp {@code prop$} call. */
    private static boolean usesPropertyCall(Equation eq) {
        return exprUsesPropertyCall(eq.lhs()) || exprUsesPropertyCall(eq.rhs());
    }

    private static boolean exprUsesPropertyCall(Expr e) {
        switch (e) {
            case Expr.Call(String fn, List<Expr> args) -> {
                if (fn.startsWith("prop$")) {
                    return true;
                }
                for (Expr a : args) {
                    if (exprUsesPropertyCall(a)) {
                        return true;
                    }
                }
                return false;
            }
            case Expr.BinOp(char op, Expr l, Expr r) -> {
                return exprUsesPropertyCall(l) || exprUsesPropertyCall(r);
            }
            case Expr.Neg(Expr o) -> {
                return exprUsesPropertyCall(o);
            }
            default -> {
                return false;
            }
        }
    }

    /** Evaluates f at x once and records it only if finite and not already seen. */
    private static void recordSample(TreeMap<Double, Double> samples, double x,
                                     java.util.function.DoubleUnaryOperator f) {
        if (samples.containsKey(x)) {
            return;
        }
        double v = f.applyAsDouble(x);
        if (Double.isFinite(v)) {
            samples.put(x, v);
        }
    }

    /**
     * Retries a failed block from transformed guesses, exploring symmetry
     * offsets and magnitudes. Offsets break invariant manifolds (for
     * z^2 = -4 the real axis z_i = 0, the default guess, is invariant, so
     * no Newton step ever acquires an imaginary component); scales reach
     * Newton basins far from 1.0 (a reciprocal like Z = -1/(omega*C) only
     * converges when the guess for C is within a factor of ~2 of the
     * solution's magnitude). Returns the iterations used, or -1 on failure
     * (with the block's variables restored to their unmodified guesses).
     *
     * One alternative start: a zero guess becomes ±zeroOffset (off the
     * invariant manifold), a nonzero guess is rescaled (toward a distant
     * Newton basin), and conjugate flips the sign of imaginary components
     * (_i) — solutions of real-coefficient complex systems come in
     * conjugate pairs, so the mirror branch is the natural alternative when
     * a guess sits on the wrong side of the phase plane.
     */
    private record GuessTransform(double zeroOffset, double scale, boolean conjugate) {}

    private static final List<GuessTransform> GUESS_TRANSFORMS = buildGuessTransforms();

    private static List<GuessTransform> buildGuessTransforms() {
        List<GuessTransform> transforms = new ArrayList<>();
        for (boolean conjugate : new boolean[] {false, true}) {
            for (double scale : new double[] {1.0, 1.0e-2, 1.0e-4, 1.0e2, 1.0e4}) {
                for (double zeroOffset : new double[] {1.0, -1.0}) {
                    transforms.add(new GuessTransform(zeroOffset, scale, conjugate));
                }
            }
        }
        return transforms;
    }

    /** Retry attempts cap iterations: healthy Newton converges quickly, and
     * a generous user limit must not multiply across the whole ladder. */
    private static final int MAX_RETRY_ITERATIONS = 500;

    private static SolverSettings retrySettings(SolverSettings settings) {
        return new SolverSettings(
                Math.min(settings.maxIterations(), MAX_RETRY_ITERATIONS),
                settings.relativeResiduals(),
                settings.changeInVariables(),
                settings.elapsedTimeSeconds(),
                settings.complexMode());
    }

    private static void applyTransform(Block block, GuessTransform transform,
                                       Map<String, Double> values,
                                       Map<String, VariableSpec> specs,
                                       Map<String, Double> warmStart) {
        for (String v : block.variables()) {
            VariableSpec spec = specs.get(v);
            double base = initialGuess(v, specs, warmStart);
            double guess = base == 0.0 ? transform.zeroOffset() : base * transform.scale();
            if (transform.conjugate() && v.endsWith("_i")) {
                guess = -guess;
            }
            if (spec != null) {
                guess = Math.clamp(guess, spec.lower(), spec.upper());
            }
            values.put(v, guess);
        }
    }

    private static int retryWithTransformedGuesses(NewtonSolver retrySolver, Block block,
                                                   Map<String, Double> values,
                                                   long deadlineNanos,
                                                   Map<String, VariableSpec> specs,
                                                   Map<String, Double> warmStart) {
        for (GuessTransform transform : GUESS_TRANSFORMS) {
            applyTransform(block, transform, values, specs, warmStart);
            try {
                return retrySolver.solveBlock(block, values, deadlineNanos, specs);
            } catch (SolverException retryFailed) {
                // try the next transform
            }
        }
        for (String v : block.variables()) {
            values.put(v, initialGuess(v, specs, warmStart));
        }
        return -1;
    }

    /**
     * Merges the failed block with blocks that share variable dependencies
     * (in both forward and backward directions). Also takes skipIndices to
     * avoid re-merging blocks that were already solved in a prior merge.
     */
    private static Block tryMergeBidirectional(List<Block> blocks, int failedIdx, Block failed,
                                                List<Integer> mergedIndices,
                                                Set<Integer> skipIndices) {
        Set<String> involvedVars = new HashSet<>();
        List<Equation> mergedEquations = new ArrayList<>(failed.equations());
        List<String> mergedVars = new ArrayList<>(failed.variables());
        Set<String> mergedVarSet = new HashSet<>(failed.variables());
        // Collect all variables referenced by the failed block's equations
        for (Equation eq : failed.equations()) {
            involvedVars.addAll(eq.variables());
        }
        boolean merged = false;

        // Scan forward: merge blocks whose variables are referenced by the
        // current merged block, or whose equations reference merged variables.
        for (int i = failedIdx + 1; i < blocks.size(); i++) {
            if (skipIndices.contains(i)) continue;
            if (shouldMerge(blocks.get(i), involvedVars, mergedVarSet)) {
                addBlock(blocks.get(i), mergedEquations, mergedVars, mergedVarSet, involvedVars);
                mergedIndices.add(i);
                merged = true;
            }
        }

        // Scan backward: merge earlier blocks whose variables are referenced
        // by the failed block's equations, or that reference our variables.
        for (int i = failedIdx - 1; i >= 0; i--) {
            if (skipIndices.contains(i)) continue;
            if (shouldMerge(blocks.get(i), involvedVars, mergedVarSet)) {
                addBlock(blocks.get(i), mergedEquations, mergedVars, mergedVarSet, involvedVars);
                mergedIndices.add(i);
                merged = true;
            }
        }

        if (!merged) {
            return null;
        }
        return new Block(failedIdx, mergedEquations, mergedVars);
    }

    private static boolean shouldMerge(Block candidate, Set<String> involvedVars,
                                        Set<String> mergedVarSet) {
        // Check if any variable determined by candidate is in our involved set
        for (String v : candidate.variables()) {
            if (involvedVars.contains(v)) return true;
        }
        // Check if candidate's equations reference any of our merged variables
        for (Equation eq : candidate.equations()) {
            for (String v : eq.variables()) {
                if (mergedVarSet.contains(v)) return true;
            }
        }
        return false;
    }

    private static void addBlock(Block block, List<Equation> equations, List<String> vars,
                                  Set<String> varSet, Set<String> involvedVars) {
        equations.addAll(block.equations());
        vars.addAll(block.variables());
        varSet.addAll(block.variables());
        for (Equation eq : block.equations()) {
            involvedVars.addAll(eq.variables());
        }
    }

    /** Mutable cursor shared across integrand evaluations of one Integral. */
    private static final class IntegrationState {
        private Map<String, Double> warmStart;
        private int iterations;
    }

    /** Everything needed to evaluate one Integral's integrand at a point. */
    private record IntegralContext(IntegralSolver.IntegralEquation equation,
                                   List<Equation> ordinary,
                                   SolverSettings settings,
                                   Map<String, VariableSpec> specs,
                                   Map<String, ProcDef> defs,
                                   long deadlineNanos,
                                   IntegrationState state) {}

    /**
     * Equation-based Integral: each F = Integral(f, t, a, b) drives t
     * from a to b, solving the rest of the system at every step, and the
     * final solution reports the system at t = b with F at its accumulated
     * value (see IntegralSolver for the quadrature).
     */
    private Result solveWithIntegrals(EquationParser.ParseResult parsed,
                                      List<Equation> equations,
                                      Map<String, Expr> uncertaintyExprs,
                                      List<IntegralSolver.IntegralEquation> integrals,
                                      SolverSettings settings,
                                      Map<String, VariableSpec> specs,
                                      long startNanos, long deadlineNanos) {
        List<Equation> ordinary =
                IntegralSolver.ordinaryEquations(equations, integrals);
        IntegrationState state = new IntegrationState();
        List<Equation> finalEquations = new ArrayList<>(ordinary);
        TreeSet<String> fixedIntegrationVars = new TreeSet<>();
        for (IntegralSolver.IntegralEquation ie : integrals) {
            appendIntegralEquations(ie, ordinary, finalEquations, fixedIntegrationVars,
                    settings, specs, parsed, deadlineNanos, state);
        }
        InnerSolve solved = solveEquationList(finalEquations, settings, specs,
                parsed.defs(), deadlineNanos, null);
        Map<String, VariableSpec> mutableSpecs = new HashMap<>(specs);
        applyUncertaintySpecs(uncertaintyExprs, solved.values(), mutableSpecs, parsed.defs());
        Map<String, Double> uncertainties = propagateUncertainty(finalEquations, solved.values(), mutableSpecs, parsed.defs());
        if (mentionsUncertaintyOf(finalEquations)) {
            UncertaintyPass pass = resolveUncertaintySecondPass(finalEquations, solved, uncertainties,
                    uncertaintyExprs, mutableSpecs, parsed, settings, deadlineNanos);
            solved = pass.solved();
            uncertainties = pass.uncertainties();
        }
        List<com.frees.backend.core.ode.OdeTableResult> odeTables =
                solveDynamicSystems(parsed, solved.values(), settings, specs, deadlineNanos);
        return buildResult(finalEquations, solved.blocks(), List.of(solved.values()),
                state.iterations + solved.iterations(), startNanos, parsed, uncertainties, odeTables);
    }

    /** Lowers one integral into the final equation set: a variable-limit integral
     *  becomes an inlined quadrature equation pinned to its upper limit; a
     *  constant-limit integral is evaluated now and added as a numeric result. */
    private void appendIntegralEquations(IntegralSolver.IntegralEquation ie, List<Equation> ordinary,
            List<Equation> finalEquations, TreeSet<String> fixedIntegrationVars, SolverSettings settings,
            Map<String, VariableSpec> specs, EquationParser.ParseResult parsed, long deadlineNanos, IntegrationState state) {
        if (!ie.constantLimits()) {
            // A variable limit (e.g. T_flame) is an unknown of the system: the
            // integral becomes an ordinary equation the Evaluator computes by
            // quadrature on each residual evaluation, and the integration variable
            // lands on the upper limit.
            finalEquations.add(IntegralSolver.inlinedEquation(ie, ordinary));
            if (fixedIntegrationVars.add(ie.integrationVar())) {
                finalEquations.add(new Equation(new Expr.Var(ie.integrationVar()),
                        ie.upperExpr(),
                        ie.integrationVar() + " = upper limit of "
                                + ie.original().sourceText()));
            }
            return;
        }
        IntegralContext context = new IntegralContext(ie, ordinary, settings,
                specs, parsed.defs(), deadlineNanos, state);
        double value = IntegralSolver.integrate(
                (t, runningTotal) -> integrandAt(context, t, runningTotal),
                ie.lower(), ie.upper(), ie.fixedStep(), deadlineNanos);
        if (fixedIntegrationVars.add(ie.integrationVar())) {
            finalEquations.add(new Equation(new Expr.Var(ie.integrationVar()),
                    new Expr.Num(ie.upper()),
                    ie.integrationVar() + " = " + ie.upper()));
        }
        finalEquations.add(new Equation(new Expr.Var(ie.resultVar()),
                new Expr.Num(value), ie.original().sourceText()));
    }

    /** Integrand value at one quadrature point: solve the subsystem with the
     * integration variable and the running integral value pinned. */
    private double integrandAt(IntegralContext context, double t, double runningTotal) {
        IntegralSolver.IntegralEquation ie = context.equation();
        Map<String, Double> pinned = new LinkedHashMap<>();
        pinned.put(ie.integrationVar(), t);
        pinned.put(ie.resultVar(), runningTotal);
        try {
            InnerSolve solved = solvePinned(context.ordinary(), pinned,
                    context.settings(), context.specs(), context.defs(),
                    context.deadlineNanos(), context.state().warmStart);
            context.state().warmStart = solved.values();
            context.state().iterations += solved.iterations();
            return Evaluator.eval(ie.integrand(), solved.values(), context.defs());
        } catch (SolverException | IllegalStateException e) {
            throw new SolverException("While evaluating Integral at "
                    + ie.integrationVar() + " = " + t + ": " + e.getMessage());
        }
    }

    /**
     * Runs every {@code DYNAMIC} block after the analytic solve, with the solved
     * scalars supplied as parameters/initial conditions, and collects one ODE
     * Table per block. The per-step algebraic coupling reuses {@link #solvePinned}
     * (states + time pinned), so the dynamic path shares the analytic solver's
     * Newton/Tarjan machinery.
     */
    private List<com.frees.backend.core.ode.OdeTableResult> solveDynamicSystems(
            EquationParser.ParseResult parsed, Map<String, Double> baseValues,
            SolverSettings settings, Map<String, VariableSpec> specs, long deadlineNanos) {
        if (parsed.dynamicSystems().isEmpty()) {
            return List.of();
        }
        SolverSettings inner = relaxedOdeSettings(settings, 1e-7);
        com.frees.backend.core.ode.DynamicSolver.AlgebraicSolve algebraic =
                (ordinary, pinned, warmStart) -> solvePinned(ordinary, pinned, inner, specs,
                        parsed.defs(), deadlineNanos, warmStart).values();
        List<com.frees.backend.core.ode.OdeTableResult> tables = new ArrayList<>();
        for (com.frees.backend.ast.DynamicSystem ds : parsed.dynamicSystems()) {
            tables.add(new com.frees.backend.core.ode.DynamicSolver(
                    ds, baseValues, parsed.defs(), algebraic, deadlineNanos).solve());
        }
        return tables;
    }

    /**
     * Solve an ordinary algebraic subsystem with a set of variables pinned to
     * fixed values, seeded from {@code warmStart}. Each pinned variable is added
     * as a {@code var = value} equation (insertion order preserved) so the
     * existing Newton/Tarjan pipeline treats it as a constant for this solve.
     *
     * <p>Shared by the {@code Integral} quadrature (pins the integration variable
     * and running total) and the ODE RHS closure (pins time {@code t} and the
     * full state vector each step). This is the one place the per-step
     * "solve-the-rest-with-the-integration-variable-fixed" behavior lives.
     */
    InnerSolve solvePinned(List<Equation> ordinary,
                           Map<String, Double> pinned,
                           SolverSettings settings,
                           Map<String, VariableSpec> specs,
                           Map<String, ProcDef> defs,
                           long deadlineNanos,
                           Map<String, Double> warmStart) {
        List<Equation> subsystem = new ArrayList<>(ordinary);
        for (Map.Entry<String, Double> e : pinned.entrySet()) {
            subsystem.add(new Equation(new Expr.Var(e.getKey()),
                    new Expr.Num(e.getValue()), e.getKey() + " = " + e.getValue()));
        }
        return solveEquationList(subsystem, settings, specs, defs,
                deadlineNanos, warmStart);
    }

    /** Declared output units of TABLE/FUNCTION defs (lowercased name -> SI unit). */
    private static Map<String, String> functionOutputUnits(Map<String, ProcDef> defs) {
        Map<String, String> units = new HashMap<>();
        for (ProcDef def : defs.values()) {
            String unit = switch (def) {
                case ProcDef.FunctionTableDef t -> t.outputUnit();
                case ProcDef.FunctionDef f -> f.outputUnit();
                default -> null;
            };
            if (unit != null) {
                units.put(def.name().toLowerCase(), unit);
            }
        }
        return units;
    }

    /** Declared argument units of TABLE/FUNCTION defs (lowercased name -> per-arg SI units). */
    private static Map<String, List<String>> functionInputUnits(Map<String, ProcDef> defs) {
        Map<String, List<String>> units = new HashMap<>();
        for (ProcDef def : defs.values()) {
            List<String> argUnits = switch (def) {
                case ProcDef.FunctionTableDef t -> t.argUnits();
                case ProcDef.FunctionDef f -> f.paramUnits();
                default -> null;
            };
            if (argUnits != null && argUnits.stream().anyMatch(java.util.Objects::nonNull)) {
                units.put(def.name().toLowerCase(), argUnits);
            }
        }
        return units;
    }

    /**
     * Check Units: dimensional consistency warnings for the given source
     * against declared variable units. Never blocks solving.
     */
    public List<String> checkUnits(String source, Map<String, String> variableUnits) {
        return checkUnits(parser.parseResult(source), variableUnits);
    }

    /** Overload reusing an already-parsed source (avoids re-parsing on the check/solve path). */
    public List<String> checkUnits(EquationParser.ParseResult parsed, Map<String, String> variableUnits) {
        List<Equation> equations = parsed.equations();
        List<String> warnings = new ArrayList<>(UnitChecker.check(
                equations, variableUnits, functionOutputUnits(parsed.defs()),
                functionInputUnits(parsed.defs())).warnings());
        try {
            List<Block> blocks = blocker.block(equations);
            for (Block block : blocks) {
                for (Equation eq : block.equations()) {
                    checkNonSmoothInBlock(eq, block.variables(), warnings);
                }
            }
        } catch (Exception e) {
            // Blocking errors here are non-fatal for unit checking — they surface
            // through the main solve path; trace at debug for diagnosis.
            log.debug("Skipping non-smooth block check (blocking failed)", e);
        }
        return warnings;
    }

    private void checkNonSmoothInBlock(Equation eq, List<String> blockVars, List<String> warnings) {
        Set<String> vars = new HashSet<>(blockVars);
        checkNonSmoothExpr(eq.lhs(), vars, eq.sourceText(), warnings);
        checkNonSmoothExpr(eq.rhs(), vars, eq.sourceText(), warnings);
    }

    private void checkNonSmoothExpr(Expr expr, Set<String> blockVars, String sourceText, List<String> warnings) {
        if (expr == null) return;
        switch (expr) {
            case Expr.Num n -> {}
            case Expr.Str s -> {}
            case Expr.Var v -> {}
            case Expr.Neg(Expr operand) -> checkNonSmoothExpr(operand, blockVars, sourceText, warnings);
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                checkNonSmoothExpr(left, blockVars, sourceText, warnings);
                checkNonSmoothExpr(right, blockVars, sourceText, warnings);
            }
            case Expr.Call(String function, List<Expr> args) -> {
                warnIfNonSmoothCall(function, args, blockVars, sourceText, warnings);
                for (Expr arg : args) {
                    checkNonSmoothExpr(arg, blockVars, sourceText, warnings);
                }
            }
            case Expr.ArrayAccess(String name, List<Expr> indices) -> {
                for (Expr idx : indices) {
                    checkNonSmoothExpr(idx, blockVars, sourceText, warnings);
                }
            }
            case Expr.Range(Expr start, Expr end) -> {
                checkNonSmoothExpr(start, blockVars, sourceText, warnings);
                checkNonSmoothExpr(end, blockVars, sourceText, warnings);
            }
            case Expr.ArrayLiteral(List<Expr> elements) -> {
                for (Expr el : elements) {
                    checkNonSmoothExpr(el, blockVars, sourceText, warnings);
                }
            }
            case Expr.Compare(String op, Expr left, Expr right) -> {
                checkNonSmoothExpr(left, blockVars, sourceText, warnings);
                checkNonSmoothExpr(right, blockVars, sourceText, warnings);
            }
            case Expr.Logical(String op, Expr left, Expr right) -> {
                checkNonSmoothExpr(left, blockVars, sourceText, warnings);
                checkNonSmoothExpr(right, blockVars, sourceText, warnings);
            }
            case Expr.Not(Expr operand) -> checkNonSmoothExpr(operand, blockVars, sourceText, warnings);
        }
    }

    /** Warns when a non-smooth function (round/floor/ceil/trunc/sign/step) is applied
     *  to an argument that depends on a simultaneous block variable — a common cause
     *  of Newton non-convergence. */
    private void warnIfNonSmoothCall(String function, List<Expr> args, Set<String> blockVars,
                                     String sourceText, List<String> warnings) {
        if (!Set.of("round", "floor", "ceil", "trunc", "sign", "step").contains(function.toLowerCase())) {
            return;
        }
        for (Expr arg : args) {
            if (arg.variables().stream().anyMatch(blockVars::contains)) {
                warnings.add("Equation '" + sourceText + "' depends on non-smooth function '" + function
                        + "' whose argument contains simultaneous block variable(s). "
                        + "Newton simultaneous solvers may stall or fail to converge; "
                        + "consider moving this variable to a sequential block.");
                break;
            }
        }
    }

    /**
     * SI units derived dimensionally for computed variables (P = m*g/A gets
     * Pa when m, g, A are known). Keys are display-cased names.
     */
    public Map<String, String> deriveUnits(String source, Map<String, String> variableUnits) {
        return deriveUnits(parser.parseResult(source), variableUnits);
    }

    /** Overload reusing an already-parsed source (avoids re-parsing on the check/solve path). */
    public Map<String, String> deriveUnits(EquationParser.ParseResult parsed, Map<String, String> variableUnits) {
        Map<String, String> derived =
                UnitChecker.check(parsed.equations(), variableUnits,
                        functionOutputUnits(parsed.defs()),
                        functionInputUnits(parsed.defs())).derivedUnits();
        Map<String, String> byDisplayName = new HashMap<>();
        derived.forEach((name, unit) ->
                byDisplayName.put(parsed.displayNames().getOrDefault(name, name), unit));
        return byDisplayName;
    }

    /**
     * A variable gets its units when it is set from an annotated
     * constant (P = 100 [bar] gives P the units bar). Returns the inferred
     * units by variable name; explicit Variable Information entries take
     * precedence over these.
     */
    public Map<String, String> inferUnits(String source) {
        return inferUnits(parser.parseResult(source));
    }

    /** Overload reusing an already-parsed source (avoids re-parsing on the check/solve path). */
    public Map<String, String> inferUnits(EquationParser.ParseResult parsed) {
        Map<String, String> inferred = new HashMap<>();
        for (Equation eq : parsed.equations()) {
            if (eq.lhs() instanceof Expr.Var(String name) && eq.rhs() instanceof Expr.Num(double val, String unit, boolean isImaginary)
                    && unit != null) {
                inferred.putIfAbsent(name, unit);
            } else if (eq.rhs() instanceof Expr.Var(String name) && eq.lhs() instanceof Expr.Num(double val, String unit, boolean isImaginary)
                    && unit != null) {
                inferred.putIfAbsent(name, unit);
            }
        }
        // Key by the display spelling so the frontend tables match directly.
        Map<String, String> byDisplayName = new HashMap<>();
        inferred.forEach((name, unit) ->
                byDisplayName.put(parsed.displayNames().getOrDefault(name, name), unit));
        return byDisplayName;
    }

    /** Finds all distinct solutions of the system (see AllRootsSolver). */
    public Result solveAll(String source, SolverSettings settings,
                           Map<String, VariableSpec> specs) {
        return solveAll(source, settings, specs, Map.of());
    }

    public Result solveAll(String source, SolverSettings settings,
                           Map<String, VariableSpec> specs,
                           Map<String, ProcDef> extraDefs) {
        long startNanos = System.nanoTime();
        long deadlineNanos = startNanos + (long) (settings.elapsedTimeSeconds() * 1.0e9);
        EquationParser.ParseResult parsed =
                withExtraDefs(parser.parseResult(source), extraDefs);
        List<Equation> equations = parsed.equations();
        ExtractedUncertainties ext = extractUncertaintyEquations(equations);
        equations = ext.activeEquations();
        requireComplexModeForImaginaryLiterals(equations, settings.complexMode());
        if (settings.complexMode()) {
            equations = com.frees.backend.parser.ComplexExpansion.expand(equations, parsed.displayNames());
        }

        TreeSet<String> allVars = new TreeSet<>();
        for (Equation eq : equations) {
            allVars.addAll(eq.variables());
        }
        Map<String, VariableSpec> expandedSpecs = new HashMap<>(expandSpecs(allVars, specs, settings.complexMode()));
        Map<String, ProcDef> defs = parsed.defs();

        checkAndAdjustGuesses(equations, defs, expandedSpecs, null);

        Map<String, Double> guesses = new HashMap<>();
        for (String name : allVars) {
            guesses.put(name, initialGuess(name, expandedSpecs, null));
        }

        List<Block> blocks = blocker.block(equations);
        AllRootsSolver allRoots = new AllRootsSolver(settings, expandedSpecs, defs);
        List<Map<String, Double>> solutions = allRoots.findAll(blocks, guesses, deadlineNanos);

        return buildResult(equations, blocks, solutions,
                allRoots.totalIterations(), startNanos, parsed, Map.of());
    }

    private Result buildResult(List<Equation> equations, List<Block> blocks,
                               List<Map<String, Double>> solutionMaps,
                               int totalIterations, long startNanos,
                               EquationParser.ParseResult parsed,
                               Map<String, Double> uncertainties) {
        return buildResult(equations, blocks, solutionMaps, totalIterations, startNanos,
                parsed, uncertainties, List.of());
    }

    private Result buildResult(List<Equation> equations, List<Block> blocks,
                               List<Map<String, Double>> solutionMaps,
                               int totalIterations, long startNanos,
                               EquationParser.ParseResult parsed,
                               Map<String, Double> uncertainties,
                               List<com.frees.backend.core.ode.OdeTableResult> odeTables) {
        Map<String, String> displayNames = parsed.displayNames();
        Map<String, ProcDef> defs = parsed.defs();
        TreeSet<String> allVars = collectVariables(equations);
        List<Solution> solutions = new ArrayList<>();
        double worstResidual = 0.0;
        for (Map<String, Double> values : solutionMaps) {
            List<EquationResidual> residuals = new ArrayList<>();
            double maxResidual = 0.0;
            for (Equation eq : equations) {
                double residual =
                        Evaluator.eval(eq.lhs(), values, defs) - Evaluator.eval(eq.rhs(), values, defs);
                residuals.add(new EquationResidual(eq.sourceText(), residual));
                maxResidual = Math.max(maxResidual, Math.abs(residual));
            }
            // Display variables with the spelling of their first appearance
            // (Check/Format behavior); lookups stay case-insensitive.
            TreeMap<String, Double> displayed = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            values.forEach((name, value) -> {
                if (EquationParser.isIgnoredSink(name)) {
                    return; // discarded ('~') or omitted trailing output: never surfaced
                }
                displayed.put(displayNames.getOrDefault(name, name), value);
            });
            solutions.add(new Solution(displayed, residuals, maxResidual));
            worstResidual = Math.max(worstResidual, maxResidual);
        }

        int surfacedVars = surfacedVarCount(allVars);
        Stats stats = new Stats(
                equations.size() - (allVars.size() - surfacedVars),
                surfacedVars,
                blocks.size(),
                totalIterations,
                (System.nanoTime() - startNanos) / 1_000_000,
                worstResidual);

        Solution first = solutions.get(0);

        List<com.frees.backend.api.SolveDtos.ResidueExpansionDto> residueExpansions = new ArrayList<>();
        java.util.Set<String> seenResidues = new java.util.HashSet<>();
        for (Equation eq : equations) {
            String txt = eq.sourceText();
            if (txt != null && txt.startsWith("CALL residue(") && seenResidues.add(txt)) {
                if (eq.rhs() instanceof com.frees.backend.ast.Expr.Call c && c.function().startsWith("residue$")) {
                    try {
                        int isK = c.function().contains("$k$") ? 1 : 0;
                        int numLen = Integer.parseInt(c.function().split("\\$")[3 + isK]);
                        int n = Integer.parseInt(c.function().split("\\$")[4 + isK]);
                        double[] num = new double[numLen];
                        double[] den = new double[n + 1];
                        int idx = 0;
                        for (int i = 0; i < numLen; i++) num[i] = Evaluator.eval(c.args().get(idx++), first.variables(), defs);
                        for (int i = 0; i < den.length; i++) den[i] = Evaluator.eval(c.args().get(idx++), first.variables(), defs);
                        var res = com.frees.backend.cas.PolynomialHelpers.residue(num, den);
                        String latex = com.frees.backend.parser.LatexConverter.toLatex(res);
                        residueExpansions.add(new com.frees.backend.api.SolveDtos.ResidueExpansionDto(txt, latex));
                    } catch (Exception ignored) {
                        // If residue evaluation fails for some reason, just omit it.
                    }
                }
            }
        }

        return new Result(first.variables(), blocks, first.residuals(), stats, solutions,
                displayNames, uncertainties, odeTables, residueExpansions);
    }

    private Map<String, VariableSpec> expandSpecs(TreeSet<String> allVars,
                                                  Map<String, VariableSpec> specs,
                                                  boolean complexMode) {
        if (!complexMode) {
            return specs;
        }
        Map<String, VariableSpec> expandedSpecs = new HashMap<>();
        for (String name : allVars) {
            VariableSpec spec = complexComponentSpec(name, specs);
            if (spec != null) {
                expandedSpecs.put(name, spec);
            }
        }
        return expandedSpecs;
    }

    /**
     * Spec for one complex-mode variable: its own entry when present,
     * otherwise the _r/_i component inherits bounds (and the real component
     * the guess) of its base variable's spec.
     */
    private static VariableSpec complexComponentSpec(String name,
                                                     Map<String, VariableSpec> specs) {
        VariableSpec own = specs.get(name);
        if (own != null) {
            return own;
        }
        if (!name.endsWith("_r") && !name.endsWith("_i")) {
            return null;
        }
        String baseName = name.substring(0, name.length() - 2);
        VariableSpec parentSpec = specs.get(baseName);
        if (parentSpec == null) {
            double guess = name.endsWith("_i") ? 0.0 : DEFAULT_GUESS;
            return new VariableSpec(name, guess,
                    Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY);
        }
        double guess = name.endsWith("_r") ? parentSpec.guess() : 0.0;
        return new VariableSpec(name, guess, parentSpec.lower(), parentSpec.upper());
    }

    private static void checkAndAdjustGuesses(List<Equation> equations,
                                              Map<String, ProcDef> defs,
                                              Map<String, VariableSpec> expandedSpecs,
                                              Map<String, Double> warmStart) {
        if (equations == null || defs == null || expandedSpecs == null) {
            return;
        }
        for (Equation eq : equations) {
            checkExpr(eq.lhs(), defs, expandedSpecs, warmStart);
            checkExpr(eq.rhs(), defs, expandedSpecs, warmStart);
        }
    }

    private static void checkExpr(Expr e,
                                  Map<String, ProcDef> defs,
                                  Map<String, VariableSpec> expandedSpecs,
                                  Map<String, Double> warmStart) {
        if (e == null) return;
        switch (e) {
            case Expr.Num num -> {}
            case Expr.Str str -> {}
            case Expr.Var var -> {}
            case Expr.Neg neg -> checkExpr(neg.operand(), defs, expandedSpecs, warmStart);
            case Expr.BinOp bin -> {
                checkExpr(bin.left(), defs, expandedSpecs, warmStart);
                checkExpr(bin.right(), defs, expandedSpecs, warmStart);
            }
            case Expr.Call call -> {
                ProcDef def = defs.get(call.function());
                if (def instanceof ProcDef.FunctionTableDef cd) {
                    adjustCallArguments(cd, call.args(), expandedSpecs, warmStart);
                }
                for (Expr arg : call.args()) {
                    checkExpr(arg, defs, expandedSpecs, warmStart);
                }
            }
            case Expr.ArrayAccess arr -> {
                for (Expr idx : arr.indices()) {
                    checkExpr(idx, defs, expandedSpecs, warmStart);
                }
            }
            case Expr.Range range -> {
                checkExpr(range.start(), defs, expandedSpecs, warmStart);
                checkExpr(range.end(), defs, expandedSpecs, warmStart);
            }
            case Expr.ArrayLiteral lit -> {
                for (Expr elem : lit.elements()) {
                    checkExpr(elem, defs, expandedSpecs, warmStart);
                }
            }
            case Expr.Compare comp -> {
                checkExpr(comp.left(), defs, expandedSpecs, warmStart);
                checkExpr(comp.right(), defs, expandedSpecs, warmStart);
            }
            case Expr.Logical log -> {
                checkExpr(log.left(), defs, expandedSpecs, warmStart);
                checkExpr(log.right(), defs, expandedSpecs, warmStart);
            }
            case Expr.Not not -> checkExpr(not.operand(), defs, expandedSpecs, warmStart);
        }
    }

    private static void adjustCallArguments(ProcDef.FunctionTableDef cd,
                                            List<Expr> args,
                                            Map<String, VariableSpec> expandedSpecs,
                                            Map<String, Double> warmStart) {
        if (args.isEmpty() || cd.curves() == null || cd.curves().isEmpty()) {
            return;
        }

        adjustArgFromXRange(args.get(0), cd, expandedSpecs, warmStart);
        adjustArgFromParamRange(args, cd, expandedSpecs, warmStart);
    }

    /** Nudges the X argument's guess into the table's x-range when it falls outside. */
    private static void adjustArgFromXRange(Expr arg, ProcDef.FunctionTableDef cd,
            Map<String, VariableSpec> expandedSpecs, Map<String, Double> warmStart) {
        if (!(arg instanceof Expr.Var varExpr)) {
            return;
        }
        double minX = Double.POSITIVE_INFINITY;
        double maxX = Double.NEGATIVE_INFINITY;
        for (ProcDef.Curve curve : cd.curves()) {
            double[] xs = curve.xs();
            if (xs != null && xs.length > 0) {
                if (xs[0] < minX) minX = xs[0];
                if (xs[xs.length - 1] > maxX) maxX = xs[xs.length - 1];
            }
        }
        if (minX <= maxX && !Double.isInfinite(minX) && !Double.isInfinite(maxX)) {
            adjustVarGuess(varExpr.name(), minX, maxX, expandedSpecs, warmStart);
            adjustVarGuess(varExpr.name() + "_r", minX, maxX, expandedSpecs, warmStart);
        }
    }

    /** Nudges the family-parameter argument's guess into the table's parameter range. */
    private static void adjustArgFromParamRange(List<Expr> args, ProcDef.FunctionTableDef cd,
            Map<String, VariableSpec> expandedSpecs, Map<String, Double> warmStart) {
        if (args.size() <= 1 || !(args.get(1) instanceof Expr.Var varExpr)) {
            return;
        }
        double minParam = Double.POSITIVE_INFINITY;
        double maxParam = Double.NEGATIVE_INFINITY;
        int paramCount = 0;
        for (ProcDef.Curve curve : cd.curves()) {
            if (curve.param() != null) {
                double p = curve.param();
                if (p < minParam) minParam = p;
                if (p > maxParam) maxParam = p;
                paramCount++;
            }
        }
        if (paramCount > 0 && minParam <= maxParam && !Double.isInfinite(minParam) && !Double.isInfinite(maxParam)) {
            adjustVarGuess(varExpr.name(), minParam, maxParam, expandedSpecs, warmStart);
            adjustVarGuess(varExpr.name() + "_r", minParam, maxParam, expandedSpecs, warmStart);
        }
    }

    private static void adjustVarGuess(String varName,
                                       double minVal,
                                       double maxVal,
                                       Map<String, VariableSpec> expandedSpecs,
                                       Map<String, Double> warmStart) {
        double currentGuess = DEFAULT_GUESS;
        if (warmStart != null && warmStart.containsKey(varName)) {
            currentGuess = warmStart.get(varName);
        } else {
            VariableSpec spec = expandedSpecs.get(varName);
            if (spec != null) {
                currentGuess = spec.guess();
            }
        }

        if (currentGuess < minVal || currentGuess > maxVal) {
            double avg = (minVal + maxVal) / 2.0;
            VariableSpec spec = expandedSpecs.get(varName);
            if (spec != null) {
                expandedSpecs.put(varName, new VariableSpec(spec.name(), avg, spec.lower(), spec.upper()));
            } else {
                expandedSpecs.put(varName, new VariableSpec(varName, avg, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY));
            }
            if (warmStart != null && warmStart.containsKey(varName)) {
                warmStart.put(varName, avg);
            }
        }
    }
    public Map<String, Double> propagateUncertainty(List<Equation> equations,
                                                    Map<String, Double> values,
                                                    Map<String, VariableSpec> specs,
                                                    Map<String, ProcDef> defs) {
        List<String> varList = new ArrayList<>(collectVariables(equations));
        UncPartition part = partitionVariables(varList, specs);
        if (part.uncVars().isEmpty()) {
            return part.uncertainties();
        }
        double[][] jacobian = computeNumericalJacobian(equations, values, defs, varList,
                equations.size(), varList.size());
        return solveRssUncertainties(jacobian, varList, part, specs);
    }

    /** Variables split into those carrying a stated uncertainty (the sources) and
     *  the dependent ones, plus a zero-initialized uncertainty map for every variable. */
    private record UncPartition(List<String> uncVars, List<String> depVars, Map<String, Double> uncertainties) {}

    private UncPartition partitionVariables(List<String> varList, Map<String, VariableSpec> specs) {
        List<String> uncVars = new ArrayList<>();
        List<String> depVars = new ArrayList<>();
        Map<String, Double> uncertainties = new HashMap<>();
        for (String v : varList) {
            uncertainties.put(v, 0.0);
            VariableSpec spec = specs.get(v);
            if (spec != null && spec.uncertainty() > 0.0) {
                uncVars.add(v);
            } else {
                depVars.add(v);
            }
        }
        return new UncPartition(uncVars, depVars, uncertainties);
    }

    /** Forward-difference Jacobian of the residual system w.r.t. every variable. */
    private double[][] computeNumericalJacobian(List<Equation> equations, Map<String, Double> values,
            Map<String, ProcDef> defs, List<String> varList, int m, int n) {
        double[][] jacobian = new double[m][n];
        double[] baseResidual = evaluateSystemResiduals(equations, values, defs);
        Map<String, Double> perturbedValues = new HashMap<>(values);
        double eps = Math.sqrt(Math.ulp(1.0));

        // Precompute sparse dependency matrix: var_j -> list of dependent equation indices
        List<Set<String>> eqVars = new ArrayList<>(m);
        for (Equation eq : equations) {
            eqVars.add(eq.variables());
        }
        List<List<Integer>> varToEqs = new ArrayList<>(n);
        for (int j = 0; j < n; j++) {
            String varName = varList.get(j);
            List<Integer> deps = new ArrayList<>();
            for (int i = 0; i < m; i++) {
                if (eqVars.get(i).contains(varName)) {
                    deps.add(i);
                }
            }
            varToEqs.add(deps);
        }

        for (int j = 0; j < n; j++) {
            List<Integer> deps = varToEqs.get(j);
            if (deps.isEmpty()) {
                continue; // Variable does not appear in any equation; its column remains 0.0
            }

            String varName = varList.get(j);
            double x = values.getOrDefault(varName, 1.0);
            double h = eps * Math.max(Math.abs(x), 1.0);
            perturbedValues.put(varName, x + h);

            // Only evaluate the specific dependent equations
            for (int i : deps) {
                Equation eq = equations.get(i);
                try {
                    double r_perturbed = Evaluator.eval(eq.lhs(), perturbedValues, defs)
                                       - Evaluator.eval(eq.rhs(), perturbedValues, defs);
                    jacobian[i][j] = (r_perturbed - baseResidual[i]) / h;
                } catch (Exception ignored) {
                    // Keep jacobian[i][j] as 0.0
                }
            }

            perturbedValues.put(varName, x);
        }
        return jacobian;
    }

    /** Solves J_y·dy = −J_x·u for each uncertainty source via SVD and combines the
     *  dependent-variable contributions in root-sum-square. */
    private Map<String, Double> solveRssUncertainties(double[][] jacobian, List<String> varList,
            UncPartition part, Map<String, VariableSpec> specs) {
        List<String> uncVars = part.uncVars();
        List<String> depVars = part.depVars();
        Map<String, Double> uncertainties = part.uncertainties();
        int m = jacobian.length;
        int p = uncVars.size();
        int q = depVars.size();

        double[][][] split = splitJacobianColumns(jacobian, varList, depVars, uncVars, m);
        double[][] jy = split[0];
        double[][] jx = split[1];

        List<Integer> nonZeroRows = selectNonZeroRows(jy, m, q);
        if (nonZeroRows.isEmpty()) {
            setSourceUncertainties(uncertainties, uncVars, specs);
            return uncertainties;
        }

        int mPrime = nonZeroRows.size();
        double[][] jyPrime = new double[mPrime][q];
        double[][] jxPrime = new double[mPrime][p];
        for (int k = 0; k < mPrime; k++) {
            int i = nonZeroRows.get(k);
            System.arraycopy(jy[i], 0, jyPrime[k], 0, q);
            System.arraycopy(jx[i], 0, jxPrime[k], 0, p);
        }

        double[] sumSq = computeDependentVariances(jyPrime, jxPrime, uncVars, specs, q, p, mPrime);
        for (int j = 0; j < q; j++) {
            uncertainties.put(depVars.get(j), Math.sqrt(sumSq[j]));
        }
        setSourceUncertainties(uncertainties, uncVars, specs);
        return uncertainties;
    }

    /** Splits the full Jacobian into dependent-variable (Jy) and uncertainty-source (Jx) columns. */
    private double[][][] splitJacobianColumns(double[][] jacobian, List<String> varList,
            List<String> depVars, List<String> uncVars, int m) {
        Map<String, Integer> varIndices = new HashMap<>();
        for (int j = 0; j < varList.size(); j++) {
            varIndices.put(varList.get(j), j);
        }
        int q = depVars.size();
        int p = uncVars.size();
        double[][] jy = new double[m][q];
        double[][] jx = new double[m][p];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < q; j++) {
                jy[i][j] = jacobian[i][varIndices.get(depVars.get(j))];
            }
            for (int j = 0; j < p; j++) {
                jx[i][j] = jacobian[i][varIndices.get(uncVars.get(j))];
            }
        }
        return new double[][][] { jy, jx };
    }

    /** Indices of residual rows that actually depend on a dependent variable. */
    private List<Integer> selectNonZeroRows(double[][] jy, int m, int q) {
        List<Integer> nonZeroRows = new ArrayList<>();
        for (int i = 0; i < m; i++) {
            boolean isZero = true;
            for (int j = 0; j < q; j++) {
                if (Math.abs(jy[i][j]) >= 1e-12) {
                    isZero = false;
                    break;
                }
            }
            if (!isZero) {
                nonZeroRows.add(i);
            }
        }
        return nonZeroRows;
    }

    /** Per-dependent-variable variance summed over each uncertainty source's propagated effect. */
    private double[] computeDependentVariances(double[][] jyPrime, double[][] jxPrime,
            List<String> uncVars, Map<String, VariableSpec> specs, int q, int p, int mPrime) {
        DecompositionSolver solver =
                new SingularValueDecomposition(new Array2DRowRealMatrix(jyPrime, false)).getSolver();
        double[] sumSq = new double[q];
        for (int i = 0; i < p; i++) {
            double u = specs.get(uncVars.get(i)).uncertainty();
            double[] b = new double[mPrime];
            for (int k = 0; k < mPrime; k++) {
                b[k] = -jxPrime[k][i] * u;
            }
            try {
                double[] dy = solver.solve(new ArrayRealVector(b, false)).toArray();
                for (int j = 0; j < q; j++) {
                    sumSq[j] += dy[j] * dy[j];
                }
            } catch (Exception ignored) {
                // Keep contributions as 0
            }
        }
        return sumSq;
    }

    private void setSourceUncertainties(Map<String, Double> uncertainties, List<String> uncVars,
                                        Map<String, VariableSpec> specs) {
        for (String name : uncVars) {
            uncertainties.put(name, specs.get(name).uncertainty());
        }
    }

    private double[] evaluateSystemResiduals(List<Equation> equations,
                                             Map<String, Double> values,
                                             Map<String, ProcDef> defs) {
        double[] res = new double[equations.size()];
        for (int i = 0; i < equations.size(); i++) {
            Equation eq = equations.get(i);
            res[i] = Evaluator.eval(eq.lhs(), values, defs) - Evaluator.eval(eq.rhs(), values, defs);
        }
        return res;
    }

    private boolean mentionsUncertaintyOf(List<Equation> equations) {
        for (Equation eq : equations) {
            if (mentionsUncertaintyOfExpr(eq.lhs()) || mentionsUncertaintyOfExpr(eq.rhs())) {
                return true;
            }
        }
        return false;
    }

    private boolean mentionsUncertaintyOfExpr(Expr expr) {
        if (expr == null) {
            return false;
        }
        return switch (expr) {
            case Expr.Num n -> false;
            case Expr.Str s -> false;
            case Expr.Var v -> false;
            case Expr.Neg(Expr operand) -> mentionsUncertaintyOfExpr(operand);
            case Expr.BinOp(char op, Expr left, Expr right) ->
                    mentionsUncertaintyOfExpr(left) || mentionsUncertaintyOfExpr(right);
            case Expr.Call(String function, List<Expr> args) ->
                    function.equalsIgnoreCase("uncertaintyof") || anyChildMentionsUncertaintyOf(args);
            case Expr.ArrayAccess(String name, List<Expr> indices) -> anyChildMentionsUncertaintyOf(indices);
            case Expr.Range(Expr start, Expr end) ->
                    mentionsUncertaintyOfExpr(start) || mentionsUncertaintyOfExpr(end);
            case Expr.ArrayLiteral(List<Expr> elements) -> anyChildMentionsUncertaintyOf(elements);
            case Expr.Compare(String op, Expr left, Expr right) ->
                    mentionsUncertaintyOfExpr(left) || mentionsUncertaintyOfExpr(right);
            case Expr.Logical(String op, Expr left, Expr right) ->
                    mentionsUncertaintyOfExpr(left) || mentionsUncertaintyOfExpr(right);
            case Expr.Not(Expr operand) -> mentionsUncertaintyOfExpr(operand);
        };
    }

    private boolean anyChildMentionsUncertaintyOf(List<Expr> children) {
        for (Expr child : children) {
            if (mentionsUncertaintyOfExpr(child)) {
                return true;
            }
        }
        return false;
    }

    private record ExtractedUncertainties(List<Equation> activeEquations,
                                         Map<String, Expr> uncertaintyExprs) {}

    private ExtractedUncertainties extractUncertaintyEquations(List<Equation> equations) {
        List<Equation> active = new ArrayList<>();
        Map<String, Expr> uncExprs = new HashMap<>();
        for (Equation eq : equations) {
            String varL = getUncertaintyTarget(eq.lhs());
            if (varL != null) {
                uncExprs.put(varL.toLowerCase(), eq.rhs());
                continue;
            }
            active.add(eq);
        }
        return new ExtractedUncertainties(active, uncExprs);
    }

    private String getUncertaintyTarget(Expr expr) {
        if (expr instanceof Expr.Call call && call.function().equalsIgnoreCase("uncertaintyof") && call.args().size() == 1) {
            Expr arg = call.args().get(0);
            if (arg instanceof Expr.Var varExpr) {
                return varExpr.name();
            } else if (arg instanceof Expr.Str strExpr) {
                return strExpr.value();
            }
        }
        return null;
    }
}
