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
 */
public class NewtonSolver {

    private static final int MAX_ITERATIONS = 200;
    private static final int MAX_HALVINGS = 25;
    private static final double RESIDUAL_TOLERANCE = 1e-10;
    private static final double STEP_TOLERANCE = 1e-13;
    private static final double JACOBIAN_EPS = Math.sqrt(Math.ulp(1.0));

    public void solveBlock(Block block, Map<String, Double> values) {
        List<Equation> equations = block.equations();
        List<String> vars = block.variables();
        int n = vars.size();

        double[] x = new double[n];
        for (int i = 0; i < n; i++) {
            x[i] = values.get(vars.get(i));
        }

        double[] residual = residuals(equations, vars, x, values);
        double norm = norm(residual);

        for (int iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            if (norm < RESIDUAL_TOLERANCE) {
                writeBack(vars, x, values);
                return;
            }

            double[][] jacobian = numericalJacobian(equations, vars, x, residual, values);
            double[] step = solveLinear(jacobian, residual, block);

            // Step-halving: back off until the residual norm actually improves,
            // preventing divergence from a full Newton step.
            double lambda = 1.0;
            double[] candidate = new double[n];
            double[] candidateResidual = null;
            double candidateNorm = Double.POSITIVE_INFINITY;
            for (int halving = 0; halving < MAX_HALVINGS; halving++) {
                for (int i = 0; i < n; i++) {
                    candidate[i] = x[i] - lambda * step[i];
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

            double maxStep = 0.0;
            for (int i = 0; i < n; i++) {
                maxStep = Math.max(maxStep, Math.abs(x[i] - candidate[i])
                        / Math.max(Math.abs(candidate[i]), 1.0));
                x[i] = candidate[i];
            }
            residual = candidateResidual;
            norm = candidateNorm;

            if (maxStep < STEP_TOLERANCE) {
                break;
            }
        }

        if (norm < Math.sqrt(RESIDUAL_TOLERANCE)) {
            // Converged loosely; accept but the residual report will show it.
            writeBack(vars, x, values);
            return;
        }
        throw new SolverException(
                "Block " + block.index() + " did not converge after " + MAX_ITERATIONS
                        + " iterations (residual norm " + norm + ").");
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
            double h = JACOBIAN_EPS * Math.max(Math.abs(x[j]), 1.0);
            perturbed[j] = x[j] + h;
            double[] residual = residuals(equations, vars, perturbed, values);
            for (int i = 0; i < n; i++) {
                jacobian[i][j] = (residual[i] - baseResidual[i]) / h;
            }
            perturbed[j] = x[j];
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
