package com.frees.backend.cas;

import org.apache.commons.math3.complex.Complex;

/**
 * MATLAB-PID-Tuner-style front door over the existing control primitives: given
 * a SISO plant {@code num/den}, a controller type, a target crossover
 * {@code wc} (the "response time" knob) and a target phase margin (the
 * "transient behaviour"/robustness knob), it returns the tuned gains together
 * with the closed-loop step response and the performance metrics a tuner shows.
 *
 * <p>Everything here composes {@link ControllerDesign#pidtune}, the polynomial
 * loop algebra in {@link PolynomialHelpers} ({@code series}/{@code feedback}/
 * {@code margin}), the step simulator in {@link TimeResponse}, and the
 * {@code stepinfo} metrics — no new control theory, only orchestration.
 */
public final class PidTuner {

    private PidTuner() {
    }

    /** Tuned gains + closed-loop step response + performance metrics. A plain
     *  transport record; the {@code t}/{@code y} arrays are never compared or
     *  hashed, so identity-based record semantics are fine here. */
    @SuppressWarnings("java:S6218")
    public record Result(
            double kp, double ki, double kd,
            double[] t, double[] y,
            double riseTime, double peakTime, double settlingTime, double overshoot,
            double gainMargin, double phaseMargin, double wGm, double wPm) {
    }

    /**
     * Ideal-form controller transfer function {@code C(s)} for the given gains,
     * as {@code {num, den}} in descending powers:
     * <ul>
     *   <li>P: {@code Kp} → {@code [Kp] / [1]}</li>
     *   <li>PI: {@code Kp + Ki/s} → {@code [Kp, Ki] / [1, 0]}</li>
     *   <li>PID: {@code Kp + Ki/s + Kd·s} → {@code [Kd, Kp, Ki] / [1, 0]}</li>
     * </ul>
     */
    public static double[][] controllerTf(String type, double kp, double ki, double kd) {
        return switch (type) {
            case "p" -> new double[][]{{kp}, {1.0}};
            case "pi" -> new double[][]{{kp, ki}, {1.0, 0.0}};
            case "pid" -> new double[][]{{kd, kp, ki}, {1.0, 0.0}};
            default -> throw new CasEngine.CasException("pidtune: unknown controller type '" + type + "'");
        };
    }

    /**
     * Tune and evaluate. {@code wc} is the target open-loop gain crossover
     * (rad/s); {@code pmDeg} the target phase margin. {@code horizon} may be
     * {@code <= 0} to auto-size the step window from {@code wc}.
     */
    public static Result tune(double[] num, double[] den, String type, double wc, double pmDeg,
                              double horizon, int points) {
        double[] gains = ControllerDesign.pidtune(num, den, type, wc, pmDeg);
        double kp = gains[0];
        double ki = gains[1];
        double kd = gains[2];

        double[][] c = controllerTf(type, kp, ki, kd);
        double[][] loop = PolynomialHelpers.series(c[0], c[1], num, den);   // L = C·G
        // Unity-feedback closed loop T = L / (1 + L).
        double[][] closed = PolynomialHelpers.feedback(loop[0], loop[1], new double[]{1.0}, new double[]{1.0}, 1.0);

        int n = Math.max(50, points);
        double tf = horizon > 0 ? horizon : autoHorizon(closed[1], wc);
        double[] t = new double[n];
        for (int i = 0; i < n; i++) {
            t[i] = tf * i / (n - 1.0);
        }
        // A proper closed loop has a shorter numerator; tf2ss (inside the step
        // simulator) needs num and den the same length, so left-pad with zeros.
        double[] closedNum = leftPad(closed[0], closed[1].length);
        double[] y = TimeResponse.response(TimeResponse.Kind.STEP, closedNum, closed[1], null, t);

        double[] info = ControllerDesign.stepinfo(t, y);      // rise, peak, settling, overshoot
        double[] mar = PolynomialHelpers.margin(loop[0], loop[1]); // gainMargin dB, phaseMargin, wGm, wPm

        return new Result(kp, ki, kd, t, y,
                info[0], info[1], info[2], info[3],
                mar[0], mar[1], mar[2], mar[3]);
    }

    /**
     * Step-window horizon: enough to show settling. Uses the slowest stable
     * closed-loop pole when available (7 time constants), else falls back to a
     * multiple of {@code 1/wc}.
     */
    private static double autoHorizon(double[] den, double wc) {
        double fallback = wc > 0 ? 12.0 / wc : 10.0;
        double[][] rootsErr;
        try {
            rootsErr = PolynomialHelpers.roots(den);
        } catch (RuntimeException e) {
            return fallback;
        }
        double slowest = Double.POSITIVE_INFINITY;
        for (double[] r : rootsErr) {
            double re = -r[0]; // stable poles have re < 0 → decay rate = -re
            if (re > 1e-9 && re < slowest) {
                slowest = re;
            }
        }
        if (!Double.isFinite(slowest)) {
            return fallback;
        }
        return Math.clamp(7.0 / slowest, 2.0 / Math.max(wc, 1e-9), 1e6);
    }

