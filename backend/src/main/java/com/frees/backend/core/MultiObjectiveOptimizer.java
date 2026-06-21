package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Multi-objective optimisation by NSGA-II (Deb et al., 2002): a genetic
 * algorithm that returns the Pareto-optimal front rather than a single optimum.
 * Each candidate is a vector of decision-variable values; it is scored by
 * solving the equation system with those decisions fixed and reading the named
 * objective variables. Objectives flagged {@code maximize} are internally
 * negated so the algorithm always minimises.
 *
 * <p>The flow per generation is the standard NSGA-II loop: binary tournament
 * selection on (rank, crowding distance), simulated-binary crossover (SBX),
 * polynomial mutation, then elitist (μ+λ) replacement using fast non-dominated
 * sorting and crowding distance. The returned front is the first non-dominated
 * rank of the final population.
 */
public final class MultiObjectiveOptimizer {

    private static final double PENALTY = 1e12;
    private static final double SBX_ETA = 15.0;
    private static final double MUT_ETA = 20.0;

    private final EquationSystemSolver solver;

    public MultiObjectiveOptimizer(EquationSystemSolver solver) {
        this.solver = solver;
    }

    public record Problem(String text,
                          SolverSettings settings,
                          Map<String, VariableSpec> specs,
                          List<String> objectives,
                          List<Boolean> maximize,
                          List<String> decisions,
                          List<Double> lowers,
                          List<Double> uppers,
                          int populationSize,
                          int generations,
                          long seed,
                          List<String> constraints) {
    }

    /** A parsed inequality/equality constraint {@code lhsExpr <op> rhs}. */
    private record Constraint(String lhsExpr, String operator, double rhs) {
    }

    /** One Pareto point: the decision vector and the raw (user-facing) objectives. */
    public record ParetoPoint(double[] decisions, double[] objectives) {
    }

    public record Result(List<ParetoPoint> front, int evaluations) {
    }

    private static final class Individual {
        final double[] x;        // decisions
        double[] objRaw;         // objectives as the user reads them
        double[] objMin;         // objectives in minimisation form
        double violation;        // total constraint violation (0 = feasible)
        int rank;
        double crowding;

        Individual(double[] x) {
            this.x = x;
        }
    }

    public Result optimize(Problem p) {
        int n = p.decisions().size();
        int popSize = Math.max(8, p.populationSize());
        Random rng = new Random(p.seed());
        int[] evaluations = {0};
        List<Constraint> constraints = parseConstraints(p.constraints());

        List<Individual> population = new ArrayList<>();
        for (int i = 0; i < popSize; i++) {
            population.add(evaluate(randomIndividual(p, n, rng), p, constraints, evaluations));
        }

        for (int gen = 0; gen < p.generations(); gen++) {
            assignRanksAndCrowding(population);
            List<Individual> offspring = new ArrayList<>();
            while (offspring.size() < popSize) {
                Individual parentA = tournament(population, rng);
                Individual parentB = tournament(population, rng);
                double[][] children = sbxCrossover(parentA.x, parentB.x, p, rng);
                offspring.add(evaluate(new Individual(mutate(children[0], p, rng)), p, constraints, evaluations));
                if (offspring.size() < popSize) {
                    offspring.add(evaluate(new Individual(mutate(children[1], p, rng)), p, constraints, evaluations));
                }
            }
            List<Individual> combined = new ArrayList<>(population);
            combined.addAll(offspring);
            population = selectNextGeneration(combined, popSize);
        }

        assignRanksAndCrowding(population);
        List<ParetoPoint> front = new ArrayList<>();
        for (Individual ind : population) {
            if (ind.rank == 0) {
                front.add(new ParetoPoint(ind.x.clone(), ind.objRaw.clone()));
            }
        }
        front.sort(Comparator.comparingDouble(pt -> pt.objectives()[0]));
        return new Result(dedupe(front), evaluations[0]);
    }

    // ── Evaluation ────────────────────────────────────────────────────────

