package com.frees.backend.cas;

import org.apache.commons.math3.complex.Complex;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.SingularValueDecomposition;

/**
 * State-feedback controller-design solvers: continuous-time LQR (via the
 * algebraic Riccati equation) and SISO pole placement (Ackermann's formula).
 *
 * <p>The LQR gain solves the continuous-time ARE
 * {@code A'P + PA - PBR^{-1}B'P + Q = 0}, then {@code K = R^{-1}B'P}. The ARE is
 * solved with the <b>matrix sign function</b> of the Hamiltonian
 * {@code H = [A, -BR^{-1}B'; -Q, -A']} — a Newton iteration
 * {@code Z <- 1/2 (cZ + (cZ)^{-1})} using only real LU inverses (Commons Math3),
 * which is robust and converges quadratically without an ordered Schur form.
 */
public final class ControllerDesign {

    private static final int SIGN_MAX_ITERS = 100;
    private static final double SIGN_TOL = 1e-12;

    /**
     * Compute numerical rank of matrix using Singular Value Decomposition.
     */
    public static int rank(double[][] matrix) {
        RealMatrix m = new Array2DRowRealMatrix(matrix, false);
        SingularValueDecomposition svd = new SingularValueDecomposition(m);
        double[] s = svd.getSingularValues();
        if (s.length == 0) {
            return 0;
        }
        double maxDim = Math.max(m.getRowDimension(), m.getColumnDimension());
        double tol = maxDim * s[0] * 2.220446049250313e-16;
        if (tol < 1e-14) {
            tol = 1e-14;
        }
        int rank = 0;
        for (double val : s) {
            if (val > tol) {
                rank++;
            }
        }
        return rank;
    }

    /**
     * Compute controllability matrix [B, AB, ..., A^(n-1)B].
     */
    public static double[][] ctrb(double[][] aArr, double[][] bArr) {
        int n = aArr.length;
        RealMatrix a = new Array2DRowRealMatrix(aArr, false);
        RealMatrix b = new Array2DRowRealMatrix(bArr, false);
        int m = b.getColumnDimension();
        RealMatrix ctrb = new Array2DRowRealMatrix(n, n * m);
        RealMatrix colBlock = b;
        for (int i = 0; i < n; i++) {
            ctrb.setSubMatrix(colBlock.getData(), 0, i * m);
            colBlock = a.multiply(colBlock);
        }
        return ctrb.getData();
    }

    /**
     * Compute observability matrix [C; CA; ...; CA^(n-1)].
     */
    public static double[][] obsv(double[][] aArr, double[][] cArr) {
        int n = aArr.length;
        RealMatrix a = new Array2DRowRealMatrix(aArr, false);
        RealMatrix c = new Array2DRowRealMatrix(cArr, false);
        int p = c.getRowDimension();
        RealMatrix obsv = new Array2DRowRealMatrix(n * p, n);
        RealMatrix rowBlock = c;
        for (int i = 0; i < n; i++) {
            obsv.setSubMatrix(rowBlock.getData(), i * p, 0);
            rowBlock = rowBlock.multiply(a);
        }
        return obsv.getData();
    }

    /**
     * Apply state similarity transformation matrix P (x = P z).
     */
    public static StateSpace.StateSpaceMatrices ss2ss(double[][] aArr, double[] bArr, double[] cArr, double d, double[][] pArr) {
        RealMatrix a = new Array2DRowRealMatrix(aArr, false);
        RealMatrix b = new Array2DRowRealMatrix(bArr.length, 1);
        for (int i = 0; i < bArr.length; i++) {
            b.setEntry(i, 0, bArr[i]);
        }
        RealMatrix c = new Array2DRowRealMatrix(1, cArr.length);
        for (int i = 0; i < cArr.length; i++) {
            c.setEntry(0, i, cArr[i]);
        }
        RealMatrix p = new Array2DRowRealMatrix(pArr, false);
        RealMatrix pInv = MatrixUtils.inverse(p);
        
        RealMatrix an = pInv.multiply(a).multiply(p);
        RealMatrix bn = pInv.multiply(b);
        RealMatrix cn = c.multiply(p);
        
        return new StateSpace.StateSpaceMatrices(an.getData(), bn.getColumn(0), cn.getRow(0), d);
    }

