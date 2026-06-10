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
        if (complexMode) {
            equations = com.frees.backend.parser.ComplexExpansion.expand(equations, parsed.displayNames());
        }

        TreeSet<String> allVars = new TreeSet<>();
        for (Equation eq : equations) {
            allVars.addAll(eq.variables());
        }

        List<String> variables = allVars.stream()
                .map(v -> parsed.displayNames().getOrDefault(v, v))
                .toList();
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
        List<Equation> equations = parsed.equations();
        if (settings.complexMode()) {
            equations = com.frees.backend.parser.ComplexExpansion.expand(equations, parsed.displayNames());
        }

        TreeSet<String> allVars = new TreeSet<>();
        for (Equation eq : equations) {
            allVars.addAll(eq.variables());
        }
        Map<String, VariableSpec> expandedSpecs = expandSpecs(allVars, specs, settings.complexMode());

        Map<String, Double> values = new HashMap<>();
        for (String var : allVars) {
            VariableSpec spec = expandedSpecs.get(var);
            values.put(var, spec != null ? spec.guess() : DEFAULT_GUESS);
        }

        Map<String, ProcDef> defs = parsed.defs();
        NewtonSolver newtonSolver = new NewtonSolver(settings, defs);
        // Use near-zero residual tolerance so the polisher keeps iterating
        // until variable change drops below 1e-15.  This is critical for
        // multiple roots where residual ≈ error^m drops below tolerance
        // long before the variable has converged.
        NewtonSolver polisher = new NewtonSolver(new SolverSettings(
                50,
                1e-30,
                1e-15,
                settings.elapsedTimeSeconds(),
                settings.complexMode()), defs);
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

        return buildResult(equations, allVars, blocks, List.of(values),
                totalIterations, startNanos, parsed.displayNames(), defs);
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
        for (String var : allVars) {
            VariableSpec spec = expandedSpecs.get(var);
            guesses.put(var, spec != null ? spec.guess() : DEFAULT_GUESS);
        }

        Map<String, ProcDef> defs = parsed.defs();
        List<Block> blocks = blocker.block(equations);
        AllRootsSolver allRoots = new AllRootsSolver(settings, expandedSpecs, defs);
        List<Map<String, Double>> solutions = allRoots.findAll(blocks, guesses, deadlineNanos);

        return buildResult(equations, allVars, blocks, solutions,
                allRoots.totalIterations(), startNanos, parsed.displayNames(), defs);
    }

    private Result buildResult(List<Equation> equations, TreeSet<String> allVars,
                               List<Block> blocks, List<Map<String, Double>> solutionMaps,
                               int totalIterations, long startNanos,
                               Map<String, String> displayNames,
                               Map<String, ProcDef> defs) {
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

    private Map<String, VariableSpec> expandSpecs(TreeSet<String> allVars, Map<String, VariableSpec> specs, boolean complexMode) {
        Map<String, VariableSpec> expandedSpecs = new HashMap<>();
        if (complexMode) {
            for (String var : allVars) {
                if (specs.containsKey(var)) {
                    expandedSpecs.put(var, specs.get(var));
                } else if (var.endsWith("_r") || var.endsWith("_i")) {
                    String baseName = var.substring(0, var.length() - 2);
                    VariableSpec parentSpec = specs.get(baseName);
                    if (parentSpec != null) {
                        double guess = var.endsWith("_r") ? parentSpec.guess() : DEFAULT_GUESS;
                        expandedSpecs.put(var, new VariableSpec(var, guess, parentSpec.lower(), parentSpec.upper()));
                    } else {
                        double guess = DEFAULT_GUESS;
                        expandedSpecs.put(var, new VariableSpec(var, guess, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY));
                    }
                }
            }
        } else {
            expandedSpecs = specs;
        }
        return expandedSpecs;
    }
}
