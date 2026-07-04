package com.frees.backend.cas;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

    @Test
    void suggestWcReturnsPositiveFrequency() {
        double wc = PidTuner.suggestWc(new double[]{2.0}, new double[]{5.0, 1.0});
        assertTrue(wc > 0 && Double.isFinite(wc));
    }

    @Test
    void controllerTfShapesMatchType() {
        assertEquals(1, PidTuner.controllerTf("p", 2, 0, 0)[0].length);
        assertEquals(2, PidTuner.controllerTf("pi", 2, 1, 0)[0].length);
        assertEquals(3, PidTuner.controllerTf("pid", 2, 1, 0.5)[0].length);
    }
}