    /**
     * A sensible default crossover to seed the response-time slider. The plant's
     * dominant (slowest stable) pole sets its natural bandwidth, so we target
     * roughly that frequency — a robust choice that does not depend on the DC
     * gain (a plant with |G| ≤ 1 everywhere has no unity gain crossover). Falls
     * back to the frequency where the plant phase first reaches -90°, then to
     * 1 rad/s.
     */
    public static double suggestWc(double[] num, double[] den) {
        double dominant = Double.POSITIVE_INFINITY;
        try {
            for (double[] r : PolynomialHelpers.roots(den)) {
                double mag = Math.hypot(r[0], r[1]);
                if (mag > 1e-9 && mag < dominant) {
                    dominant = mag;
                }
            }
        } catch (RuntimeException ignored) {
            // fall through to the phase-based estimate
        }
        if (Double.isFinite(dominant)) {
            return dominant;
        }
        double logLo = Math.log(1e-4);
        double logHi = Math.log(1e4);
        int steps = 400;
        for (int i = 0; i < steps; i++) {
            double w = Math.exp(logLo + (logHi - logLo) * i / (steps - 1.0));
            Complex g = horner(num, new Complex(0.0, w)).divide(horner(den, new Complex(0.0, w)));
            if (g.getArgument() <= -Math.PI / 2) {
                return w;
            }
        }
        return 1.0;
    }

    /**
     * Recover the open-loop plant {@code G(s)} seen by a SigPID from the
     * linearized closed loop and the controller currently in the loop.
     *
     * <p>Perturbing the exogenous reference and measuring the plant output gives
     * the closed-loop transfer {@code M = ∂y/∂r} (via {@code LINEARIZE} +
     * {@code ss2tf}). frees' PID error is {@code e = sp − pv}, so with the loop
     * gain {@code L = C0·G}:
     * <ul>
     *   <li>reference on the {@code sp} input, measurement on {@code pv} (the
     *       common wiring, {@code e = r − y}): {@code M = L/(1+L)} ⟹
     *       {@code L = M/(1−M)};</li>
     *   <li>reference on {@code pv}, measurement on {@code sp} (reverse-acting,
     *       {@code e = y − r}): {@code M = −L/(1−L)} ⟹ {@code L = M/(M−1)}.</li>
     * </ul>
     * Then {@code G = L/C0}. All operations are exact polynomial algebra.
     *
     * @param mNum,mDen  closed-loop transfer M = ∂output/∂reference
     * @param cNum,cDen  current controller C0(s)
     * @param referenceOnSp true when the reference drives the PID's {@code sp}
     *                      input (the common wiring); false for the reverse
     *                      wiring where the reference drives {@code pv}
     * @return {@code {num, den}} of the recovered plant G(s)
     */
    public static double[][] recoverPlant(
            double[] mNum, double[] mDen, double[] cNum, double[] cDen, boolean referenceOnSp) {
        // L = M/(1−M) = mNum / (mDen − mNum)  [reference on sp, standard]
        // L = M/(M−1) = mNum / (mNum − mDen)  [reference on pv, reverse-acting]
        double[] lNum = mNum;
        double[] lDen = referenceOnSp
                ? subtractRaw(mDen, mNum)
                : subtractRaw(mNum, mDen);
        // G = L / C0 = (lNum·cDen) / (lDen·cNum)
        double[] gNum = PolynomialHelpers.multiplyRaw(lNum, cDen);
        double[] gDen = PolynomialHelpers.multiplyRaw(lDen, cNum);
        // Cancel the common s^k factor the recovery introduces: the controller's
        // integrator (cDen = s) and the type-1 loop's (1−M) each contribute a
        // root at the origin, which must cancel for G to have the right type.
        int drop = commonTrailingZeros(gNum, gDen);
        gNum = java.util.Arrays.copyOfRange(gNum, 0, gNum.length - drop);
        gDen = java.util.Arrays.copyOfRange(gDen, 0, gDen.length - drop);
        return new double[][]{trimLeadingZeros(gNum), trimLeadingZeros(gDen)};
    }

