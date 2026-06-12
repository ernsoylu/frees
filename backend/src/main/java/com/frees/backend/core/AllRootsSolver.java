package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.ast.ProcDef;
import org.apache.commons.math3.analysis.UnivariateFunction;
import org.apache.commons.math3.analysis.solvers.BrentSolver;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.TreeSet;

/**
 * Finds (in practice) all roots of a blocked equation system, going beyond
 * EES, which only ever reports the single root nearest the guess values.
 *
 * Strategy per block, composed by Cartesian branching across blocks:
 *  - 1-variable blocks: scan the bounded interval for sign changes of the
 *    residual and run Brent's method on each bracket. Unbounded variables are
 *    scanned within ±SCAN_LIMIT; set bounds in the Variable Information
 *    window to widen or narrow the search.
 *  - N-variable simultaneous blocks: multi-start Newton from the guess plus
 *    deterministic pseudo-random starts inside the bounds, deduplicated.
 *
 * Every root of block k forks a new branch for the remaining blocks, so the
 * result is the full combination set of system solutions (capped at
 * MAX_SOLUTIONS branches to avoid combinatorial explosion).
 */
public class AllRootsSolver {

    public static final double SCAN_LIMIT = 100.0;
    private static final int SCAN_INTERVALS = 1024;
    private static final int STARTS_PER_VARIABLE = 32;
    private static final int MAX_STARTS = 128;
    private static final int MAX_SOLUTIONS = 32;
    private static final long RANDOM_SEED = 987654321L;

    private final SolverSettings settings;
    private final Map<String, VariableSpec> specs;
    private final Map<String, ProcDef> defs;
    private final NewtonSolver newton;
    private final NewtonSolver polisher;
    private int totalIterations;

    public AllRootsSolver(SolverSettings settings, Map<String, VariableSpec> specs) {
        this(settings, specs, Map.of());
    }

    public AllRootsSolver(SolverSettings settings, Map<String, VariableSpec> specs,
                          Map<String, ProcDef> defs) {
        this.settings = settings;
        this.specs = specs;
        this.defs = defs;
        this.newton = new NewtonSolver(settings, defs);
        // Use near-zero residual tolerance so the polisher keeps iterating
        // until variable change drops below 1e-15.  Critical for multiple
        // roots where residual ≈ error^m drops below tolerance long before
        // the variable has converged.
        this.polisher = new NewtonSolver(new SolverSettings(
                50,
                1e-30,
                1e-15,
                settings.elapsedTimeSeconds(),
                settings.complexMode()), defs);
    }

    public int totalIterations() {
        return totalIterations;
    }

    /** Returns complete value maps, one per distinct system solution. */
    public List<Map<String, Double>> findAll(List<Block> blocks,
                                             Map<String, Double> initialGuesses,
                                             long deadlineNanos) {
        List<Map<String, Double>> branches = new ArrayList<>();
        branches.add(new HashMap<>(initialGuesses));

        for (Block block : blocks) {
            List<Map<String, Double>> nextBranches = new ArrayList<>();
            for (Map<String, Double> branch : branches) {
                for (Map<String, Double> rooted : blockRoots(block, branch, deadlineNanos)) {
                    if (nextBranches.size() < MAX_SOLUTIONS) {
                        nextBranches.add(rooted);
                    }
                }
            }
            if (nextBranches.isEmpty()) {
                throw new SolverException(
                        "No solution found for block " + block.index()
                                + " within the search region. Adjust guesses or bounds "
                                + "in the Variable Information window.");
            }
            branches = nextBranches;
        }

        return dedupAndSort(branches, blocks);
    }

    /** All roots of one block given fixed upstream values; each returned map is a branch copy. */
    private List<Map<String, Double>> blockRoots(Block block, Map<String, Double> branch,
                                                 long deadlineNanos) {
        if (block.variables().size() == 1) {
            return scanRoots1D(block, branch, deadlineNanos);
        }
        return multiStartRoots(block, branch, deadlineNanos);
    }

    // ------------------------------------------------------------------
    // 1D blocks: interval scan + Brent
    // ------------------------------------------------------------------