    private ControllerDesign() {
    }

    /**
     * Continuous-time LQR gain {@code K} (m×n) for {@code (A, B, Q, R)}.
     *
     * @param a state matrix (n×n)
     * @param b input matrix (n×m)
     * @param q state weight (n×n, symmetric PSD)
     * @param r input weight (m×m, symmetric PD)
     */
    public static double[][] lqr(double[][] a, double[][] b, double[][] q, double[][] r) {
        RealMatrix matA = new Array2DRowRealMatrix(a, true);
        RealMatrix matB = new Array2DRowRealMatrix(b, true);
        RealMatrix matQ = new Array2DRowRealMatrix(q, true);
        RealMatrix matR = new Array2DRowRealMatrix(r, true);
        int n = matA.getRowDimension();

        RealMatrix rInv = MatrixUtils.inverse(matR);
        RealMatrix brb = matB.multiply(rInv).multiply(matB.transpose()); // n×n

        // Hamiltonian H = [ A , -B R^-1 B' ; -Q , -A' ].
        RealMatrix h = new Array2DRowRealMatrix(2 * n, 2 * n);
        h.setSubMatrix(matA.getData(), 0, 0);
        h.setSubMatrix(brb.scalarMultiply(-1.0).getData(), 0, n);
        h.setSubMatrix(matQ.scalarMultiply(-1.0).getData(), n, 0);
        h.setSubMatrix(matA.transpose().scalarMultiply(-1.0).getData(), n, n);

        RealMatrix s = matrixSign(h);

        // Partition sign(H) into n×n blocks.
        RealMatrix s11 = s.getSubMatrix(0, n - 1, 0, n - 1);
        RealMatrix s12 = s.getSubMatrix(0, n - 1, n, 2 * n - 1);
        RealMatrix s21 = s.getSubMatrix(n, 2 * n - 1, 0, n - 1);
        RealMatrix s22 = s.getSubMatrix(n, 2 * n - 1, n, 2 * n - 1);
        RealMatrix eye = MatrixUtils.createRealIdentityMatrix(n);

        // Solve the overdetermined [S12; S22+I] P = -[S11+I; S21] in least squares.
        RealMatrix top = s12;
        RealMatrix bot = s22.add(eye);
        RealMatrix lhs = stackRows(top, bot);              // 2n×n
        RealMatrix rhs = stackRows(s11.add(eye).scalarMultiply(-1.0),
                s21.scalarMultiply(-1.0));                 // 2n×n
        RealMatrix lhsT = lhs.transpose();
        RealMatrix p = MatrixUtils.inverse(lhsT.multiply(lhs)).multiply(lhsT).multiply(rhs);

        // Symmetrize P to scrub numerical asymmetry, then K = R^-1 B' P.
        p = p.add(p.transpose()).scalarMultiply(0.5);
        RealMatrix k = rInv.multiply(matB.transpose()).multiply(p);
        return k.getData();
    }

    /** Newton iteration for the matrix sign function with determinant scaling. */
    private static RealMatrix matrixSign(RealMatrix h) {
        RealMatrix z = h.copy();
        int dim = z.getRowDimension();
        for (int iter = 0; iter < SIGN_MAX_ITERS; iter++) {
            RealMatrix zInv = MatrixUtils.inverse(z);
            double det = new LUDecomposition(z).getDeterminant();
            double c = 1.0;
            if (det != 0.0 && Double.isFinite(det)) {
                c = Math.pow(Math.abs(det), -1.0 / dim);
            }
            RealMatrix zNext = z.scalarMultiply(c).add(zInv.scalarMultiply(1.0 / c)).scalarMultiply(0.5);
            double diff = zNext.subtract(z).getFrobeniusNorm();
            z = zNext;
            if (diff <= SIGN_TOL * Math.max(1.0, z.getFrobeniusNorm())) {
                break;
            }
        }
        return z;
    }