    /** Solved-variable name prefix for serialised constraint left-hand sides. */
    private static final String CON_VAR_PREFIX = "zz_mo_con_";

    private Individual evaluate(Individual ind, Problem p, List<Constraint> constraints, int[] evaluations) {
        evaluations[0]++;
        int m = p.objectives().size();
        ind.objRaw = new double[m];
        ind.objMin = new double[m];
        Map<String, Double> solved = solveWithDecisions(p, ind.x, constraints);
        for (int j = 0; j < m; j++) {
            Double v = solved.get(p.objectives().get(j));
            double raw = v != null && isFinite(v) ? v : Double.NaN;
            ind.objRaw[j] = raw;
            ind.objMin[j] = minimisationValue(raw, Boolean.TRUE.equals(p.maximize().get(j)));
        }
        ind.violation = totalViolation(constraints, solved);
        return ind;
    }

    private static double minimisationValue(double raw, boolean maximize) {
        if (Double.isNaN(raw)) {
            return PENALTY;
        }
        return maximize ? -raw : raw;
    }

    private Map<String, Double> solveWithDecisions(Problem p, double[] x, List<Constraint> constraints) {
        StringBuilder sb = new StringBuilder(p.text());
        for (int i = 0; i < p.decisions().size(); i++) {
            sb.append('\n').append(p.decisions().get(i)).append(" = ")
                    .append(BigDecimal.valueOf(x[i]).toPlainString());
        }
        for (int i = 0; i < constraints.size(); i++) {
            sb.append('\n').append(CON_VAR_PREFIX).append(i).append(" = ").append(constraints.get(i).lhsExpr());
        }
        try {
            return solver.solve(sb.toString(), p.settings(), p.specs()).variables();
        } catch (EquationParser.ParseException | SolverException e) {
            return Map.of();
        }
    }

    /** Sum of normalised constraint violations; 0 means feasible. */
    private static double totalViolation(List<Constraint> constraints, Map<String, Double> solved) {
        double total = 0.0;
        for (int i = 0; i < constraints.size(); i++) {
            Constraint c = constraints.get(i);
            Double lhs = solved.get(CON_VAR_PREFIX + i);
            if (lhs == null || !isFinite(lhs)) {
                total += PENALTY;
                continue;
            }
            double g;
            if (c.operator().equals("<=")) {
                g = Math.max(0.0, lhs - c.rhs());
            } else if (c.operator().equals(">=")) {
                g = Math.max(0.0, c.rhs() - lhs);
            } else {
                g = Math.abs(lhs - c.rhs());
            }
            total += g / (1.0 + Math.abs(c.rhs()));
        }
        return total;
    }

    private static List<Constraint> parseConstraints(List<String> raw) {
        List<Constraint> out = new ArrayList<>();
        if (raw == null) {
            return out;
        }
        for (String line : raw) {
            String s = line.trim();
            if (!s.isEmpty()) {
                out.add(parseConstraint(line, s));
            }
        }
        return out;
    }

    private static Constraint parseConstraint(String original, String s) {
        String op = "<=";
        if (!s.contains("<=")) {
            if (s.contains(">=")) {
                op = ">=";
            } else if (s.contains("=")) {
                op = "=";
            } else {
                throw new IllegalArgumentException("Constraint '" + original + "' needs <=, >= or =.");
            }
        }
        int idx = s.indexOf(op);
        String lhs = s.substring(0, idx).trim();
        String rhsText = s.substring(idx + op.length()).trim();
        try {
            return new Constraint(lhs, op, Double.parseDouble(rhsText));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Constraint '" + original + "' must end with a number.");
        }
    }

    // ── NSGA-II core ──────────────────────────────────────────────────────

