package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Deferred-item #3 — zeotropic blends: the composition rider {@code z} (opt-in,
 * transported and flow-weighted like moist-air {@code w}) and the temperature
 * glide of a zeotropic blend. Pure/azeotropic refrigerants carry no {@code z}
 * member, so the rider is a no-op for them (verified by the rest of the suite
 * staying green).
 */
class ZeotropicBlendTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void compositionRiderIsTransportedAcrossConnects() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                BlendSource SRC(fluid$=R134a, mdot=0.02, P=400000, x=0.3, z=0.35)
                BlendSensor SEN(fluid$=R134a)
                BlendSink SNK()
                connect(SRC.out, SEN.in)
                connect(SEN.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // z rides equal across each pass-through connect, all the way to the sink
        assertEquals(0.35, v.get("sen.in.z"), 1e-9, "z transported into the sensor");
        assertEquals(0.35, v.get("sen.out.z"), 1e-9, "z passes through the sensor");
        assertEquals(0.35, v.get("snk.z"), 1e-9, "z reaches the sink");
    }

    @Test
    void blendMixerFlowWeightsComposition() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                BlendSource S1(fluid$=R134a, mdot=0.01, P=400000, x=0.3, z=0.2)
                BlendSource S2(fluid$=R134a, mdot=0.03, P=400000, x=0.3, z=0.6)
                BlendMixer MIX()
                BlendSink SNK()
                connect(S1.out, MIX.in1)
                connect(S2.out, MIX.in2)
                connect(MIX.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // flow-weighted: (0.01·0.2 + 0.03·0.6) / 0.04 = 0.5
        assertEquals(0.5, v.get("mix.out.z"), 1e-9, "composition is flow-weighted at the mixer");
        assertEquals(0.04, v.get("mix.out.mdot"), 1e-9, "mass conserved");
    }

    @Test
    void zeotropicBlendShowsTemperatureGlide() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        assumeTrue(coolPropHas("R407C"), "CoolProp build lacks the R407C mixture");
        String src = """
                BlendSource SRC(fluid$=R407C, mdot=0.02, P=400000, x=0.3, z=0.5)
                BlendSink SNK()
                connect(SRC.out, SNK.in)
                """;
        double glide = solver.solve(src).variables().get("src.glide");
        assertTrue(glide > 3.0, "R407C is zeotropic — meaningful bubble-to-dew glide: " + glide);
    }

    @Test
    void pureRefrigerantHasNoGlide() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                BlendSource SRC(fluid$=R134a, mdot=0.02, P=400000, x=0.3, z=1)
                BlendSink SNK()
                connect(SRC.out, SNK.in)
                """;
        double glide = solver.solve(src).variables().get("src.glide");
        assertTrue(Math.abs(glide) < 0.5, "a pure fluid has (essentially) no glide: " + glide);
    }

    private static boolean coolPropHas(String fluid) {
        try {
            double t = CoolProp.propsSI("T", "P", 400000, "Q", 0.0, fluid);
            return Double.isFinite(t);
        } catch (RuntimeException e) {
            return false;
        }
    }
}
