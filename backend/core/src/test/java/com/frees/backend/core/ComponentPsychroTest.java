package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * HVAC humid-air domain — a psychrometric {@code CoolingCoil} (moist air, CoolProp
 * HumidAir) on the moist-air port basis {@code (P, ṁ_da, h, W)}: dry-air mass flow
 * is conserved and the humidity ratio {@code W} and enthalpy {@code h} (per kg dry
 * air) ride along, carried across a {@code connect} link. Cooling 30 °C / W=0.012
 * air below its dew point to 10 °C condenses moisture, so the duty has both a
 * sensible and a latent part. Tagged {@code domain$ = moistair}.
 */
class ComponentPsychroTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void coolingCoilCondensesAndRemovesSensiblePlusLatentHeat() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                MoistAirSource SRC(P=101325, T=303.15, W=0.012, mdot=1)
                CoolingCoil    CC(Tout=283.15)
                MoistAirSink   SNK()
                connect(SRC.out, CC.in)
                connect(CC.out, SNK.in)
                T_out = Temperature(AirH2O, H=CC.out.h, P=101325, W=CC.out.W)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(283.15, v.get("t_out"), 1e-2);                   // cooled to the coil temperature
        assertTrue(v.get("cc.out.w") < 0.012, "moisture removed: " + v.get("cc.out.w"));
        assertTrue(v.get("cc.out.w") > 0.005, "outlet saturated ~10 °C");
        assertTrue(v.get("cc.q") > 0, "cooling duty positive");
        assertTrue(v.get("cc.q") > v.get("cc.q_lat"), "total duty exceeds latent alone");
    }
}
