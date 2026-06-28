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
