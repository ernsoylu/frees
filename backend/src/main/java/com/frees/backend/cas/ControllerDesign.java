package com.frees.backend.cas;

import org.apache.commons.math3.complex.Complex;
import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.RealMatrix;

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
}
