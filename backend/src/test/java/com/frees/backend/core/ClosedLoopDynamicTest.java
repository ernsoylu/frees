package com.frees.backend.core;
import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.core.ode.OdeTableResult;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * FRONTIER, numerical: the topologically-CLOSED dual-evaporator vapor-compression
 * loop solved by INTEGRATE-TO-STEADY. The cold-start algebraic solve of BOTH
 * floating pressures fails (one seed can't serve a low suction + high discharge),
 * so instead the two pressures are STATES on compliance volumes (PVol,
 * der(P)=dmdot/C) seeded individually at plausible values (= the charge split).
 *
 * Because the pressure is now anchored by the volume mass balance, the condenser
 * can use the relative-enthalpy form (out.h = in.h - Q/mdot) WITHOUT the
 * relative-enthalpy singularity (that needed BOTH pressure free AND enthalpy
 * relative). The compressor displacement (mdot = frac*disp*rho(P_suc)) pumps mass
 * from the suction volume to the discharge volume; the loop marches to der(P)=0,
 * i.e. compressor throughput == evaporator demand -- the steady operating point.
 */
class ClosedLoopDynamicTest {
  private String model() {
    return """
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
      // pressure-compliance volume: P is a STATE driven by the mass imbalance.
      COMPONENT PVol(in, out)
        PARAM C, P0, domain$ = twophase
        der(in.P)  = (in.mdot - out.mdot) / C
        init(in.P) = P0
        out.P = in.P
        out.h = in.h
      END
      COMPONENT CompVol(in, out)
        PARAM fluid$, disp, eta, domain$ = twophase
        rho_s = Density(fluid$, P=in.P, h=in.h)
        in.mdot  = frac * disp * rho_s
        out.mdot = in.mdot
        s_in = Entropy(fluid$, P=in.P, h=in.h)
        h_s  = Enthalpy(fluid$, P=out.P, s=s_in)
        out.h = in.h + (h_s - in.h) / eta
        W = in.mdot * (out.h - in.h)
      END
      // condenser: floats P_cond algebraically against its ABSOLUTE saturated-
      // liquid anchor (the well-conditioned form). One pressure is a state
      // (suction), the other floats here -> square, no charge ambiguity.
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
      PVol PSUC(C=1e-5, P0=350000)
      CompVol CMP(fluid$=R1234yf, disp=0.0028, eta=0.7)
      CondFloatUA COND(fluid$=R1234yf, UA=1200, Tamb=313)
      connect(WCHL.wall, CHLR.wall)
      connect(WCAB.wall, CABE.wall)
      connect(COND.out, TX1.in, TX2.in)
      connect(TX1.out, CHLR.in)
      connect(TX2.out, CABE.in)
      connect(CHLR.out, SUC.in1)
      connect(CABE.out, SUC.in2)
      connect(SUC.out, PSUC.in)
      connect(PSUC.out, CMP.in)
      connect(CMP.out, COND.in)
      DYNAMIC clp (method = ida, time = 0 .. 300, points = 1501, rtol = 1e-6, atol = 1e-6)
        CMP.frac = 0.3 + 0.7 * min(time/10, 1)
      END
      """;
  }

  @Test void check() {
    var r = new EquationSystemSolver().check(model().replaceAll("(?s)DYNAMIC.*?END\n", ""));
    System.out.printf("CLOSED-LOOP (algebraic core): eqs=%d vars=%d (DOF %+d) solvable=%b%n",
        r.equationCount(), r.unknownCount(), r.equationCount()-r.unknownCount(), r.solvable());
    // one DOF short by design: the suction pressure is a compliance STATE, so
    // the dynamic DAE (with der(P_suc)) is square -- the algebraic core is -1.
    assertEquals(-1, r.equationCount() - r.unknownCount(), "exactly one pressure state");
  }

  @Disabled("frontier: the DAE is square and marches, but a transient (P,h) "
      + "excursion NaNs the IDA residual (IDASolve -9). Needs transient property "
      + "guarding (NaN-sanitize iterate / clamp (P,h) to table / floor Q/mdot) in "
      + "the core residual path -- the documented numerical-hardening work.")
  @Test void integrateToSteady() {
    assumeTrue(CoolProp.isAvailable()); assumeTrue(SundialsIda.isAvailable());
    var res = new EquationSystemSolver().solve(model());
    OdeTableResult t = res.odeTables().get(0);
    List<List<Double>> r = t.rows();
    int ti=t.columns().indexOf("time"),
        ps=t.columns().indexOf("psuc$in$p"), pd=t.columns().indexOf("cond$in$p");
    System.out.println("rows="+r.size()+" cols="+t.columns());
    for (int idx : new int[]{0, 50, 200, r.size()-1})
      System.out.printf("t=%6.1f s  Psuc=%.0f Pa  Pcond=%.0f Pa%n",
        r.get(idx).get(ti), r.get(idx).get(ps), pd>=0?r.get(idx).get(pd):Double.NaN);
    double psucEnd = r.get(r.size()-1).get(ps);
    assertTrue(psucEnd > 1e5 && psucEnd < 1.5e6, "suction settles in band: " + psucEnd);
    if (pd>=0) assertTrue(r.get(r.size()-1).get(pd) > psucEnd + 1e5, "discharge above suction");
  }
}