    private List<Map<String, Double>> scanRoots1D(Block block, Map<String, Double> branch,
                                                   long deadlineNanos) {
        String varName = block.variables().get(0);
        VariableSpec spec = specs.get(varName);

        double lo = spec != null && Double.isFinite(spec.lower()) ? spec.lower() : -SCAN_LIMIT;
        double hi = spec != null && Double.isFinite(spec.upper()) ? spec.upper() : SCAN_LIMIT;

        Scan1D scanner = new Scan1D(block, branch, deadlineNanos);
        scanner.runScan(lo, hi);
        List<Double> roots = scanner.roots;

        // Also run plain Newton from the guess: it preserves single-root
        // behavior for roots outside the scan window or tangent (non-crossing)
        // roots the sign scan cannot see.
        try {
            Map<String, Double> newtonBranch = new HashMap<>(branch);
            totalIterations += newton.solveBlock(block, newtonBranch, deadlineNanos, specs);
            addRoot(roots, newtonBranch.get(varName));
        } catch (SolverException ignored) {
            // The scan results stand on their own.
        }

        // Polish every root for maximum precision (critical for multiple roots
        // where the residual drops to tolerance well before x converges).
        List<Map<String, Double>> result = new ArrayList<>();
        for (double root : roots) {
            Map<String, Double> copy = new HashMap<>(branch);
            copy.put(varName, root);
            try {
                totalIterations += polisher.solveBlock(block, copy, deadlineNanos, specs);
            } catch (SolverException ignored) {
                // Polishing is best-effort.
            }
            result.add(copy);
        }
        return result;
    }

    private class Scan1D {
        final Block block;
        final Map<String, Double> branch;
        final long deadlineNanos;
        final String varName;
        final Equation eq;
        final Map<String, Double> work;
        final UnivariateFunction f;
        final List<Double> roots = new ArrayList<>();

        Scan1D(Block block, Map<String, Double> branch, long deadlineNanos) {
            this.block = block;
            this.branch = branch;
            this.deadlineNanos = deadlineNanos;
            this.varName = block.variables().get(0);
            this.eq = block.equations().get(0);
            this.work = new HashMap<>(branch);
            this.f = t -> {
                work.put(varName, t);
                return Evaluator.eval(eq.lhs(), work, defs) - Evaluator.eval(eq.rhs(), work, defs);
            };
        }

        void runScan(double lo, double hi) {
            double step = (hi - lo) / SCAN_INTERVALS;
            if (step <= 0 || !Double.isFinite(step)) {
                return;
            }
            double prevT = lo;
            double prevF = safeEval(f, prevT);
            for (int i = 1; i <= SCAN_INTERVALS; i++) {
                double t = (i == SCAN_INTERVALS) ? hi : lo + i * step;
                double ft = safeEval(f, t);
                if (prevF == 0.0 && isValidRoot(eq, varName, prevT, work)) {
                    addRoot(roots, prevT);
                }
                if (Double.isFinite(prevF) && Double.isFinite(ft) && prevF * ft < 0) {
                    checkBrentRoot(prevT, t);
                }
                if (Double.isFinite(prevF) && Double.isFinite(ft) && prevF * ft > 0 && Math.abs(prevF) + Math.abs(ft) > 0) {
                    checkTangentRoot(prevT, t, prevF, ft);
                }
                prevT = t;
                prevF = ft;
            }
            if (prevF == 0.0 && isValidRoot(eq, varName, prevT, work)) {
                addRoot(roots, prevT);
            }
        }

        private void checkBrentRoot(double prevT, double t) {
            try {
                double root = new BrentSolver(1e-14, 1e-12)
                        .solve(200, f, Math.min(prevT, t), Math.max(prevT, t));
                // Validate brent root to handle poles
                if (isValidRoot(eq, varName, root, work)) {
                    addRoot(roots, root);
                }
            } catch (RuntimeException ignored) {
                // Bracket failed to converge; skip it.
            }
        }

        private void checkTangentRoot(double prevT, double t, double prevF, double ft) {
            double minAbs = Math.min(Math.abs(prevF), Math.abs(ft));
            if (minAbs < Math.sqrt(settings.relativeResiduals())) {
                double mid = (prevT + t) / 2.0;
                try {
                    Map<String, Double> tangentWork = new HashMap<>(branch);
                    tangentWork.put(varName, mid);
                    totalIterations += newton.solveBlock(block, tangentWork, deadlineNanos, specs);
                    double tangentRoot = tangentWork.get(varName);
                    if (isValidRoot(eq, varName, tangentRoot, tangentWork)) {
                        addRoot(roots, tangentRoot);
                    }
                } catch (SolverException ignored) {
                    // Tangent root solve failed; skip it.
                }
            }
        }
    }

    private static double safeEval(UnivariateFunction f, double t) {
        try {
            return f.value(t);
        } catch (RuntimeException e) {
            return Double.NaN;
        }
    }

