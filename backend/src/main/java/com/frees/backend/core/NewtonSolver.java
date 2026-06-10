package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Evaluator;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.DecompositionSolver;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.RealVector;
import org.apache.commons.math3.linear.SingularMatrixException;

import java.util.List;
import java.util.Map;

/**
 * Newton's method with a numerical Jacobian and step-halving, applied to one
 * block of simultaneous equations. Values of variables solved by earlier
 * blocks are passed in and held fixed.
 *
 * Stopping follows the EES Stop Criteria: iterations stop successfully when
 * every relative residual (|lhs-rhs| / |lhs|) is below the tolerance or when
 * the largest change in a variable falls below the threshold; they abort on
 * the iteration limit or the elapsed-time budget.
 */
public class NewtonSolver {

    private static final int MAX_HALVINGS = 25;
    private static final double JACOBIAN_EPS = Math.sqrt(Math.ulp(1.0));

    private final SolverSettings settings;

    public NewtonSolver(SolverSettings settings) {
        this.settings = settings;
    }

    /** Solves one block in place; returns the number of Newton iterations used. */
    public int solveBlock(Block block, Map<String, Double> values, long deadlineNanos,
                          Map<String, VariableSpec> specs) {
        List<Equation> equations = block.equations();
        List<String> vars = block.variables();
        int n = vars.size();

        double[] x = new double[n];
        double[] lo = new double[n];
        double[] hi = new double[n];
        for (int i = 0; i < n; i++) {
            x[i] = values.get(vars.get(i));
            VariableSpec spec = specs.get(vars.get(i));
            lo[i] = spec != null ? spec.lower() : Double.NEGATIVE_INFINITY;
            hi[i] = spec != null ? spec.upper() : Double.POSITIVE_INFINITY;
        }

        double[] residual = residuals(equations, vars, x, values);
        double norm = norm(residual);

        for (int iteration = 0; iteration < settings.maxIterations(); iteration++) {
            if (withinResidualTolerance(equations, vars, x, residual, values)) {
                writeBack(vars, x, values);
                return iteration;
            }
            if (System.nanoTime() > deadlineNanos) {
                throw new SolverException(String.format(
                        "Stop criteria: elapsed time exceeded %.0f s in block %d.",
                        settings.elapsedTimeSeconds(), block.index()));
            }

            double[][] jacobian = numericalJacobian(equations, vars, x, residual, values);
            double[] step = solveLinear(jacobian, residual, block);

            double lambda = 1.0;
            double[] candidate = new double[n];
            double[] candidateResidual = null;
            double candidateNorm = Double.POSITIVE_INFINITY;
            for (int halving = 0; halving < MAX_HALVINGS; halving++) {
                for (int i = 0; i < n; i++) {
                    candidate[i] = Math.clamp(x[i] - lambda * step[i], lo[i], hi[i]);
                }
                candidateResidual = residuals(equations, vars, candidate, values);
                candidateNorm = norm(candidateResidual);
                if (Double.isFinite(candidateNorm) && candidateNorm < norm) {
                    break;
                }
                lambda /= 2.0;
            }

            if (!Double.isFinite(candidateNorm) || candidateNorm >= norm) {
                throw new SolverException(
                        "Newton iteration stalled in block " + block.index()
                                + " (residual " + norm + "). Try different guess values.");
            }

            double maxChange = 0.0;
            for (int i = 0; i < n; i++) {
                maxChange = Math.max(maxChange, Math.abs(x[i] - candidate[i]));
                x[i] = candidate[i];
            }
            residual = candidateResidual;
            norm = candidateNorm;

            // EES stop criterion: change in variables below threshold.
            if (maxChange < settings.changeInVariables()) {
                if (withinResidualTolerance(equations, vars, x, residual, values)) {
                    writeBack(vars, x, values);
                    return iteration + 1;
                }
                if (atBound(x, lo, hi)) {
                    throw new SolverException(
                            "Constrained solution in block " + block.index()
                                    + ": a variable is pinned at its lower or upper bound "
                                    + "and the residuals cannot be reduced further. "
                                    + "Relax the bounds in the Variable Information window.");
                }
                throw new SolverException(
                        "Iteration stalled in block " + block.index()
                                + " before reaching the residual tolerance. "
                                + "Try different guess values.");
            }
        }

        if (withinResidualTolerance(equations, vars, x, residual, values)) {
            writeBack(vars, x, values);
            return settings.maxIterations();
        }
        throw new SolverException(String.format(
                "Block %d did not converge within %d iterations (residual norm %g). "
                        + "Increase the iteration limit in Preferences or adjust guess values.",
                block.index(), settings.maxIterations(), norm));
    }

