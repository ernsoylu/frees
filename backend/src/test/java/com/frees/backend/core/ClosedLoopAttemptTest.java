package com.frees.backend.core;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * FRONTIER: a topologically-CLOSED dual-evaporator vapor-compression loop.
 *
 * No source/sink: condenser liquid -> split -> two TXVs (isenthalpic) -> two
 * evaporators -> suction mixer -> DISPLACEMENT compressor -> condenser -> back.
 *
 * Why this can close where ClosedLoopDiagnosisTest could not: every enthalpy is
 * ABSOLUTELY anchored (evaporator = superheat state, condenser = saturated
 * liquid), so the loop enthalpy level is observable (no relative-enthalpy
 * singularity). The suction-pressure closure is the COMPRESSOR DISPLACEMENT
 * (mdot = frac*disp*rho(P_suc)) -- the equation that was redundant in the open
 * chain (where a feed pinned P_suc) but is REQUIRED once the loop is closed.
 */
class ClosedLoopAttemptTest {
  private String head = """
      COMPONENT WallT(wall)
        PARAM T
        wall.T = T
      END
      COMPONENT EvapSH(in, out, wall)
        PARAM fluid$, UA, SH, domain$ = twophase
        out.P = in.P
        Tevap = T_sat(fluid$, P=out.P)
        Q     = UA * (wall.T - Tevap)
        out.h = Enthalpy(fluid$, P=out.P, T=Tevap + SH)
        out.mdot = Q / (out.h - in.h)
        in.mdot  = out.mdot
        wall.Qdot = Q
      END
      COMPONENT TXV(in, out)
        PARAM domain$ = twophase
        out.h    = in.h
        out.mdot = in.mdot
      END
      COMPONENT TwoPhaseMixer(in1, in2, out)
        PARAM domain$ = twophase
        out.P    = in1.P
        out.mdot = in1.mdot + in2.mdot
        out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
      END
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
      COMPONENT CondFloatUA(in, out)
        PARAM fluid$, UA, Tamb, domain$ = twophase
        out.mdot = in.mdot
        out.P    = in.P
        Tcond    = T_sat(fluid$, P=in.P)
        out.h    = Enthalpy(fluid$, P=in.P, x=0)
        Q        = in.mdot * (in.h - out.h)
        Q        = UA * (Tcond - Tamb)
      END
      WallT WCHL(T=288)
      WallT WCAB(T=295)
      EvapSH CHLR(fluid$=R1234yf, UA=200, SH=5)
      EvapSH CABE(fluid$=R1234yf, UA=130, SH=8)
      TXV TX1()
      TXV TX2()
      TwoPhaseMixer SUC()
      CompVol CMP(fluid$=R1234yf, disp=0.0025, eta=0.7)
      CondFloatUA COND(fluid$=R1234yf, UA=1200, Tamb=313)
      connect(WCHL.wall, CHLR.wall)
      connect(WCAB.wall, CABE.wall)
      connect(COND.out, TX1.in, TX2.in)
      connect(TX1.out, CHLR.in)
      connect(TX2.out, CABE.in)
      connect(CHLR.out, SUC.in1)
      connect(CABE.out, SUC.in2)
      connect(SUC.out, CMP.in)
      connect(CMP.out, COND.in)
      """;

  /**
   * THE RESULT: the closed dual-evaporator loop is STRUCTURALLY WELL-POSED
   * (solvable, DOF 0). This refutes the prior "a closed refrigerant loop is
   * structurally singular" note (ClosedLoopDiagnosisTest) for THIS formulation:
   * absolute enthalpy anchors (evaporator superheat + condenser saturated liquid)
   * make the loop enthalpy level observable, and the compressor DISPLACEMENT
   * (mdot = disp*rho(P_suc)) supplies the suction-pressure closure that a
   * pass-through compressor lacked.
   */
  @Test void closedLoopIsStructurallyWellPosed() {
    var r = new EquationSystemSolver().check(head);
    System.out.printf("CLOSED-LOOP: eqs=%d vars=%d (DOF %+d) solvable=%b%n",
        r.equationCount(), r.unknownCount(), r.equationCount()-r.unknownCount(), r.solvable());
    assertEquals(r.equationCount(), r.unknownCount(), "DOF 0");
    assertTrue(r.solvable(), "closed loop is structurally well-posed (not singular)");
  }

  /**
   * CHARACTERIZATION of the remaining frontier: although well-posed, the
   * COLD-START solve of both simultaneously-floating pressures still fails -- one
   * nominal seed cannot serve a low suction and a high discharge, so a pressure
   * iterate leaves the property table (NaN). The route past this is integrate-to-
   * steady with the suction as a compliance STATE (ClosedLoopDynamicTest), which
   * in turn needs transient (P,h) property guarding in the IDA residual. If this
   * ever starts passing, the cold-start hardening landed -- update the note.
   */
  @Test void coldStartIsStillTheNumericalFrontier() {
    assumeTrue(CoolProp.isAvailable());
    assertThrows(Exception.class, () -> new EquationSystemSolver().solve(head),
        "cold-start of both floating pressures is the documented numerical frontier");
  }
}
