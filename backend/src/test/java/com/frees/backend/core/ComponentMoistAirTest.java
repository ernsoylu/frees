package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Humid-air (moist-air) domain — a distinct connector type ({@code domain$ =
 * moistair}) on the basis {@code (P, ṁ_da, h, W)}: the junction conserves dry-air
 * mass ({@code Σṁ_da}) and carries the humidity ratio {@code W} and enthalpy
 * {@code h} (per kg dry air) as flow-weighted riders — two conserved mass streams
 * (dry air + water), the mechanism that makes humid air its own domain. {@code W}
 * is carried across a plain {@code connect} link and flow-weighted only at an
 * explicit {@code MixingBox}. CoolProp-gated where HumidAir properties are used;
 * the conservation tests are property-free.
 */
class ComponentMoistAirTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void mixingBoxConservesDryAirWaterAndEnergy() {
        // 2 kg/s at W=0.010 mixed with 1 kg/s at W=0.004 → 3 kg/s at
        // (2·0.010 + 1·0.004)/3 = 0.008; enthalpy flow-weighted likewise.
        String src = """
                COMPONENT MASrc(out)
                  PARAM W, h0, mdot, P, domain$ = moistair
                  out.P    = P
                  out.mdot = mdot
                  out.W    = W
                  out.h    = h0
                END
                MASrc     A(W=0.010, h0=60000, mdot=2, P=101325)
                MASrc     B(W=0.004, h0=30000, mdot=1, P=101325)
                MixingBox MB(a, b, c)
                connect(A.out, MB.in1)
                connect(B.out, MB.in2)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(3.0, v.get("c.mdot"), 1e-9);                       // dry air conserved
        assertEquals((2 * 0.010 + 1 * 0.004) / 3, v.get("c.w"), 1e-12); // water conserved
        assertEquals((2 * 60000.0 + 1 * 30000.0) / 3, v.get("c.h"), 1e-6); // energy
    }

    @Test
    void heatingCoilAddsSensibleHeatAtConstantHumidity() {
        String src = """
                COMPONENT MASrc(out)
                  PARAM W, h0, mdot, P, domain$ = moistair
                  out.P    = P
                  out.mdot = mdot
                  out.W    = W
                  out.h    = h0
                END
                MASrc      SRC(W=0.006, h0=40000, mdot=2, P=101325)
                HeatingCoil HC(Q=10000)
                connect(SRC.out, HC.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(0.006, v.get("hc.out.w"), 1e-12);                       // W unchanged
        assertEquals(40000.0 + 10000.0 / 2, v.get("hc.out.h"), 1e-6);        // h += Q/ṁ
    }

    @Test
    void humidifierAddsMoistureAndEnthalpy() {
        // 0.002 kg/s of 2.5 MJ/kg steam into a 2 kg/s dry-air stream:
        // ΔW = 0.002/2 = 0.001, Δh = 0.002·2.5e6/2 = 2500 J/kg_da.
        String src = """
                COMPONENT MASrc(out)
                  PARAM W, h0, mdot, P, domain$ = moistair
                  out.P    = P
                  out.mdot = mdot
                  out.W    = W
                  out.h    = h0
                END
                MASrc      SRC(W=0.005, h0=35000, mdot=2, P=101325)
                Humidifier HUM(mdot_w=0.002, h_w=2.5e6)
                connect(SRC.out, HUM.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(0.005 + 0.001, v.get("hum.out.w"), 1e-12);
        assertEquals(35000.0 + 2500.0, v.get("hum.out.h"), 1e-6);
    }

    @Test
    void airHandlingTrainCarriesHumidityThroughConnects() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        // Outdoor + return mix → cool/dehumidify → reheat. Proves W rides through a
        // plain connect chain and the train solves end-to-end.
        String src = """
                MoistAirSource OUT(P=101325, T=308.15, W=0.016, mdot=1)
                MoistAirSource RET(P=101325, T=297.15, W=0.009, mdot=2)
                MixingBox      MB(m1, m2, mixed)
                CoolingCoil    CC(Tout=285.15)
                HeatingCoil    RH(Q=3000)
                MoistAirSink   SNK()
                connect(OUT.out, MB.in1)
                connect(RET.out, MB.in2)
                connect(MB.out, CC.in)
                connect(CC.out, RH.in)
                connect(RH.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Dry-air mass conserved along the whole train.
        assertEquals(3.0, v.get("cc.in.mdot"), 1e-9);
        assertEquals(3.0, v.get("rh.out.mdot"), 1e-9);
        // Mixed humidity is the flow-weighted average of outdoor + return.
        assertEquals((1 * 0.016 + 2 * 0.009) / 3, v.get("cc.in.w"), 1e-9);
        // The coil dehumidifies; reheat keeps W (sensible only).
        assertTrue(v.get("cc.out.w") < v.get("cc.in.w"), "coil removes moisture");
        assertEquals(v.get("cc.out.w"), v.get("rh.out.w"), 1e-12);
    }

    @Test
    void moistAirCannotConnectToDryThermofluid() {
        // The new connector type must reject a dry (fluid) line.
        String src = """
                COMPONENT DrySink(in)
                  PARAM P
                  in.P = P
                END
                MoistAirSource SRC(P=101325, T=300, W=0.008, mdot=1)
                DrySink        SNK(P=101325)
                connect(SRC.out, SNK.in)
                """;
        String msg = org.junit.jupiter.api.Assertions.assertThrows(
                com.frees.backend.parser.EquationParser.ParseException.class,
                () -> solver.solve(src)).getMessage();
        assertTrue(msg.contains("moistair") && msg.contains("fluid"),
                "error names moistair vs fluid: " + msg);
    }
}
