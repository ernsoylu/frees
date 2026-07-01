package com.frees.backend.core;

import com.frees.backend.props.Atmosphere;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase G — cheap, in-scope niche additions: the ISA 1976 standard atmosphere
 * functions, measurement sensors (thermal / flow, drawing no power), the 2RC
 * Thévenin battery, and an ideal current source. All low-risk one-to-three
 * equation additions on the existing machinery.
 */
class ComponentNicheTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void isaAtmosphereMatchesTheStandardLayers() {
        String src = """
                T0   = isa_T(0)
                T5   = isa_T(5000)
                P5   = isa_P(5000)
                rho5 = isa_rho(5000)
                T11  = isa_T(11000)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(288.15, v.get("t0"), 1e-6);                       // sea-level
        assertEquals(Atmosphere.temperature(5000), v.get("t5"), 1e-6);
        assertEquals(Atmosphere.pressure(5000), v.get("p5"), 1e-3);
        assertEquals(Atmosphere.density(5000), v.get("rho5"), 1e-6);
        assertEquals(216.65, v.get("t11"), 1e-2);                      // tropopause
    }

    @Test
    void thermalSensorReadsNodeTemperatureWithoutDrawingHeat() {
        String src = """
                ThermalSource SRC(T=350)
                ThermalSensor SENS()
                connect(SRC.port, SENS.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(350.0, v.get("sens.t_meas"), 1e-9);
    }

    @Test
    void flowSensorPassesFlowThroughAndReportsIt() {
        String src = """
                COMPONENT FSrc(out)
                  PARAM mdot, P, h0
                  out.mdot = mdot
                  out.P    = P
                  out.h    = h0
                END
                FSrc       SRC(mdot=2.5, P=100000, h0=0)
                FlowSensor FS()
                Sink       SNK()
                connect(SRC.out, FS.in)
                connect(FS.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(2.5, v.get("fs.mdot_meas"), 1e-9);
    }

    @Test
    void battery2rcShowsCombinedDcResistanceAtSteady() {
        // At DC both RC branches contribute their R, so V = Voc − (R0+R1+R2)·I.
        String src = """
                Battery2RC B(Voc=48, R0=0.1, R1=0.2, C1=1000, R2=0.1, C2=2000, Vrc1_0=0, Vrc2_0=0)
                Resistor   RL(R=4.6)
                Ground     G()
                connect(B.p, RL.a)
                connect(B.n, RL.b, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double i = 48.0 / (0.1 + 0.2 + 0.1 + 4.6);          // 9.6 A
        assertEquals(i, v.get("rl.a.i"), 1e-6);
        assertEquals(48.0 - 0.4 * i, v.get("b.p.v"), 1e-6); // 44.16 V
    }

    @Test
    void currentSourceForcesItsCurrentThroughALoad() {
        String src = """
                CurrentSource CS(I=2)
                Resistor      R(R=5)
                Ground        G()
                connect(CS.p, R.a)
                connect(CS.n, R.b, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(10.0, v.get("cs.p.v"), 1e-9);          // I·R = 2·5 = 10 V
    }
}
