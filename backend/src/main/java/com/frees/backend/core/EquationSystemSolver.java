package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import com.frees.backend.parser.EquationParser;
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
    private final NewtonSolver newtonSolver = new NewtonSolver();

    public record EquationResidual(String equation, double residual) {}

    public record Stats(int equationCount,
                        int unknownCount,
                        int blockCount,
                        long elapsedMillis,
                        double maxResidual) {}

    public record Result(Map<String, Double> variables,
                         List<Block> blocks,
                         List<EquationResidual> residuals,
                         Stats stats) {}

    public record CheckResult(boolean solvable,
                              int equationCount,
                              int unknownCount,
                              String message) {}

    /**
     * EES Check/Format: verifies syntax and reports equation/variable counts,
     * then verifies the system is structurally solvable (zero degrees of
     * freedom and an independent equation-to-variable assignment). Does not
     * solve anything.
     */
    public CheckResult check(String source) {
        List<Equation> equations = parser.parse(source);

        TreeSet<String> allVars = new TreeSet<>();
        for (Equation eq : equations) {
            allVars.addAll(eq.variables());
        }

        try {
            blocker.verifyStructure(equations);
        } catch (SolverException e) {
            return new CheckResult(false, equations.size(), allVars.size(), e.getMessage());
        }

        return new CheckResult(true, equations.size(), allVars.size(), String.format(
                "No syntax errors were detected. There are %d equations and %d variables.",
                equations.size(), allVars.size()));
    }

    public Result solve(String source) {
        long startNanos = System.nanoTime();
        List<Equation> equations = parser.parse(source);

        TreeSet<String> allVars = new TreeSet<>();
        for (Equation eq : equations) {
            allVars.addAll(eq.variables());
        }
        Map<String, Double> values = new HashMap<>();
        for (String var : allVars) {
            values.put(var, DEFAULT_GUESS);
        }

        List<Block> blocks = blocker.block(equations);
        for (Block block : blocks) {
            newtonSolver.solveBlock(block, values);
        }

        List<EquationResidual> residuals = new ArrayList<>();
        double maxResidual = 0.0;
        for (Equation eq : equations) {
            double residual = Evaluator.eval(eq.lhs(), values) - Evaluator.eval(eq.rhs(), values);
            residuals.add(new EquationResidual(eq.sourceText(), residual));
            maxResidual = Math.max(maxResidual, Math.abs(residual));
        }

        Stats stats = new Stats(
                equations.size(),
                allVars.size(),
                blocks.size(),
                (System.nanoTime() - startNanos) / 1_000_000,
                maxResidual);

        return new Result(new TreeMap<>(values), blocks, residuals, stats);
    }
}
