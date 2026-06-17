package com.frees.backend.core.ode;

/**
 * {@code ode23s} — Shampine's modified Rosenbrock (2,3) pair, a linearly
 * implicit one-step method for stiff systems (the scheme MATLAB's {@code ode23s}
 * uses). Each step forms the iteration matrix {@code W = I − h·d·J} once from a
 * finite-difference Jacobian, then takes three linear solves; the third stage
 * yields an embedded order-3 error estimate for adaptive step control. L-stable
 * and well-suited to Van der Pol (large μ) and Robertson kinetics.
 */
public final class RosenbrockMethod implements OdeMethod {

    private static final double D = 1.0 / (2.0 + Math.sqrt(2.0));
    private static final double E32 = 6.0 + Math.sqrt(2.0);
    private static final double SAFETY = 0.9;
    private static final double MIN_SCALE = 0.2;
    private static final double MAX_SCALE = 5.0;

    @Override
    public String name() {
        return "ode23s";
    }

    @Override
    public boolean adaptive() {
        return true;
    }

    @Override
    public int order() {
        return 2;
    }

    @Override
    public StepResult step(OdeRhs f, double t, double[] y, double[] f0, double h, OdeProblem p) {
        int n = y.length;
        double span = p.tf() - p.t0();
        double[][] jac = OdeLinearAlgebra.jacobian(f, t, y, f0);
        double[] dfdt = OdeLinearAlgebra.dfdt(f, t, y, f0, span);
        double[][] w = OdeLinearAlgebra.identityMinus(h * D, jac);

        // Stage 1: W·k1 = f0 + h·d·(∂f/∂t)
        double[] b1 = new double[n];
        for (int i = 0; i < n; i++) {
            b1[i] = f0[i] + h * D * dfdt[i];
        }
        double[] k1 = OdeLinearAlgebra.solve(w, b1);

        // Stage 2: W·(k2−k1) = f(t+h/2, y+h/2·k1) − k1
        double[] y1 = new double[n];
        for (int i = 0; i < n; i++) {
            y1[i] = y[i] + 0.5 * h * k1[i];
        }
        double[] f1 = f.eval(t + 0.5 * h, y1);
        double[] b2 = new double[n];
        for (int i = 0; i < n; i++) {
            b2[i] = f1[i] - k1[i];
        }
        double[] k2 = OdeLinearAlgebra.solve(w, b2);
        for (int i = 0; i < n; i++) {
            k2[i] += k1[i];
        }

        double[] yNew = new double[n];
        for (int i = 0; i < n; i++) {
            yNew[i] = y[i] + h * k2[i];
        }
        double[] f2 = f.eval(t + h, yNew);

        // Stage 3 (error estimate): W·k3 = f2 − e32·(k2−f1) − 2·(k1−f0) + h·d·(∂f/∂t)
        double[] b3 = new double[n];
        for (int i = 0; i < n; i++) {
            b3[i] = f2[i] - E32 * (k2[i] - f1[i]) - 2.0 * (k1[i] - f0[i]) + h * D * dfdt[i];
        }
        double[] k3 = OdeLinearAlgebra.solve(w, b3);

        double[] err = new double[n];
        for (int i = 0; i < n; i++) {
            err[i] = (h / 6.0) * (k1[i] - 2.0 * k2[i] + k3[i]);
        }
        double errNorm = RungeKuttaMethod.errorNorm(err, y, yNew, p.rtol(), p.atol());
        double exponent = 1.0 / 3.0;
        if (errNorm <= 1.0) {
            double scale = errNorm == 0.0 ? MAX_SCALE
                    : Math.min(MAX_SCALE, Math.max(MIN_SCALE, SAFETY * Math.pow(errNorm, -exponent)));
            double hNext = h * scale;
            if (p.maxStep() != null) {
                hNext = Math.min(hNext, p.maxStep());
            }
            return new StepResult(true, yNew, f2, hNext);
        }
        double scale = Math.max(MIN_SCALE, SAFETY * Math.pow(errNorm, -exponent));
        return new StepResult(false, null, null, h * scale);
    }
}
