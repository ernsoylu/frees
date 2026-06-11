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
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Orchestrates the full EES solve pipeline:
 * parse -> extract variables (guess 1.0, bounds ±infinity) -> block -> solve.
 */
@Service
public class EquationSystemSolver {

    public static final double DEFAULT_GUESS = 1.0;

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
     * of their first appearance, which EES uses for display.
     */
    public record Result(Map<String, Double> variables,
                         List<Block> blocks,
                         List<EquationResidual> residuals,
                         Stats stats,
                         List<Solution> solutions,
                         Map<String, String> displayNames) {}

    public record CheckResult(boolean solvable,
                              int equationCount,
                              int unknownCount,
                              List<String> variables,
                              String message) {}

    /**
     * EES Check/Format: verifies syntax and reports equation/variable counts,
     * then verifies the system is structurally solvable (zero degrees of
     * freedom and an independent equation-to-variable assignment). Does not
     * solve anything.
     */
    public CheckResult check(String source) {
        return check(source, false);
    }

    public CheckResult check(String source, boolean complexMode) {
        EquationParser.ParseResult parsed = parser.parseResult(source);
        List<Equation> equations = parsed.equations();
        try {
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

        TreeSet<String> allVars = collectVariables(equations);
        List<String> variables = displayNamesOf(allVars, parsed);
        try {
            blocker.verifyStructure(equations);
        } catch (SolverException e) {
            return new CheckResult(false, equations.size(), allVars.size(), variables,
                    e.getMessage());
        }

        return new CheckResult(true, equations.size(), allVars.size(), variables,
                String.format(
                        "No syntax errors were detected. There are %d equations and %d variables.",
                        equations.size(), allVars.size()));
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
                .map(v -> parsed.displayNames().getOrDefault(v, v))
                .toList();
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
        long startNanos = System.nanoTime();
        long deadlineNanos = startNanos + (long) (settings.elapsedTimeSeconds() * 1.0e9);
        EquationParser.ParseResult parsed = parser.parseResult(source);
        List<IntegralSolver.IntegralEquation> integrals =
                findIntegrals(parsed.equations(), parsed.defs(), settings.complexMode());
        if (!integrals.isEmpty()) {
            return solveWithIntegrals(parsed, integrals, settings, specs,
                    startNanos, deadlineNanos);
        }

        List<Equation> equations = parsed.equations();
        if (settings.complexMode()) {
            equations = com.frees.backend.parser.ComplexExpansion.expand(equations, parsed.displayNames());
        }

        InnerSolve solved = solveEquationList(equations, settings, specs,
                parsed.defs(), deadlineNanos, null);
        return buildResult(equations, solved.blocks(), List.of(solved.values()),
                solved.iterations(), startNanos, parsed);
    }

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
        Map<String, VariableSpec> expandedSpecs =
                expandSpecs(allVars, specs, settings.complexMode());
        Map<String, Double> values = new HashMap<>();
        for (String name : allVars) {
            values.put(name, initialGuess(name, expandedSpecs, warmStart));
        }
        NewtonSolver newtonSolver = new NewtonSolver(settings, defs);
        NewtonSolver polisher = new NewtonSolver(polishSettings(settings), defs);
        List<Block> blocks = blocker.block(equations);
        int totalIterations = 0;
        for (Block block : blocks) {
            totalIterations += newtonSolver.solveBlock(block, values, deadlineNanos, expandedSpecs);
            try {
                totalIterations += polisher.solveBlock(block, values, deadlineNanos, expandedSpecs);
            } catch (SolverException ignored) {
                // Polishing is best-effort; the main solution is still valid.
            }
        }
        return new InnerSolve(values, blocks, totalIterations);
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
     * EES equation-based Integral: each F = Integral(f, t, a, b) drives t
     * from a to b, solving the rest of the system at every step, and the
     * final solution reports the system at t = b with F at its accumulated
     * value (see IntegralSolver for the quadrature).
     */
    private Result solveWithIntegrals(EquationParser.ParseResult parsed,
                                      List<IntegralSolver.IntegralEquation> integrals,
                                      SolverSettings settings,
                                      Map<String, VariableSpec> specs,
                                      long startNanos, long deadlineNanos) {
        List<Equation> ordinary =
                IntegralSolver.ordinaryEquations(parsed.equations(), integrals);
        IntegrationState state = new IntegrationState();
        List<Equation> finalEquations = new ArrayList<>(ordinary);
        TreeSet<String> fixedIntegrationVars = new TreeSet<>();
        for (IntegralSolver.IntegralEquation ie : integrals) {
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
        InnerSolve solved = solveEquationList(finalEquations, settings, specs,
                parsed.defs(), deadlineNanos, null);
        return buildResult(finalEquations, solved.blocks(), List.of(solved.values()),
                state.iterations + solved.iterations(), startNanos, parsed);
    }

    /** Integrand value at one quadrature point: solve the subsystem with the
     * integration variable and the running integral value pinned. */
    private double integrandAt(IntegralContext context, double t, double runningTotal) {
        IntegralSolver.IntegralEquation ie = context.equation();
        List<Equation> subsystem = new ArrayList<>(context.ordinary());
        subsystem.add(new Equation(new Expr.Var(ie.integrationVar()),
                new Expr.Num(t), ie.integrationVar() + " = " + t));
        subsystem.add(new Equation(new Expr.Var(ie.resultVar()),
                new Expr.Num(runningTotal), ie.resultVar() + " = " + runningTotal));
        try {
            InnerSolve solved = solveEquationList(subsystem, context.settings(),
                    context.specs(), context.defs(), context.deadlineNanos(),
                    context.state().warmStart);
            context.state().warmStart = solved.values();
            context.state().iterations += solved.iterations();
            return Evaluator.eval(ie.integrand(), solved.values(), context.defs());
        } catch (SolverException | IllegalStateException e) {
            throw new SolverException("While evaluating Integral at "
                    + ie.integrationVar() + " = " + t + ": " + e.getMessage());
        }
    }

    /**
     * EES Check Units: dimensional consistency warnings for the given source
     * against declared variable units. Never blocks solving.
     */
    public List<String> checkUnits(String source, Map<String, String> variableUnits) {
        List<Equation> equations = parser.parse(source);
        return UnitChecker.check(equations, variableUnits).warnings();
    }

    /**
     * SI units derived dimensionally for computed variables (P = m*g/A gets
     * Pa when m, g, A are known). Keys are display-cased names.
     */
    public Map<String, String> deriveUnits(String source, Map<String, String> variableUnits) {
        EquationParser.ParseResult parsed = parser.parseResult(source);
        Map<String, String> derived =
                UnitChecker.check(parsed.equations(), variableUnits).derivedUnits();
        Map<String, String> byDisplayName = new HashMap<>();
        derived.forEach((name, unit) ->
                byDisplayName.put(parsed.displayNames().getOrDefault(name, name), unit));
        return byDisplayName;
    }

    /**
     * EES assigns a variable its units when it is set from an annotated
     * constant (P = 100 [bar] gives P the units bar). Returns the inferred
     * units by variable name; explicit Variable Information entries take
     * precedence over these.
     */
    public Map<String, String> inferUnits(String source) {
        EquationParser.ParseResult parsed = parser.parseResult(source);
        Map<String, String> inferred = new HashMap<>();
        for (Equation eq : parsed.equations()) {
            if (eq.lhs() instanceof Expr.Var v && eq.rhs() instanceof Expr.Num n
                    && n.unit() != null) {
                inferred.putIfAbsent(v.name(), n.unit());
            } else if (eq.rhs() instanceof Expr.Var v && eq.lhs() instanceof Expr.Num n
                    && n.unit() != null) {
                inferred.putIfAbsent(v.name(), n.unit());
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
        long startNanos = System.nanoTime();
        long deadlineNanos = startNanos + (long) (settings.elapsedTimeSeconds() * 1.0e9);
        EquationParser.ParseResult parsed = parser.parseResult(source);
        List<Equation> equations = parsed.equations();
        if (settings.complexMode()) {
            equations = com.frees.backend.parser.ComplexExpansion.expand(equations, parsed.displayNames());
        }

        TreeSet<String> allVars = new TreeSet<>();
        for (Equation eq : equations) {
            allVars.addAll(eq.variables());
        }
        Map<String, VariableSpec> expandedSpecs = expandSpecs(allVars, specs, settings.complexMode());

        Map<String, Double> guesses = new HashMap<>();
        for (String name : allVars) {
            guesses.put(name, initialGuess(name, expandedSpecs, null));
        }

        Map<String, ProcDef> defs = parsed.defs();
        List<Block> blocks = blocker.block(equations);
        AllRootsSolver allRoots = new AllRootsSolver(settings, expandedSpecs, defs);
        List<Map<String, Double>> solutions = allRoots.findAll(blocks, guesses, deadlineNanos);

        return buildResult(equations, blocks, solutions,
                allRoots.totalIterations(), startNanos, parsed);
    }

    private Result buildResult(List<Equation> equations, List<Block> blocks,
                               List<Map<String, Double>> solutionMaps,
                               int totalIterations, long startNanos,
                               EquationParser.ParseResult parsed) {
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
            // (EES Check/Format behavior); lookups stay case-insensitive.
            TreeMap<String, Double> displayed = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            values.forEach((name, value) ->
                    displayed.put(displayNames.getOrDefault(name, name), value));
            solutions.add(new Solution(displayed, residuals, maxResidual));
            worstResidual = Math.max(worstResidual, maxResidual);
        }

        Stats stats = new Stats(
                equations.size(),
                allVars.size(),
                blocks.size(),
                totalIterations,
                (System.nanoTime() - startNanos) / 1_000_000,
                worstResidual);

        Solution first = solutions.get(0);
        return new Result(first.variables(), blocks, first.residuals(), stats, solutions,
                displayNames);
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
            return new VariableSpec(name, DEFAULT_GUESS,
                    Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY);
        }
        double guess = name.endsWith("_r") ? parentSpec.guess() : DEFAULT_GUESS;
        return new VariableSpec(name, guess, parentSpec.lower(), parentSpec.upper());
    }
}
