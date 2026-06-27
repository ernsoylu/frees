package com.frees.backend.core.dae;

/**
 * Finite-difference assembly of IDA's combined DAE system matrix
 * {@code J = ∂F/∂y + cj · ∂F/∂y'} — Phase&nbsp;S1, the Jacobian half of the
 * solver core. IDA's sparse (KLU) linear solver requires a user Jacobian (it has
 * no internal difference-quotient path for sparse matrices), so this fills that
 * role; the dense solver can use it too.
 *
 * <p><b>The key identity.</b> Perturbing state {@code y[c]} by {@code ε} <em>and</em>
 * {@code y'[c]} by {@code cj·ε} together makes the residual change by
 * {@code (∂F/∂y_c + cj·∂F/∂y'_c)·ε}, so a single forward difference yields the
 * whole combined column {@code c} — no separate {@code ∂F/∂y} and {@code ∂F/∂y'}
 * sweeps. This is the column the sparse pattern (one per {@code y} variable, with
 * {@code der$X} folded onto state {@code X}'s column) lays out.
 *
 * <p>Pure Java and independently unit-tested; {@link IdaDaeSolver} calls
 * {@link #column} from its native KLU Jacobian callback.
 */
public final class DaeJacobian {

    private DaeJacobian() {}

    private static double perturbation(double v) {
        return 1e-7 * Math.max(Math.abs(v), 1.0);
    }

    /**
     * Computes combined column {@code c} of {@code J} into {@code out} (length n)
     * by one forward difference, reusing the already-evaluated base residual
     * {@code f0}. Returns the {@code ε} used.
     */
    public static double column(DaeResidual res, double t, double cj,
                                double[] y, double[] yp, int c, double[] f0, double[] out) {
        int n = y.length;
        double eps = perturbation(y[c]);
        double[] yPert = y.clone();
        double[] ypPert = yp.clone();
        yPert[c] += eps;
        ypPert[c] += cj * eps;
        double[] fp = new double[n];
        res.eval(t, yPert, ypPert, fp);
        for (int i = 0; i < n; i++) {
            out[i] = (fp[i] - f0[i]) / eps;
        }
        return eps;
    }

    /** Full dense combined Jacobian {@code J[i][j]} (for the dense solver and tests). */
    public static double[][] dense(DaeResidual res, double t, double cj, double[] y, double[] yp) {
        int n = y.length;
        double[] f0 = new double[n];
        res.eval(t, y, yp, f0);
        double[][] j = new double[n][n];
        double[] col = new double[n];
        for (int c = 0; c < n; c++) {
            column(res, t, cj, y, yp, c, f0, col);
            for (int i = 0; i < n; i++) {
                j[i][c] = col[i];
            }
        }
        return j;
    }
}
