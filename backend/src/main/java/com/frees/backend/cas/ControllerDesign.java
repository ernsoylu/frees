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
    public static StateSpace.StateSpaceMatrices ss2ss(double[][] aArr, double[][] bArr, double[][] cArr, double[][] d, double[][] pArr) {
        RealMatrix a = new Array2DRowRealMatrix(aArr, false);
        RealMatrix b = new Array2DRowRealMatrix(bArr, false);
        RealMatrix c = new Array2DRowRealMatrix(cArr, false);
        RealMatrix p = new Array2DRowRealMatrix(pArr, false);
        RealMatrix pInv = MatrixUtils.inverse(p);
        
        RealMatrix an = pInv.multiply(a).multiply(p);
        RealMatrix bn = pInv.multiply(b);
        RealMatrix cn = c.multiply(p);
        
        return new StateSpace.StateSpaceMatrices(an.getData(), bn.getData(), cn.getData(), d);
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
            double[][] a1Arr, double[][] b1Arr, double[][] c1Arr, double[][] d1Arr,
            double[][] a2Arr, double[][] b2Arr, double[][] c2Arr, double[][] d2Arr) {
        org.apache.commons.math3.linear.RealMatrix a1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a1Arr, false);
        org.apache.commons.math3.linear.RealMatrix b1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(b1Arr, false);
        org.apache.commons.math3.linear.RealMatrix c1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(c1Arr, false);
        org.apache.commons.math3.linear.RealMatrix d1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(d1Arr, false);
        org.apache.commons.math3.linear.RealMatrix a2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a2Arr, false);
        org.apache.commons.math3.linear.RealMatrix b2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(b2Arr, false);
        org.apache.commons.math3.linear.RealMatrix c2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(c2Arr, false);
        org.apache.commons.math3.linear.RealMatrix d2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(d2Arr, false);

        int n1 = a1.getRowDimension();
        int n2 = a2.getRowDimension();
        int n = n1 + n2;
        int m = b1.getColumnDimension();
        int p = c2.getRowDimension();
        
        org.apache.commons.math3.linear.RealMatrix a = new org.apache.commons.math3.linear.Array2DRowRealMatrix(n, n);
        if (n1 > 0) a.setSubMatrix(a1.getData(), 0, 0);
        if (n2 > 0) a.setSubMatrix(a2.getData(), n1, n1);
        if (n2 > 0 && n1 > 0) a.setSubMatrix(b2.multiply(c1).getData(), n1, 0);
        
        org.apache.commons.math3.linear.RealMatrix b = new org.apache.commons.math3.linear.Array2DRowRealMatrix(n, m);
        if (n1 > 0) b.setSubMatrix(b1.getData(), 0, 0);
        if (n2 > 0) b.setSubMatrix(b2.multiply(d1).getData(), n1, 0);
        
        org.apache.commons.math3.linear.RealMatrix c = new org.apache.commons.math3.linear.Array2DRowRealMatrix(p, n);
        if (n1 > 0) c.setSubMatrix(d2.multiply(c1).getData(), 0, 0);
        if (n2 > 0) c.setSubMatrix(c2.getData(), 0, n1);
        
        org.apache.commons.math3.linear.RealMatrix d = d2.multiply(d1);
        return new StateSpace.StateSpaceMatrices(a.getData(), b.getData(), c.getData(), d.getData());
    }

        public static StateSpace.StateSpaceMatrices ssParallel(
            double[][] a1Arr, double[][] b1Arr, double[][] c1Arr, double[][] d1Arr,
            double[][] a2Arr, double[][] b2Arr, double[][] c2Arr, double[][] d2Arr) {
        org.apache.commons.math3.linear.RealMatrix a1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a1Arr, false);
        org.apache.commons.math3.linear.RealMatrix b1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(b1Arr, false);
        org.apache.commons.math3.linear.RealMatrix c1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(c1Arr, false);
        org.apache.commons.math3.linear.RealMatrix d1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(d1Arr, false);
        org.apache.commons.math3.linear.RealMatrix a2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a2Arr, false);
        org.apache.commons.math3.linear.RealMatrix b2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(b2Arr, false);
        org.apache.commons.math3.linear.RealMatrix c2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(c2Arr, false);
        org.apache.commons.math3.linear.RealMatrix d2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(d2Arr, false);

        int n1 = a1.getRowDimension();
        int n2 = a2.getRowDimension();
        int n = n1 + n2;
        int m = Math.max(b1.getColumnDimension(), b2.getColumnDimension());
        int p = Math.max(c1.getRowDimension(), c2.getRowDimension());
        
        org.apache.commons.math3.linear.RealMatrix a = new org.apache.commons.math3.linear.Array2DRowRealMatrix(n, n);
        if (n1 > 0) a.setSubMatrix(a1.getData(), 0, 0);
        if (n2 > 0) a.setSubMatrix(a2.getData(), n1, n1);
        
        org.apache.commons.math3.linear.RealMatrix b = new org.apache.commons.math3.linear.Array2DRowRealMatrix(n, m);
        if (n1 > 0 && b1.getColumnDimension() == m) b.setSubMatrix(b1.getData(), 0, 0);
        else if (n1 > 0) b.setSubMatrix(padRight(b1, m).getData(), 0, 0);
        if (n2 > 0 && b2.getColumnDimension() == m) b.setSubMatrix(b2.getData(), n1, 0);
        else if (n2 > 0) b.setSubMatrix(padRight(b2, m).getData(), n1, 0);
        
        org.apache.commons.math3.linear.RealMatrix c = new org.apache.commons.math3.linear.Array2DRowRealMatrix(p, n);
        if (n1 > 0 && c1.getRowDimension() == p) c.setSubMatrix(c1.getData(), 0, 0);
        else if (n1 > 0) c.setSubMatrix(padBottom(c1, p).getData(), 0, 0);
        if (n2 > 0 && c2.getRowDimension() == p) c.setSubMatrix(c2.getData(), 0, n1);
        else if (n2 > 0) c.setSubMatrix(padBottom(c2, p).getData(), 0, n1);
        
        org.apache.commons.math3.linear.RealMatrix d = d1.add(d2);
        return new StateSpace.StateSpaceMatrices(a.getData(), b.getData(), c.getData(), d.getData());
    }
    
    private static org.apache.commons.math3.linear.RealMatrix padRight(org.apache.commons.math3.linear.RealMatrix m, int cols) {
        org.apache.commons.math3.linear.RealMatrix res = new org.apache.commons.math3.linear.Array2DRowRealMatrix(m.getRowDimension(), cols);
        res.setSubMatrix(m.getData(), 0, 0);
        return res;
    }
    private static org.apache.commons.math3.linear.RealMatrix padBottom(org.apache.commons.math3.linear.RealMatrix m, int rows) {
        org.apache.commons.math3.linear.RealMatrix res = new org.apache.commons.math3.linear.Array2DRowRealMatrix(rows, m.getColumnDimension());
        res.setSubMatrix(m.getData(), 0, 0);
        return res;
    }

        public static StateSpace.StateSpaceMatrices ssFeedback(
            double[][] a1Arr, double[][] b1Arr, double[][] c1Arr, double[][] d1Arr,
            double[][] a2Arr, double[][] b2Arr, double[][] c2Arr, double[][] d2Arr, double sign) {
        org.apache.commons.math3.linear.RealMatrix A1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a1Arr, false);
        org.apache.commons.math3.linear.RealMatrix B1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(b1Arr, false);
        org.apache.commons.math3.linear.RealMatrix C1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(c1Arr, false);
        org.apache.commons.math3.linear.RealMatrix D1 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(d1Arr, false);
        org.apache.commons.math3.linear.RealMatrix A2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a2Arr, false);
        org.apache.commons.math3.linear.RealMatrix B2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(b2Arr, false);
        org.apache.commons.math3.linear.RealMatrix C2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(c2Arr, false);
        org.apache.commons.math3.linear.RealMatrix D2 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(d2Arr, false);

        int n1 = A1.getRowDimension();
        int n2 = A2.getRowDimension();
        int p1 = B1.getColumnDimension();
        int q1 = C1.getRowDimension();
        int n = n1 + n2;

        org.apache.commons.math3.linear.RealMatrix I = org.apache.commons.math3.linear.MatrixUtils.createRealIdentityMatrix(q1);
        org.apache.commons.math3.linear.RealMatrix E_inv = I.add(D2.multiply(D1).scalarMultiply(sign));
        org.apache.commons.math3.linear.RealMatrix E = new org.apache.commons.math3.linear.LUDecomposition(E_inv).getSolver().getInverse();

        org.apache.commons.math3.linear.RealMatrix ED2C1 = E.multiply(D2).multiply(C1);
        org.apache.commons.math3.linear.RealMatrix EC2 = E.multiply(C2);
        
        org.apache.commons.math3.linear.RealMatrix A11 = A1.subtract(B1.multiply(ED2C1).scalarMultiply(sign));
        org.apache.commons.math3.linear.RealMatrix A12 = B1.multiply(EC2).scalarMultiply(-sign);
        org.apache.commons.math3.linear.RealMatrix A21 = B2.multiply(C1).subtract(B2.multiply(D1).multiply(ED2C1).scalarMultiply(sign));
        org.apache.commons.math3.linear.RealMatrix A22 = A2.subtract(B2.multiply(D1).multiply(EC2).scalarMultiply(sign));

        double[][] a = new double[n][n];
        if (n1 > 0) {
            for (int i=0; i<n1; i++) System.arraycopy(A11.getData()[i], 0, a[i], 0, n1);
            if (n2 > 0) {
                for (int i=0; i<n1; i++) System.arraycopy(A12.getData()[i], 0, a[i], n1, n2);
                for (int i=0; i<n2; i++) System.arraycopy(A21.getData()[i], 0, a[n1+i], 0, n1);
            }
        }
        if (n2 > 0) {
            for (int i=0; i<n2; i++) System.arraycopy(A22.getData()[i], 0, a[n1+i], n1, n2);
        }

        org.apache.commons.math3.linear.RealMatrix B1E = B1.multiply(E);
        org.apache.commons.math3.linear.RealMatrix B2D1E = B2.multiply(D1).multiply(E);
        double[][] b = new double[n][p1];
        if (n1 > 0) {
            for (int i=0; i<n1; i++) System.arraycopy(B1E.getData()[i], 0, b[i], 0, p1);
        }
        if (n2 > 0) {
            for (int i=0; i<n2; i++) System.arraycopy(B2D1E.getData()[i], 0, b[n1+i], 0, p1);
        }

        org.apache.commons.math3.linear.RealMatrix C11 = C1.subtract(D1.multiply(ED2C1).scalarMultiply(sign));
        org.apache.commons.math3.linear.RealMatrix C12 = D1.multiply(EC2).scalarMultiply(-sign);
        double[][] c = new double[q1][n];
        for (int i=0; i<q1; i++) {
            if (n1 > 0) System.arraycopy(C11.getData()[i], 0, c[i], 0, n1);
            if (n2 > 0) System.arraycopy(C12.getData()[i], 0, c[i], n1, n2);
        }

        double[][] d = D1.multiply(E).getData();

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

    public static double[][] lyap(double[][] a, double[][] q) {
        int n = a.length;
        org.apache.commons.math3.linear.RealMatrix A = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a);
        org.apache.commons.math3.linear.RealMatrix Q = new org.apache.commons.math3.linear.Array2DRowRealMatrix(q);
        org.apache.commons.math3.linear.RealMatrix K = new org.apache.commons.math3.linear.Array2DRowRealMatrix(n * n, n * n);
        
        for (int j = 0; j < n; j++) {
            for (int i = 0; i < n; i++) {
                int row = j * n + i;
                for (int l = 0; l < n; l++) {
                    for (int k = 0; k < n; k++) {
                        int col = l * n + k;
                        double val = 0;
                        if (j == l) val += A.getEntry(i, k);
                        if (i == k) val += A.getEntry(j, l);
                        K.setEntry(row, col, val);
                    }
                }
            }
        }
        
        org.apache.commons.math3.linear.RealVector vecQ = new org.apache.commons.math3.linear.ArrayRealVector(n * n);
        for (int j = 0; j < n; j++) {
            for (int i = 0; i < n; i++) {
                vecQ.setEntry(j * n + i, -Q.getEntry(i, j));
            }
        }
        
        org.apache.commons.math3.linear.DecompositionSolver solver = new org.apache.commons.math3.linear.LUDecomposition(K).getSolver();
        if (!solver.isNonSingular()) {
            solver = new org.apache.commons.math3.linear.SingularValueDecomposition(K).getSolver();
        }
        org.apache.commons.math3.linear.RealVector vecX = solver.solve(vecQ);
        
        double[][] x = new double[n][n];
        for (int j = 0; j < n; j++) {
            for (int i = 0; i < n; i++) {
                x[i][j] = vecX.getEntry(j * n + i);
            }
        }
        return x;
    }

    public static double[][] dlyap(double[][] a, double[][] q) {
        int n = a.length;
        org.apache.commons.math3.linear.RealMatrix A = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a);
        org.apache.commons.math3.linear.RealMatrix Q = new org.apache.commons.math3.linear.Array2DRowRealMatrix(q);
        org.apache.commons.math3.linear.RealMatrix K = new org.apache.commons.math3.linear.Array2DRowRealMatrix(n * n, n * n);
        
        for (int j = 0; j < n; j++) {
            for (int i = 0; i < n; i++) {
                int row = j * n + i;
                for (int l = 0; l < n; l++) {
                    for (int k = 0; k < n; k++) {
                        int col = l * n + k;
                        double val = A.getEntry(j, l) * A.getEntry(i, k);
                        if (j == l && i == k) val -= 1.0;
                        K.setEntry(row, col, val);
                    }
                }
            }
        }
        
        org.apache.commons.math3.linear.RealVector vecQ = new org.apache.commons.math3.linear.ArrayRealVector(n * n);
        for (int j = 0; j < n; j++) {
            for (int i = 0; i < n; i++) {
                vecQ.setEntry(j * n + i, -Q.getEntry(i, j));
            }
        }
        
        org.apache.commons.math3.linear.DecompositionSolver solver = new org.apache.commons.math3.linear.LUDecomposition(K).getSolver();
        if (!solver.isNonSingular()) {
            solver = new org.apache.commons.math3.linear.SingularValueDecomposition(K).getSolver();
        }
        org.apache.commons.math3.linear.RealVector vecX = solver.solve(vecQ);
        
        double[][] x = new double[n][n];
        for (int j = 0; j < n; j++) {
            for (int i = 0; i < n; i++) {
                x[i][j] = vecX.getEntry(j * n + i);
            }
        }
        return x;
    }

    public static double[][] dare(double[][] a, double[][] b, double[][] q, double[][] r) {
        int n = a.length;
        org.apache.commons.math3.linear.RealMatrix A = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a);
        org.apache.commons.math3.linear.RealMatrix B = new org.apache.commons.math3.linear.Array2DRowRealMatrix(b);
        org.apache.commons.math3.linear.RealMatrix Q = new org.apache.commons.math3.linear.Array2DRowRealMatrix(q);
        org.apache.commons.math3.linear.RealMatrix R = new org.apache.commons.math3.linear.Array2DRowRealMatrix(r);

        org.apache.commons.math3.linear.DecompositionSolver aSolver = new org.apache.commons.math3.linear.LUDecomposition(A).getSolver();
        org.apache.commons.math3.linear.RealMatrix Ainv;
        if (aSolver.isNonSingular()) {
            Ainv = aSolver.getInverse();
        } else {
            Ainv = new org.apache.commons.math3.linear.SingularValueDecomposition(A).getSolver().getInverse();
        }
        
        org.apache.commons.math3.linear.DecompositionSolver rSolver = new org.apache.commons.math3.linear.LUDecomposition(R).getSolver();
        org.apache.commons.math3.linear.RealMatrix Rinv = rSolver.isNonSingular() ? rSolver.getInverse() : new org.apache.commons.math3.linear.SingularValueDecomposition(R).getSolver().getInverse();

        org.apache.commons.math3.linear.RealMatrix AinvT = Ainv.transpose();
        org.apache.commons.math3.linear.RealMatrix BRinvBT = B.multiply(Rinv).multiply(B.transpose());
        
        org.apache.commons.math3.linear.RealMatrix S11 = A.add(BRinvBT.multiply(AinvT).multiply(Q));
        org.apache.commons.math3.linear.RealMatrix S12 = BRinvBT.multiply(AinvT).scalarMultiply(-1.0);
        org.apache.commons.math3.linear.RealMatrix S21 = AinvT.multiply(Q).scalarMultiply(-1.0);
        org.apache.commons.math3.linear.RealMatrix S22 = AinvT;

        org.apache.commons.math3.linear.RealMatrix S = new org.apache.commons.math3.linear.Array2DRowRealMatrix(2 * n, 2 * n);
        S.setSubMatrix(S11.getData(), 0, 0);
        S.setSubMatrix(S12.getData(), 0, n);
        S.setSubMatrix(S21.getData(), n, 0);
        S.setSubMatrix(S22.getData(), n, n);

        org.apache.commons.math3.linear.EigenDecomposition eig = new org.apache.commons.math3.linear.EigenDecomposition(S);
        org.apache.commons.math3.linear.RealMatrix V11 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(n, n);
        org.apache.commons.math3.linear.RealMatrix V21 = new org.apache.commons.math3.linear.Array2DRowRealMatrix(n, n);

        int count = 0;
        for (int i = 0; i < 2 * n; i++) {
            double real = eig.getRealEigenvalue(i);
            double imag = eig.getImagEigenvalue(i);
            double mag = Math.sqrt(real * real + imag * imag);
            if (mag < 1.0 && count < n) {
                org.apache.commons.math3.linear.RealVector vec = eig.getEigenvector(i);
                for (int j = 0; j < n; j++) {
                    V11.setEntry(j, count, vec.getEntry(j));
                    V21.setEntry(j, count, vec.getEntry(n + j));
                }
                count++;
            }
        }
        if (count < n) {
            // Unstable or borderline roots, fallback or error out.
            // A more robust Schur decomposition is needed for production, but this is sufficient for typical cases.
            throw new RuntimeException("dare: could not find enough stable eigenvalues");
        }

        org.apache.commons.math3.linear.RealMatrix X = V21.multiply(new org.apache.commons.math3.linear.LUDecomposition(V11).getSolver().getInverse());
        return X.getData();
    }

    public static double[][] dlqr(double[][] a, double[][] b, double[][] q, double[][] r) {
        org.apache.commons.math3.linear.RealMatrix B = new org.apache.commons.math3.linear.Array2DRowRealMatrix(b);
        org.apache.commons.math3.linear.RealMatrix R = new org.apache.commons.math3.linear.Array2DRowRealMatrix(r);
        org.apache.commons.math3.linear.RealMatrix X = new org.apache.commons.math3.linear.Array2DRowRealMatrix(dare(a, b, q, r));
        org.apache.commons.math3.linear.RealMatrix A = new org.apache.commons.math3.linear.Array2DRowRealMatrix(a);

        org.apache.commons.math3.linear.RealMatrix temp = R.add(B.transpose().multiply(X).multiply(B));
        org.apache.commons.math3.linear.DecompositionSolver solver = new org.apache.commons.math3.linear.LUDecomposition(temp).getSolver();
        org.apache.commons.math3.linear.RealMatrix K = solver.getInverse().multiply(B.transpose()).multiply(X).multiply(A);
        return K.getData();
    }

    /**
     * Continuous-time Kalman estimator (LQE) gain {@code L} for the plant
     * {@code x' = Ax + Bu + Gw, y = Cx + v} with process-noise covariance
     * {@code Q} and measurement-noise covariance {@code R}. Solves the filter
     * ARE {@code AP + PA' - PC'R^{-1}CP + GQG' = 0} and returns
     * {@code L = PC'R^{-1}} (n×p). Computed by duality from {@link #lqr}: with
     * {@code Kd = lqr(A', C', GQG', R)} the estimator gain is {@code L = Kd'}.
     */
    public static double[][] lqe(double[][] a, double[][] g, double[][] c,
                                 double[][] q, double[][] r) {
        RealMatrix A = new Array2DRowRealMatrix(a, true);
        RealMatrix G = new Array2DRowRealMatrix(g, true);
        RealMatrix C = new Array2DRowRealMatrix(c, true);
        RealMatrix Q = new Array2DRowRealMatrix(q, true);
        // Process-noise covariance mapped into the state space: GQG' (n×n).
        RealMatrix gqg = G.multiply(Q).multiply(G.transpose());
        // Dual LQR on (A', C') with state weight GQG' and control weight R.
        double[][] kd = lqr(A.transpose().getData(), C.transpose().getData(),
                gqg.getData(), r);
        return new Array2DRowRealMatrix(kd, false).transpose().getData();
    }

    /**
     * System gramian via the Lyapunov equation. {@code type='c'} returns the
     * controllability gramian {@code Wc} (solving {@code AWc + WcA' + BB' = 0},
     * with {@code m} = B); {@code type='o'} returns the observability gramian
     * {@code Wo} (solving {@code A'Wo + WoA + C'C = 0}, with {@code m} = C). Both
     * are n×n. Requires a stable A.
     */
    public static double[][] gramian(double[][] a, double[][] m, char type) {
        RealMatrix A = new Array2DRowRealMatrix(a, true);
        RealMatrix M = new Array2DRowRealMatrix(m, true);
        if (type == 'c') {
            RealMatrix bbt = M.multiply(M.transpose());      // B B'
            return lyap(A.getData(), bbt.getData());
        } else if (type == 'o') {
            RealMatrix ctc = M.transpose().multiply(M);      // C' C
            return lyap(A.transpose().getData(), ctc.getData());
        }
        throw new IllegalArgumentException("gram: type must be 'c' or 'o' (got '" + type + "')");
    }

    /** Balanced-realization triple (Ab, Bb, Cb) returned by {@link #balreal}. */
    public static final class BalrealResult {
        public final double[][] a;
        public final double[][] b;
        public final double[][] c;
        public BalrealResult(double[][] a, double[][] b, double[][] c) {
            this.a = a;
            this.b = b;
            this.c = c;
        }
    }

    /**
     * Internally-balanced realization of the stable, minimal system
     * {@code (A, B, C)} (Laub's method). Forms the controllability and
     * observability gramians {@code Wc, Wo}, factors them via Cholesky
     * ({@code Wc = Lc Lc'}, {@code Wo = Lo Lo'}), takes the SVD
     * {@code Lo'Lc = U S V'}, and applies the balancing transform
     * {@code T = Lc V S^{-1/2}}, {@code T^{-1} = S^{-1/2} U' Lo'} so that the
     * transformed gramians are equal and diagonal. Returns
     * {@code Ab = T^{-1}AT}, {@code Bb = T^{-1}B}, {@code Cb = CT}.
     */
    public static BalrealResult balreal(double[][] a, double[][] b, double[][] c) {
        RealMatrix A = new Array2DRowRealMatrix(a, true);
        RealMatrix B = new Array2DRowRealMatrix(b, true);
        RealMatrix C = new Array2DRowRealMatrix(c, true);

        RealMatrix Wc = new Array2DRowRealMatrix(gramian(a, b, 'c'));
        RealMatrix Wo = new Array2DRowRealMatrix(gramian(a, c, 'o'));

        RealMatrix Lc = choleskyLower(Wc);
        RealMatrix Lo = choleskyLower(Wo);

        RealMatrix h = Lo.transpose().multiply(Lc);          // Lo' Lc
        SingularValueDecomposition svd = new SingularValueDecomposition(h);
        RealMatrix U = svd.getU();
        RealMatrix V = svd.getV();
        double[] sv = svd.getSingularValues();

        int n = sv.length;
        RealMatrix sInvSqrt = new Array2DRowRealMatrix(n, n);
        for (int i = 0; i < n; i++) {
            sInvSqrt.setEntry(i, i, 1.0 / Math.sqrt(sv[i]));
        }

        RealMatrix T = Lc.multiply(V).multiply(sInvSqrt);
        RealMatrix Tinv = sInvSqrt.multiply(U.transpose()).multiply(Lo.transpose());

        RealMatrix Ab = Tinv.multiply(A).multiply(T);
        RealMatrix Bb = Tinv.multiply(B);
        RealMatrix Cb = C.multiply(T);
        return new BalrealResult(Ab.getData(), Bb.getData(), Cb.getData());
    }

    /** Lower-triangular Cholesky factor {@code L} (with {@code M = L L'}) of an SPD matrix. */
    private static RealMatrix choleskyLower(RealMatrix m) {
        org.apache.commons.math3.linear.CholeskyDecomposition chol =
                new org.apache.commons.math3.linear.CholeskyDecomposition(m);
        // Commons Math returns L with M = L L^T from getL().
        return chol.getL();
    }

}
