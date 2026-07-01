package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 2 — the heat port {@code (T, Q̇)} and domain-aware {@code connect(...)}.
 * A heat node equates temperature and conserves heat as a Kirchhoff balance
 * (Σ Q̇ = 0, each Q̇ signed into its component) — distinct from a fluid node's
 * pressure/enthalpy equality and mass balance. The expander tells the two apart
 * from the members each stream carries ({@code mdot} ⇒ fluid, {@code qdot}/{@code t}
 * ⇒ heat). The standard-library thermal primitives (ThermalSource, Conduction,
 * Convection, Radiation) are pure algebra, so these tests are CoolProp-free.
 */
class ComponentThermalTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void conductionBetweenTwoFixedTemperaturesCarriesFourierHeat() {
        // Hot wall 400 K, cold wall 300 K, a slab between them. Q = kA/L·ΔT.
        String src = """
                ThermalSource SH(T=400)
                Conduction   WALL(k=50, area=0.1, L=0.02)
                ThermalSource SC(T=300)
                connect(SH.port, WALL.a)
                connect(WALL.b, SC.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double q = 50.0 * 0.1 / 0.02 * (400.0 - 300.0);   // = 25000 W
        assertEquals(q, v.get("wall.q"), 1e-6);
        // A heat 2-port does NOT equate its ports — the ends sit at the source
        // temperatures (validates the seeding gate that skips heat pass-throughs).
        assertEquals(400.0, v.get("wall.a.t"), 1e-9);
        assertEquals(300.0, v.get("wall.b.t"), 1e-9);
        // Kirchhoff at the hot node: source delivers the heat (negative = out of
        // the source, into the wall at a).
        assertEquals(-q, v.get("sh.port.qdot"), 1e-6);
        assertEquals(q, v.get("wall.a.qdot"), 1e-6);
    }

    @Test
    void surfaceLosesHeatByConvectionAndRadiationAtAThreeWayNode() {
        // A 350 K surface loses heat to 300 K surroundings by parallel convection
        // and radiation — a 3-port heat node (Σ Q̇ = 0 across all three ports).
        String src = """
                ThermalSource SURF(T=350)
                Convection CV(htc=10, area=2)
                Radiation  RD(emis=0.9, area=2)
                ThermalSource AIR(T=300)
                ThermalSource SUR(T=300)
                connect(SURF.port, CV.a, RD.a)
                connect(CV.b, AIR.port)
                connect(RD.b, SUR.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double qConv = 10.0 * 2.0 * (350.0 - 300.0);     // = 1000 W
        double qRad = 0.9 * 5.670374419e-8 * 2.0 * (Math.pow(350, 4) - Math.pow(300, 4));
        assertEquals(qConv, v.get("cv.q"), 1e-6);
        assertEquals(qRad, v.get("rd.q"), 1e-3);
        // Both legs see the common surface temperature at the shared node.
        assertEquals(350.0, v.get("cv.a.t"), 1e-9);
        assertEquals(350.0, v.get("rd.a.t"), 1e-9);
        // 3-way Kirchhoff balance closes; the surface supplies the total loss.
        assertEquals(0.0, v.get("surf.port.qdot") + v.get("cv.a.qdot") + v.get("rd.a.qdot"), 1e-6);
        assertEquals(-(qConv + qRad), v.get("surf.port.qdot"), 1e-3);
        assertTrue(qRad > 0, "radiative loss must be positive");
    }
}
