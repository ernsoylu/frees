package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 5 — datasheet-style flow resistance. A {@code Valve} sizes flow from its
 * {@code Cv}: {@code ṁ = Cv·√(ρ·ΔP)}. With a datasheet pump head curve (a
 * {@code TABLE}) the pump+valve operating point is the Newton solve of
 * {@code ρ·Q = Cv·√(ρ·PumpHead(Q))} — the digitize → TABLE → component → operating
 * point pattern (the fan-duct case proves the curve path). Pure algebra,
 * CoolProp-free.
 */
class ComponentValveTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void valveSizesFlowFromItsCv() {
        // ΔP = 1 bar, Cv=0.001, ρ=1000 → ṁ = 0.001·√(1000·1e5) = 10 kg/s.
        String src = """
                COMPONENT PSource(out)
                  PARAM P, h0
                  out.P = P
                  out.h = h0
                END
                COMPONENT PSink(in)
                  PARAM P
                  in.P = P
                END
                PSource SRC(P=200000, h0=0)
                Valve   VLV(Cv=0.001, rho=1000)
                PSink   SNK(P=100000)
                connect(SRC.out, VLV.in)
                connect(VLV.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(10.0, v.get("vlv.in.mdot"), 1e-6);
    }

    @Test
    void twoValvesInSeriesShareFlowAndSplitTheDrop() {
        // A coupled resistance network: the mid-pressure is an unknown. With
        // physical pressure seeding (§8.5) the √(ΔP) network converges — equal
        // valves split the 3-bar drop in half → 2.5 bar mid-pressure.
        String src = """
                COMPONENT PSource(out)
                  PARAM P, h0
                  out.P = P
                  out.h = h0
                END
                COMPONENT PSink(in)
                  PARAM P
                  in.P = P
                END
                PSource SRC(P=400000, h0=0)
                Valve   V1(Cv=0.001, rho=1000)
                Valve   V2(Cv=0.001, rho=1000)
                PSink   SNK(P=100000)
                connect(SRC.out, V1.in)
                connect(V1.out, V2.in)
                connect(V2.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(250000.0, v.get("v1.out.p"), 1.0);                // mid-pressure
        double expect = 0.001 * Math.sqrt(1000.0 * 150000.0);          // ṁ per valve
        assertEquals(expect, v.get("v1.in.mdot"), 1e-3);
        assertEquals(expect, v.get("v2.in.mdot"), 1e-3);
    }

    @Test
    void datasheetPumpCurveMeetsValveAtAnOperatingPoint() {
        // Digitize → TABLE → component → Newton operating point: the pump raises
        // pressure by PumpHead(Q) and the valve drops it, so ρ·Q = Cv·√(ρ·head).
        String src = """
                COMPONENT PSource(out)
                  PARAM P, h0
                  out.P = P
                  out.h = h0
                END
                COMPONENT PSink(in)
                  PARAM P
                  in.P = P
                END
                TABLE PumpHead(Q [m^3/s]) [Pa]
                  0.0    500000
                  0.05   400000
                  0.1    100000
                END
                COMPONENT PumpCurve(in, out)
                  PARAM rho
                  Q        = in.mdot / rho
                  out.mdot = in.mdot
                  out.h    = in.h
                  out.P    = in.P + PumpHead(Q)
                END
                PSource   SRC(P=100000, h0=0)
                PumpCurve PMP(rho=1000)
                Valve     VLV(Cv=0.001, rho=1000)
                PSink     SNK(P=100000)
                connect(SRC.out, PMP.in)
                connect(PMP.out, VLV.in)
                connect(VLV.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double mdot = v.get("vlv.in.mdot");
        double head = v.get("pmp.out.p") - 100000.0;
        assertTrue(mdot > 0 && mdot < 100, "physical operating flow: " + mdot);
        assertEquals(0.001 * Math.sqrt(1000.0 * head), mdot, 1e-3);
    }
}