    /** Deb's constraint-domination: feasible beats infeasible; among infeasible,
     *  lower violation wins; among feasible, standard Pareto dominance applies. */
    private static boolean dominates(Individual a, Individual b) {
        boolean aFeasible = a.violation <= 1e-9;
        boolean bFeasible = b.violation <= 1e-9;
        if (aFeasible != bFeasible) {
            return aFeasible;
        }
        if (!aFeasible) {
            return a.violation < b.violation;
        }
        boolean strictlyBetter = false;
        for (int i = 0; i < a.objMin.length; i++) {
            if (a.objMin[i] > b.objMin[i]) {
                return false;
            }
            if (a.objMin[i] < b.objMin[i]) {
                strictlyBetter = true;
            }
        }
        return strictlyBetter;
    }

    /** Fast non-dominated sort; returns the fronts as lists of individuals (rank set on each). */
    private static List<List<Individual>> nonDominatedSort(List<Individual> pop) {
        int n = pop.size();
        List<List<Integer>> dominated = new ArrayList<>();
        int[] dominationCount = new int[n];
        for (int i = 0; i < n; i++) {
            dominated.add(new ArrayList<>());
        }
        computeDomination(pop, dominated, dominationCount);
        return buildFronts(pop, dominated, dominationCount);
    }

