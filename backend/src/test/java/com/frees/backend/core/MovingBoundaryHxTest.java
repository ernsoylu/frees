package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase T3 (final increment) — the switched moving-boundary heat exchangers. The
 * refrigerant-side zones occupy solved lengths whose boundary moves with
 * conditions; a shrinking zone is smoothly floored and {@code zone_ramp}-gated so
 * it collapses to an inert passthrough rather than a singular UA (§4.8). Runs
 * steady against a fixed wall and transient against a wall thermal mass on the
 * SUNDIALS-IDA path.
 */
class MovingBoundaryHxTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void evaporatorResolvesTwoPhaseAndSuperheatZones() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                MovingBoundaryEvaporator EV(fluid$=R134a, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.01)
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=350000, x=0.25)
                TwoPhaseSink SNK()
                ThermalSource WALL(T=292)
                connect(SRC.out, EV.in)
                connect(EV.out, SNK.in)
                connect(EV.wall, WALL.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double lTp = v.get("ev.l_tp");
        double lSh = v.get("ev.l_sh");
        assertTrue(lTp > 0 && lSh > 0, "both zones present: L_tp=" + lTp + " L_sh=" + lSh);
        assertTrue(Math.abs((lTp + lSh) - 5.0) < 0.05, "zone lengths fill the tube");
        assertTrue(v.get("ev.sh") > 0.5, "outlet is superheated: SH=" + v.get("ev.sh"));
        assertTrue(v.get("ev.q") > 0 && v.get("ev.wall.qdot") > 0, "absorbs heat from the wall");
    }

    @Test
    void evaporatorSuperheatZoneCollapsesSmoothly() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        // a low wall ΔT makes the two-phase zone want more than the whole tube,
        // so the superheat zone collapses (floored, ramped) without a NaN
        String src = """
                MovingBoundaryEvaporator EV(fluid$=R134a, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.01)
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=350000, x=0.25)
                TwoPhaseSink SNK()
                ThermalSource WALL(T=283)
                connect(SRC.out, EV.in)
                connect(EV.out, SNK.in)
                connect(EV.wall, WALL.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double lSh = v.get("ev.l_sh");
        assertTrue(Double.isFinite(lSh) && lSh < 0.05, "superheat zone collapsed (floored): " + lSh);
        assertTrue(Math.abs(v.get("ev.sh")) < 1.0, "no superheat when the zone is gone: " + v.get("ev.sh"));
        assertTrue(Double.isFinite(v.get("ev.out.h")), "outlet enthalpy finite (no NaN)");
    }

    @Test
    void undersizedEvaporatorLeavesRefrigerantTwoPhase() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        // a short tube at a modest wall ΔT cannot complete the evaporation, so the
        // outlet stays two-phase (0 < x < 1) instead of being capped at saturation
        String src = """
                MovingBoundaryEvaporator EV(fluid$=R134a, U_tp=2000, U_sh=200, D=0.01, L=2, eps_zone=0.01)
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=350000, x=0.25)
                TwoPhaseSink SNK()
                ThermalSource WALL(T=285)
                connect(SRC.out, EV.in)
                connect(EV.out, SNK.in)
                connect(EV.wall, WALL.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double hf = CoolProp.propsSI("H", "P", 350000, "Q", 0.0, "R134a");
        double hg = CoolProp.propsSI("H", "P", 350000, "Q", 1.0, "R134a");
        double xOut = (v.get("ev.out.h") - hf) / (hg - hf);
        assertTrue(xOut > 0.25 && xOut < 1.0, "outlet is two-phase (incomplete evaporation): x=" + xOut);
        assertTrue(Math.abs(v.get("ev.sh")) < 1.0, "no superheat: still in the dome");
        // the two-phase zone fills (essentially) the whole short tube
        assertTrue(v.get("ev.l_tp") > 1.9, "two-phase zone fills the tube: L_tp=" + v.get("ev.l_tp"));
    }

    @Test
    void condenserResolvesCondensingAndSubcoolZones() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                MovingBoundaryCondenser CD(fluid$=R134a, U_cond=2500, U_sc=300, D=0.01, L=8, eps_zone=0.01)
                TwoPhaseSourcePH SRC(mdot=0.02, P=900000, h=445000)
                TwoPhaseSink SNK()
                ThermalSource WALL(T=300)
                connect(SRC.out, CD.in)
                connect(CD.out, SNK.in)
                connect(CD.wall, WALL.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertTrue(v.get("cd.l_cond") > 0 && v.get("cd.l_sc") > 0, "condense + subcool zones present");
        assertTrue(v.get("cd.sc") > 0.5, "outlet is subcooled: SC=" + v.get("cd.sc"));
        assertTrue(v.get("cd.wall.qdot") < 0, "rejects heat to the wall");
    }

    @Test
    void transientWarmupBirthsSuperheatZoneOnIda() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        assumeTrue(SundialsIda.isAvailable(), "SUNDIALS IDA not available");
        // The wall thermal mass starts near T_sat (superheat zone collapsed) and is
        // warmed by the secondary; the superheat zone is BORN as it warms — the
        // moving boundary crosses the ramp region without a NaN on the IDA path.
        String src = """
                MovingBoundaryEvaporator EV(fluid$=R134a, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.3)
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=350000, x=0.25)
                TwoPhaseSink SNK()
                ThermalMass WALL(C=5000, T0=282)
                ThermalSource AMB(T=305)
                Conduction K(k=50, area=1, L=0.1)
                connect(SRC.out, EV.in)
                connect(EV.out, SNK.in)
                connect(EV.wall, WALL.port, K.b)
                connect(K.a, AMB.port)
                DYNAMIC warm(method = ida, time = 0 .. 60, points = 40, rtol = 1e-5, atol = 1e-6)
                END
                SH_start = MinValue('ev.sh')
                SH_final = FinalValue('ev.sh')
                Lsh_final = FinalValue('ev.l_sh')
                Tw_final = FinalValue('wall.port.t')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertTrue(v.get("sh_start") < 0.5, "starts with the superheat zone collapsed: " + v.get("sh_start"));
        assertTrue(v.get("sh_final") > v.get("sh_start"), "superheat zone born during warm-up");
        assertTrue(Double.isFinite(v.get("lsh_final")) && Double.isFinite(v.get("tw_final")),
                "transient finished without NaNs");
        assertTrue(v.get("tw_final") > 282 && v.get("tw_final") < 305, "wall warmed toward the secondary");
    }
}
