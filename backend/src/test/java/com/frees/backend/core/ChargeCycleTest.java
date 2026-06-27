package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.core.ode.OdeTableResult;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * The CLOSED vapor-compression cycle solved by integrate-to-steady, built
 * ENTIRELY from the standard library — the Amesim methodology productised:
 *
 *  - {@code TwoPhaseChamber} (promoted): the (P,h)-state two-phase capacitive
 *    volume with a heat port. Charge {@code m=ρ(P,h)V} is DERIVED, so there is no
 *    conserved-sum-of-states invariant; the charge DISTRIBUTION between the two
 *    chambers drives the floating pressures.
 *  - {@code TwoPhaseCompressor model$=volumetric}: displacement (R), sets ṁ from
 *    suction density.
 *  - {@code TwoPhaseExpansionValve}: odd-symmetric orifice (R), the return restriction.
 *  - {@code ThermalSource}: the secondary-side wall temperatures.
 *
 * C-R-C-R, no source/sink: evaporator chamber (C, warm wall) → compressor (R) →
 * condenser chamber (C, cool wall) → expansion valve (R) → back. Both pressures
 * float and settle where compressor throughput == valve return flow. This is the
 * closed loop that was structurally non-square before the ComponentExpander
 * capacitive-loop-seed fix (Amesim C/R causality: C nodes are states).
 */
class ChargeCycleTest {

  private static final String F = "R1234yf";

  private double h(double p, double q) { return CoolProp.propsSI("Hmass", "P", p, "Q", q, F); }

  private String model() {
    double he0 = h(350000, 0.9);    // low-side chamber start: mostly vapor
    double hc0 = h(1200000, 0.1);   // high-side chamber start: mostly liquid
    return ("""
      ThermalSource WEVAP(T=288)
      ThermalSource WCOND(T=313)
      TwoPhaseChamber EVAP(fluid$=R1234yf, V=0.02, C=1.5e-5, UA=200,  P0=350000,  h0=%f)
      TwoPhaseCompressor CMP(fluid$=R1234yf, model$=volumetric, eta=0.7, eta_v=0.9, disp=5.5e-5, rpm=3000)
      TwoPhaseChamber COND(fluid$=R1234yf, V=0.02, C=1.5e-5, UA=1200, P0=1200000, h0=%f)
      TwoPhaseExpansionValve TX(fluid$=R1234yf, Cv=1.2e-6)
      connect(EVAP.wall, WEVAP.port)
      connect(COND.wall, WCOND.port)
      connect(EVAP.out, CMP.in)
      connect(CMP.out, COND.in)
      connect(COND.out, TX.in)
      connect(TX.out, EVAP.in)
      DYNAMIC cyc (method = ida, time = 0 .. 300, points = 1501, rtol = 1e-6, atol = 1e-6)
      END
      """).formatted(he0, hc0);
  }

  @Test void closedLoopIsWellPosed() {
    var r = new EquationSystemSolver().check(model().replaceAll("(?s)DYNAMIC.*?END\n", ""));
    int dof = r.equationCount() - r.unknownCount();
    System.out.printf("CLOSED CYCLE (std lib) algebraic core: eqs=%d vars=%d (DOF %+d)%n",
        r.equationCount(), r.unknownCount(), dof);
    assertTrue(dof == 0, "closed (P,h) charge loop is well-posed (capacitive-loop-seed fix)");
  }

  @Test void closedChargeCycleIntegratesToSteady() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    var res = new EquationSystemSolver().solve(model());
    OdeTableResult t = res.odeTables().get(0);
    List<List<Double>> r = t.rows();
    int ti = t.columns().indexOf("time"),
        pe = t.columns().indexOf("evap$in$p"), pc = t.columns().indexOf("cond$in$p"),
        he = t.columns().indexOf("evap$hcv"), hc = t.columns().indexOf("cond$hcv");
    System.out.println("cols=" + t.columns());
    for (int idx : new int[]{0, 50, 200, r.size() - 1}) {
      System.out.printf("t=%6.1f s  P_evap=%.0f h_evap=%.0f  P_cond=%.0f h_cond=%.0f%n",
          r.get(idx).get(ti), r.get(idx).get(pe), r.get(idx).get(he),
          r.get(idx).get(pc), r.get(idx).get(hc));
    }
    double peEnd = r.get(r.size() - 1).get(pe), pcEnd = r.get(r.size() - 1).get(pc);
    assertTrue(r.size() > 1, "the closed charge cycle marched");
    assertTrue(pcEnd > peEnd + 1e5, "discharge floats above suction at steady: " + peEnd + " -> " + pcEnd);
    assertTrue(peEnd > 5e4 && pcEnd < 3e6, "both pressures physical");
  }
}
