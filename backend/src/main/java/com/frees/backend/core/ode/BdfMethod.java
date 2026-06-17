package com.frees.backend.core.ode;

/**
 * {@code ode15s} — a stiff implicit BDF integrator. Each step uses backward
 * (implicit) Euler, which is L-stable, and obtains an error estimate and an
 * order-2 solution by step doubling (Richardson extrapolation): one full step
 * of size {@code h} versus two half steps. The implicit stage is solved with a
 * damped Newton iteration using a finite-difference Jacobian. Robust for stiff
 * systems where the explicit methods would need vanishingly small steps; also
 * serves the {@code ode23t}/{@code ode23tb} aliases.
 */
public final class BdfMethod implements OdeMethod {

    private static final double SAFETY = 0.9;
    private static final double MIN_SCALE = 0.2;
    private static final double MAX_SCALE = 4.0;
    private static final int NEWTON_MAX = 25;
    private static final double NEWTON_TOL = 1e-10;

    @Override
    public String name() {
        return "ode15s";
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
        double[] yBig = implicitEuler(f, t, y, h, f0);
        double[] yHalf = implicitEuler(f, t, y, 0.5 * h, f0);
        double[] fHalf = f.eval(t + 0.5 * h, yHalf);
        double[] yHalf2 = implicitEuler(f, t + 0.5 * h, yHalf, 0.5 * h, fHalf);

        double[] err = new double[n];
        for (int i = 0; i < n; i++) {
            err[i] = yHalf2[i] - yBig[i];
        }
        double errNorm = RungeKuttaMethod.errorNorm(err, y, yHalf2, p.rtol(), p.atol());

        // Richardson extrapolation lifts the order-1 result to order 2.
        double[] yNew = new double[n];
        for (int i = 0; i < n; i++) {
            yNew[i] = 2.0 * yHalf2[i] - yBig[i];
        }
        double exponent = 1.0 / 2.0;
        if (errNorm <= 1.0) {
            double[] fNew = f.eval(t + h, yNew);
            double scale = errNorm == 0.0 ? MAX_SCALE
                    : Math.min(MAX_SCALE, Math.max(MIN_SCALE, SAFETY * Math.pow(errNorm, -exponent)));
            double hNext = h * scale;
            if (p.maxStep() != null) {
                hNext = Math.min(hNext, p.maxStep());
            }
            return new StepResult(true, yNew, fNew, hNext);
        }
        double scale = Math.max(MIN_SCALE, SAFETY * Math.pow(errNorm, -exponent));
        return new StepResult(false, null, null, h * scale);
    }

    /** Solves {@code y1 = y + h·f(t+h, y1)} by Newton with an FD Jacobian. */
    private static double[] implicitEuler(OdeRhs f, double t, double[] y, double h, double[] f0) {
        int n = y.length;
        double tn = t + h;
        double[] y1 = new double[n];
        for (int i = 0; i < n; i++) {
            y1[i] = y[i] + h * f0[i];        // explicit-Euler predictor
        }
        for (int it = 0; it < NEWTON_MAX; it++) {
            double[] fEval = f.eval(tn, y1);
            double[] residual = new double[n];
            for (int i = 0; i < n; i++) {
                residual[i] = -(y1[i] - y[i] - h * fEval[i]);
            }
            double[][] jac = OdeLinearAlgebra.jacobian(f, tn, y1, fEval);
            double[][] newtonMatrix = OdeLinearAlgebra.identityMinus(h, jac); // I − h·J
            double[] delta = OdeLinearAlgebra.solve(newtonMatrix, residual);
            double dnorm = 0.0;
            double ynorm = 0.0;
            for (int i = 0; i < n; i++) {
                y1[i] += delta[i];
                dnorm += delta[i] * delta[i];
                ynorm += y1[i] * y1[i];
            }
            if (Math.sqrt(dnorm) <= NEWTON_TOL * (1.0 + Math.sqrt(ynorm))) {
                break;
            }
        }
        return y1;
    }
}