    /** Fills, for each individual, the indices it dominates and how many dominate it. */
    private static void computeDomination(List<Individual> pop, List<List<Integer>> dominated, int[] dominationCount) {
        int n = pop.size();
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (dominates(pop.get(i), pop.get(j))) {
                    dominated.get(i).add(j);
                    dominationCount[j]++;
                } else if (dominates(pop.get(j), pop.get(i))) {
                    dominated.get(j).add(i);
                    dominationCount[i]++;
                }
            }
        }
    }

    private static List<List<Individual>> buildFronts(List<Individual> pop,
                                                      List<List<Integer>> dominated, int[] dominationCount) {
        List<List<Individual>> fronts = new ArrayList<>();
        List<Integer> current = new ArrayList<>();
        for (int i = 0; i < pop.size(); i++) {
            if (dominationCount[i] == 0) {
                pop.get(i).rank = 0;
                current.add(i);
            }
        }
        int rank = 0;
        while (!current.isEmpty()) {
            List<Individual> frontInds = new ArrayList<>();
            List<Integer> next = new ArrayList<>();
            for (int idx : current) {
                frontInds.add(pop.get(idx));
                for (int dj : dominated.get(idx)) {
                    if (--dominationCount[dj] == 0) {
                        pop.get(dj).rank = rank + 1;
                        next.add(dj);
                    }
                }
            }
            fronts.add(frontInds);
            current = next;
            rank++;
        }
        return fronts;
    }

    private static void assignRanksAndCrowding(List<Individual> pop) {
        List<List<Individual>> fronts = nonDominatedSort(pop);
        for (List<Individual> front : fronts) {
            assignCrowding(front);
        }
    }

    private static void assignCrowding(List<Individual> front) {
        for (Individual ind : front) {
            ind.crowding = 0.0;
        }
        if (front.isEmpty()) {
            return;
        }
        int m = front.get(0).objMin.length;
        for (int obj = 0; obj < m; obj++) {
            final int o = obj;
            front.sort(Comparator.comparingDouble(ind -> ind.objMin[o]));
            front.get(0).crowding = Double.POSITIVE_INFINITY;
            front.get(front.size() - 1).crowding = Double.POSITIVE_INFINITY;
            double range = front.get(front.size() - 1).objMin[o] - front.get(0).objMin[o];
            if (range <= 0) {
                continue;
            }
            for (int i = 1; i < front.size() - 1; i++) {
                front.get(i).crowding += (front.get(i + 1).objMin[o] - front.get(i - 1).objMin[o]) / range;
            }
        }
    }

    private static List<Individual> selectNextGeneration(List<Individual> combined, int popSize) {
        List<List<Individual>> fronts = nonDominatedSort(combined);
        List<Individual> next = new ArrayList<>();
        for (List<Individual> front : fronts) {
            assignCrowding(front);
            if (next.size() + front.size() <= popSize) {
                next.addAll(front);
            } else {
                front.sort(Comparator.comparingDouble((Individual ind) -> ind.crowding).reversed());
                for (Individual ind : front) {
                    if (next.size() >= popSize) {
                        break;
                    }
                    next.add(ind);
                }
                break;
            }
        }
        return next;
    }

    private static Individual tournament(List<Individual> pop, Random rng) {
        Individual a = pop.get(rng.nextInt(pop.size()));
        Individual b = pop.get(rng.nextInt(pop.size()));
        if (a.rank != b.rank) {
            return a.rank < b.rank ? a : b;
        }
        return a.crowding >= b.crowding ? a : b;
    }

    // ── Variation operators ───────────────────────────────────────────────

    private static double[] randomDecisions(Problem p, int n, Random rng) {
        double[] x = new double[n];
        for (int i = 0; i < n; i++) {
            double lo = p.lowers().get(i);
            double hi = p.uppers().get(i);
            x[i] = lo + rng.nextDouble() * (hi - lo);
        }
        return x;
    }

    private Individual randomIndividual(Problem p, int n, Random rng) {
        return new Individual(randomDecisions(p, n, rng));
    }

    private static double[][] sbxCrossover(double[] a, double[] b, Problem p, Random rng) {
        int n = a.length;
        double[] c1 = a.clone();
        double[] c2 = b.clone();
        if (rng.nextDouble() > 0.9) {
            return new double[][]{c1, c2};
        }
        for (int i = 0; i < n; i++) {
            if (rng.nextDouble() > 0.5 || Math.abs(a[i] - b[i]) < 1e-14) {
                continue;
            }
            double lo = p.lowers().get(i);
            double hi = p.uppers().get(i);
            double u = rng.nextDouble();
            double beta = u <= 0.5
                    ? Math.pow(2 * u, 1.0 / (SBX_ETA + 1))
                    : Math.pow(1.0 / (2 * (1 - u)), 1.0 / (SBX_ETA + 1));
            double x1 = 0.5 * ((1 + beta) * a[i] + (1 - beta) * b[i]);
            double x2 = 0.5 * ((1 - beta) * a[i] + (1 + beta) * b[i]);
            c1[i] = clamp(x1, lo, hi);
            c2[i] = clamp(x2, lo, hi);
        }
        return new double[][]{c1, c2};
    }

    private static double[] mutate(double[] x, Problem p, Random rng) {
        int n = x.length;
        double[] out = x.clone();
        double rate = 1.0 / n;
        for (int i = 0; i < n; i++) {
            double lo = p.lowers().get(i);
            double hi = p.uppers().get(i);
            double range = hi - lo;
            if (rng.nextDouble() <= rate && range > 0) {
                double u = rng.nextDouble();
                double delta = u < 0.5
                        ? Math.pow(2 * u, 1.0 / (MUT_ETA + 1)) - 1.0
                        : 1.0 - Math.pow(2 * (1 - u), 1.0 / (MUT_ETA + 1));
                out[i] = clamp(x[i] + delta * range, lo, hi);
            }
        }
        return out;
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static List<ParetoPoint> dedupe(List<ParetoPoint> front) {
        List<ParetoPoint> out = new ArrayList<>();
        for (ParetoPoint pt : front) {
            if (!containsClose(out, pt)) {
                out.add(pt);
            }
        }
        return out;
    }

    private static boolean containsClose(List<ParetoPoint> kept, ParetoPoint pt) {
        for (ParetoPoint k : kept) {
            if (close(k.objectives(), pt.objectives())) {
                return true;
            }
        }
        return false;
    }

    private static boolean close(double[] a, double[] b) {
        for (int i = 0; i < a.length; i++) {
            if (Math.abs(a[i] - b[i]) > 1e-9 * (1.0 + Math.abs(b[i]))) {
                return false;
            }
        }
        return true;
    }

    private static double clamp(double v, double lo, double hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static boolean isFinite(double v) {
        return !Double.isNaN(v) && !Double.isInfinite(v);
    }
}
