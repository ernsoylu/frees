package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase B — oil-hydraulic (fluid-power) domain. A hydraulic port carries
 * {@code (P, ṁ, h)} and so reuses the fluid node rule ({@code P} equal,
 * {@code Σṁ=0}); the orifice/valve/relief/pump laws are plain algebra over the
 * existing functions (no new backend function). These tests cover the metering
 * orifice ({@code ṁ=Cd·A·√(2ρΔP)}), the cracking relief valve, a speed-driven
 * positive-displacement pump's operating point (cross-domain to the rotational
 * port), and a hydraulic cylinder's holding force (cross-domain to the
 * translational port). Pure algebra, CoolProp-free.
 */
class ComponentHydraulicTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void orificeMetersFlowFromPressureDrop() {
        // 100 bar drop across a Cd·A = 1e-5 orifice in oil (ρ=850): ṁ = √(CdA²·2ρ·ΔP).
        String src = """
                HydraulicSupply  SUP(P=10000000)
                HydraulicOrifice ORI(CdA=1e-5, rho=850)
                HydraulicTank    TNK(P=0)
                connect(SUP.out, ORI.in)
                connect(ORI.out, TNK.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double expect = Math.sqrt(1e-10 * 2 * 850 * 10000000.0);
        assertEquals(expect, v.get("ori.in.mdot"), 1e-6);
    }

    @Test
    void reliefValveStaysShutBelowCrackAndOpensAbove() {
        // Below the 50 bar setpoint the valve passes ~no flow; above it, it opens
        // and bleeds K·(P−Pcrack-region)·ΔP. Two solves bracket the setpoint.
        String shut = """
                HydraulicSupply SUP(P=4000000)
                ReliefValve     RV(Pcrack=5000000, K=1e-6, eps=10000)
                HydraulicTank   TNK(P=0)
                connect(SUP.out, RV.in)
                connect(RV.out, TNK.port)
                """;
        String open = shut.replace("P=4000000", "P=6000000");
        double mShut = solver.solve(shut).variables().get("rv.in.mdot");
        double mOpen = solver.solve(open).variables().get("rv.in.mdot");
        assertTrue(mShut < 1e-3, "valve essentially shut below crack: " + mShut);
        assertEquals(1e-6 * 6000000.0, mOpen, 1e-2);   // fully open above crack: K·(P−0)
    }

    @Test
    void speedDrivenPumpDeliversFlowAgainstAnOrificeLoad() {
        // A 1e-5 m³/rev pump spun at 100 rad/s pumps oil (ρ=850, η_v=0.95) through
        // an orifice to tank. The kinematic flow ṁ=ρ·D·(ω/2π)·η_v fixes the rate;
        // the orifice sets the discharge pressure ΔP = ṁ²/(CdA²·2ρ).
        String src = """
                HydraulicSupply  SUC(P=0)
                SpeedSource      SS(w=100)
                MechGround       G()
                HydraulicPump    PMP(disp=1e-5, rho=850, eta_v=0.95, eta_m=0.9)
                HydraulicOrifice ORI(CdA=1e-5, rho=850)
                HydraulicTank    DIS(P=0)
                connect(SUC.out, PMP.in)
                connect(SS.a, PMP.shaft)
                connect(SS.b, G.port)
                connect(PMP.out, ORI.in)
                connect(ORI.out, DIS.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double mdot = 850 * 1e-5 * (100.0 / (2 * Math.PI)) * 0.95;
        double dP = mdot * mdot / (1e-10 * 2 * 850);
        assertEquals(mdot, v.get("pmp.out.mdot"), 1e-6);
        assertEquals(dP, v.get("pmp.out.p"), 1.0);
    }

    @Test
    void cylinderHoldsLoadAtSupplyPressureWhenStalled() {
        // Held against ground (v=0) the chamber reaches supply pressure (no flow,
        // der(P)=0) and exerts the holding force F = −(P − Patm)·A.
        String src = """
                HydraulicSupply   SUP(P=10000000)
                HydraulicOrifice  ORI(CdA=1e-5, rho=850)
                HydraulicCylinder CYL(rho=850, beta=1.5e9, V0=1e-4, area=0.001, Patm=100000, P0=100000)
                TransGround       G()
                connect(SUP.out, ORI.in)
                connect(ORI.out, CYL.in)
                connect(CYL.rod, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(10000000.0, v.get("cyl.in.p"), 1.0);              // chamber at supply pressure
        assertEquals(-(10000000.0 - 100000.0) * 0.001, v.get("cyl.rod.f"), 1e-3);   // −9900 N
    }
}
