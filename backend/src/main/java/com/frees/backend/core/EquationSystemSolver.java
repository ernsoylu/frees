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
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
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
     * of their first appearance, used for display.
     */
    public record Result(Map<String, Double> variables,
                         List<Block> blocks,
                         List<EquationResidual> residuals,
                         Stats stats,
                         List<Solution> solutions,
                         Map<String, String> displayNames,
                         Map<String, Double> uncertainties) {

        public Result(Map<String, Double> variables,
                      List<Block> blocks,
                      List<EquationResidual> residuals,
                      Stats stats,
                      List<Solution> solutions,
                      Map<String, String> displayNames) {
            this(variables, blocks, residuals, stats, solutions, displayNames, Map.of());
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
        EquationParser.ParseResult parsed =
                withExtraDefs(parser.parseResult(source), extraDefs);
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

    private static EquationParser.ParseResult withExtraDefs(
            EquationParser.ParseResult parsed, Map<String, ProcDef> extraDefs) {
        if (extraDefs.isEmpty()) {
            return parsed;
        }
        Map<String, ProcDef> merged = new HashMap<>(extraDefs);
        merged.putAll(parsed.defs());
        return new EquationParser.ParseResult(
                parsed.equations(), parsed.displayNames(), merged);
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

        InnerSolve solved = solveEquationList(equations, settings, specs,
                parsed.defs(), deadlineNanos, null);
        Map<String, VariableSpec> mutableSpecs = new HashMap<>(specs);
        for (Map.Entry<String, Expr> entry : ext.uncertaintyExprs().entrySet()) {
            String varName = entry.getKey();
            try {
                double val = Evaluator.eval(entry.getValue(), solved.values(), parsed.defs());
                VariableSpec old = mutableSpecs.get(varName);
                mutableSpecs.put(varName, new VariableSpec(
                        varName,
                        old != null ? old.guess() : 1.0,
                        old != null ? old.lower() : Double.NEGATIVE_INFINITY,
                        old != null ? old.upper() : Double.POSITIVE_INFINITY,
                        val
                ));
            } catch (Exception ignored) {}
        }
        Map<String, Double> uncertainties = propagateUncertainty(equations, solved.values(), mutableSpecs, parsed.defs());
        if (mentionsUncertaintyOf(equations)) {
            for (Map.Entry<String, Double> entry : uncertainties.entrySet()) {
                solved.values().put("uncertaintyof$" + entry.getKey().toLowerCase(), entry.getValue());
            }
            solved = solveEquationList(equations, settings, mutableSpecs,
                    parsed.defs(), deadlineNanos, solved.values());
            for (Map.Entry<String, Expr> entry : ext.uncertaintyExprs().entrySet()) {
                String varName = entry.getKey();
                try {
                    double val = Evaluator.eval(entry.getValue(), solved.values(), parsed.defs());
                    VariableSpec old = mutableSpecs.get(varName);
                    mutableSpecs.put(varName, new VariableSpec(
                            varName,
                            old != null ? old.guess() : 1.0,
                            old != null ? old.lower() : Double.NEGATIVE_INFINITY,
                            old != null ? old.upper() : Double.POSITIVE_INFINITY,
                            val
                    ));
                } catch (Exception ignored) {}
            }
            uncertainties = propagateUncertainty(equations, solved.values(), mutableSpecs, parsed.defs());
            for (Map.Entry<String, Double> entry : uncertainties.entrySet()) {
                solved.values().put("uncertaintyof$" + entry.getKey().toLowerCase(), entry.getValue());
            }
        }
        return buildResult(equations, solved.blocks(), List.of(solved.values()),
                solved.iterations(), startNanos, parsed, uncertainties);
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
        Map<String, VariableSpec> expandedSpecs = new HashMap<>(
                expandSpecs(allVars, specs, settings.complexMode()));
        Map<String, Double> mutableWarmStart = warmStart != null ? new HashMap<>(warmStart) : null;

        checkAndAdjustGuesses(equations, defs, expandedSpecs, mutableWarmStart);

        Map<String, Double> values = new HashMap<>();
        for (String name : allVars) {
            values.put(name, initialGuess(name, expandedSpecs, mutableWarmStart));
        }
        if (mutableWarmStart != null) {
            for (Map.Entry<String, Double> entry : mutableWarmStart.entrySet()) {
                if (entry.getKey().startsWith("uncertaintyof$")) {
                    values.put(entry.getKey(), entry.getValue());
                }
            }
        }
        NewtonSolver newtonSolver = new NewtonSolver(settings, defs);
        NewtonSolver retrySolver = new NewtonSolver(retrySettings(settings), defs);
        NewtonSolver polisher = new NewtonSolver(polishSettings(settings), defs);
        List<Block> blocks = blocker.block(equations);
        int totalIterations = 0;
        Set<Integer> skipIndices = new HashSet<>();
        for (int bi = 0; bi < blocks.size(); bi++) {
            if (skipIndices.contains(bi)) continue;
            totalIterations += solveBlockWithFallback(bi, blocks, values, deadlineNanos, expandedSpecs,
                    newtonSolver, retrySolver, polisher, mutableWarmStart, skipIndices);
        }
        return new InnerSolve(values, blocks, totalIterations);
    }

    private int solveBlockWithFallback(int bi, List<Block> blocks, Map<String, Double> values,
                                       long deadlineNanos, Map<String, VariableSpec> expandedSpecs,
                                       NewtonSolver newtonSolver, NewtonSolver retrySolver,
                                       NewtonSolver polisher, Map<String, Double> warmStart,
                                       Set<Integer> skipIndices) {
        Block block = blocks.get(bi);
        Block actualSolved = block;
        int iterations = 0;
        try {
            iterations += newtonSolver.solveBlock(block, values, deadlineNanos, expandedSpecs);
        } catch (SolverException ex) {
            // First resort when a block fails: retry it alone from
            // transformed guesses. This is local and cheap, and keeps the
            // solutions of all other blocks intact.
            int retryIterations = retryWithTransformedGuesses(retrySolver, block,
                    values, deadlineNanos, expandedSpecs, warmStart);
            if (retryIterations >= 0) {
                iterations += retryIterations;
            } else {
                // Second resort: merge with connected blocks in both
                // directions and re-solve the combined system.
                List<Integer> mergedIndices = new ArrayList<>();
                Block merged = tryMergeBidirectional(blocks, bi, block, mergedIndices, skipIndices);
                if (merged != null && merged.variables().size() > block.variables().size()) {
                    // Reset ALL variables in the merged block to initial guesses.
                    // Previously solved blocks may have incorrect values from
                    // SVD fallback on rank-deficient Jacobians.
                    for (String v : merged.variables()) {
                        values.put(v, initialGuess(v, expandedSpecs, null));
                    }
                    iterations += newtonSolver.solveBlock(merged, values, deadlineNanos, expandedSpecs);
                    skipIndices.addAll(mergedIndices);
                    actualSolved = merged;
                } else {
                    throw ex;
                }
            }
        }
        try {
            iterations += polisher.solveBlock(actualSolved, values, deadlineNanos, expandedSpecs);
        } catch (SolverException ignored) {
            // Polishing is best-effort; the main solution is still valid.
        }
        return iterations;
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
            if (!ie.constantLimits()) {
                // A variable limit (e.g. T_flame) is an unknown of the
                // system: the integral becomes an ordinary equation that the
                // Evaluator computes by quadrature on each residual
                // evaluation, and the integration variable lands on the
                // upper limit.
                finalEquations.add(IntegralSolver.inlinedEquation(ie, ordinary));
                if (fixedIntegrationVars.add(ie.integrationVar())) {
                    finalEquations.add(new Equation(new Expr.Var(ie.integrationVar()),
                            ie.upperExpr(),
                            ie.integrationVar() + " = upper limit of "
                                    + ie.original().sourceText()));
                }
                continue;
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
        InnerSolve solved = solveEquationList(finalEquations, settings, specs,
                parsed.defs(), deadlineNanos, null);
        Map<String, VariableSpec> mutableSpecs = new HashMap<>(specs);
        for (Map.Entry<String, Expr> entry : uncertaintyExprs.entrySet()) {
            String varName = entry.getKey();
            try {
                double val = Evaluator.eval(entry.getValue(), solved.values(), parsed.defs());
                VariableSpec old = mutableSpecs.get(varName);
                mutableSpecs.put(varName, new VariableSpec(
                        varName,
                        old != null ? old.guess() : 1.0,
                        old != null ? old.lower() : Double.NEGATIVE_INFINITY,
                        old != null ? old.upper() : Double.POSITIVE_INFINITY,
                        val
                ));
            } catch (Exception ignored) {}
        }
        Map<String, Double> uncertainties = propagateUncertainty(finalEquations, solved.values(), mutableSpecs, parsed.defs());
        if (mentionsUncertaintyOf(finalEquations)) {
            for (Map.Entry<String, Double> entry : uncertainties.entrySet()) {
                solved.values().put("uncertaintyof$" + entry.getKey().toLowerCase(), entry.getValue());
            }
            solved = solveEquationList(finalEquations, settings, mutableSpecs,
                    parsed.defs(), deadlineNanos, solved.values());
            for (Map.Entry<String, Expr> entry : uncertaintyExprs.entrySet()) {
                String varName = entry.getKey();
                try {
                    double val = Evaluator.eval(entry.getValue(), solved.values(), parsed.defs());
                    VariableSpec old = mutableSpecs.get(varName);
                    mutableSpecs.put(varName, new VariableSpec(
                            varName,
                            old != null ? old.guess() : 1.0,
                            old != null ? old.lower() : Double.NEGATIVE_INFINITY,
                            old != null ? old.upper() : Double.POSITIVE_INFINITY,
                            val
                    ));
                } catch (Exception ignored) {}
            }
            uncertainties = propagateUncertainty(finalEquations, solved.values(), mutableSpecs, parsed.defs());
            for (Map.Entry<String, Double> entry : uncertainties.entrySet()) {
                solved.values().put("uncertaintyof$" + entry.getKey().toLowerCase(), entry.getValue());
            }
        }
        return buildResult(finalEquations, solved.blocks(), List.of(solved.values()),
                state.iterations + solved.iterations(), startNanos, parsed, uncertainties);
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
     * Check Units: dimensional consistency warnings for the given source
     * against declared variable units. Never blocks solving.
     */
    public List<String> checkUnits(String source, Map<String, String> variableUnits) {
        List<Equation> equations = parser.parse(source);
        List<String> warnings = new ArrayList<>(UnitChecker.check(equations, variableUnits).warnings());
        try {
            List<Block> blocks = blocker.block(equations);
            for (Block block : blocks) {
                for (Equation eq : block.equations()) {
                    checkNonSmoothInBlock(eq, block.variables(), warnings);
                }
            }
        } catch (Exception ignored) {
            // Ignored: blocking errors are handled elsewhere
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
                String lowerFunc = function.toLowerCase();
                if (Set.of("round", "floor", "ceil", "trunc", "sign", "step").contains(lowerFunc)) {
                    for (Expr arg : args) {
                        Set<String> argVars = arg.variables();
                        boolean dependsOnBlockVar = argVars.stream().anyMatch(blockVars::contains);
                        if (dependsOnBlockVar) {
                            warnings.add("Equation '" + sourceText + "' depends on non-smooth function '" + function 
                                    + "' whose argument contains simultaneous block variable(s). "
                                    + "Newton simultaneous solvers may stall or fail to converge; "
                                    + "consider moving this variable to a sequential block.");
                            break;
                        }
                    }
                }
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
     * A variable gets its units when it is set from an annotated
     * constant (P = 100 [bar] gives P the units bar). Returns the inferred
     * units by variable name; explicit Variable Information entries take
     * precedence over these.
     */
    public Map<String, String> inferUnits(String source) {
        EquationParser.ParseResult parsed = parser.parseResult(source);
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
                displayNames, uncertainties);
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

        // Check 1st argument (X)
        Expr arg1 = args.get(0);
        if (arg1 instanceof Expr.Var varExpr) {
            String varName = varExpr.name();
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
                adjustVarGuess(varName, minX, maxX, expandedSpecs, warmStart);
                adjustVarGuess(varName + "_r", minX, maxX, expandedSpecs, warmStart);
            }
        }

        // Check 2nd argument (Parameter) if it exists
        if (args.size() > 1) {
            Expr arg2 = args.get(1);
            if (arg2 instanceof Expr.Var varExpr) {
                String varName = varExpr.name();
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
                    adjustVarGuess(varName, minParam, maxParam, expandedSpecs, warmStart);
                    adjustVarGuess(varName + "_r", minParam, maxParam, expandedSpecs, warmStart);
                }
            }
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
        TreeSet<String> allVars = collectVariables(equations);
        List<String> varList = new ArrayList<>(allVars);
        int N = varList.size();
        
        List<String> uncVars = new ArrayList<>();
        List<String> depVars = new ArrayList<>();
        for (String v : varList) {
            VariableSpec spec = specs.get(v);
            if (spec != null && spec.uncertainty() > 0.0) {
                uncVars.add(v);
            } else {
                depVars.add(v);
            }
        }
        
        Map<String, Double> uncertainties = new HashMap<>();
        for (String v : varList) {
            uncertainties.put(v, 0.0);
        }
        
        if (uncVars.isEmpty()) {
            return uncertainties;
        }
        
        int M = equations.size();
        double[][] J = new double[M][N];
        double[] baseResidual = evaluateSystemResiduals(equations, values, defs);
        Map<String, Double> perturbedValues = new HashMap<>(values);
        double eps = Math.sqrt(Math.ulp(1.0));
        
        for (int j = 0; j < N; j++) {
            String varName = varList.get(j);
            double x = values.getOrDefault(varName, 1.0);
            double h = eps * Math.max(Math.abs(x), 1.0);
            perturbedValues.put(varName, x + h);
            try {
                double[] perturbedResidual = evaluateSystemResiduals(equations, perturbedValues, defs);
                for (int i = 0; i < M; i++) {
                    J[i][j] = (perturbedResidual[i] - baseResidual[i]) / h;
                }
            } catch (Exception ignored) {
                // Keep J[i][j] as 0.0
            }
            perturbedValues.put(varName, x);
        }
        
        int p = uncVars.size();
        int q = depVars.size();
        
        Map<String, Integer> varIndices = new HashMap<>();
        for (int j = 0; j < N; j++) {
            varIndices.put(varList.get(j), j);
        }
        
        int[] depIndices = new int[q];
        for (int j = 0; j < q; j++) {
            depIndices[j] = varIndices.get(depVars.get(j));
        }
        int[] uncIndices = new int[p];
        for (int j = 0; j < p; j++) {
            uncIndices[j] = varIndices.get(uncVars.get(j));
        }
        
        double[][] Jy = new double[M][q];
        double[][] Jx = new double[M][p];
        for (int i = 0; i < M; i++) {
            for (int j = 0; j < q; j++) {
                Jy[i][j] = J[i][depIndices[j]];
            }
            for (int j = 0; j < p; j++) {
                Jx[i][j] = J[i][uncIndices[j]];
            }
        }
        
        List<Integer> nonZeroRows = new ArrayList<>();
        for (int i = 0; i < M; i++) {
            boolean isZero = true;
            for (int j = 0; j < q; j++) {
                if (Math.abs(Jy[i][j]) >= 1e-12) {
                    isZero = false;
                    break;
                }
            }
            if (!isZero) {
                nonZeroRows.add(i);
            }
        }
        
        if (nonZeroRows.isEmpty()) {
            for (int i = 0; i < p; i++) {
                String name = uncVars.get(i);
                uncertainties.put(name, specs.get(name).uncertainty());
            }
            return uncertainties;
        }
        
        int Mprime = nonZeroRows.size();
        double[][] JyPrime = new double[Mprime][q];
        double[][] JxPrime = new double[Mprime][p];
        for (int k = 0; k < Mprime; k++) {
            int i = nonZeroRows.get(k);
            System.arraycopy(Jy[i], 0, JyPrime[k], 0, q);
            System.arraycopy(Jx[i], 0, JxPrime[k], 0, p);
        }
        
        Array2DRowRealMatrix jyMat = new Array2DRowRealMatrix(JyPrime, false);
        SingularValueDecomposition svd = new SingularValueDecomposition(jyMat);
        DecompositionSolver solver = svd.getSolver();
        
        double[] sumSq = new double[q];
        for (int i = 0; i < p; i++) {
            double u = specs.get(uncVars.get(i)).uncertainty();
            double[] b = new double[Mprime];
            for (int k = 0; k < Mprime; k++) {
                b[k] = -JxPrime[k][i] * u;
            }
            RealVector bVec = new ArrayRealVector(b, false);
            try {
                RealVector dyVec = solver.solve(bVec);
                double[] dy = dyVec.toArray();
                for (int j = 0; j < q; j++) {
                    sumSq[j] += dy[j] * dy[j];
                }
            } catch (Exception ignored) {
                // Keep contributions as 0
            }
        }
        
        for (int j = 0; j < q; j++) {
            uncertainties.put(depVars.get(j), Math.sqrt(sumSq[j]));
        }
        for (int i = 0; i < p; i++) {
            String name = uncVars.get(i);
            uncertainties.put(name, specs.get(name).uncertainty());
        }
        
        return uncertainties;
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
        if (expr == null) return false;
        switch (expr) {
            case Expr.Num n -> { return false; }
            case Expr.Str s -> { return false; }
            case Expr.Var v -> { return false; }
            case Expr.Neg(Expr operand) -> { return mentionsUncertaintyOfExpr(operand); }
            case Expr.BinOp(char op, Expr left, Expr right) -> {
                return mentionsUncertaintyOfExpr(left) || mentionsUncertaintyOfExpr(right);
            }
            case Expr.Call(String function, List<Expr> args) -> {
                if (function.equalsIgnoreCase("uncertaintyof")) {
                    return true;
                }
                for (Expr arg : args) {
                    if (mentionsUncertaintyOfExpr(arg)) return true;
                }
                return false;
            }
            case Expr.ArrayAccess(String name, List<Expr> indices) -> {
                for (Expr idx : indices) {
                    if (mentionsUncertaintyOfExpr(idx)) return true;
                }
                return false;
            }
            case Expr.Range(Expr start, Expr end) -> {
                return mentionsUncertaintyOfExpr(start) || mentionsUncertaintyOfExpr(end);
            }
            case Expr.ArrayLiteral(List<Expr> elements) -> {
                for (Expr el : elements) {
                    if (mentionsUncertaintyOfExpr(el)) return true;
                }
                return false;
            }
            case Expr.Compare(String op, Expr left, Expr right) -> {
                return mentionsUncertaintyOfExpr(left) || mentionsUncertaintyOfExpr(right);
            }
            case Expr.Logical(String op, Expr left, Expr right) -> {
                return mentionsUncertaintyOfExpr(left) || mentionsUncertaintyOfExpr(right);
            }
            case Expr.Not(Expr operand) -> { return mentionsUncertaintyOfExpr(operand); }
        }
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
