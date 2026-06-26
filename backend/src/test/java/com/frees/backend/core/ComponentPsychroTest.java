package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase 6 HVAC — a psychrometric {@code CoolingCoil} (moist air, CoolProp
 * HumidAir). Cooling 30 °C / W=0.012 air below its dew point (16.8 °C) to 10 °C
 * condenses moisture, so the duty has both a sensible and a latent part.
 */
class ComponentPsychroTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void coolingCoilCondensesAndRemovesSensiblePlusLatentHeat() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                CoolingCoil CC(s_in, s_out, P=101325, Tout=283.15)
                s_in.T      = 303.15
                s_in.humrat = 0.012
                s_in.mdot   = 1
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(283.15, v.get("s_out.t"), 1e-6);                 // cooled to the coil temperature
        // Below the dew point → moisture condenses out (saturated outlet).
        assertTrue(v.get("s_out.humrat") < 0.012, "moisture removed: " + v.get("s_out.humrat"));
        assertTrue(v.get("s_out.humrat") > 0.005, "outlet saturated ~10 °C");
        // Total duty positive and exceeds the latent part (so it has sensible too).
        assertTrue(v.get("cc.q") > 0, "cooling duty positive");
        assertTrue(v.get("cc.q") > v.get("cc.q_lat"), "total duty exceeds latent alone");
    }
}
