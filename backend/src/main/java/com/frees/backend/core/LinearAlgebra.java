package com.frees.backend.core;

import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.CholeskyDecomposition;
import org.apache.commons.math3.linear.LUDecomposition;
import org.apache.commons.math3.linear.MatrixUtils;
import org.apache.commons.math3.linear.QRDecomposition;
import org.apache.commons.math3.linear.RealMatrix;
import org.apache.commons.math3.linear.SingularValueDecomposition;

/**
 * Dense linear-algebra kernels exposed to the equation language as matrix CALL
 * intrinsics (QR, Cholesky, singular values, matrix exponential). These operate
 * on the <em>resolved</em> numeric values of a matrix's entries — i.e. on known
 * data — mirroring the existing eigendecomposition path in {@code Evaluator}.
 *
 * <p>All kernels are backed by Apache Commons Math; {@link #expm} adds the one
 * routine Commons Math does not provide, via scaling-and-squaring with a [6/6]
 * Padé approximant (Golub &amp; Van Loan, <i>Matrix Computations</i>).
 */
public final class LinearAlgebra {

    private LinearAlgebra() {}

    private static RealMatrix matrix(double[][] data) {
        return new Array2DRowRealMatrix(data, false);
    }

    /** Q factor (m×m, orthogonal) of the QR decomposition of {@code a}. */
    public static double[][] qrQ(double[][] a) {
        return new QRDecomposition(matrix(a)).getQ().getData();
    }

    /** R factor (m×n, upper-triangular) of the QR decomposition of {@code a}. */
    public static double[][] qrR(double[][] a) {
        return new QRDecomposition(matrix(a)).getR().getData();
    }

    /** Singular values of {@code a}, in non-increasing order (length min(m,n)). */
    public static double[] singularValues(double[][] a) {
        return new SingularValueDecomposition(matrix(a)).getSingularValues();
    }

    /** U factor (m×m, orthogonal) of the Singular Value Decomposition of {@code a}. */
    public static double[][] svdU(double[][] a) {
        return new SingularValueDecomposition(matrix(a)).getU().getData();
    }

    /** S factor (m×n, diagonal) of the Singular Value Decomposition of {@code a}. */
    public static double[][] svdS(double[][] a) {
        return new SingularValueDecomposition(matrix(a)).getS().getData();
    }

    /** V factor (n×n, orthogonal) of the Singular Value Decomposition of {@code a}. */
    public static double[][] svdV(double[][] a) {
        return new SingularValueDecomposition(matrix(a)).getV().getData();
    }

    /**
     * Lower-triangular Cholesky factor L of a symmetric positive-definite matrix,
     * so that {@code A = L·Lᵀ}. Symmetry/positivity thresholds are relaxed
     * slightly relative to the Commons Math defaults so matrices assembled from
     * solved (slightly noisy) variables still factor.
     */
    public static double[][] choleskyL(double[][] a) {
        return new CholeskyDecomposition(matrix(a), 1.0e-9, 1.0e-12).getL().getData();
    }

    /**
     * Matrix exponential e^A via scaling-and-squaring with a [6/6] Padé
     * approximant. Exact for the cases that matter to frees (state-transition
     * matrices, zero-order-hold discretization).
     */
    public static double[][] expm(double[][] a) {
        RealMatrix x = matrix(a);
        int n = x.getRowDimension();
        if (n != x.getColumnDimension()) {
            throw new IllegalArgumentException("MatExp requires a square matrix.");
        }
        // Scale A by 2^-s so its norm is < 1, keeping the Padé approximant accurate.
        double norm = x.getNorm();
        int s = Math.max(0, (int) Math.ceil(Math.log(Math.max(norm, 1.0e-300)) / Math.log(2.0)) + 1);
        RealMatrix scaled = x.scalarMultiply(1.0 / Math.pow(2.0, s));

        RealMatrix ident = MatrixUtils.createRealIdentityMatrix(n);
        RealMatrix xk = scaled;
        double c = 0.5;
        RealMatrix num = ident.add(scaled.scalarMultiply(c));      // numerator N
        RealMatrix den = ident.subtract(scaled.scalarMultiply(c)); // denominator D
        int q = 6;
        boolean plus = true; // sign alternates in the denominator series
        for (int k = 2; k <= q; k++) {
            c = c * (q - k + 1) / ((double) k * (2 * q - k + 1));
            xk = scaled.multiply(xk);
            RealMatrix cxk = xk.scalarMultiply(c);
            num = num.add(cxk);
            den = plus ? den.add(cxk) : den.subtract(cxk);
            plus = !plus;
        }
        // F = D^{-1} N
        RealMatrix f = new LUDecomposition(den).getSolver().solve(num);
        // Undo the scaling: e^A = (F)^{2^s}.
        for (int k = 0; k < s; k++) {
            f = f.multiply(f);
        }
        return f.getData();
    }
}
