package com.frees.backend.core.ode;

/**
 * A Butcher tableau for an explicit Runge–Kutta method. {@code a} is the strict
 * lower-triangular stage-coefficient matrix ({@code a[i]} has length {@code i}),
 * {@code c} the stage nodes, {@code b} the high-order solution weights. When
 * {@code bErr} (= {@code b − b_hat}) is non-null the method is an embedded pair
 * usable for adaptive step-size control, with {@code errorOrder} the lower order
 * of the pair (the exponent in the step-size controller). {@code fsal} marks a
 * First-Same-As-Last pair (last stage equals the next step's first derivative).
 */
public final class ButcherTableau {

    public final String name;
    public final double[] c;
    public final double[][] a;
    public final double[] b;
    public final double[] bErr;
    public final int errorOrder;
    public final boolean fsal;
    public final int stages;

    public ButcherTableau(String name, double[] c, double[][] a, double[] b,
                          double[] bErr, int errorOrder, boolean fsal) {
        this.name = name;
        this.c = c;
        this.a = a;
        this.b = b;
        this.bErr = bErr;
        this.errorOrder = errorOrder;
        this.fsal = fsal;
        this.stages = b.length;
    }

    public boolean adaptive() {
        return bErr != null;
    }

    // ── Fixed-step explicit methods (Simulink ode1–ode5) ────────────────────

    /** ode1 — explicit (forward) Euler, order 1. */
    public static ButcherTableau euler() {
        return new ButcherTableau("ode1",
                new double[]{0},
                new double[][]{{}},
                new double[]{1}, null, 1, false);
    }

    /** ode2 — Heun's method (explicit trapezoid), order 2. */
    public static ButcherTableau heun() {
        return new ButcherTableau("ode2",
                new double[]{0, 1},
                new double[][]{{}, {1}},
                new double[]{0.5, 0.5}, null, 2, false);
    }

    /** ode3 — Kutta's third-order method. */
    public static ButcherTableau rk3() {
        return new ButcherTableau("ode3",
                new double[]{0, 0.5, 1},
                new double[][]{{}, {0.5}, {-1, 2}},
                new double[]{1.0 / 6, 2.0 / 3, 1.0 / 6}, null, 3, false);
    }

    /** ode4 — the classic fourth-order Runge–Kutta method. */
    public static ButcherTableau rk4() {
        return new ButcherTableau("ode4",
                new double[]{0, 0.5, 0.5, 1},
                new double[][]{{}, {0.5}, {0, 0.5}, {0, 0, 1}},
                new double[]{1.0 / 6, 1.0 / 3, 1.0 / 3, 1.0 / 6}, null, 4, false);
    }

    /** ode5 — Dormand–Prince fifth-order weights used as a fixed-step method. */
    public static ButcherTableau dopri5Fixed() {
        ButcherTableau pair = dopri54();
        return new ButcherTableau("ode5", pair.c, pair.a, pair.b, null, 5, false);
    }

    // ── Adaptive embedded pairs ─────────────────────────────────────────────

    /** ode45 — Dormand–Prince 5(4), the default adaptive method (FSAL). */
    public static ButcherTableau dopri54() {
        double[] c = {0, 1.0 / 5, 3.0 / 10, 4.0 / 5, 8.0 / 9, 1, 1};
        double[][] a = {
                {},
                {1.0 / 5},
                {3.0 / 40, 9.0 / 40},
                {44.0 / 45, -56.0 / 15, 32.0 / 9},
                {19372.0 / 6561, -25360.0 / 2187, 64448.0 / 6561, -212.0 / 729},
                {9017.0 / 3168, -355.0 / 33, 46732.0 / 5247, 49.0 / 176, -5103.0 / 18656},
                {35.0 / 384, 0, 500.0 / 1113, 125.0 / 192, -2187.0 / 6784, 11.0 / 84}
        };
        double[] b = {35.0 / 384, 0, 500.0 / 1113, 125.0 / 192, -2187.0 / 6784, 11.0 / 84, 0};
        double[] bHat = {5179.0 / 57600, 0, 7571.0 / 16695, 393.0 / 640,
                -92097.0 / 339200, 187.0 / 2100, 1.0 / 40};
        double[] bErr = new double[b.length];
        for (int i = 0; i < b.length; i++) {
            bErr[i] = b[i] - bHat[i];
        }
        return new ButcherTableau("ode45", c, a, b, bErr, 4, true);
    }

    /** ode23 — Bogacki–Shampine 3(2) adaptive pair (FSAL). */
    public static ButcherTableau bogackiShampine32() {
        double[] c = {0, 1.0 / 2, 3.0 / 4, 1};
        double[][] a = {
                {},
                {1.0 / 2},
                {0, 3.0 / 4},
                {2.0 / 9, 1.0 / 3, 4.0 / 9}
        };
        double[] b = {2.0 / 9, 1.0 / 3, 4.0 / 9, 0};
        double[] bHat = {7.0 / 24, 1.0 / 4, 1.0 / 3, 1.0 / 8};
        double[] bErr = new double[b.length];
        for (int i = 0; i < b.length; i++) {
            bErr[i] = b[i] - bHat[i];
        }
        return new ButcherTableau("ode23", c, a, b, bErr, 2, true);
    }
}
