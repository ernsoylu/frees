package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import com.frees.backend.props.HxCorrelations;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Correlation-based UA (heat) and dP (friction) computed OUTSIDE a component and
 * injected into its parameters — the Amesim Nu+Geom sizing recipe as reusable
 * scalar functions (props/HxCorrelations).
 */
class HxCorrelationTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  @Test void correlationsReturnPhysicalValues() {
    assumeTrue(CoolProp.isAvailable());
    // single-phase coolant (EG50) and air film coefficients
    double hCool = HxCorrelations.htc1phase("EG50", 200000, 300, 0.2, 0.008, 1.2e-4);
    double hAir = HxCorrelations.htc1phase("Air", 101325, 313, 0.8, 0.003, 0.02);
    // two-phase refrigerant films
    double hEvap = HxCorrelations.htcEvap("R1234yf", 350000, 0.5, 0.03, 0.006, 8e-5);
    double hCond = HxCorrelations.htcCond("R1234yf", 1200000, 0.5, 0.03, 0.006, 8e-5);
    System.out.printf("h: cool=%.0f air=%.0f evap=%.0f cond=%.0f W/m2K%n", hCool, hAir, hEvap, hCond);
    for (double h : new double[]{hCool, hAir, hEvap, hCond}) {
      assertTrue(h > 5 && h < 1e5, "film coefficient physical: " + h);
    }
    // boiling/condensation enhance over the liquid-only base
    assertTrue(hEvap > hCool * 0.1 && hCond > 0, "two-phase films positive");
    // overall UA and friction drops
    double ua = HxCorrelations.uaHx(hEvap, 0.6, hCool, 0.8, 1e-4);
    double dp1 = HxCorrelations.dp1phase("EG50", 200000, 300, 0.2, 0.008, 1.2e-4, 2.0);
    double dp2 = HxCorrelations.dp2phase("R1234yf", 350000, 0.5, 0.03, 0.006, 8e-5, 2.0);
    System.out.printf("UA=%.1f W/K  dp_1phase=%.0f Pa  dp_2phase=%.0f Pa%n", ua, dp1, dp2);
    assertTrue(ua > 0 && ua < 1e5, "UA physical: " + ua);
    assertTrue(dp1 > 0 && dp2 > dp1, "two-phase drop exceeds single-phase: " + dp1 + " -> " + dp2);
  }

  @Test void documentCallMatchesJava() {
    assumeTrue(CoolProp.isAvailable());
    Map<String, Double> v = solver.solve("""
        h_cool = htc_1phase('EG50', 200000, 300, 0.2, 0.008, 1.2e-4)
        h_evap = htc_evap('R1234yf', 350000, 0.5, 0.03, 0.006, 8e-5)
        UA = ua_hx(h_evap, 0.6, h_cool, 0.8, 1e-4)
        dP = dp_2phase('R1234yf', 350000, 0.5, 0.03, 0.006, 8e-5, 2)
        """).variables();
    assertEquals(HxCorrelations.htc1phase("EG50", 200000, 300, 0.2, 0.008, 1.2e-4), v.get("h_cool"), 1e-3);
    assertEquals(HxCorrelations.uaHx(v.get("h_evap"), 0.6, v.get("h_cool"), 0.8, 1e-4), v.get("ua"), 1e-6);
    assertTrue(v.get("dp") > 0, "two-phase drop computed in-document");
  }

  @Test void airSideGeometryAndExtraDp() {
    assumeTrue(CoolProp.isAvailable());
    // (1) external air-side convection (finned tube bank) + Nusselt helpers
    double hAir = HxCorrelations.htcExtAir("Air", 101325, 313, 0.8, 0.01, 0.02);
    double nuBlend = HxCorrelations.nuBlend(10, 40); // (1000+64000)^(1/3) ≈ 40.2
    System.out.printf("air-side h=%.0f W/m2K  nu_blend=%.2f%n", hAir, nuBlend);
    assertTrue(hAir > 5 && hAir < 1e4, "external air-side h physical: " + hAir);
    assertTrue(nuBlend > 40 && nuBlend < 41, "cubic free+forced blend");
    // (2) geometry resolver: Dh, A_conv, sigma, eta_surf
    double dh = HxCorrelations.hxDh(1e-3, 2.0, 1.0);
    double aconv = HxCorrelations.hxAconv(1e-3, 1.0, dh);
    double sigma = HxCorrelations.hxSigma(1e-3, 5e-3);
    double etaSurf = HxCorrelations.hxEtaSurf(0.8, 1.0, 0.85);
    System.out.printf("geom Dh=%.4f Aconv=%.4f sigma=%.3f eta_surf=%.3f%n", dh, aconv, sigma, etaSurf);
    assertEquals(4.0 * 1e-3 * 1.0 / dh, aconv, 1e-9, "A_conv = 4*Aflow*L/Dh identity");
    assertTrue(sigma > 0 && sigma < 1 && etaSurf > 0 && etaSurf <= 1, "sigma, eta_surf in (0,1]");
    // (4) Müller-Steinhagen two-phase dP and compact-core entrance/exit dP
    double dpMs = HxCorrelations.dpMuellerSteinhagen("R1234yf", 350000, 0.5, 0.03, 0.006, 8e-5, 2.0);
    double dpCore = HxCorrelations.dpCompactCore(50, 1.2, 1.0, 0.6, 0.4, 0.2);
    System.out.printf("dp_MS=%.0f Pa  dp_core=%.1f Pa%n", dpMs, dpCore);
    assertTrue(dpMs > 0, "Mueller-Steinhagen drop positive");
    assertTrue(dpCore > 0, "compact-core drop (acceleration-dominated here) positive");
  }

  @Test void remainingCorrelations() {
    assumeTrue(CoolProp.isAvailable());
    // tube-bank (inline vs staggered), single cylinder, chevron plate Nu
    double nuIn = HxCorrelations.nuTubeBank("inline", 1e4, 0.7);
    double nuSt = HxCorrelations.nuTubeBank("staggered", 1e4, 0.7);
    double nuHi = HxCorrelations.nuHilpert(1e4, 0.7);
    double nuPl30 = HxCorrelations.nuPlate(2000, 5, 30);
    double nuPl60 = HxCorrelations.nuPlate(2000, 5, 60);
    System.out.printf("Nu bank in=%.0f stag=%.0f  hilpert=%.0f  plate30=%.0f plate60=%.0f%n",
        nuIn, nuSt, nuHi, nuPl30, nuPl60);
    assertTrue(nuSt > nuIn, "staggered bank enhances over inline");
    assertTrue(nuHi > 0 && nuPl60 > nuPl30, "Hilpert positive; steeper chevron -> higher Nu");
    // fin-and-tube geometry -> areas -> eta_surf
    double finLen = HxCorrelations.hxFinLen(0.025, 1.5e-4, 1000, 0.002);
    double aDir = HxCorrelations.hxAreaDirect(0.4, 30, 0.002, 0.025, 1.5e-4);
    double aInd = HxCorrelations.hxAreaIndirect(0.4, 30, finLen);
    double etaSurf = HxCorrelations.hxEtaSurf(aInd, aDir + aInd, 0.85);
    System.out.printf("finLen=%.4f Adir=%.3f Aind=%.3f eta_surf=%.3f%n", finLen, aDir, aInd, etaSurf);
    assertTrue(finLen > 0 && aInd > aDir && etaSurf > 0 && etaSurf <= 1, "fin geometry sane");
    // gravitational two-phase dP (vertical riser)
    double dpG = HxCorrelations.dpGravity(1100, 30, 0.7, 1.0, 90);
    assertTrue(dpG > 0, "vertical riser static head positive: " + dpG);
  }

  @Test void gapCompletionCorrelations() {
    assumeTrue(CoolProp.isAvailable());
    // mass flux helper
    assertEquals(0.4 / 0.02, HxCorrelations.massFlux(0.4, 0.02), 1e-9);
    // Colburn-j + friction for compact fin surfaces (louvered > plain at same Re)
    double jPlain = HxCorrelations.jFin("plain", 1000);
    double jLouv = HxCorrelations.jFin("louvered", 1000);
    double fLouv = HxCorrelations.fFin("louvered", 1000);
    System.out.printf("j plain=%.4f louvered=%.4f  f louvered=%.4f%n", jPlain, jLouv, fLouv);
    assertTrue(jPlain > 0 && jLouv > 0 && fLouv > jLouv, "j and f physical (f>j)");
    // Gungor-Winterton boiling (enhances over liquid Nu) and Traviss condensation
    double nuGw = HxCorrelations.nuGungorWinterton(50, 0.3, 0.0); // convective limit
    double nuTr = HxCorrelations.nuTraviss(2e4, 3.0, 0.3);
    System.out.printf("Nu GW=%.0f  Nu Traviss=%.0f%n", nuGw, nuTr);
    assertTrue(nuGw > 50, "Gungor-Winterton enhances over liquid-only Nu");
    assertTrue(nuTr > 0, "Traviss condensation Nu positive");
    // quality-integrated two-phase dP vs single mid-point
    double dpAvg = HxCorrelations.dp2phaseAvg("R1234yf", 350000, 0.1, 0.9, 0.03, 0.006, 8e-5, 2.0, 10);
    double dpMid = HxCorrelations.dp2phase("R1234yf", 350000, 0.5, 0.03, 0.006, 8e-5, 2.0);
    System.out.printf("dp_avg(10 cells)=%.0f Pa  dp_mid=%.0f Pa%n", dpAvg, dpMid);
    assertTrue(dpAvg > 0 && Math.abs(dpAvg - dpMid) < 5 * dpMid, "quality-integrated dP in a sane band");
  }

  @Test void uaAndDpInjectedIntoComponent() {
    assumeTrue(CoolProp.isAvailable());
    // A chiller evaporator whose UA and dP are CALCULATED OUTSIDE (correlation +
    // geometry) and INJECTED into the component parameters — not hand-tuned lumps.
    Map<String, Double> v = solver.solve("""
        COMPONENT EvapUA(in, out, wall)
          PARAM fluid$, UA, dP, SH, domain$ = twophase
          out.P = in.P - dP
          Tevap = T_sat(fluid$, P=in.P)
          Q     = UA * (wall.T - Tevap)
          out.h = Enthalpy(fluid$, P=out.P, T=Tevap + SH)
          in.mdot  = Q / (out.h - in.h)
          out.mdot = in.mdot
          wall.Qdot = Q
        END
        COMPONENT LiqFeed(out)
          PARAM fluid$, P, x, domain$ = twophase
          out.P = P
          out.h = Enthalpy(fluid$, P=P, x=x)
        END
        // UA object (chiller: R1234yf boiling <-> EG50 coolant) + dP object,
        // both computed from correlation + geometry and injected below.
        h_ref  = htc_evap('R1234yf', 350000, 0.5, 0.03, 0.006, 8e-5)
        h_cool = htc_1phase('EG50', 200000, 290, 0.2, 0.008, 1.2e-4)
        UA_chl = ua_hx(h_ref, 0.6, h_cool, 0.8, 1e-4)
        dP_chl = dp_2phase('R1234yf', 350000, 0.5, 0.03, 0.006, 8e-5, 1.5)

        LiqFeed       FEED(fluid$=R1234yf, P=350000, x=0.20)
        EvapUA        EV(fluid$=R1234yf, UA=UA_chl, dP=dP_chl, SH=5)
        ThermalSource WALL(T=290)
        TwoPhaseSink  SNK()
        connect(FEED.out, EV.in)
        connect(EV.wall, WALL.port)
        connect(EV.out, SNK.in)
        """).variables();
    System.out.printf("INJECTED  UA=%.1f W/K  dP=%.0f Pa  Q=%.0f W  mdot=%.4f kg/s  dP_applied=%.0f%n",
        v.get("ua_chl"), v.get("dp_chl"), v.get("ev.q"), v.get("ev.in.mdot"),
        v.get("ev.in.p") - v.get("ev.out.p"));
    assertTrue(v.get("ua_chl") > 0, "UA object computed");
    assertTrue(v.get("ev.q") > 0, "chiller draws heat using the injected UA");
    assertEquals(v.get("dp_chl"), v.get("ev.in.p") - v.get("ev.out.p"), 1e-6, "injected dP applied across the evaporator");
  }
}