    /** EES relative residual: |lhs - rhs| / |lhs|, guarding against |lhs| ~ 0. */
    private boolean withinResidualTolerance(List<Equation> equations, List<String> vars,
                                            double[] x, double[] residual,
                                            Map<String, Double> values) {
        writeBack(vars, x, values);
        for (int i = 0; i < equations.size(); i++) {
            double lhsMagnitude = Math.abs(Evaluator.eval(equations.get(i).lhs(), values));
            double scale = Math.max(lhsMagnitude, 1.0e-12);
            if (Math.abs(residual[i]) / scale > settings.relativeResiduals()) {
                return false;
            }
        }
        return true;
    }

    private double[] residuals(List<Equation> equations, List<String> vars,
                               double[] x, Map<String, Double> values) {
        writeBack(vars, x, values);
        double[] result = new double[equations.size()];
        for (int i = 0; i < equations.size(); i++) {
            Equation eq = equations.get(i);
            result[i] = Evaluator.eval(eq.lhs(), values) - Evaluator.eval(eq.rhs(), values);
        }
        return result;
    }

    private double[][] numericalJacobian(List<Equation> equations, List<String> vars,
                                         double[] x, double[] baseResidual,
                                         Map<String, Double> values) {
        int n = vars.size();
        double[][] jacobian = new double[n][n];
        double[] perturbed = x.clone();
        for (int j = 0; j < n; j++) {
            // When residuals are much larger in magnitude than x_j (common in
            // engineering problems with values like 1e8 kJ), a perturbation
            // scaled only to x_j underflows against the residual in double
            // precision and the whole column computes as zero. Grow h until
            // the column registers.
            double h = JACOBIAN_EPS * Math.max(Math.abs(x[j]), 1.0);
            for (int attempt = 0; attempt < 5; attempt++) {
                perturbed[j] = x[j] + h;
                double[] residual = residuals(equations, vars, perturbed, values);
                boolean columnClean = true;
                boolean anyChange = false;
                for (int i = 0; i < n; i++) {
                    double change = Math.abs(residual[i] - baseResidual[i]);
                    jacobian[i][j] = (residual[i] - baseResidual[i]) / h;
                    if (change > 0.0) {
                        anyChange = true;
                        double ulpScale = Math.ulp(Math.max(Math.abs(residual[i]), Math.abs(baseResidual[i])));
                        if (change < 1.0e5 * ulpScale) {
                            columnClean = false;
                        }
                    }
                }
                perturbed[j] = x[j];
                if (anyChange && columnClean) {
                    break;
                }
                h *= 1.0e4;
            }
        }
        // Restore the unperturbed values.
        writeBack(vars, x, values);
        return jacobian;
    }

    private double[] solveLinear(double[][] jacobian, double[] residual, Block block) {
        try {
            DecompositionSolver solver =
                    new LUDecomposition(new Array2DRowRealMatrix(jacobian, false)).getSolver();
            RealVector step = solver.solve(new ArrayRealVector(residual, false));
            return step.toArray();
        } catch (SingularMatrixException e) {
            throw new SolverException(
                    "Singular Jacobian in block " + block.index()
                            + ": the equations may be redundant or the guess values degenerate.");
        }
    }

    private static boolean atBound(double[] x, double[] lo, double[] hi) {
        for (int i = 0; i < x.length; i++) {
            if (x[i] == lo[i] || x[i] == hi[i]) {
                return true;
            }
        }
        return false;
    }

    private static void writeBack(List<String> vars, double[] x, Map<String, Double> values) {
        for (int i = 0; i < vars.size(); i++) {
            values.put(vars.get(i), x[i]);
        }
    }

    private static double norm(double[] v) {
        double sum = 0.0;
        for (double value : v) {
            sum += value * value;
        }
        return Math.sqrt(sum);
    }
}