    private static RealMatrix stackRows(RealMatrix top, RealMatrix bottom) {
        int rt = top.getRowDimension();
        int rb = bottom.getRowDimension();
        int cols = top.getColumnDimension();
        RealMatrix out = new Array2DRowRealMatrix(rt + rb, cols);
        out.setSubMatrix(top.getData(), 0, 0);
        out.setSubMatrix(bottom.getData(), rt, 0);
        return out;
    }

    /**
     * SISO pole placement via Ackermann's formula.
     * {@code K = [0 … 0 1] · C^{-1} · φ(A)}, where {@code C = [b, Ab, …, A^{n-1}b]}
     * is the controllability matrix and {@code φ} is the desired characteristic
     * polynomial (from the requested closed-loop poles) evaluated at {@code A}.
     *
     * @param aArr         state matrix (n×n)
     * @param bArr         input vector (length n)
     * @param desiredRoots desired closed-loop poles as {re, im} pairs (length n)
     * @return feedback gain row vector K (length n)
     */
    public static double[] place(double[][] aArr, double[] bArr, double[][] desiredRoots) {
        int n = aArr.length;
        RealMatrix a = new Array2DRowRealMatrix(aArr, true);
        RealMatrix b = new Array2DRowRealMatrix(n, 1);
        for (int i = 0; i < n; i++) {
            b.setEntry(i, 0, bArr[i]);
        }

        // Controllability matrix C = [b, Ab, ..., A^{n-1} b].
        RealMatrix ctrb = new Array2DRowRealMatrix(n, n);
        RealMatrix col = b;
        for (int j = 0; j < n; j++) {
            ctrb.setColumnMatrix(j, col);
            col = a.multiply(col);
        }
        RealMatrix ctrbInv = MatrixUtils.inverse(ctrb);

        // Desired monic characteristic polynomial (descending): [1, c1, ..., cn].
        double[] coeffs = PolynomialHelpers.expandRoots(desiredRoots);
        if (coeffs.length != n + 1) {
            throw new CasEngine.CasException(
                    "place: number of desired poles (" + (coeffs.length - 1)
                            + ") must equal the system order n = " + n);
        }

        // φ(A) = Σ coeffs[k] · A^{n-k}  (k = 0..n).
        RealMatrix[] powers = new RealMatrix[n + 1];
        powers[0] = MatrixUtils.createRealIdentityMatrix(n);
        for (int i = 1; i <= n; i++) {
            powers[i] = powers[i - 1].multiply(a);
        }
        RealMatrix phi = new Array2DRowRealMatrix(n, n);
        for (int k = 0; k <= n; k++) {
            phi = phi.add(powers[n - k].scalarMultiply(coeffs[k]));
        }

        // K = e_n' · C^-1 · φ(A), with e_n' = [0 … 0 1].
        RealMatrix lastRow = new Array2DRowRealMatrix(1, n);
        lastRow.setEntry(0, n - 1, 1.0);
        RealMatrix k = lastRow.multiply(ctrbInv).multiply(phi);
        return k.getRow(0);
    }

