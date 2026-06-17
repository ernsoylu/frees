package com.frees.backend.core.ode;

import com.frees.backend.core.SolverException;

import java.util.ArrayList;
import java.util.List;

/**
 * The ODE driver: it owns the time loop, step guards, dense-output sampling and
 * event detection, delegating only the single-step advance to a pluggable
 * {@link OdeMethod} (explicit Runge–Kutta or stiff Rosenbrock/BDF). Accepted
 * steps are stored as {@code (t, y, f)} knots; output is sampled at evenly
 * spaced times via cubic Hermite interpolation, and event switching functions
 * are monitored for zero crossings between knots (bracket + bisection on the
 * same interpolant). Reuses {@code IntegralSolver}'s guard style: a hard step
 * cap, a wall-clock deadline, and NaN/Inf rejection with clear errors.
 */
public final class OdeIntegrator {

    private static final int MAX_STEPS = 1_000_000;
    private static final int BISECTION_ITERS = 60;

    public OdeResult integrate(OdeProblem p) {
        OdeMethod method = resolveMethod(p.method());
        int n = p.dimension();
        if (p.tf() <= p.t0()) {
            throw new SolverException("DYNAMIC: the time span must satisfy t0 < tf (got "
                    + p.t0() + " .. " + p.tf() + ").");
        }
        double span = p.tf() - p.t0();
        double minStep = span * 1e-12;

        List<Double> knotT = new ArrayList<>();
        List<double[]> knotY = new ArrayList<>();
        List<double[]> knotF = new ArrayList<>();

        double t = p.t0();
        double[] y = p.y0().clone();
        double[] f = p.rhs().eval(t, y);
        checkFinite(f, t, "initial derivative");
        knotT.add(t);
        knotY.add(y.clone());
        knotF.add(f.clone());

        boolean fixed = !method.adaptive();
        double hFixed = p.fixedStep() != null ? p.fixedStep() : span / (p.sampleCount() - 1);
        double h = fixed ? hFixed
                : (p.fixedStep() != null ? p.fixedStep()
                        : initialStep(p, method, y, f, span));
        if (p.maxStep() != null) {
            h = Math.min(h, p.maxStep());
        }

        List<OdeResult.EventRecord> recorded = new ArrayList<>();
        double[] gPrev = evalEvents(p, t, y);
        int accepted = 0;
        int rejected = 0;
        int steps = 0;
        boolean stopped = false;
        double endTime = p.tf();

        while (t < p.tf() - minStep) {
            guard(++steps, p);
            double hUse = Math.min(h, p.tf() - t);
            OdeMethod.StepResult sr = method.step(p.rhs(), t, y, f, hUse, p);
            while (!sr.accepted()) {
                rejected++;
                hUse = Math.min(sr.hNext(), p.tf() - t);
                if (hUse < minStep) {
                    throw new SolverException("DYNAMIC: step size underflow near t = " + t
                            + " — the system may be too stiff for method '" + p.method()
                            + "' (try ode23s or ode15s).");
                }
                guard(++steps, p);
                sr = method.step(p.rhs(), t, y, f, hUse, p);
            }
            double tNew = t + hUse;
            double[] yNew = sr.yNew();
            double[] fNew = sr.fNew();
            checkFinite(yNew, tNew, "state");
            checkFinite(fNew, tNew, "derivative");

            double[] gNew = evalEvents(p, tNew, yNew);
            EventHit hit = earliestEvent(p, t, y, f, tNew, yNew, fNew, gPrev, gNew);
            if (hit != null) {
                recorded.add(new OdeResult.EventRecord(hit.name, hit.time, hit.y.clone()));
                if (hit.stop) {
                    knotT.add(hit.time);
                    knotY.add(hit.y.clone());
                    knotF.add(p.rhs().eval(hit.time, hit.y));
                    endTime = hit.time;
                    stopped = true;
                    break;
                }
            }

            accepted++;
            t = tNew;
            y = yNew;
            f = fNew;
            gPrev = gNew;
            knotT.add(t);
            knotY.add(y.clone());
            knotF.add(f.clone());

            h = fixed ? hFixed : sr.hNext();
            if (p.maxStep() != null) {
                h = Math.min(h, p.maxStep());
            }
        }

        double[][] sampled = sample(knotT, knotY, knotF, p.t0(), endTime, p.sampleCount(), n);
        double[] times = new double[sampled.length];
        double[][] states = new double[sampled.length][];
        for (int i = 0; i < sampled.length; i++) {
            times[i] = sampled[i][0];
            states[i] = new double[n];
            System.arraycopy(sampled[i], 1, states[i], 0, n);
        }
        return new OdeResult(times, states, recorded, stopped, endTime, accepted, rejected);
    }

