package com.frees.backend.cas;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PidTunerTest {

    /** A first-order plant G = 2/(5s+1): a PI tune should hit the target margin
     *  and produce a stable, well-damped closed-loop step. */
    @Test
    void tunesFirstOrderPlantToTargetMargin() {
        double[] num = {2.0};
        double[] den = {5.0, 1.0};
        double wc = 0.5;
        PidTuner.Result r = PidTuner.tune(num, den, "pi", wc, 60.0, 0, 400);

        // Gains are finite and Ki > 0 (integral action removes steady error).
        assertTrue(Double.isFinite(r.kp()) && Double.isFinite(r.ki()));
        assertTrue(r.ki() > 0, "PI tune should give positive integral gain");

        // Closed-loop step settles to ~1 (unity DC gain from the integrator).
        double yFinal = r.y()[r.y().length - 1];
        assertEquals(1.0, yFinal, 0.05, "closed loop should track a unit step");

        // The realized phase margin is close to the 60° target.
        assertEquals(60.0, r.phaseMargin(), 12.0, "phase margin near the 60° target");
    }

    /** Raising the target phase margin should not destabilise and generally
     *  reduces overshoot versus a low-margin design. */
    @Test
    void higherPhaseMarginReducesOvershoot() {
        double[] num = {1.0};
        double[] den = {1.0, 1.0, 0.0}; // 1/(s^2+s): needs damping
        PidTuner.Result low = PidTuner.tune(num, den, "pid", 1.0, 40.0, 20, 400);
        PidTuner.Result high = PidTuner.tune(num, den, "pid", 1.0, 70.0, 20, 400);
        assertTrue(high.overshoot() <= low.overshoot() + 1e-6,
                "higher target PM should not increase overshoot (low=" + low.overshoot()
                        + ", high=" + high.overshoot() + ")");
    }

    /** A pure-gain P controller: the closed loop is stable and finite. */
    @Test
    void tunesAProportionalController() {
        PidTuner.Result r = PidTuner.tune(new double[]{2.0}, new double[]{5.0, 1.0}, "p", 0.5, 60.0, 0, 200);
        assertEquals(0.0, r.ki(), 1e-12, "a P controller has no integral gain");
        assertEquals(0.0, r.kd(), 1e-12);
        assertTrue(Double.isFinite(r.kp()) && r.kp() > 0);
        assertTrue(Double.isFinite(r.y()[r.y().length - 1]));
    }

    @Test
    void suggestWcUsesTheDominantPole() {
        // 1/(5s+1): pole at -0.2 → dominant crossover 0.2 rad/s.
        assertEquals(0.2, PidTuner.suggestWc(new double[]{2.0}, new double[]{5.0, 1.0}), 1e-9);
    }

    @Test
    void suggestWcFallsBackForAPureIntegrator() {
        // 1/s has only a pole at the origin (no nonzero pole) → phase-based path.
        double wc = PidTuner.suggestWc(new double[]{1.0}, new double[]{1.0, 0.0});
        assertTrue(wc > 0 && Double.isFinite(wc));
    }

    /** The 4-arg overload keeps the historical 60° default. */
    @Test
    void defaultPhaseMarginOverloadMatchesExplicit60() {
        double[] num = {1.0};
        double[] den = {1.0, 1.0, 0.0};
        double[] a = ControllerDesign.pidtune(num, den, "pid", 1.0);
        double[] b = ControllerDesign.pidtune(num, den, "pid", 1.0, 60.0);
        assertArrayEquals(b, a, 1e-12);
    }

    @Test
    void controllerTfShapesMatchType() {
        assertEquals(1, PidTuner.controllerTf("p", 2, 0, 0)[0].length);
        assertEquals(2, PidTuner.controllerTf("pi", 2, 1, 0)[0].length);
        assertEquals(3, PidTuner.controllerTf("pid", 2, 1, 0.5)[0].length);
    }

    @Test
    void controllerTfRejectsUnknownType() {
        assertThrows(CasEngine.CasException.class, () -> PidTuner.controllerTf("lead", 1, 1, 1));
    }
}
