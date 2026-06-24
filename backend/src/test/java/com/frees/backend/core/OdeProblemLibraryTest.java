package com.frees.backend.core;

import com.frees.backend.core.ode.OdeTableResult;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * A library of 20 classic engineering-physics ODE problems (sourced from the EES
 * Clone NotebookLM notebook — EES manual / Mastering EES / Chapra) solved through
 * frees DYNAMIC blocks and verified against closed-form or well-known reference
 * answers. Collectively they exercise every solver in the roster: fixed-step
 * ode1–ode5, adaptive ode45/ode23, and stiff ode23s/ode15s. These mirror the
 * worked problems shipped in the Help page.
 */
class OdeProblemLibraryTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** Last-sample value of a column. */
    private double last(OdeTableResult t, String col) {
        int ci = t.columns().indexOf(col);
        return t.rows().get(t.rows().size() - 1).get(ci);
    }

    /** Value of a column at the sample nearest the given time. */
    private double at(OdeTableResult t, String col, double time) {
        int ci = t.columns().indexOf(col);
        int ti = t.columns().indexOf(t.columns().get(0)); // time is column 0
        double best = Double.MAX_VALUE;
        double val = 0;
        for (List<Double> row : t.rows()) {
            double d = Math.abs(row.get(0) - time);
            if (d < best) {
                best = d;
                val = row.get(ci);
            }
        }
        return val;
    }

    private OdeTableResult solveTable(String src) {
        var r = solver.solve(src);
        assertEquals(1, r.odeTables().size(), "expected one ODE table");
        return r.odeTables().get(0);
    }

    // ── First-order single-state ──────────────────────────────────────────────

    @Test
    void p01_radioactiveDecay_ode1() {
        // dc/dt = -k c, c = 100 e^{-0.175 t}.
        OdeTableResult t = solveTable("""
                k = 0.175
                DYNAMIC decay (method = ode1, t = 0 .. 20, points = 800)
                  der(c) = -k * c
                  c(0) = 100
                END
                """);
        assertEquals(100 * Math.exp(-0.175 * 20), last(t, "c"), 0.3);
    }

    @Test
    void p21_implicitDAE_ode15s() {
        // Implicitly defined ODE: der(x) + x = 0, x(0) = 1.
        // x = e^{-t}.
        OdeTableResult t = solveTable("""
                DYNAMIC dae (method = ode15s, t = 0 .. 1)
                  x(0) = 1
                  der(x) + x = 0
                END
                """);
        assertEquals(Math.exp(-1), last(t, "x"), 1e-4);
    }

    @Test
    void p02_rcCharging_ode2() {
        // de/dt = (es - e)/(RC), e = 10 (1 - e^{-1000 t}).
        OdeTableResult t = solveTable("""
                R = 1000
                C = 1e-6
                es = 10
                DYNAMIC rc (method = ode2, t = 0 .. 0.006, points = 400)
                  der(e) = (es - e) / (R * C)
                  e(0) = 0
                END
                """);
        assertEquals(10 * (1 - Math.exp(-1000 * 0.006)), last(t, "e"), 0.02);
    }

    @Test
    void p03_firstOrderReaction_ode3() {
        // A -> B: cA = e^{-k t}, cB = 1 - e^{-k t}.
        OdeTableResult t = solveTable("""
                k = 0.7
                DYNAMIC reaction (method = ode3, t = 0 .. 5, points = 300)
                  der(cA) = -k * cA
                  der(cB) =  k * cA
                  cA(0) = 1
                  cB(0) = 0
                END
                """);
        assertEquals(Math.exp(-0.7 * 5), last(t, "ca"), 1e-3);
        assertEquals(1 - Math.exp(-0.7 * 5), last(t, "cb"), 1e-3);
    }

    @Test
    void p04_rlCircuit_ode4() {
        // L di/dt + R i = 0, i = 0.5 e^{-1.5 t}.
        OdeTableResult t = solveTable("""
                L = 1
                R = 1.5
                DYNAMIC rl (method = ode4, t = 0 .. 2, points = 200)
                  der(i) = -(R / L) * i
                  i(0) = 0.5
                END
                """);
        assertEquals(0.5 * Math.exp(-1.5 * 2), last(t, "i"), 1e-4);
    }

    @Test
    void p05_newtonCooling_ode5() {
        // dT/dt = -k (T - Ta), T = Ta + (T0 - Ta) e^{-k t}.
        OdeTableResult t = solveTable("""
                k = 0.1
                Ta = 20
                DYNAMIC cooling (method = ode5, time = 0 .. 30, points = 200)
                  der(T) = -k * (T - Ta)
                  T(0) = 90
                END
                """);
        assertEquals(20 + 70 * Math.exp(-0.1 * 30), last(t, "t"), 1e-3);
    }

    @Test
    void p06_parachutistLinearDrag_ode45() {
        // dv/dt = g - (c/m) v, terminal v = g m / c = 53.44 m/s.
        OdeTableResult t = solveTable("""
                g = 9.81
                m = 68.1
                c = 12.5
                DYNAMIC fall (method = ode45, t = 0 .. 30, points = 600, rtol = 1e-8)
                  der(v) = g - (c / m) * v
                  v(0) = 0
                END
                """);
        double vt = 9.81 * 68.1 / 12.5;
        assertEquals(vt, last(t, "v"), 0.3);
        assertEquals(vt * (1 - Math.exp(-(12.5 / 68.1) * 15)), at(t, "v", 15), 0.1);
    }

    @Test
    void p07_tankDraining_ode23() {
        // dy/dt = -k sqrt(y), y = (sqrt(3) - 0.03 t)^2, k = 0.06.
        OdeTableResult t = solveTable("""
                k = 0.06
                DYNAMIC tank (method = ode23, t = 0 .. 20, points = 200, rtol = 1e-8)
                  der(y) = -k * sqrt(y)
                  y(0) = 3
                END
                """);
        double expected = Math.pow(Math.sqrt(3) - 0.03 * 20, 2);
        assertEquals(expected, last(t, "y"), 1e-3);
    }

    @Test
    void p08_logisticGrowth_ode45() {
        // dp/dt = r (1 - p/K) p, p = K / (1 + 3.6967 e^{-r t}).
        OdeTableResult t = solveTable("""
                r = 0.026
                K = 12000
                DYNAMIC logistic (method = ode45, t = 0 .. 100, points = 200, rtol = 1e-9)
                  der(p) = r * (1 - p / K) * p
                  p(0) = 2555
                END
                """);
        double expected = 12000 / (1 + 3.6967 * Math.exp(-0.026 * 100));
        assertEquals(expected, last(t, "p"), 5.0);
    }

    @Test
    void p09_terminalVelocityQuadraticDrag_ode45() {
        // dv/dt = g - (c/m) v^2, v = v_t tanh(t sqrt(g c / m)), v_t = sqrt(g m / c).
        OdeTableResult t = solveTable("""
                g = 9.81
                m = 70
                c = 0.25
                DYNAMIC fall2 (method = ode45, t = 0 .. 20, points = 300, rtol = 1e-9)
                  der(v) = g - (c / m) * v * v
                  v(0) = 0
                END
                """);
        double vt = Math.sqrt(9.81 * 70 / 0.25);
        double rate = Math.sqrt(9.81 * 0.25 / 70);
        // v(t) = v_t tanh(t·sqrt(g c / m)); at t = 20 it is within ~0.1% of v_t.
        assertEquals(vt * Math.tanh(20 * rate), last(t, "v"), 1e-3);
        assertEquals(vt * Math.tanh(10 * rate), at(t, "v", 10), 0.1);
    }

    @Test
    void p10_massSpringDamper_ode45() {
        // m x'' + c x' + k x = 0 (underdamped). x(0)=1, x'(0)=0.
        OdeTableResult t = solveTable("""
                m = 20
                c = 5
                k = 20
                DYNAMIC vib (method = ode45, t = 0 .. 15, points = 600, rtol = 1e-9)
                  der(x) = v
                  der(v) = -(c/m) * v - (k/m) * x
                  x(0) = 1
                  v(0) = 0
                END
                """);
        double wn = Math.sqrt(20.0 / 20.0);
        double zeta = 5.0 / (2 * Math.sqrt(20.0 * 20.0));
        double wd = wn * Math.sqrt(1 - zeta * zeta);
        double x5 = Math.exp(-zeta * wn * 5) * (Math.cos(wd * 5) + (zeta * wn / wd) * Math.sin(wd * 5));
        assertEquals(x5, at(t, "x", 5), 0.01);
    }

    @Test
    void p11_undampedSHM_ode4_energyConserved() {
        // x'' + w^2 x = 0, x = cos(w t); total energy E = 0.5 v^2 + 0.5 w^2 x^2 constant.
        OdeTableResult t = solveTable("""
                w = 2
                DYNAMIC shm (method = ode4, t = 0 .. 6.283185307, points = 400)
                  der(x) = v
                  der(v) = -w*w * x
                  E = 0.5 * v*v + 0.5 * w*w * x*x
                  x(0) = 1
                  v(0) = 0
                END
                """);
        // After one full period x returns to 1.
        assertEquals(1.0, last(t, "x"), 1e-3);
        // Energy is conserved across the whole trajectory.
        int ei = t.columns().indexOf("e");
        double min = Double.MAX_VALUE;
        double max = -Double.MAX_VALUE;
        for (List<Double> row : t.rows()) {
            min = Math.min(min, row.get(ei));
            max = Math.max(max, row.get(ei));
        }
        assertEquals(2.0, min, 1e-3);
        assertTrue(max - min < 1e-3, "energy drift " + (max - min));
    }

    @Test
    void p12_pendulumSmallAngle_ode5() {
        // theta'' + (g/l) theta = 0, theta = (pi/4) cos(sqrt(g/l) t).
        OdeTableResult t = solveTable("""
                g = 32.2
                l = 2
                DYNAMIC pend (method = ode5, t = 0 .. 3, points = 600)
                  der(theta) = omega
                  der(omega) = -(g/l) * theta
                  theta(0) = pi# / 4
                  omega(0) = 0
                END
                """);
        double expected = (Math.PI / 4) * Math.cos(Math.sqrt(32.2 / 2) * 1.0);
        assertEquals(expected, at(t, "theta", 1.0), 5e-3);
    }

    @Test
    void p13_seriesRLC_ode23() {
        // L q'' + R q' + (1/C) q = 0 (underdamped). q(0)=1, q'(0)=0.
        OdeTableResult t = solveTable("""
                L = 5
                R = 280
                Cap = 1e-4
                DYNAMIC rlc (method = ode23, t = 0 .. 0.2, points = 400, rtol = 1e-9)
                  der(q) = i
                  der(i) = -(R/L) * i - (1/(L*Cap)) * q
                  q(0) = 1
                  i(0) = 0
                END
                """);
        double alpha = 280.0 / (2 * 5.0);
        double wd = Math.sqrt(1.0 / (5.0 * 1e-4) - alpha * alpha);
        double q = Math.exp(-alpha * 0.05) * (Math.cos(wd * 0.05) + (alpha / wd) * Math.sin(wd * 0.05));
        assertEquals(q, at(t, "q", 0.05), 5e-3);
    }

    // ── Coupled multi-state ───────────────────────────────────────────────────

    @Test
    void p14_lotkaVolterra_ode45_conservedInvariant() {
        // Predator-prey; the invariant V = d x - c ln x + b y - a ln y is constant.
        OdeTableResult t = solveTable("""
                a = 1.2
                b = 0.6
                cc = 0.8
                d = 0.3
                DYNAMIC lv (method = ode45, t = 0 .. 30, points = 600, rtol = 1e-9)
                  der(x) = a*x - b*x*y
                  der(y) = -cc*y + d*x*y
                  V = d*x - cc*ln(x) + b*y - a*ln(y)
                  x(0) = 2
                  y(0) = 1
                END
                """);
        int vi = t.columns().indexOf("v");
        double min = Double.MAX_VALUE;
        double max = -Double.MAX_VALUE;
        for (List<Double> row : t.rows()) {
            min = Math.min(min, row.get(vi));
            max = Math.max(max, row.get(vi));
        }
        assertTrue(max - min < 1e-2, "invariant drift " + (max - min));
    }

    @Test
    void p15_coupledMixingTanks_ode23() {
        // Two tanks exchanging fluid; total mass conserved, both approach the mean.
        OdeTableResult t = solveTable("""
                kk = 0.5
                DYNAMIC tanks (method = ode23, t = 0 .. 20, points = 200, rtol = 1e-8)
                  der(c1) = kk * (c2 - c1)
                  der(c2) = kk * (c1 - c2)
                  total = c1 + c2
                  c1(0) = 10
                  c2(0) = 0
                END
                """);
        assertEquals(5.0, last(t, "c1"), 1e-2);
        assertEquals(5.0, last(t, "c2"), 1e-2);
        assertEquals(10.0, last(t, "total"), 1e-6);
    }

    @Test
    void p16_twoBodyCircularOrbit_ode45() {
        // Circular orbit r=1, mu=1, v=1; period 2pi returns to the start.
        OdeTableResult t = solveTable("""
                mu = 1
                DYNAMIC orbit (method = ode45, t = 0 .. 6.283185307, points = 400, rtol = 1e-10)
                  r = sqrt(x*x + y*y)
                  der(x) = vx
                  der(y) = vy
                  der(vx) = -mu * x / r^3
                  der(vy) = -mu * y / r^3
                  x(0) = 1
                  y(0) = 0
                  vx(0) = 0
                  vy(0) = 1
                END
                """);
        assertEquals(1.0, last(t, "x"), 2e-3);
        assertEquals(0.0, last(t, "y"), 2e-3);
        // Orbit radius stays unit throughout.
        assertEquals(1.0, at(t, "r", 3.14159), 2e-3);
    }

    // ── Stiff systems ─────────────────────────────────────────────────────────

    @Test
    void p17_classicStiffLinear_ode15s() {
        // y' = -1000 y + 3000 - 2000 e^{-t}; y = 3 - 0.998 e^{-1000 t} - 2.002 e^{-t}.
        OdeTableResult t = solveTable("""
                DYNAMIC stiff (method = ode15s, t = 0 .. 0.4, points = 200, rtol = 1e-7)
                  der(y) = -1000*y + 3000 - 2000*exp(-t)
                  y(0) = 0
                END
                """);
        double expected = 3 - 0.998 * Math.exp(-1000 * 0.4) - 2.002 * Math.exp(-0.4);
        assertEquals(expected, last(t, "y"), 1e-2);
    }

    @Test
    void p18_vanDerPolStiff_ode23s() {
        // mu = 1000: very stiff relaxation oscillator; the slow manifold keeps y1 bounded.
        OdeTableResult t = solveTable("""
                mu = 1000
                DYNAMIC vdp (method = ode23s, t = 0 .. 1, points = 100, rtol = 1e-4, atol = 1e-7)
                  der(y1) = y2
                  der(y2) = mu * (1 - y1*y1) * y2 - y1
                  y1(0) = 2
                  y2(0) = 0
                END
                """);
        assertTrue(Math.abs(last(t, "y1")) < 3.0, "y1 bounded: " + last(t, "y1"));
    }

    @Test
    void p19_robertsonKinetics_ode23s_massConserved() {
        // Robertson stiff kinetics; total concentration c1+c2+c3 = 1 always.
        OdeTableResult t = solveTable("""
                DYNAMIC rob (method = ode23s, t = 0 .. 40, points = 100, rtol = 1e-6, atol = 1e-10)
                  der(c1) = -0.04*c1 + 1e4*c2*c3
                  der(c2) = 0.04*c1 - 1e4*c2*c3 - 3e7*c2*c2
                  der(c3) = 3e7*c2*c2
                  c1(0) = 1
                  c2(0) = 0
                  c3(0) = 0
                END
                """);
        assertEquals(1.0, last(t, "c1") + last(t, "c2") + last(t, "c3"), 1e-4);
        assertTrue(last(t, "c1") > 0 && last(t, "c1") < 1, "c1 decays");
    }

    @Test
    void p20_stiffReactionChain_ode15s() {
        // A -> B -> C with disparate rates (k1=1000 fast, k2=1 slow); mass conserved.
        OdeTableResult t = solveTable("""
                k1 = 1000
                k2 = 1
                DYNAMIC chain (method = ode15s, t = 0 .. 5, points = 150, rtol = 1e-7)
                  der(a) = -k1 * a
                  der(b) =  k1 * a - k2 * b
                  der(cc) = k2 * b
                  a(0) = 1
                  b(0) = 0
                  cc(0) = 0
                END
                """);
        // Fast species A is essentially gone; total mass conserved.
        assertTrue(last(t, "a") < 1e-3, "A consumed: " + last(t, "a"));
        assertEquals(1.0, last(t, "a") + last(t, "b") + last(t, "cc"), 1e-3);
    }
}