    // ── Method resolution ───────────────────────────────────────────────────

    private static OdeMethod resolveMethod(String name) {
        String m = name == null ? "ode45" : name.toLowerCase();
        return switch (m) {
            case "ode1", "euler" -> new RungeKuttaMethod(ButcherTableau.euler());
            case "ode2", "heun" -> new RungeKuttaMethod(ButcherTableau.heun());
            case "ode3" -> new RungeKuttaMethod(ButcherTableau.rk3());
            case "ode4", "rk4" -> new RungeKuttaMethod(ButcherTableau.rk4());
            case "ode5" -> new RungeKuttaMethod(ButcherTableau.dopri5Fixed());
            case "ode45" -> new RungeKuttaMethod(ButcherTableau.dopri54());
            case "ode23" -> new RungeKuttaMethod(ButcherTableau.bogackiShampine32());
            case "ode23s" -> new RosenbrockMethod();
            case "ode15s", "ode23t", "ode23tb" -> new BdfMethod();
            default -> throw new SolverException("DYNAMIC: unknown method '" + name
                    + "'. Supported: ode1, ode2, ode3, ode4, ode5, ode45, ode23, "
                    + "ode23s (stiff), ode15s (stiff).");
        };
    }

    /**
     * Hairer's automatic initial step-size estimate (Solving ODEs I, II.4). A
     * fixed fraction of the span is a poor first step for systems with fast early
     * dynamics — too large a first step can diverge before the controller
     * recovers. This bases the first step on the scaled norms of {@code y0} and
     * {@code f(t0,y0)} and a trial derivative.
     */
    private static double initialStep(OdeProblem p, OdeMethod method, double[] y0,
                                      double[] f0, double span) {
        int n = y0.length;
        double[] scale = new double[n];
        for (int i = 0; i < n; i++) {
            scale[i] = p.atol() + p.rtol() * Math.abs(y0[i]);
        }
        double d0 = scaledNorm(y0, scale);
        double d1 = scaledNorm(f0, scale);
        double h0 = (d0 < 1e-5 || d1 < 1e-5) ? 1e-6 : 0.01 * d0 / d1;
        h0 = Math.min(h0, span);

        double[] y1 = new double[n];
        for (int i = 0; i < n; i++) {
            y1[i] = y0[i] + h0 * f0[i];
        }
        double[] f1 = p.rhs().eval(p.t0() + h0, y1);
        double[] df = new double[n];
        for (int i = 0; i < n; i++) {
            df[i] = (f1[i] - f0[i]);
        }
        double d2 = scaledNorm(df, scale) / h0;

        double maxD = Math.max(d1, d2);
        double h1 = maxD <= 1e-15
                ? Math.max(1e-6, h0 * 1e-3)
                : Math.pow(0.01 / maxD, 1.0 / (method.order() + 1));
        double h = Math.min(100 * h0, h1);
        return Math.min(Math.max(h, span * 1e-9), span);
    }

    private static double scaledNorm(double[] v, double[] scale) {
        double sum = 0;
        for (int i = 0; i < v.length; i++) {
            double r = v[i] / scale[i];
            sum += r * r;
        }
        return Math.sqrt(sum / v.length);
    }

    // ── Guards ──────────────────────────────────────────────────────────────

    private static void guard(int steps, OdeProblem p) {
        if (steps > MAX_STEPS) {
            throw new SolverException("DYNAMIC: exceeded " + MAX_STEPS
                    + " integration steps — the system may be too stiff or the tolerances too tight.");
        }
        if (System.nanoTime() > p.deadlineNanos()) {
            throw new SolverException("DYNAMIC: integration exceeded the elapsed time limit.");
        }
    }

