package com.frees.backend.cas;

import org.matheclipse.core.eval.ExprEvaluator;
import org.matheclipse.parser.client.math.MathException;

import java.util.Arrays;

/**
 * Symbolic state-space to transfer-function conversion.
 *
 * <p>For a SISO system {@code (A, B, C, D)} the transfer function is
 * {@code G(s) = C (sI - A)^{-1} B + D}. This is computed symbolically with Symja
 * (symbolic matrix inverse over the Laplace variable {@code s}), then the
 * numerator and denominator polynomial coefficients are read off — the
 * symbolic counterpart to the numeric companion-matrix route.
 */
public final class StateSpace {

    private static final short MAX_RECURSION = 256;

    private StateSpace() {
    }

    /** num(s)/den(s) coefficient arrays, both in descending powers. */
    public record TransferCoefficients(double[] num, double[] den) {
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof TransferCoefficients other)) return false;
            return Arrays.equals(num, other.num) && Arrays.equals(den, other.den);
        }

        @Override
        public int hashCode() {
            return 31 * Arrays.hashCode(num) + Arrays.hashCode(den);
        }

        @Override
        public String toString() {
            return "TransferCoefficients[num=" + Arrays.toString(num)
                    + ", den=" + Arrays.toString(den) + "]";
        }
    }

    public static TransferCoefficients ss2tf(double[][] a, double[][] b, double[][] c, double d) {
        int n = a.length;
        if (n == 0 || a[0].length != n) {
            throw new CasEngine.CasException("ss2tf requires a square A matrix");
        }
        if (b.length != n || b[0].length != 1) {
            throw new CasEngine.CasException("ss2tf requires B to be n x 1");
        }
        if (c.length != 1 || c[0].length != n) {
            throw new CasEngine.CasException("ss2tf requires C to be 1 x n");
        }

        try {
            ExprEvaluator util = new ExprEvaluator(false, MAX_RECURSION);
            util.eval("amat = " + matrix(a));
            util.eval("bmat = " + matrix(b));
            util.eval("cmat = " + matrix(c));
            util.eval("sIminusA = s*IdentityMatrix(" + n + ") - amat");
            util.eval("detA = Det(sIminusA)");
            // Compute the uncancelled numerator: C * adj(sI-A) * B + D * det(sI-A)
            util.eval("tfn = Expand(Cancel((cmat . (detA * Inverse(sIminusA)) . bmat)[[1,1]]) + (" + number(d) + ") * detA)");
            util.eval("tfd = Expand(detA)");

            // The denominator is the degree-n characteristic polynomial; the
            // numerator has degree at most n. Read coefficients s^n .. s^0.
            // num and den both have length n+1 (MATLAB convention; the numerator
            // is zero-padded at the high-order end when it is lower degree).
            double[] den = new double[n + 1];
            double[] num = new double[n + 1];
            for (int k = 0; k <= n; k++) {
                den[n - k] = util.eval("Coefficient(tfd, s, " + k + ")").evalDouble();
                num[n - k] = util.eval("Coefficient(tfn, s, " + k + ")").evalDouble();
            }
            return new TransferCoefficients(num, den);
        } catch (MathException e) {
            throw new CasEngine.CasException("ss2tf CAS error: " + e.getMessage(), e);
        } catch (StackOverflowError e) {
            throw new CasEngine.CasException("ss2tf system too large to convert symbolically", e);
        }
    }

    private static String matrix(double[][] m) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < m.length; i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append('{');
            for (int j = 0; j < m[i].length; j++) {
                if (j > 0) {
                    sb.append(',');
                }
                sb.append(number(m[i][j]));
            }
            sb.append('}');
        }
        return sb.append('}').toString();
    }

    private static String number(double value) {
        if (value == Math.rint(value) && !Double.isInfinite(value) && Math.abs(value) < 1e15) {
            return Long.toString((long) value);
        }
        return Double.toString(value);
    }

    public record StateSpaceMatrices(double[][] a, double[][] b, double[][] c, double[][] d) {
        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof StateSpaceMatrices other)) return false;
            return Arrays.deepEquals(a, other.a)
                    && Arrays.deepEquals(b, other.b)
                    && Arrays.deepEquals(c, other.c)
                    && Arrays.deepEquals(d, other.d);
        }

        @Override
        public int hashCode() {
            int result = Arrays.deepHashCode(a);
            result = 31 * result + Arrays.deepHashCode(b);
            result = 31 * result + Arrays.deepHashCode(c);
            return 31 * result + Arrays.deepHashCode(d);
        }

        @Override
        public String toString() {
            return "StateSpaceMatrices[a=" + Arrays.deepToString(a)
                    + ", b=" + Arrays.deepToString(b)
                    + ", c=" + Arrays.deepToString(c)
                    + ", d=" + Arrays.deepToString(d) + "]";
        }
    }

    /**
     * Converts a transfer function (num, den coefficients in descending powers)
     * to controllable canonical state-space form matrices.
     */
    public static StateSpaceMatrices tf2ss(double[] num, double[] den) {
        int n = den.length - 1;
        if (n < 0) {
            throw new CasEngine.CasException("tf2ss: denominator cannot be empty");
        }
        if (num.length != den.length) {
            throw new CasEngine.CasException("tf2ss: num and den must have the same length (n+1)");
        }
        double d0 = den[0];
        if (Math.abs(d0) < 1e-15) {
            throw new CasEngine.CasException("tf2ss: leading denominator coefficient cannot be zero");
        }
        double[] aCoeffs = new double[n + 1];
        double[] bCoeffs = new double[n + 1];
        for (int i = 0; i <= n; i++) {
            aCoeffs[i] = den[i] / d0;
            bCoeffs[i] = num[i] / d0;
        }

        double d = bCoeffs[0];
        double[] bBar = new double[n];
        for (int i = 1; i <= n; i++) {
            bBar[i - 1] = bCoeffs[i] - d * aCoeffs[i];
        }

        double[][] a = new double[n][n];
        double[] b = new double[n];
        double[] c = new double[n];
        if (n > 0) {
            for (int j = 0; j < n; j++) {
                a[0][j] = -aCoeffs[j + 1];
            }
            for (int i = 1; i < n; i++) {
                a[i][i - 1] = 1.0;
            }
            b[0] = 1.0;
            for (int i = 0; i < n; i++) {
                c[i] = bBar[i];
            }
        }
        double[][] bMat = new double[n][1];
        if (n > 0) {
            for (int i = 0; i < n; i++) bMat[i][0] = b[i];
        }
        double[][] cMat = new double[1][n];
        if (n > 0) {
            System.arraycopy(c, 0, cMat[0], 0, n);
        }
        double[][] dMat = new double[][]{{d}};
        return new StateSpaceMatrices(a, bMat, cMat, dMat);
    }
}