    private boolean isValidRoot(Equation eq, String varName, double root, Map<String, Double> work) {
        work.put(varName, root);
        try {
            double lhs = Evaluator.eval(eq.lhs(), work, defs);
            double rhs = Evaluator.eval(eq.rhs(), work, defs);
            double scale = Math.max(Math.abs(lhs), 1.0e-12);
            return Math.abs(lhs - rhs) / scale <= Math.sqrt(settings.relativeResiduals());
        } catch (RuntimeException e) {
            return false;
        }
    }

    private static void addRoot(List<Double> roots, double candidate) {
        for (double existing : roots) {
            if (Math.abs(existing - candidate) <= 1e-6 * Math.max(1.0, Math.abs(existing))) {
                return;
            }
        }
        roots.add(candidate);
        roots.sort(Comparator.naturalOrder());
    }

    // ------------------------------------------------------------------
    // N-D blocks: multi-start Newton
    // ------------------------------------------------------------------

    private List<Map<String, Double>> multiStartRoots(Block block, Map<String, Double> branch,
                                                      long deadlineNanos) {
        List<String> vars = block.variables();
        int n = vars.size();
        int starts = Math.min(MAX_STARTS, STARTS_PER_VARIABLE * n);

        double[] lo = new double[n];
        double[] hi = new double[n];
        for (int i = 0; i < n; i++) {
            VariableSpec spec = specs.get(vars.get(i));
            lo[i] = spec != null && Double.isFinite(spec.lower()) ? spec.lower() : -SCAN_LIMIT;
            hi[i] = spec != null && Double.isFinite(spec.upper()) ? spec.upper() : SCAN_LIMIT;
        }

        List<Map<String, Double>> found = new ArrayList<>();

        // Start 0: the user's guess values (preserves single-solve behavior).
        attemptStart(block, branch, null, found, deadlineNanos);

        Random random = new Random(RANDOM_SEED);
        for (int s = 1; s < starts; s++) {
            double[] start = generateRandomStart(s, n, lo, hi, random);
            attemptStart(block, branch, start, found, deadlineNanos);
            if (System.nanoTime() > deadlineNanos) {
                break;
            }
        }

        return found;
    }

    private double[] generateRandomStart(int s, int n, double[] lo, double[] hi, Random random) {
        double[] start = new double[n];
        for (int i = 0; i < n; i++) {
            if (s % 2 == 0) {
                // Near-origin scale: engineering solutions cluster near the
                // guess magnitude far more often than near the box edges.
                double nearLo = Math.max(lo[i], -10.0);
                double nearHi = Math.min(hi[i], 10.0);
                start[i] = nearLo + random.nextDouble() * (nearHi - nearLo);
            } else {
                start[i] = lo[i] + random.nextDouble() * (hi[i] - lo[i]);
            }
        }
        return start;
    }

    private void attemptStart(Block block, Map<String, Double> branch, double[] start,
                              List<Map<String, Double>> found, long deadlineNanos) {
        List<String> vars = block.variables();
        Map<String, Double> work = new HashMap<>(branch);
        if (start != null) {
            for (int i = 0; i < vars.size(); i++) {
                work.put(vars.get(i), start[i]);
            }
        }
        try {
            totalIterations += newton.solveBlock(block, work, deadlineNanos, specs);
        } catch (SolverException e) {
            return;
        }
        try {
            totalIterations += polisher.solveBlock(block, work, deadlineNanos, specs);
        } catch (SolverException ignored) {
            // Polishing is best-effort; the loose solution is still valid.
        }
        for (Map<String, Double> existing : found) {
            if (sameOn(existing, work, vars)) {
                return;
            }
        }
        found.add(work);
    }

    private static boolean sameOn(Map<String, Double> a, Map<String, Double> b,
                                  List<String> vars) {
        for (String varName : vars) {
            double x = a.get(varName);
            double y = b.get(varName);
            if (Math.abs(x - y) > 1e-6 * Math.max(1.0, Math.abs(x))) {
                return false;
            }
        }
        return true;
    }

    // ------------------------------------------------------------------

    private static List<Map<String, Double>> dedupAndSort(List<Map<String, Double>> solutions,
                                                          List<Block> blocks) {
        List<String> allVars = new ArrayList<>(new TreeSet<>(
                blocks.stream().flatMap(b -> b.variables().stream()).toList()));

        List<Map<String, Double>> unique = new ArrayList<>();
        for (Map<String, Double> candidate : solutions) {
            boolean duplicate = unique.stream().anyMatch(u -> sameOn(u, candidate, allVars));
            if (!duplicate) {
                unique.add(candidate);
            }
        }

        unique.sort((a, b) -> {
            for (String varName : allVars) {
                int cmp = Double.compare(a.get(varName), b.get(varName));
                if (cmp != 0) {
                    return cmp;
                }
            }
            return 0;
        });
        return unique;
    }
}