    private static void checkFinite(double[] v, double t, String what) {
        for (double x : v) {
            if (Double.isNaN(x) || Double.isInfinite(x)) {
                throw new SolverException("DYNAMIC: non-finite " + what + " (NaN/Inf) at t = " + t
                        + " — check the model for division by zero or domain errors.");
            }
        }
    }

    // ── Events ──────────────────────────────────────────────────────────────

    private record EventHit(String name, double time, double[] y, boolean stop) {}

    private static double[] evalEvents(OdeProblem p, double t, double[] y) {
        if (p.events().isEmpty()) {
            return new double[0];
        }
        double[] g = new double[p.events().size()];
        for (int i = 0; i < g.length; i++) {
            g[i] = p.events().get(i).g().eval(t, y);
        }
        return g;
    }

    /** Earliest matching zero crossing across all events on (t, tNew], refined
     *  on the Hermite interpolant; null if none. */
    private static EventHit earliestEvent(OdeProblem p, double t, double[] y, double[] f,
                                          double tNew, double[] yNew, double[] fNew,
                                          double[] gPrev, double[] gNew) {
        EventHit best = null;
        for (int i = 0; i < p.events().size(); i++) {
            OdeEvent ev = p.events().get(i);
            if (!ev.triggers(gPrev[i], gNew[i])) {
                continue;
            }
            double tc = refineCrossing(ev, t, y, f, tNew, yNew, fNew);
            double[] yc = hermite(t, y, f, tNew, yNew, fNew, tc);
            if (best == null || tc < best.time) {
                best = new EventHit(ev.name(), tc, yc, ev.stop());
            }
        }
        return best;
    }

    private static double refineCrossing(OdeEvent ev, double t, double[] y, double[] f,
                                         double tNew, double[] yNew, double[] fNew) {
        double lo = t;
        double hi = tNew;
        double gLo = ev.g().eval(lo, y);
        for (int it = 0; it < BISECTION_ITERS; it++) {
            double mid = 0.5 * (lo + hi);
            double[] ym = hermite(t, y, f, tNew, yNew, fNew, mid);
            double gm = ev.g().eval(mid, ym);
            if (gm == 0.0) {
                return mid;
            }
            if ((gLo < 0) != (gm < 0)) {
                hi = mid;
            } else {
                lo = mid;
                gLo = gm;
            }
        }
        return 0.5 * (lo + hi);
    }

    // ── Dense output (cubic Hermite) ────────────────────────────────────────

    static double[] hermite(double t0, double[] y0, double[] f0,
                            double t1, double[] y1, double[] f1, double tau) {
        int n = y0.length;
        double dt = t1 - t0;
        double[] out = new double[n];
        if (dt == 0.0) {
            System.arraycopy(y1, 0, out, 0, n);
            return out;
        }
        double th = (tau - t0) / dt;
        double th2 = th * th;
        double th3 = th2 * th;
        double h00 = 2 * th3 - 3 * th2 + 1;
        double h10 = th3 - 2 * th2 + th;
        double h01 = -2 * th3 + 3 * th2;
        double h11 = th3 - th2;
        for (int d = 0; d < n; d++) {
            out[d] = h00 * y0[d] + h10 * dt * f0[d] + h01 * y1[d] + h11 * dt * f1[d];
        }
        return out;
    }

    /** Samples the trajectory at {@code count} evenly spaced times in
     *  {@code [t0, endTime]}; each output row is {@code [t, y0, y1, …]}. */
    private static double[][] sample(List<Double> knotT, List<double[]> knotY, List<double[]> knotF,
                                     double t0, double endTime, int count, int n) {
        double[][] out = new double[count][n + 1];
        int knot = 0;
        int knots = knotT.size();
        for (int i = 0; i < count; i++) {
            double tau = count == 1 ? endTime
                    : t0 + (endTime - t0) * i / (double) (count - 1);
            while (knot < knots - 2 && knotT.get(knot + 1) < tau) {
                knot++;
            }
            int lo = Math.min(knot, knots - 2);
            int hi = lo + 1;
            double[] yi = hermite(knotT.get(lo), knotY.get(lo), knotF.get(lo),
                    knotT.get(hi), knotY.get(hi), knotF.get(hi), tau);
            out[i][0] = tau;
            System.arraycopy(yi, 0, out[i], 1, n);
        }
        return out;
    }
}
