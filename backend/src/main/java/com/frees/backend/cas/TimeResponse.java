package com.frees.backend.cas;

import com.frees.backend.core.ode.OdeIntegrator;
import com.frees.backend.core.ode.OdeProblem;
import com.frees.backend.core.ode.OdeRhs;

import java.util.List;

/**
 * Time-domain responses of a SISO LTI system: unit step, impulse, and arbitrary
 * forced response ({@code lsim}).
 *
 * <p>Per the control-systems architecture, time responses route through the
 * tested {@link OdeIntegrator} (RK/BDF) rather than a bespoke matrix-exponential:
 * a transfer function {@code num/den} is converted to controllable canonical
 * state space {@code (A, B, C, D)} via {@link StateSpace#tf2ss}, then the state
 * equation {@code x' = A x + B u(t)} is integrated and sampled at the requested
 * time points with the integrator's Hermite dense output. The scalar output is
 * {@code y = C x + D u}.
 *
 * <ul>
 *   <li><b>step</b>: {@code u(t) = 1}, {@code x(0) = 0}.</li>
 *   <li><b>impulse</b>: {@code x(0) = B}, {@code u(t) = 0} — the {@code C e^{At} B}
 *       response (the {@code D} direct-feedthrough delta term is not representable
 *       on a sampled grid and is omitted).</li>
 *   <li><b>lsim</b>: {@code x(0) = 0} with the supplied input {@code u} linearly
 *       interpolated between sample times.</li>
 * </ul>
 */
public final class TimeResponse {

    /** Per-integration wall-clock budget (ns). */
    private static final long BUDGET_NANOS = 5_000_000_000L;

    public enum Kind { STEP, IMPULSE, LSIM }

    private TimeResponse() {
    }

    /** Time response for a transfer function {@code num/den} (descending powers). */
    public static double[] response(Kind kind, double[] num, double[] den, double[] u, double[] t) {
        StateSpace.StateSpaceMatrices ss = StateSpace.tf2ss(num, den);
        return responseSS(kind, ss.a(), ss.b(), ss.c(), ss.d(), u, t);
    }

    /**
     * Time response for a state-space model. {@code u} is consulted only for
     * {@link Kind#LSIM} (it may be {@code null} for step/impulse).
     */
    public static double[] responseSS(Kind kind, double[][] a, double[] b, double[] c, double d,
                                      double[] u, double[] t) {
        int big = t.length;
        int n = a.length;
        double[] y = new double[big];

        // Pure-gain system (no states): y = D * u.
        if (n == 0) {
            for (int i = 0; i < big; i++) {
                y[i] = d * inputAt(kind, u, i);
            }
            return y;
        }

        double[] y0 = new double[n];
        OdeRhs rhs;
        switch (kind) {
            case STEP -> rhs = (tt, x) -> deriv(a, b, x, 1.0);
            case IMPULSE -> {
                y0 = b.clone();
                rhs = (tt, x) -> deriv(a, b, x, 0.0);
            }
            case LSIM -> rhs = (tt, x) -> deriv(a, b, x, interp(t, u, tt));
            default -> throw new IllegalArgumentException("Unknown response kind: " + kind);
        }

        double t0 = t[0];
        double tf = t[big - 1];
        // Degenerate window (single point, or non-increasing times): the integrator
        // requires t0 < tf, so just report the initial output everywhere.
        if (tf <= t0) {
            for (int i = 0; i < big; i++) {
                y[i] = dot(c, y0) + d * inputAt(kind, u, i);
            }
            return y;
        }

        OdeProblem problem = new OdeProblem(
                "ode45", t0, tf, y0, rhs, null, null,
                1e-7, 1e-9, null, List.of(), System.nanoTime() + BUDGET_NANOS);
        double[][] states = new OdeIntegrator().integrateAndSampleAt(problem, t);

        for (int i = 0; i < big; i++) {
            y[i] = dot(c, states[i]) + d * inputAt(kind, u, i);
        }
        return y;
    }

    /** x' = A x + B u for the controllable canonical (column) B vector. */
    private static double[] deriv(double[][] a, double[] b, double[] x, double u) {
        int n = x.length;
        double[] dx = new double[n];
        for (int i = 0; i < n; i++) {
            double s = 0.0;
            for (int j = 0; j < n; j++) {
                s += a[i][j] * x[j];
            }
            dx[i] = s + b[i] * u;
        }
        return dx;
    }

    private static double dot(double[] c, double[] x) {
        double s = 0.0;
        for (int i = 0; i < c.length; i++) {
            s += c[i] * x[i];
        }
        return s;
    }

    /** The driving input value contributed to the output at sample {@code i}. */
    private static double inputAt(Kind kind, double[] u, int i) {
        return switch (kind) {
            case STEP -> 1.0;
            case IMPULSE -> 0.0;
            case LSIM -> u[i];
        };
    }

    /** Linear interpolation of the sampled input {@code u(t)} at time {@code tt}. */
    private static double interp(double[] t, double[] u, double tt) {
        int n = t.length;
        if (tt <= t[0]) {
            return u[0];
        }
        if (tt >= t[n - 1]) {
            return u[n - 1];
        }
        int lo = 0;
        int hi = n - 1;
        while (hi - lo > 1) {
            int mid = (lo + hi) >>> 1;
            if (t[mid] <= tt) {
                lo = mid;
            } else {
                hi = mid;
            }
        }
        double span = t[hi] - t[lo];
        if (span <= 0) {
            return u[lo];
        }
        double w = (tt - t[lo]) / span;
        return u[lo] + w * (u[hi] - u[lo]);
    }
}
