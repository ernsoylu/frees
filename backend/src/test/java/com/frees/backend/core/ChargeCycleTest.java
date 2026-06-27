package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.core.ode.OdeTableResult;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * The CLOSED vapor-compression loop solved by integrate-to-steady, the way Amesim
 * does it (research corpus: libtpf/libthh capacitive volumes — "mass + energy
 * conservation with (p, h) as states"; alternating C/R discipline -> index-1 DAE).
 *
 * The earlier (M, U)-state control volume made total charge M_evap+M_cond a
 * CONSERVED SUM OF STATES -> an index-2 invariant -> structurally one equation
 * short. Amesim's fix (and this one): the capacitive volume's STATES are
 * (P, h) -- pressure from a bulk-modulus/compressibility compliance
 * (dp/dt = Σṁ / C) and enthalpy from the energy balance -- so the CHARGE
 * m = ρ(P,h)·V is DERIVED, not a state. Total charge is then a nonlinear
 * function of the states, conserved as a CONSEQUENCE of the internal flows, with
 * no algebraic constraint relating states. Index-1, square, marches.
 *
 * Loop (C-R-C-R, never C-C): evaporator volume (C) -> displacement compressor (R)
 * -> condenser volume (C) -> TXV restriction (R) -> back. No source/sink; both
 * pressures float and settle where compressor throughput == TXV return flow.
 */
class ChargeCycleTest {

  private static final String F = "R1234yf";

  private double h(double p, double q) { return CoolProp.propsSI("Hmass", "P", p, "Q", q, F); }

  private String model() {
    double pe0 = 350000, he0 = h(pe0, 0.9);    // low side: mostly-vapor start
    double pc0 = 1200000, hc0 = h(pc0, 0.1);   // high side: mostly-liquid start
    return ("""
      // Amesim-style two-phase capacitive volume: STATES are (P, h).
      // dP/dt from compressibility compliance C (= V*dRho/dP); dh/dt from the
      // energy balance. Charge m = Rho(P,h)*V is DERIVED (not a state), so the
      // closed loop has no conserved-sum-of-states invariant -> index-1.
      COMPONENT PhVol(in, out)
        PARAM fluid$, V, C, UA, T_ext, P0, h0, domain$ = twophase
        der(in.P)  = (in.mdot - out.mdot) / C
        init(in.P) = P0
        rho = Density(fluid$, P=in.P, h=hcv)
        der(hcv)  = (in.mdot * (in.h - hcv) + Qdot) / (rho * V)
        init(hcv) = h0
        out.P = in.P
        out.h = hcv
        Tcv   = Temperature(fluid$, P=in.P, h=hcv)
        Qdot  = UA * (T_ext - Tcv)
      END
      // displacement compressor (R): swept volume * suction density
      COMPONENT CompVol(in, out)
        PARAM fluid$, disp, eta, domain$ = twophase
        rho_s = Density(fluid$, P=in.P, h=in.h)
        in.mdot  = disp * rho_s
        out.mdot = in.mdot
        s_in = Entropy(fluid$, P=in.P, h=in.h)
        h_s  = Enthalpy(fluid$, P=out.P, s=s_in)
        out.h = in.h + (h_s - in.h) / eta
        W = in.mdot * (out.h - in.h)
      END
      // TXV (R): isenthalpic; return flow metered by the pressure drop
      COMPONENT TXV(in, out)
        PARAM Kv, domain$ = twophase
        out.h    = in.h
        out.mdot = in.mdot
        in.mdot  = Kv * sqrt(max(in.P - out.P, 1))
      END
      PhVol   EVAP(fluid$=R1234yf, V=0.02, C=1.5e-5, UA=200,  T_ext=288, P0=%f, h0=%f)
      CompVol CMP(fluid$=R1234yf, disp=0.0025, eta=0.7)
      PhVol   COND(fluid$=R1234yf, V=0.02, C=1.5e-5, UA=1200, T_ext=313, P0=%f, h0=%f)
      TXV     TX(Kv=5e-5)
      connect(EVAP.out, CMP.in)
      connect(CMP.out, COND.in)
      connect(COND.out, TX.in)
      connect(TX.out, EVAP.in)
      DYNAMIC cyc (method = ida, time = 0 .. 300, points = 1501, rtol = 1e-6, atol = 1e-6)
      END
      """).formatted(pe0, he0, pc0, hc0);
  }

  /**
   * The closed (P,h) loop is now structurally well-posed (DOF 0). The fix:
   * ComponentExpander no longer seeds an in↔out loop link for a CAPACITIVE volume
   * (it accumulates mass and its pressure is a state), so the cycle-closing
   * connect is not wrongly judged redundant and emits its across (P/h) + Σṁ
   * equalities. This is frees' analogue of Amesim's C/R causality assignment.
   */
  @Test void closedLoopIsWellPosed() {
    var r = new EquationSystemSolver().check(model().replaceAll("(?s)DYNAMIC.*?END\n", ""));
    int dof = r.equationCount() - r.unknownCount();
    System.out.printf("CHARGE-CYCLE (P,h) algebraic core: eqs=%d vars=%d (DOF %+d)%n",
        r.equationCount(), r.unknownCount(), dof);
    assertTrue(dof == 0, "closed (P,h) charge loop is well-posed (was -3 before the expander fix)");
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
