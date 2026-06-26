package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

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

}