    /** Count trailing (constant-end) coefficients that are ≈0 in BOTH
     *  polynomials — the common factor of s^k to divide out of a ratio. */
    private static int commonTrailingZeros(double[] num, double[] den) {
        double scale = 0;
        for (double v : num) {
            scale = Math.max(scale, Math.abs(v));
        }
        for (double v : den) {
            scale = Math.max(scale, Math.abs(v));
        }
        double tol = (scale == 0 ? 1 : scale) * 1e-9;
        int drop = 0;
        int maxDrop = Math.min(num.length, den.length) - 1;
        while (drop < maxDrop
                && Math.abs(num[num.length - 1 - drop]) < tol
                && Math.abs(den[den.length - 1 - drop]) < tol) {
            drop++;
        }
        return drop;
    }

    /**
     * SISO state-space → transfer function {@code C(sI−A)⁻¹B + D}, computed
     * numerically via the Faddeev–LeVerrier (Souriau–Frame) recursion. Returns
     * {@code {num, den}}, both length n+1 (descending powers). This avoids the
     * symbolic CAS path, which can choke on some numerically-linearized systems.
     */
    public static double[][] ssToTf(double[][] a, double[] b, double[] c, double d) {
        int n = a.length;
        if (n == 0) {
            return new double[][]{{d}, {1.0}};
        }
        double[] den = new double[n + 1];
        den[0] = 1.0;
        double[] numAdj = new double[n]; // C·adj(sI−A)·B, descending s^{n-1}..s^0
        double[][] bk = identity(n);     // B_0 = I
        for (int k = 1; k <= n; k++) {
            // numerator contribution from B_{k-1}: c · (B_{k-1} · b)
            numAdj[k - 1] = dot(c, matVec(bk, b));
            double[][] abk = matMul(a, bk);
            double pk = -trace(abk) / k;
            den[k] = pk;
            // B_k = A·B_{k-1} + pk·I
            bk = addScaledIdentity(abk, pk);
        }
        // G_num = numAdj (deg n-1) + D·den (deg n); pad numAdj to length n+1.
        double[] num = new double[n + 1];
        System.arraycopy(numAdj, 0, num, 1, n);
        for (int i = 0; i <= n; i++) {
            num[i] += d * den[i];
        }
        return new double[][]{num, den};
    }

    private static double[][] identity(int n) {
        double[][] m = new double[n][n];
        for (int i = 0; i < n; i++) {
            m[i][i] = 1.0;
        }
        return m;
    }

    private static double[][] matMul(double[][] a, double[][] b) {
        int n = a.length;
        double[][] r = new double[n][n];
        for (int i = 0; i < n; i++) {
            for (int k = 0; k < n; k++) {
                double aik = a[i][k];
                if (aik == 0.0) {
                    continue;
                }
                for (int j = 0; j < n; j++) {
                    r[i][j] += aik * b[k][j];
                }
            }
        }
        return r;
    }

    private static double[] matVec(double[][] m, double[] v) {
        int n = m.length;
        double[] r = new double[n];
        for (int i = 0; i < n; i++) {
            double s = 0;
            for (int j = 0; j < n; j++) {
                s += m[i][j] * v[j];
            }
            r[i] = s;
        }
        return r;
    }

    private static double dot(double[] a, double[] b) {
        double s = 0;
        for (int i = 0; i < a.length && i < b.length; i++) {
            s += a[i] * b[i];
        }
        return s;
    }

    private static double trace(double[][] m) {
        double s = 0;
        for (int i = 0; i < m.length; i++) {
            s += m[i][i];
        }
        return s;
    }

    private static double[][] addScaledIdentity(double[][] m, double scalar) {
        double[][] r = new double[m.length][m.length];
        for (int i = 0; i < m.length; i++) {
            System.arraycopy(m[i], 0, r[i], 0, m.length);
            r[i][i] += scalar;
        }
        return r;
    }

    private static double[] subtractRaw(double[] a, double[] b) {
        double[] negB = b.clone();
        for (int i = 0; i < negB.length; i++) {
            negB[i] = -negB[i];
        }
        return PolynomialHelpers.addRaw(a, negB);
    }

    /** Drop leading (highest-order) zero coefficients; keep at least one term. */
    private static double[] trimLeadingZeros(double[] c) {
        int i = 0;
        while (i < c.length - 1 && c[i] == 0.0) {
            i++;
        }
        return i == 0 ? c : java.util.Arrays.copyOfRange(c, i, c.length);
    }

    /** Left-pad a coefficient vector with leading zeros to {@code len}. */
    private static double[] leftPad(double[] c, int len) {
        if (c.length >= len) {
            return c;
        }
        double[] out = new double[len];
        System.arraycopy(c, 0, out, len - c.length, c.length);
        return out;
    }

    /** Horner evaluation of a real-coefficient polynomial (descending) at s. */
    private static Complex horner(double[] coeffs, Complex s) {
        Complex v = Complex.ZERO;
        for (double c : coeffs) {
            v = v.multiply(s).add(c);
        }
        return v;
    }
}
