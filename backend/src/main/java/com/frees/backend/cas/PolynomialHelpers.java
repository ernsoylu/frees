package com.frees.backend.cas;

import org.apache.commons.math3.linear.Array2DRowRealMatrix;
import org.apache.commons.math3.linear.EigenDecomposition;
import org.apache.commons.math3.linear.RealMatrix;

import java.util.Arrays;

/**
 * Utility helper class for polynomial calculations.
 * Supports add, multiply, companion-matrix roots, and coeffs-from-roots expansion.
 * Polynomial coefficients are represented as double arrays in descending powers (MATLAB-style).
 */
public final class PolynomialHelpers {

    private PolynomialHelpers() {
    }

    /**
     * Adds two polynomials.
     */
    public static double[] add(double[] p1, double[] p2) {
        int n1 = p1.length;
        int n2 = p2.length;
        int maxLen = Math.max(n1, n2);
        double[] result = new double[maxLen];
        for (int i = 0; i < maxLen; i++) {
            double c1 = (i < maxLen - n1) ? 0.0 : p1[i - (maxLen - n1)];
            double c2 = (i < maxLen - n2) ? 0.0 : p2[i - (maxLen - n2)];
            result[i] = c1 + c2;
        }
        return trimLeadingZeros(result);
    }

    /**
     * Multiplies two polynomials.
     */
    public static double[] multiply(double[] p1, double[] p2) {
        int n1 = p1.length;
        int n2 = p2.length;
        if (n1 == 0 || n2 == 0) {
            return new double[0];
        }
        double[] result = new double[n1 + n2 - 1];
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n2; j++) {
                result[i + j] += p1[i] * p2[j];
            }
        }
        return trimLeadingZeros(result);
    }

    /**
     * Computes the roots of a polynomial from its coefficients using the companion matrix.
     * Returns an array of complex roots, where each root is represented as [real, imag].
     */
    public static double[][] roots(double[] coeffs) {
        double[] c = trimLeadingZeros(coeffs);
        if (c.length <= 1) {
            return new double[0][2];
        }
        int degree = c.length - 1;

        if (degree == 1) {
            // First degree: c0 * s + c1 = 0 => s = -c1 / c0
            return new double[][]{{-c[1] / c[0], 0.0}};
        }

        // Construct companion matrix
        double[][] matrix = new double[degree][degree];
        for (int j = 0; j < degree; j++) {
            matrix[0][j] = -c[j + 1] / c[0];
        }
        for (int i = 1; i < degree; i++) {
            matrix[i][i - 1] = 1.0;
        }

        try {
            RealMatrix realMatrix = new Array2DRowRealMatrix(matrix);
            EigenDecomposition decomp = new EigenDecomposition(realMatrix);
            double[] realParts = decomp.getRealEigenvalues();
            double[] imagParts = decomp.getImagEigenvalues();
            double[][] result = new double[degree][2];
            for (int i = 0; i < degree; i++) {
                result[i][0] = realParts[i];
                result[i][1] = imagParts[i];
            }
            return result;
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to calculate roots: " + e.getMessage(), e);
        }
    }

    /**
     * Expands complex roots back to real monic polynomial coefficients in descending order.
     * Each root is represented as [real, imag].
     */
    public static double[] expandRoots(double[][] roots) {
        if (roots == null || roots.length == 0) {
            return new double[]{1.0};
        }

        // We use complex polynomial multiplication: start with [1.0 + j0.0]
        Complex[] poly = new Complex[]{new Complex(1.0, 0.0)};

        for (double[] root : roots) {
            Complex r = new Complex(root[0], root[1]);
            Complex[] next = new Complex[poly.length + 1];
            next[0] = poly[0];
            for (int i = 1; i < poly.length; i++) {
                // next[i] = poly[i] - poly[i-1] * r
                next[i] = poly[i].subtract(poly[i - 1].multiply(r));
            }
            next[poly.length] = poly[poly.length - 1].multiply(r).negate();
            poly = next;
        }

        // Extract real parts (assuming the imaginary parts are numerical noise / zero)
        double[] result = new double[poly.length];
        for (int i = 0; i < poly.length; i++) {
            result[i] = poly[i].r;
        }
        return trimLeadingZeros(result);
    }

    /**
     * Converts a zero-pole-gain model to transfer function coefficients.
     */
    public static double[][] zp2tf(double[] z_r, double[] z_i, double[] p_r, double[] p_i, double k) {
        int nz = z_r.length;
        int np = p_r.length;
        double[][] zRoots = new double[nz][2];
        for (int i = 0; i < nz; i++) {
            zRoots[i][0] = z_r[i];
            zRoots[i][1] = z_i[i];
        }
        double[][] pRoots = new double[np][2];
        for (int i = 0; i < np; i++) {
            pRoots[i][0] = p_r[i];
            pRoots[i][1] = p_i[i];
        }
        double[] zPoly = expandRoots(zRoots);
        double[] pPoly = expandRoots(pRoots);

        for (int i = 0; i < zPoly.length; i++) {
            zPoly[i] *= k;
        }

        double[] num = new double[np + 1];
        int pad = (np + 1) - zPoly.length;
        for (int i = 0; i < zPoly.length; i++) {
            if (i + pad >= 0 && i + pad < num.length) {
                num[i + pad] = zPoly[i];
            }
        }

        double[] den = new double[np + 1];
        int dPad = (np + 1) - pPoly.length;
        for (int i = 0; i < pPoly.length; i++) {
            if (i + dPad >= 0 && i + dPad < den.length) {
                den[i + dPad] = pPoly[i];
            }
        }

        return new double[][]{num, den};
    }

    public static record ZpkResult(double[][] zeros, double[][] poles, double k) {
    }

    /**
     * Converts a transfer function model to zero-pole-gain roots and gain.
     */
    public static ZpkResult tf2zp(double[] num, double[] den) {
        double[] trimmedNum = trimLeadingZeros(num);
        double[] trimmedDen = trimLeadingZeros(den);

        if (trimmedDen.length == 0 || (trimmedDen.length == 1 && Math.abs(trimmedDen[0]) < 1e-15)) {
            throw new IllegalArgumentException("tf2zp: denominator cannot be zero");
        }
        if (trimmedNum.length == 0 || (trimmedNum.length == 1 && Math.abs(trimmedNum[0]) < 1e-15)) {
            double[][] z = new double[0][2];
            double[][] p = roots(trimmedDen);
            return new ZpkResult(z, p, 0.0);
        }

        double k = trimmedNum[0] / trimmedDen[0];
        double[][] z = roots(trimmedNum);
        double[][] p = roots(trimmedDen);
        return new ZpkResult(z, p, k);
    }

    private static double[] trimLeadingZeros(double[] p) {
        int firstNonZero = -1;
        for (int i = 0; i < p.length; i++) {
            if (Math.abs(p[i]) > 1e-15) {
                firstNonZero = i;
                break;
            }
        }
        if (firstNonZero == -1) {
            return new double[]{0.0};
        }
        if (firstNonZero == 0) {
            return p;
        }
        return Arrays.copyOfRange(p, firstNonZero, p.length);
    }

    public static double[] multiplyRaw(double[] p1, double[] p2) {
        int n1 = p1.length;
        int n2 = p2.length;
        if (n1 == 0 || n2 == 0) {
            return new double[0];
        }
        double[] result = new double[n1 + n2 - 1];
        for (int i = 0; i < n1; i++) {
            for (int j = 0; j < n2; j++) {
                result[i + j] += p1[i] * p2[j];
            }
        }
        return result;
    }

    public static double[] addRaw(double[] p1, double[] p2) {
        int n1 = p1.length;
        int n2 = p2.length;
        int maxLen = Math.max(n1, n2);
        double[] result = new double[maxLen];
        for (int i = 0; i < maxLen; i++) {
            double c1 = (i < maxLen - n1) ? 0.0 : p1[i - (maxLen - n1)];
            double c2 = (i < maxLen - n2) ? 0.0 : p2[i - (maxLen - n2)];
            result[i] = c1 + c2;
        }
        return result;
    }

    public static double[][] series(double[] num1, double[] den1, double[] num2, double[] den2) {
        double[] num = multiplyRaw(num1, num2);
        double[] den = multiplyRaw(den1, den2);
        return new double[][]{num, den};
    }

    public static double[][] parallel(double[] num1, double[] den1, double[] num2, double[] den2) {
        double[] num = addRaw(multiplyRaw(num1, den2), multiplyRaw(num2, den1));
        double[] den = multiplyRaw(den1, den2);
        return new double[][]{num, den};
    }

    public static double[][] feedback(double[] num1, double[] den1, double[] num2, double[] den2, double sign) {
        double[] num = multiplyRaw(num1, den2);
        double[] term2 = multiplyRaw(num1, num2);
        for (int i = 0; i < term2.length; i++) {
            term2[i] *= sign;
        }
        double[] den = addRaw(multiplyRaw(den1, den2), term2);
        return new double[][]{num, den};
    }

    public static double[][] poleSS(double[][] a) {
        try {
            RealMatrix realMatrix = new Array2DRowRealMatrix(a);
            EigenDecomposition decomp = new EigenDecomposition(realMatrix);
            double[] realParts = decomp.getRealEigenvalues();
            double[] imagParts = decomp.getImagEigenvalues();
            double[][] result = new double[realParts.length][2];
            for (int i = 0; i < realParts.length; i++) {
                result[i][0] = realParts[i];
                result[i][1] = imagParts[i];
            }
            return result;
        } catch (Exception e) {
            throw new IllegalArgumentException("Failed to calculate eigenvalues of A: " + e.getMessage(), e);
        }
    }

    public static Complex evalPoly(double[] coeffs, Complex s) {
        Complex val = new Complex(0.0, 0.0);
        for (double c : coeffs) {
            val = val.multiply(s).add(new Complex(c, 0.0));
        }
        return val;
    }

    public static double[] unwrap(double[] phaseRad) {
        int n = phaseRad.length;
        double[] unwrapped = new double[n];
        if (n == 0) return unwrapped;
        unwrapped[0] = phaseRad[0];
        double offset = 0;
        for (int i = 1; i < n; i++) {
            double diff = phaseRad[i] - phaseRad[i - 1];
            if (diff > Math.PI) {
                offset -= 2.0 * Math.PI;
            } else if (diff < -Math.PI) {
                offset += 2.0 * Math.PI;
            }
            unwrapped[i] = phaseRad[i] + offset;
        }
        return unwrapped;
    }

    public static double[][] bode(double[] num, double[] den, double[] omega) {
        int n = omega.length;
        double[] mag = new double[n];
        double[] phase = new double[n];
        double[] phaseRad = new double[n];
        for (int i = 0; i < n; i++) {
            Complex s = new Complex(0.0, omega[i]);
            Complex nVal = evalPoly(num, s);
            Complex dVal = evalPoly(den, s);
            Complex resp = nVal.divide(dVal);
            mag[i] = 20.0 * Math.log10(Math.max(resp.magnitude(), 1e-30));
            phaseRad[i] = Math.atan2(resp.i, resp.r);
        }
        double[] phaseUnwrapped = unwrap(phaseRad);
        for (int i = 0; i < n; i++) {
            phase[i] = phaseUnwrapped[i] * (180.0 / Math.PI);
        }
        return new double[][]{mag, phase};
    }

    public static double[][] nyquist(double[] num, double[] den, double[] omega) {
        int n = omega.length;
        double[] real = new double[n];
        double[] imag = new double[n];
        for (int i = 0; i < n; i++) {
            Complex s = new Complex(0.0, omega[i]);
            Complex nVal = evalPoly(num, s);
            Complex dVal = evalPoly(den, s);
            Complex resp = nVal.divide(dVal);
            real[i] = resp.r;
            imag[i] = resp.i;
        }
        return new double[][]{real, imag};
    }

    public static double[] margin(double[] num, double[] den) {
        int numPoints = 2000;
        double wMin = 1e-5;
        double wMax = 1e5;
        double logMin = Math.log(wMin);
        double logMax = Math.log(wMax);
        double step = (logMax - logMin) / (numPoints - 1);
        
        double[] w = new double[numPoints];
        double[] mag = new double[numPoints];
        double[] phase = new double[numPoints];
        
        for (int i = 0; i < numPoints; i++) {
            w[i] = Math.exp(logMin + i * step);
            Complex s = new Complex(0.0, w[i]);
            Complex nVal = evalPoly(num, s);
            Complex dVal = evalPoly(den, s);
            Complex resp = nVal.divide(dVal);
            mag[i] = resp.magnitude();
            phase[i] = Math.atan2(resp.i, resp.r);
        }
        
        double[] phaseUnwrapped = unwrap(phase);
        
        double w_cg = 0.0;
        double pm = 1e9;
        boolean hasWcg = false;
        
        double w_cp = 0.0;
        double gm_db = 1e9;
        boolean hasWcp = false;
        
        for (int i = 1; i < numPoints; i++) {
            if (!hasWcg && ((mag[i-1] >= 1.0 && mag[i] < 1.0) || (mag[i-1] < 1.0 && mag[i] >= 1.0))) {
                double r = (1.0 - mag[i-1]) / (mag[i] - mag[i-1]);
                double logWcg = Math.log(w[i-1]) + r * (Math.log(w[i]) - Math.log(w[i-1]));
                w_cg = Math.exp(logWcg);
                
                double phaseCg = phaseUnwrapped[i-1] + r * (phaseUnwrapped[i] - phaseUnwrapped[i-1]);
                double phaseCgDeg = phaseCg * (180.0 / Math.PI);
                pm = 180.0 + phaseCgDeg;
                while (pm <= -180.0) pm += 360.0;
                while (pm > 180.0) pm -= 360.0;
                hasWcg = true;
            }
            
            double target = -Math.PI;
            if (!hasWcp && ((phaseUnwrapped[i-1] >= target && phaseUnwrapped[i] < target) || (phaseUnwrapped[i-1] < target && phaseUnwrapped[i] >= target))) {
                double r = (target - phaseUnwrapped[i-1]) / (phaseUnwrapped[i] - phaseUnwrapped[i-1]);
                double logWcp = Math.log(w[i-1]) + r * (Math.log(w[i]) - Math.log(w[i-1]));
                w_cp = Math.exp(logWcp);
                
                double magCp = mag[i-1] + r * (mag[i] - mag[i-1]);
                if (magCp > 1e-30) {
                    gm_db = -20.0 * Math.log10(magCp);
                } else {
                    gm_db = 1e9;
                }
                hasWcp = true;
            }
        }
        
        return new double[]{gm_db, pm, w_cg, w_cp};
    }

    private static record Complex(double r, double i) {
        public Complex multiply(Complex o) {
            return new Complex(this.r * o.r - this.i * o.i, this.r * o.i + this.i * o.r);
        }

        public Complex subtract(Complex o) {
            return new Complex(this.r - o.r, this.i - o.i);
        }

        public Complex negate() {
            return new Complex(-this.r, -this.i);
        }

        public Complex add(Complex o) {
            return new Complex(this.r + o.r, this.i + o.i);
        }

        public Complex divide(Complex o) {
            double denom = o.r * o.r + o.i * o.i;
            if (Math.abs(denom) < 1e-30) {
                return new Complex(0.0, 0.0);
            }
            return new Complex((this.r * o.r + this.i * o.i) / denom, (this.i * o.r - this.r * o.i) / denom);
        }

        public double magnitude() {
            return Math.sqrt(this.r * this.r + this.i * this.i);
        }
    }
}
