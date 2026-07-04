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

    /** Tuned gains + closed-loop step response + performance metrics. */
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

        double[] info = ControllerDesign.stepinfo(t, y);      // {tr, tp, ts, os}
        double[] mar = PolynomialHelpers.margin(loop[0], loop[1]); // {gm_db, pm, wcg, wcp}

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
        return Math.min(Math.max(7.0 / slowest, 2.0 / Math.max(wc, 1e-9)), 1e6);
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
