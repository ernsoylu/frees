package com.frees.backend.core.ode;

/**
 * Explicit Runge–Kutta stepper driven by a {@link ButcherTableau}. Handles both
 * fixed-step methods (no embedded error estimate) and adaptive embedded pairs
 * with a PI-style step-size controller (rtol/atol, array-language-like). The driver in
 * {@link OdeIntegrator} owns the time loop and dense-output sampling.
 */
public final class RungeKuttaMethod implements OdeMethod {

    private static final double SAFETY = 0.9;
    private static final double MIN_SCALE = 0.2;
    private static final double MAX_SCALE = 5.0;

    private final ButcherTableau t;

    public RungeKuttaMethod(ButcherTableau tableau) {
        this.t = tableau;
    }

    @Override
    public String name() {
        return t.name;
    }

    @Override
    public boolean adaptive() {
        return t.adaptive();
    }

    @Override
    public int order() {
        return t.adaptive() ? t.errorOrder + 1 : t.errorOrder;
    }

    @Override
    public StepResult step(OdeRhs f, double time, double[] y, double[] f0, double h,
                           OdeProblem problem) {
        int n = y.length;
        int s = t.stages;
        double[][] k = new double[s][];
        k[0] = f0;
        for (int i = 1; i < s; i++) {
            double[] yi = stageState(y, t.a[i], k, h, n);
            k[i] = f.eval(time + t.c[i] * h, yi);
        }

        double[] yNew = y.clone();
        accumulateWeighted(yNew, t.b, k, h, s, n);

        if (!t.adaptive()) {
            double[] fNew = f.eval(time + h, yNew);
            return new StepResult(true, yNew, fNew, h);
        }

        // Embedded error estimate.
        double[] errVec = new double[n];
        accumulateWeighted(errVec, t.bErr, k, h, s, n);
        double err = errorNorm(errVec, y, yNew, problem.rtol(), problem.atol());
        double exponent = 1.0 / (t.errorOrder + 1);
        if (!Double.isFinite(err) || !allFinite(yNew)) {
            // A stage diverged (NaN/Inf) — reject hard and shrink the step.
            return new StepResult(false, null, null, h * MIN_SCALE);
        }
        if (err <= 1.0) {
            double[] fNew = f.eval(time + h, yNew);
            double scale = err == 0.0 ? MAX_SCALE
                    : Math.min(MAX_SCALE, Math.max(MIN_SCALE, SAFETY * Math.pow(err, -exponent)));
            return new StepResult(true, yNew, fNew, capStep(h * scale, problem));
        }
        double scale = Math.max(MIN_SCALE, SAFETY * Math.pow(err, -exponent));
        return new StepResult(false, null, null, h * scale);
    }

    /** Intermediate stage state {@code yi = y + h·Σ_j a[j]·k[j]} (zero coefficients skipped). */
    private static double[] stageState(double[] y, double[] ai, double[][] k, double h, int n) {
        double[] yi = y.clone();
        for (int j = 0; j < ai.length; j++) {
            double aij = ai[j];
            if (aij == 0.0) {
                continue;
            }
            for (int d = 0; d < n; d++) {
                yi[d] += h * aij * k[j][d];
            }
        }
        return yi;
    }

    /** Adds {@code h·Σ_i coeff[i]·k[i]} into {@code out} (zero coefficients skipped). */
    private static void accumulateWeighted(double[] out, double[] coeff, double[][] k, double h, int s, int n) {
        for (int i = 0; i < s; i++) {
            double ci = coeff[i];
            if (ci == 0.0) {
                continue;
            }
            for (int d = 0; d < n; d++) {
                out[d] += h * ci * k[i][d];
            }
        }
    }

    /** RMS norm of the error vector scaled by atol + rtol·max(|y|,|yNew|). */
    static double errorNorm(double[] errVec, double[] y, double[] yNew,
                            double rtol, double atol) {
        int n = errVec.length;
        double sum = 0.0;
        for (int d = 0; d < n; d++) {
            double sc = atol + rtol * Math.max(Math.abs(y[d]), Math.abs(yNew[d]));
            double r = errVec[d] / sc;
            sum += r * r;
        }
        return Math.sqrt(sum / n);
    }

    private static boolean allFinite(double[] v) {
        for (double x : v) {
            if (!Double.isFinite(x)) {
                return false;
            }
        }
        return true;
    }

    private static double capStep(double h, OdeProblem problem) {
        if (problem.maxStep() != null && h > problem.maxStep()) {
            return problem.maxStep();
        }
        return h;
    }
}
