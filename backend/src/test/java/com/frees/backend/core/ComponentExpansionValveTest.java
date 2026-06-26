package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 6 refrigeration — an {@code ExpansionValve} (capillary/orifice expansion
 * device): isenthalpic (`out.h = in.h`) with orifice flow
 * {@code ṁ·|ṁ| = (Cd·A)²·2ρ·ΔP}. The smooth squared form converges from a cold
 * start (with the §8.5 pressure seeding). Pure algebra, CoolProp-free.
 */
class ComponentExpansionValveTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void expansionValveThrottlesIsenthalpicallyAtOrificeFlow() {
        // From 1.2 MPa to 0.3 MPa (ΔP = 0.9 MPa), CdA=1e-6, ρ=1200 kg/m³ (subcooled
        // refrigerant) → ṁ = CdA·√(2ρ·ΔP) = 1e-6·√(2·1200·9e5).
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
                PSource       SRC(P=1200000, h0=250000)
                ExpansionValve TXV(CdA=1e-6, rho_in=1200)
                PSink         SNK(P=300000)
                connect(SRC.out, TXV.in)
                connect(TXV.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double expect = 1e-6 * Math.sqrt(2 * 1200.0 * 900000.0);
        assertEquals(expect, v.get("txv.in.mdot"), 1e-9);
        assertEquals(250000.0, v.get("txv.out.h"), 1e-6);   // isenthalpic expansion
    }
}
