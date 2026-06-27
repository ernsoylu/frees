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

    /**
     * Distance-1 greedy coloring of the columns (Phase S2): two columns get
     * different colors iff they share a row (their structural supports overlap).
     * Columns of the <em>same</em> color are structurally orthogonal, so they can
     * be perturbed together and recovered from a single residual evaluation —
     * cutting the FD Jacobian from {@code n} residual evals to {@code #colors}
     * (≈ the bandwidth for a banded C-R-C system). Returns a 0-based color per
     * column; {@code sparsityRows[i]} lists the columns present in row {@code i}.
     */
    public static int[] colorColumns(int[][] sparsityRows, int n) {
        java.util.List<java.util.Set<Integer>> adj = new java.util.ArrayList<>(n);
        for (int c = 0; c < n; c++) {
            adj.add(new java.util.HashSet<>());
        }
        for (int[] row : sparsityRows) {
            for (int a = 0; a < row.length; a++) {
                for (int b = a + 1; b < row.length; b++) {
                    adj.get(row[a]).add(row[b]);
                    adj.get(row[b]).add(row[a]);
                }
            }
        }
        int[] color = new int[n];
        java.util.Arrays.fill(color, -1);
        for (int c = 0; c < n; c++) {
            boolean[] used = new boolean[n];
            for (int nb : adj.get(c)) {
                if (color[nb] >= 0) {
                    used[color[nb]] = true;
                }
            }
            int k = 0;
            while (used[k]) {
                k++;
            }
            color[c] = k;
        }
        return color;
    }

    /**
     * Colored finite-difference combined Jacobian, returned dense for testing —
     * identical (to FD precision) to {@link #dense} but using {@code #colors}
     * residual evaluations instead of {@code n}. {@code colRows[c]} are the rows
     * present in column {@code c}; {@code color} is from {@link #colorColumns}.
     */
    public static double[][] denseColored(DaeResidual res, double t, double cj, double[] y, double[] yp,
                                          int[][] colRows, int[] color) {
        int n = y.length;
        double[] f0 = new double[n];
        res.eval(t, y, yp, f0);
        double[][] j = new double[n][n];
        int ncolors = 0;
        for (int cc : color) {
            ncolors = Math.max(ncolors, cc + 1);
        }
        double[] eps = new double[n];
        for (int c = 0; c < n; c++) {
            eps[c] = perturbation(y[c]);
        }
        double[] fp = new double[n];
        for (int g = 0; g < ncolors; g++) {
            double[] yPert = y.clone();
            double[] ypPert = yp.clone();
            for (int c = 0; c < n; c++) {
                if (color[c] == g) {
                    yPert[c] += eps[c];
                    ypPert[c] += cj * eps[c];
                }
            }
            res.eval(t, yPert, ypPert, fp);
            for (int c = 0; c < n; c++) {
                if (color[c] == g) {
                    for (int row : colRows[c]) {
                        j[row][c] = (fp[row] - f0[row]) / eps[c];
                    }
                }
            }
        }
        return j;
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
