package com.frees.backend.core;

import com.frees.backend.core.ode.OdeTableResult;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Capstone acceptance test — the loss-accurate sounding-rocket trajectory that
 * exercises every layer of the DYNAMIC feature at once:
 *
 * <ul>
 *   <li>coupled multi-state system der(h)=v, der(v)=(F−D−m·g0)/m, der(m)=−mdot
 *       (states share one step cursor — what single-state Integral lacks);</li>
 *   <li>aerodynamic drag with an exponential-atmosphere density, resolved as a
 *       per-step algebraic auxiliary;</li>
 *   <li>thrust/mdot gated off at burnout via the EES If() conditional;</li>
 *   <li>an apogee event (v = 0 → stop);</li>
 *   <li>an ODE Table feeding state-vs-time / state-vs-state plots;</li>
 *   <li>the loop closed by an accessor: the propellant burn time is sized so the
 *       apogee altitude equals 100 km (MaxValue('h') = h_target), live during the
 *       analytic Newton solve.</li>
 * </ul>
 */
class OdeRocketTrajectoryTest {

    private static final String ROCKET = """
            g0     = 9.81
            m0     = 600
            mdot   = 9
            F0     = 28000
            Cd     = 0.3
            A      = 0.03
            rho0   = 1.225
            Hscale = 8000
            h_target = 100000

            m_burn = mdot * t_burn
            MaxValue('h') = h_target

            DYNAMIC ascent (method = ode45, time = 0 .. 600, points = 500, rtol = 1e-7, atol = 1e-3)
              thrust = If(time, t_burn, F0, F0, 0)
              mflow  = If(time, t_burn, mdot, mdot, 0)
              rho    = rho0 * exp(-h / Hscale)
              drag   = 0.5 * rho * v * v * Cd * A
              der(h) = v
              der(v) = (thrust - drag - m * g0) / m
              der(m) = -mflow
              h(0) = 0
              v(0) = 0
              m(0) = m0
              EVENT apogee: v = 0 | falling -> stop
            END
            """;

    @Test
    void sizesBurnTimeSoApogeeReaches100km() {
        var specs = Map.of(
                "t_burn", new VariableSpec("t_burn", 30.0, 5.0, 55.0));
        var result = new EquationSystemSolver().solve(ROCKET, SolverSettings.DEFAULTS, specs);

        double tBurn = result.variables().get("t_burn");
        assertTrue(tBurn > 20.0 && tBurn < 35.0, "burn time sized near 27 s: " + tBurn);

        assertEquals(1, result.odeTables().size());
        OdeTableResult tbl = result.odeTables().get(0);
        assertEquals("ascent", tbl.name());
        // Columns: time + states (h, v, m) + auxiliaries.
        assertTrue(tbl.columns().containsAll(java.util.List.of("time", "h", "v", "m", "drag", "rho")),
                tbl.columns().toString());
        assertTrue(tbl.stopped(), "stops at apogee");
        assertTrue(tbl.events().stream().anyMatch(e -> e.name().equals("apogee")));

        // Apogee altitude (peak of column h) lands within 1 km of 100 km.
        int hi = tbl.columns().indexOf("h");
        double apogee = tbl.rows().stream().mapToDouble(r -> r.get(hi)).max().orElse(0);
        assertEquals(100000.0, apogee, 1000.0, "apogee altitude within 1 km of target");

        // Mass strictly decreases during the burn (propellant consumed), then holds.
        int mi = tbl.columns().indexOf("m");
        double mFirst = tbl.rows().get(0).get(mi);
        double mLast = tbl.rows().get(tbl.rows().size() - 1).get(mi);
        assertTrue(mLast < mFirst && mLast > 0, "mass consumed: " + mFirst + " -> " + mLast);
    }
}
