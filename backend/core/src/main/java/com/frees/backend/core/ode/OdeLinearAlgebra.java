package com.frees.backend.core.ode;

import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.ArrayRealVector;
import org.apache.commons.math3.linear.DecompositionSolver;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.QRDecomposition;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.RealVector;
import org.apache.commons.math3.linear.SingularMatrixException;

/**
 * Finite-difference Jacobians and dense linear solves shared by the stiff ODE
 * methods ({@link RosenbrockMethod}, {@link BdfMethod}). The RHS of a frees
 * {@code DYNAMIC} block is a closure over the algebraic solve, so a symbolic
 * Jacobian of the whole closure is impractical — a forward-difference Jacobian
 * is the robust choice (the symbolic {@code Differentiator} still grounds the
 * per-step Newton inside the algebraic block).
 */
final class OdeLinearAlgebra {

    private OdeLinearAlgebra() {}

    /** Forward-difference Jacobian {@code J[i][j] = ∂f_i/∂y_j} at {@code (t, y)}. */
    static double[][] jacobian(OdeRhs f, double t, double[] y, double[] f0) {
        int n = y.length;
        double[][] j = new double[n][n];
        for (int col = 0; col < n; col++) {
            double yj = y[col];
            double delta = Math.sqrt(Math.ulp(1.0)) * Math.max(Math.abs(yj), 1.0);
            double[] yp = y.clone();
            yp[col] = yj + delta;
            double[] fp = f.eval(t, yp);
            double inv = 1.0 / (yp[col] - yj);
            for (int row = 0; row < n; row++) {
                j[row][col] = (fp[row] - f0[row]) * inv;
            }
        }
        return j;
    }

    /** Forward-difference partial {@code ∂f/∂t} at {@code (t, y)}. */
    static double[] dfdt(OdeRhs f, double t, double[] y, double[] f0, double span) {
        double dt = Math.sqrt(Math.ulp(1.0)) * Math.max(Math.abs(t), span);
        if (dt == 0.0) {
            return new double[y.length];
        }
        double[] fp = f.eval(t + dt, y);
        double[] out = new double[y.length];
        for (int i = 0; i < out.length; i++) {
            out[i] = (fp[i] - f0[i]) / dt;
        }
        return out;
    }

    /** Solves {@code A x = b} (LU, falling back to least-squares QR if singular). */
    static double[] solve(double[][] a, double[] b) {
        RealMatrix m = new Array2DRowRealMatrix(a, false);
        RealVector rhs = new ArrayRealVector(b, false);
        try {
            DecompositionSolver solver = new LUDecomposition(m).getSolver();
            return solver.solve(rhs).toArray();
        } catch (SingularMatrixException ex) {
            DecompositionSolver qr = new QRDecomposition(m).getSolver();
            return qr.solve(rhs).toArray();
        }
    }

    /** {@code I − scale·J}, the iteration matrix shared by the stiff methods. */
    static double[][] identityMinus(double scale, double[][] jac) {
        int n = jac.length;
        double[][] w = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int k = 0; k < n; k++) {
                w[i][k] = (i == k ? 1.0 : 0.0) - scale * jac[i][k];
            }
        }
        return w;
    }
}
