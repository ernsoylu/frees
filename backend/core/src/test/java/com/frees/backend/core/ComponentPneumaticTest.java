package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase A — pneumatic (compressible-gas power) domain. A pneumatic port carries
 * {@code (P, ṁ, h)}, so it reuses the fluid node rule ({@code P} equal,
 * {@code Σṁ=0}) — no new connection domain. Restrictions close a mass-flow
 * equation with the {@code ISO 6358} law ({@code iso6358(C, b, Pup, Tup, Pdown)}),
 * a sonic-conductance model with choked and subsonic branches. These tests cover
 * the choked/subsonic orifice operating point, the variable servovalve, a
 * charging-volume transient, and a cross-domain pneumatic→translational actuator.
 */
class ComponentPneumaticTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** ANR reference constants mirrored from props/Pneumatics for the analytic check. */
    private static double iso6358(double c, double b, double pUp, double tUp, double pDown) {
        double choked = c * 1.185 * pUp * Math.sqrt(293.15 / tUp);
        double pr = pDown / pUp;
        if (pr <= b) {
            return choked;
        }
        if (pr >= 1.0) {
            return 0.0;
        }
        double x = (pr - b) / (1.0 - b);
        return choked * Math.sqrt(1.0 - x * x);
    }

    @Test
    void orificeChokesBelowTheCriticalPressureRatio() {
        // 7 bar supply → orifice (C=1e-8, b=0.3) → 1 bar atmosphere. pr = 1/7 = 0.14
        // < b, so the flow is choked: ṁ = C·ρ_ANR·Pup·√(T_ANR/Tup), independent of
        // the downstream pressure.
        String src = """
                PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
                PneumaticOrifice    ORI(fluid$=Air, C=1e-8, b=0.3)
                PneumaticAtmosphere ATM(P=100000)
                connect(SUP.out, ORI.in)
                connect(ORI.out, ATM.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double expect = iso6358(1e-8, 0.3, 700000, 300.0, 100000);
        assertEquals(expect, v.get("ori.in.mdot"), 5e-5);
    }

    @Test
    void chokedFlowIsIndependentOfDownstreamPressure() {
        // Dropping the downstream pressure further (still below b·Pup) leaves the
        // choked mass flow unchanged — the defining property of sonic flow.
        String src = """
                PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
                PneumaticOrifice    ORI(fluid$=Air, C=1e-8, b=0.3)
                PneumaticAtmosphere ATM(P=50000)
                connect(SUP.out, ORI.in)
                connect(ORI.out, ATM.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double expect = iso6358(1e-8, 0.3, 700000, 300.0, 100000);   // same as the 1 bar case
        assertEquals(expect, v.get("ori.in.mdot"), 5e-5);
    }

    @Test
    void orificeFlowsSubsonicAboveTheCriticalRatio() {
        // 1.2 bar supply → 1 bar atmosphere. pr = 0.833 > b, so the subsonic
        // branch applies and the flow is below the choked value.
        String src = """
                PneumaticSupply     SUP(fluid$=Air, P=120000, T=300)
                PneumaticOrifice    ORI(fluid$=Air, C=1e-8, b=0.3)
                PneumaticAtmosphere ATM(P=100000)
                connect(SUP.out, ORI.in)
                connect(ORI.out, ATM.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double expect = iso6358(1e-8, 0.3, 120000, 300.0, 100000);
        assertEquals(expect, v.get("ori.in.mdot"), 1e-5);
        double choked = iso6358(1e-8, 0.3, 120000, 300.0, 0.0);
        assertTrue(v.get("ori.in.mdot") < choked, "subsonic flow is below the choked limit");
    }

    @Test
    void servovalveScalesFlowWithItsOpening() {
        // A half-open servovalve (u=0.5) passes half the choked flow of a fully
        // open one (u=1.0): flow ∝ C ∝ u in the choked regime.
        String half = """
                PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
                PneumaticServoValve SV(fluid$=Air, Cmax=1e-8, b=0.3, u=0.5)
                PneumaticAtmosphere ATM(P=100000)
                connect(SUP.out, SV.in)
                connect(SV.out, ATM.port)
                """;
        String full = half.replace("u=0.5", "u=1.0");
        double mHalf = solver.solve(half).variables().get("sv.in.mdot");
        double mFull = solver.solve(full).variables().get("sv.in.mdot");
        assertEquals(0.5, mHalf / mFull, 1e-6);
    }

    @Test
    void volumeChargesThroughAResistanceTowardSupplyPressure() {
        // Pneumatic storage: a 2 bar supply charges a closed volume through a
        // linear pneumatic resistance. der(P) = (R_gas·T/V)·ṁ_in and ṁ_in =
        // (P_sup − P)/R, giving first-order charging dP/dt = (1/τ)(P_sup − P) with
        // τ = V·R/(R_gas·T). Sized to τ = 1 s: V·R/(R_gas·T) = 0.861·1e5/(287·300) = 1.
        String src = """
                COMPONENT LinPneuRes(in, out)
                  PARAM R, domain$ = gas
                  out.mdot = in.mdot
                  out.h    = in.h
                  in.mdot  = (in.P - out.P) / R
                END
                COMPONENT PneuPlug(port)
                  PARAM domain$ = gas
                  port.mdot = 0
                END
                PneumaticSupply SUP(fluid$=Air, P=200000, T=300)
                LinPneuRes      RES(R=1e5)
                PneumaticVolume VOL(V=0.861, T=300, R=287, P0=100000)
                PneuPlug        PLG()
                connect(SUP.out, RES.in)
                connect(RES.out, VOL.in)
                connect(VOL.out, PLG.port)
                DYNAMIC charge(method = ode45, time = 0 .. 6, points = 100)
                END
                P_final = FinalValue('vol.in.p')
                P_start = MinValue('vol.in.p')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // 200000 − 100000·e^(−6) ≈ 1.9975e5 Pa (τ = 1 s, charging from 1 bar).
        assertEquals(200000.0 - 100000.0 * Math.exp(-6.0), v.get("p_final"), 100.0);
        assertEquals(100000.0, v.get("p_start"), 1e-6);
    }

    @Test
    void actuatorBalancesGasForceAgainstAMechanicalLoad() {
        // Cross-domain: a 3 bar gas chamber drives a piston (area 0.01 m²) against a
        // translational damper to ground. Force balance F = (P − Patm)·A = c·v, so
        // v = (200000·0.01)/1000 = 2 m/s; the chamber force is −2000 N (sign:
        // into the actuator port).
        String src = """
                PneumaticSupply   SUP(fluid$=Air, P=300000, T=300)
                PneumaticActuator ACT(fluid$=Air, area=0.01, Patm=100000)
                TransDamper       D(c=1000)
                TransGround       G()
                connect(SUP.out, ACT.in)
                connect(ACT.rod, D.a)
                connect(D.b, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(2.0, v.get("d.a.vel"), 1e-6);
        assertEquals(-(300000.0 - 100000.0) * 0.01, v.get("act.rod.f"), 1e-6);
    }
}
