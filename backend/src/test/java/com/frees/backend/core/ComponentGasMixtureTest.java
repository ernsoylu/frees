package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase E (first slice) — gas-mixture composition transport. A species mass
 * fraction rides as an ordinary stream member ({@code .y}); shared-name binding
 * aliases it through the network just like {@code P}/{@code h}/{@code ṁ}, so an
 * explicit {@code GasMixer} conserves species flow-weighted ({@code Σṁ·y}) exactly
 * as the standard {@code Mixer} conserves enthalpy — no expander change. A
 * {@code GasPipe} passes composition through unchanged. (The full multi-species
 * vector rider with {@code connect}-node propagation remains a follow-on.)
 */
class ComponentGasMixtureTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void mixerBlendsCompositionFlowWeighted() {
        // Pure species (y=1) at 2 kg/s mixes with diluent (y=0) at 3 kg/s →
        // outlet fraction (2·1 + 3·0)/5 = 0.4 and 5 kg/s total.
        String src = """
                GasSource S1(a, y=1, mdot=2, P=100000, h0=300000)
                GasSource S2(b, y=0, mdot=3, P=100000, h0=290000)
                GasMixer  MIX(a, b, c)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(5.0, v.get("c.mdot"), 1e-9);
        assertEquals(0.4, v.get("c.y"), 1e-9);
        // Enthalpy is flow-weighted too: (2·300000 + 3·290000)/5 = 294000.
        assertEquals(294000.0, v.get("c.h"), 1e-3);
    }

    @Test
    void pipeCarriesCompositionThrough() {
        String src = """
                GasSource S(a, y=0.21, mdot=1.5, P=120000, h0=305000)
                GasPipe   P(a, b)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(0.21, v.get("b.y"), 1e-9);
        assertEquals(1.5, v.get("b.mdot"), 1e-9);
    }

    @Test
    void threeWayBlendConservesSpecies() {
        // Cascade two mixers: (y=1,1) + (y=0,1) → 0.5 at 2 kg/s, then + (y=0.2,2)
        // → (2·0.5 + 2·0.2)/4 = 0.35 at 4 kg/s.
        String src = """
                GasSource S1(a, y=1.0, mdot=1, P=100000, h0=300000)
                GasSource S2(b, y=0.0, mdot=1, P=100000, h0=300000)
                GasMixer  M1(a, b, m)
                GasSource S3(d, y=0.2, mdot=2, P=100000, h0=300000)
                GasMixer  M2(m, d, out)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(4.0, v.get("out.mdot"), 1e-9);
        assertEquals(0.35, v.get("out.y"), 1e-9);
    }
}
