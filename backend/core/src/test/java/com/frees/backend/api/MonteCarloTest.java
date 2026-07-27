package com.frees.backend.api;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.core.VariableSpec;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Monte Carlo uncertainty: the linear validation case must reproduce the
 * analytic (and first-order) sigma within sampling tolerance, and a
 * nonlinear case must show the first-order/MC divergence that motivates
 * sampling in the first place.
 */
class MonteCarloTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static long farDeadline() {
        return System.nanoTime() + 120_000_000_000L;
    }

    private static MonteCarlo.VariableStats statOf(MonteCarlo.Outcome outcome, String name) {
        return outcome.stats().stream().filter(s -> s.variable().equals(name)).findFirst().orElseThrow();
    }

    /** f = x*y with independent normal x, y: sigma_f = sqrt((y sx)^2 + (x sy)^2)
     *  = 3.2016 at the center (10, 5) — both MC and first-order must agree. */
    @Test
    void productReproducesAnalyticSigma() {
        Map<String, VariableSpec> specs = Map.of(
                "x", new VariableSpec("x", 10, -100, 100, 0.5),
                "y", new VariableSpec("y", 5, -100, 100, 0.2));
        MonteCarlo.Outcome outcome = MonteCarlo.run(solver, "f = x*y\nx = 10\ny = 5",
                SolverSettings.DEFAULTS, specs, Map.of(), 2000, 7L, farDeadline());

        assertEquals(2000, outcome.samples().size());
        assertEquals(0, outcome.failedSamples());
        assertEquals(java.util.List.of("x", "y"), outcome.sources());

        MonteCarlo.VariableStats f = statOf(outcome, "f");
        double analytic = Math.hypot(5 * 0.5, 10 * 0.2);
        assertEquals(50.0, f.mean(), 50.0 * 0.01, "mean stays at the center");
        assertEquals(analytic, f.sigma(), analytic * 0.06, "MC sigma matches analytic");
        assertEquals(analytic, f.firstOrderSigma(), analytic * 0.01, "first-order agrees here");
        assertTrue(f.p5() < f.p50() && f.p50() < f.p95(), "percentiles ordered");
    }

    /** g = exp(x), x = 1 +- 0.5: the true (lognormal) sigma exceeds the
     *  first-order e*sx by ~20%, and the mean shifts above e — exactly the
     *  divergence a linearization cannot see. */
    @Test
    void exponentialShowsFirstOrderDivergence() {
        Map<String, VariableSpec> specs = Map.of(
                "x", new VariableSpec("x", 1, -50, 50, 0.5));
        MonteCarlo.Outcome outcome = MonteCarlo.run(solver, "g = exp(x)\nx = 1",
                SolverSettings.DEFAULTS, specs, Map.of(), 2000, 11L, farDeadline());

        MonteCarlo.VariableStats g = statOf(outcome, "g");
        assertTrue(g.sigma() > 1.12 * g.firstOrderSigma(),
                "MC sigma " + g.sigma() + " must exceed first-order " + g.firstOrderSigma());
        assertTrue(g.mean() > 2.9, "lognormal mean shifts above e, got " + g.mean());
    }

    /** Same seed, same everything: the run is reproducible. */
    @Test
    void fixedSeedIsDeterministic() {
        Map<String, VariableSpec> specs = Map.of(
                "x", new VariableSpec("x", 10, -100, 100, 0.5));
        MonteCarlo.Outcome a = MonteCarlo.run(solver, "f = 2*x\nx = 10",
                SolverSettings.DEFAULTS, specs, Map.of(), 200, 42L, farDeadline());
        MonteCarlo.Outcome b = MonteCarlo.run(solver, "f = 2*x\nx = 10",
                SolverSettings.DEFAULTS, specs, Map.of(), 200, 42L, farDeadline());
        assertEquals(statOf(a, "f").mean(), statOf(b, "f").mean(), 0.0);
        assertEquals(statOf(a, "f").sigma(), statOf(b, "f").sigma(), 0.0);
    }

    /** No declared uncertainty: a clear message, not a silent empty run. */
    @Test
    void rejectsRunWithoutSources() {
        SolverException ex = assertThrows(SolverException.class, () -> MonteCarlo.run(
                solver, "f = 2*x\nx = 10", SolverSettings.DEFAULTS, Map.of(), Map.of(),
                100, 42L, farDeadline()));
        assertTrue(ex.getMessage().contains("uncertainty"));
    }

    /** An expired budget stops the loop and reports the truncation honestly. */
    @Test
    void expiredBudgetTruncates() {
        Map<String, VariableSpec> specs = Map.of(
                "x", new VariableSpec("x", 10, -100, 100, 0.5));
        MonteCarlo.Outcome outcome = MonteCarlo.run(solver, "f = 2*x\nx = 10",
                SolverSettings.DEFAULTS, specs, Map.of(), 500, 42L,
                System.nanoTime() - 1);
        assertTrue(outcome.truncated());
        assertEquals(0, outcome.samples().size());
    }
}
