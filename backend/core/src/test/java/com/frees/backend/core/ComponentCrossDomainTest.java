package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 2 acceptance — components <em>compose across domains</em> in a single
 * solve. A {@code HeatingResistor} is a cross-domain transducer: an electrical
 * port pair {@code (p, n)} dissipating {@code I²R}, and a heat port emitting that
 * power. Wired between an electrical circuit and a thermal network, the whole
 * multi-domain system (electrical `ΣI=0` + heat `ΣQ̇=0`) closes in one solve —
 * the steady-state core of the EV battery-thermal pattern. Pure algebra, so
 * CoolProp-free.
 */
class ComponentCrossDomainTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void electricalDissipationFlowsThroughAThermalNetworkToAmbient() {
        // 10 V across a 5 Ω heating element → I = 2 A, 20 W dissipated. The 20 W
        // conducts to a 300 K ambient through k·A/L = 20 W/K, so the element runs
        // 1 K above ambient.
        String src = """
                VoltageSource   VS(E=10)
                HeatingResistor HR(R=5)
                Ground          G()
                Conduction      C(k=2, area=1, L=0.1)
                ThermalSource   AMB(T=300)
                connect(VS.p, HR.p)
                connect(VS.n, HR.n, G.port)
                connect(HR.heat, C.a)
                connect(C.b, AMB.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Electrical side.
        assertEquals(10.0, v.get("hr.p.v"), 1e-9);     // element voltage (vs ground)
        assertEquals(2.0, v.get("hr.p.i"), 1e-9);      // current I = V/R
        assertEquals(20.0, v.get("hr.q"), 1e-9);       // dissipated power I²R
        // The heat crosses the domain boundary: −Q into the resistor's heat port,
        // +Q into the conduction path (node Kirchhoff balance).
        assertEquals(-20.0, v.get("hr.heat.qdot"), 1e-9);
        assertEquals(0.0, v.get("hr.heat.qdot") + v.get("c.a.qdot"), 1e-9);
        assertEquals(20.0, v.get("c.q"), 1e-9);        // conducted heat
        // Thermal side: element temperature sits ΔT = Q/(kA/L) above ambient.
        assertEquals(301.0, v.get("c.a.t"), 1e-9);
        assertEquals(300.0, v.get("c.b.t"), 1e-9);
    }

    @Test
    void evPackSelfHeatingReachesSteadyTemperatureAboveCoolant() {
        // The EV battery-thermal flagship, steady-state slice: a 400 V pack with
        // 0.1 Ω internal resistance drives a motor/inverter electrical load; its
        // ohmic self-heat (I²R0) crosses to a cold plate and out to coolant.
        // Electrical + thermal close together in one solve — the headline
        // multi-domain use case.
        String src = """
                BatteryThermal B(Voc=400, R0=0.1)
                Resistor       MOT(R=3.9)
                Ground         G()
                Conduction     PLATE(k=10, area=1, L=0.1)
                ThermalSource  COOL(T=298)
                connect(B.p, MOT.a)
                connect(B.n, MOT.b, G.port)
                connect(B.heat, PLATE.a)
                connect(PLATE.b, COOL.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Electrical: I = Voc/(R0+R_load) = 400/4 = 100 A; terminal V = 400−I·R0.
        assertEquals(100.0, v.get("mot.a.i"), 1e-9);
        assertEquals(390.0, v.get("b.p.v"), 1e-9);          // terminal voltage
        assertEquals(39000.0, v.get("b.w"), 1e-6);          // power delivered to the load
        // Self-heating I²R0 = 1000 W crosses into the cooling path.
        assertEquals(1000.0, v.get("b.q"), 1e-6);
        assertEquals(-1000.0, v.get("b.heat.qdot"), 1e-6);
        assertEquals(1000.0, v.get("plate.q"), 1e-6);
        // Pack temperature settles ΔT = Q/(kA/L) = 1000/100 = 10 K above coolant.
        assertEquals(308.0, v.get("plate.a.t"), 1e-9);
    }
}