    /**
     * Loop-shaping PID auto-tuning for a SISO plant {@code num/den}.
     *
     * <p>The controller is designed so the open loop {@code C(jw)G(jw)} has its
     * gain crossover (|loop| = 1) at {@code wc} with a 60° phase margin — the same
     * default target MATLAB's {@code pidtune} uses. At {@code wc} the required
     * controller response is {@code Mc∠θc} with {@code Mc = 1/|G|} and
     * {@code θc = (-180° + 60°) - ∠G}; the gains follow in closed form:
     * <ul>
     *   <li><b>P</b>: {@code Kp = 1/|G|} (phase margin is not enforced — a pure
     *       gain cannot reshape phase).</li>
     *   <li><b>PI</b>: {@code Kp = Mc cosθc}, {@code Ki = -wc·Mc sinθc}.</li>
     *   <li><b>PID</b>: {@code Kp = Mc cosθc}; with the standard {@code Ti = 4·Td}
     *       relation ({@code Ki = Kp²/(4·Kd)}) the imaginary-part constraint
     *       {@code Kd·wc - Ki/wc = Mc sinθc} solves to
     *       {@code Kd = (Q + √(Q² + Kp²))/(2·wc)}, {@code Q = Mc sinθc}.</li>
     * </ul>
     *
     * @param type one of "p", "pi", "pid" (lower-case)
     * @return {@code {Kp, Ki, Kd}} (unused terms are zero)
     */
    public static double[] pidtune(double[] num, double[] den, String type, double wc) {
        Complex s = new Complex(0.0, wc);
        Complex g = evalPolyComplex(num, s).divide(evalPolyComplex(den, s));
        double mg = g.abs();
        if (mg == 0.0 || !Double.isFinite(mg)) {
            throw new CasEngine.CasException(
                    "pidtune: plant gain is zero or singular at wc = " + wc);
        }
        double pg = g.getArgument();                 // plant phase (rad)
        double thetaC = (-Math.PI + Math.toRadians(60.0)) - pg;
        double mc = 1.0 / mg;

        double kp;
        double ki;
        double kd;
        switch (type) {
            case "p" -> {
                kp = mc;
                ki = 0.0;
                kd = 0.0;
            }
            case "pi" -> {
                kp = mc * Math.cos(thetaC);
                ki = -wc * mc * Math.sin(thetaC);
                kd = 0.0;
            }
            case "pid" -> {
                kp = mc * Math.cos(thetaC);
                double q = mc * Math.sin(thetaC);
                kd = (q + Math.sqrt(q * q + kp * kp)) / (2.0 * wc);
                ki = kd == 0.0 ? 0.0 : kp * kp / (4.0 * kd);
            }
            default -> throw new CasEngine.CasException("pidtune: unknown controller type '" + type + "'");
        }
        return new double[]{kp, ki, kd};
    }

    /** Horner evaluation of a real-coefficient polynomial (descending) at complex s. */
    private static Complex evalPolyComplex(double[] coeffs, Complex s) {
        Complex v = Complex.ZERO;
        for (double c : coeffs) {
            v = v.multiply(s).add(c);
        }
        return v;
    }

    public static StateSpace.StateSpaceMatrices ssSeries(
            double[][] a1, double[] b1, double[] c1, double d1,
            double[][] a2, double[] b2, double[] c2, double d2) {
        int n1 = a1.length;
        int n2 = a2.length;
        int n = n1 + n2;
        
        double[][] a = new double[n][n];
        for (int i = 0; i < n1; i++) {
            System.arraycopy(a1[i], 0, a[i], 0, n1);
        }
        for (int i = 0; i < n2; i++) {
            for (int j = 0; j < n1; j++) {
                a[n1 + i][j] = b2[i] * c1[j];
            }
            System.arraycopy(a2[i], 0, a[n1 + i], n1, n2);
        }
        
        double[] b = new double[n];
        System.arraycopy(b1, 0, b, 0, n1);
        for (int i = 0; i < n2; i++) {
            b[n1 + i] = b2[i] * d1;
        }
        
        double[] c = new double[n];
        for (int j = 0; j < n1; j++) {
            c[j] = d2 * c1[j];
        }
        System.arraycopy(c2, 0, c, n1, n2);
        
        double d = d2 * d1;
        return new StateSpace.StateSpaceMatrices(a, b, c, d);
    }

    public static StateSpace.StateSpaceMatrices ssParallel(
            double[][] a1, double[] b1, double[] c1, double d1,
            double[][] a2, double[] b2, double[] c2, double d2) {
        int n1 = a1.length;
        int n2 = a2.length;
        int n = n1 + n2;
        
        double[][] a = new double[n][n];
        for (int i = 0; i < n1; i++) {
            System.arraycopy(a1[i], 0, a[i], 0, n1);
        }
        for (int i = 0; i < n2; i++) {
            System.arraycopy(a2[i], 0, a[n1 + i], n1, n2);
        }
        
        double[] b = new double[n];
        System.arraycopy(b1, 0, b, 0, n1);
        System.arraycopy(b2, 0, b, n1, n2);
        
        double[] c = new double[n];
        System.arraycopy(c1, 0, c, 0, n1);
        System.arraycopy(c2, 0, c, n1, n2);
        
        double d = d1 + d2;
        return new StateSpace.StateSpaceMatrices(a, b, c, d);
    }

