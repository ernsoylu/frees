package com.frees.backend.core;

/**
 * Discrete-signal kernels exposed to the equation language as CALL intrinsics
 * (FFT, IFFT, Convolve). Like {@link LinearAlgebra}, these operate on the
 * resolved numeric values of an array's elements (known data).
 *
 * <p>The transform is a direct DFT (O(n²)). For the modest array sizes typical
 * of a declarative engineering document this is exact for any length n, with no
 * power-of-two restriction; it trades the asymptotic speed of a radix-2 FFT for
 * correctness and simplicity.
 */
public final class SignalProcessing {

    private SignalProcessing() {}

    /**
     * Discrete Fourier transform of the complex sequence {@code re + i·im}.
     * Returns {@code {outRe, outIm}}. When {@code inverse} is true, computes the
     * inverse transform (including the 1/n normalization).
     */
    public static double[][] dft(double[] re, double[] im, boolean inverse) {
        int n = re.length;
        if (im.length != n) {
            throw new IllegalArgumentException("FFT real and imaginary parts must have equal length.");
        }
        double[] outRe = new double[n];
        double[] outIm = new double[n];
        double sign = inverse ? 1.0 : -1.0;
        for (int k = 0; k < n; k++) {
            double sumRe = 0.0;
            double sumIm = 0.0;
            for (int j = 0; j < n; j++) {
                double angle = sign * 2.0 * Math.PI * j * k / n;
                double cos = Math.cos(angle);
                double sin = Math.sin(angle);
                sumRe += re[j] * cos - im[j] * sin;
                sumIm += re[j] * sin + im[j] * cos;
            }
            if (inverse) {
                sumRe /= n;
                sumIm /= n;
            }
            outRe[k] = sumRe;
            outIm[k] = sumIm;
        }
        return new double[][] {outRe, outIm};
    }

    /** Linear convolution of {@code a} and {@code b} (length a.length + b.length − 1). */
    public static double[] convolve(double[] a, double[] b) {
        int m = a.length;
        int n = b.length;
        double[] c = new double[m + n - 1];
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                c[i + j] += a[i] * b[j];
            }
        }
        return c;
    }
}