    public static StateSpace.StateSpaceMatrices ssFeedback(
            double[][] a1, double[] b1, double[] c1, double d1,
            double[][] a2, double[] b2, double[] c2, double d2, double sign) {
        int n1 = a1.length;
        int n2 = a2.length;
        int n = n1 + n2;
        
        double gamma = 1.0 / (1.0 + sign * d1 * d2);
        
        double[][] a = new double[n][n];
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n1; j++) {
                a[i][j] = a1[i][j] - gamma * sign * d2 * b1[i] * c1[j];
            }
            for (int j = 0; j < n2; j++) {
                a[i][n1 + j] = -gamma * sign * b1[i] * c2[j];
            }
        }
        for (int i = 0; i < n2; i++) {
            for (int j = 0; j < n1; j++) {
                a[n1 + i][j] = gamma * b2[i] * c1[j];
            }
            for (int j = 0; j < n2; j++) {
                a[n1 + i][n1 + j] = a2[i][j] - gamma * sign * d1 * b2[i] * c2[j];
            }
        }
        
        double[] b = new double[n];
        for (int i = 0; i < n1; i++) {
            b[i] = gamma * b1[i];
        }
        for (int i = 0; i < n2; i++) {
            b[n1 + i] = gamma * d1 * b2[i];
        }
        
        double[] c = new double[n];
        for (int j = 0; j < n1; j++) {
            c[j] = gamma * c1[j];
        }
        for (int j = 0; j < n2; j++) {
            c[n1 + j] = -gamma * sign * d1 * c2[j];
        }
        
        double d = gamma * d1;
        return new StateSpace.StateSpaceMatrices(a, b, c, d);
    }

    public static double[][] pade(double Td, int order) {
        double[] num = new double[order + 1];
        double[] den = new double[order + 1];
        for (int i = 0; i <= order; i++) {
            int k = order - i;
            double coeff = factorial(2 * order - k) / (factorial(k) * factorial(order - k));
            double val = coeff * Math.pow(Td, k);
            den[i] = val;
            num[i] = (k % 2 == 0) ? val : -val;
        }
        return new double[][]{num, den};
    }

    private static double factorial(int n) {
        double res = 1.0;
        for (int i = 2; i <= n; i++) {
            res *= i;
        }
        return res;
    }

    public static double[] stepinfo(double[] t, double[] y) {
        int N = t.length;
        if (N == 0) {
            return new double[]{0, 0, 0, 0};
        }
        double yfinal = y[N - 1];
        
        // Find ypeak and ipeak
        double ypeak = y[0];
        int ipeak = 0;
        if (yfinal >= 0) {
            for (int i = 1; i < N; i++) {
                if (y[i] > ypeak) {
                    ypeak = y[i];
                    ipeak = i;
                }
            }
        } else {
            for (int i = 1; i < N; i++) {
                if (y[i] < ypeak) {
                    ypeak = y[i];
                    ipeak = i;
                }
            }
        }
        
        double tp = t[ipeak];
        
        // OS
        double os = 0.0;
        if (Math.abs(yfinal) > 1e-12) {
            os = 100.0 * (Math.abs(ypeak) - Math.abs(yfinal)) / Math.abs(yfinal);
            if (os < 0.0) {
                os = 0.0;
            }
        }
        
        // Tr
        double y10 = 0.1 * yfinal;
        double y90 = 0.9 * yfinal;
        double t10 = findTimeOfValue(t, y, y10);
        double t90 = findTimeOfValue(t, y, y90);
        double tr = t90 - t10;
        
        // Ts (2% criterion)
        double limit = 0.02 * Math.abs(yfinal);
        int lastOutsideIdx = -1;
        for (int i = N - 1; i >= 0; i--) {
            if (Math.abs(y[i] - yfinal) > limit) {
                lastOutsideIdx = i;
                break;
            }
        }
        double ts;
        if (lastOutsideIdx == -1) {
            ts = t[0];
        } else if (lastOutsideIdx == N - 1) {
            ts = t[N - 1];
        } else {
            double t0 = t[lastOutsideIdx];
            double t1 = t[lastOutsideIdx + 1];
            double y0 = Math.abs(y[lastOutsideIdx] - yfinal);
            double y1 = Math.abs(y[lastOutsideIdx + 1] - yfinal);
            if (Math.abs(y1 - y0) < 1e-12) {
                ts = t1;
            } else {
                ts = t0 + (t1 - t0) * (limit - y0) / (y1 - y0);
            }
        }
        
        return new double[]{tr, tp, ts, os};
    }

    private static double findTimeOfValue(double[] t, double[] y, double targetVal) {
        int N = t.length;
        if (y[N - 1] >= 0) {
            for (int i = 0; i < N; i++) {
                if (y[i] >= targetVal) {
                    if (i == 0) return t[0];
                    double t0 = t[i - 1];
                    double t1 = t[i];
                    double y0 = y[i - 1];
                    double y1 = y[i];
                    if (Math.abs(y1 - y0) < 1e-12) return t0;
                    return t0 + (t1 - t0) * (targetVal - y0) / (y1 - y0);
                }
            }
        } else {
            for (int i = 0; i < N; i++) {
                if (y[i] <= targetVal) {
                    if (i == 0) return t[0];
                    double t0 = t[i - 1];
                    double t1 = t[i];
                    double y0 = y[i - 1];
                    double y1 = y[i];
                    if (Math.abs(y1 - y0) < 1e-12) return t0;
                    return t0 + (t1 - t0) * (targetVal - y0) / (y1 - y0);
                }
            }
        }
        return t[N - 1];
    }

    public static class RlocusResult {
        public double[] k;
        public double[][] cpr;
        public double[][] cpi;
        public RlocusResult(double[] k, double[][] cpr, double[][] cpi) {
            this.k = k;
            this.cpr = cpr;
            this.cpi = cpi;
        }
    }

    public static RlocusResult rlocus(double[] num, double[] den, int M) {
        double maxDen = 0.0;
        for (double d : den) {
            maxDen = Math.max(maxDen, Math.abs(d));
        }
        double maxNum = 0.0;
        for (double n : num) {
            maxNum = Math.max(maxNum, Math.abs(n));
        }
        double kBase = (maxNum > 1e-12) ? (maxDen / maxNum) : 1.0;

        double[] k = new double[M];
        k[0] = 0.0;
        if (M > 1) {
            double kMin = 1e-4 * kBase;
            double kMax = 100.0 * kBase;
            for (int i = 1; i < M; i++) {
                double fraction = (double)(i - 1) / (M - 2);
                k[i] = kMin * Math.pow(kMax / kMin, fraction);
            }
        }

        int N = den.length - 1;
        double[][] cpr = new double[M][N];
        double[][] cpi = new double[M][N];

        for (int i = 0; i < M; i++) {
            double Ki = k[i];
            int maxDegree = Math.max(den.length - 1, num.length - 1);
            double[] coeffs = new double[maxDegree + 1];
            for (int j = 0; j < den.length; j++) {
                coeffs[maxDegree - (den.length - 1) + j] += den[j];
            }
            for (int j = 0; j < num.length; j++) {
                coeffs[maxDegree - (num.length - 1) + j] += Ki * num[j];
            }

            double[][] r = PolynomialHelpers.roots(coeffs);
            for (int j = 0; j < N; j++) {
                if (j < r.length) {
                    cpr[i][j] = r[j][0];
                    cpi[i][j] = r[j][1];
                } else {
                    cpr[i][j] = 0.0;
                    cpi[i][j] = 0.0;
                }
            }
        }

        return new RlocusResult(k, cpr, cpi);
    }
}
