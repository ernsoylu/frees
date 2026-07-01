package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * EV thermal-management coolant loop with a DISCRETIZED radiator PIPE and
 * WIDE BRANCHES — the real-world flowsheet topology missing from the earlier
 * examples.
 *
 *  - WIDE-BRANCH SPLIT: one multi-port connect node (1 in / 2 out) divides the
 *    pump flow into a battery branch and a motor branch (each its own orifice +
 *    cold-plate heat exchanger). A flow-weighted COLLECT (LiqMix) rejoins them.
 *  - DISCRETIZED radiator PIPE: three series cells, each a wall-HX heat segment
 *    (wall → ambient) plus an orifice friction segment — a spatial discretization
 *    of the radiator line that drops pressure and rejects heat cell by cell.
 *  - Battery & motor are thermal-mass states (MassGen) so the SAME network solves
 *    a steady operating point (der→0) and a transient pull-down to it.
 */
class EvTmsDiscretizedTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  private static final String HELPERS = """
      // flow-weighted collecting junction (liquid domain has no shipped mixer)
      COMPONENT LiqMix(in1, in2, out)
        PARAM domain$ = liquid
        out.P    = in1.P
        in2.P    = in1.P
        out.mdot = in1.mdot + in2.mdot
        out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
      END
      // lumped thermal mass with internal heat generation + a heat port
      COMPONENT MassGen(port)
        PARAM C, Qgen, T0
        der(port.T)  = (Qgen + port.Qdot) / C
        init(port.T) = T0
      END
      """;

  private String coolant(boolean dynamic) {
    String head = HELPERS + """
        LiquidSource  SRC(fluid$=EG50, mdot=0.4, P=200000, T=315)
        LiquidPump    PUMP(fluid$=EG50, eta=0.6)
        LiquidOrifice OBAT(CdA=1.6e-5, rho=1050)
        LiquidOrifice OMOT(CdA=1.2e-5, rho=1050)
        LiquidWallHX  BCHX(fluid$=EG50, UA=500)
        LiquidWallHX  MCHX(fluid$=EG50, UA=500)
        MassGen       BATT(C=60000, Qgen=4000, T0=315)
        MassGen       MOTR(C=40000, Qgen=5000, T0=315)
        LiqMix        MIX()
        // discretized radiator line: 3 cells of [wall-HX heat] + [orifice ΔP]
        LiquidWallHX  RAD1(fluid$=EG50, UA=400)
        LiquidOrifice OR1(CdA=1.2e-4, rho=1050)
        LiquidWallHX  RAD2(fluid$=EG50, UA=400)
        LiquidOrifice OR2(CdA=1.2e-4, rho=1050)
        LiquidWallHX  RAD3(fluid$=EG50, UA=400)
        LiquidOrifice OR3(CdA=1.2e-4, rho=1050)
        ThermalSource AMB(T=298)
        LiquidSink    OUT()

        connect(SRC.out, PUMP.in)
        connect(PUMP.out, OBAT.in, OMOT.in)
        connect(OBAT.out, BCHX.in)
        connect(BCHX.wall, BATT.port)
        connect(BCHX.out, MIX.in1)
        connect(OMOT.out, MCHX.in)
        connect(MCHX.wall, MOTR.port)
        connect(MCHX.out, MIX.in2)
        connect(MIX.out, RAD1.in)
        connect(RAD1.out, OR1.in)
        connect(OR1.out, RAD2.in)
        connect(RAD2.out, OR2.in)
        connect(OR2.out, RAD3.in)
        connect(RAD3.out, OR3.in)
        connect(OR3.out, OUT.in)
        connect(AMB.port, RAD1.wall, RAD2.wall, RAD3.wall)
        OUT.in.P = 200000
        """;
    return dynamic
        ? head + "DYNAMIC run(method = ode23s, time = 0 .. 1200, points = 120)\nEND\n"
            + "Tb = FinalValue('batt.port.t')\nTm = FinalValue('motr.port.t')\n"
        : head;
  }

  @Test void coolantLoopSteady() {
    assumeTrue(CoolProp.isAvailable());
    Map<String, Double> v = solver.solve(coolant(false)).variables();
    double mBat = v.get("obat.in.mdot"), mMot = v.get("omot.in.mdot");
    System.out.printf("SPLIT  mdot_batt=%.4f mdot_motor=%.4f sum=%.4f (pump 0.4)%n", mBat, mMot, mBat + mMot);
    System.out.printf("STEADY Tbatt=%.2f Tmotor=%.2f C  radiator dh=%.0f J/kg%n",
        v.get("batt.port.t") - 273.15, v.get("motr.port.t") - 273.15,
        v.get("mix.out.h") - v.get("or3.out.h"));
    assertTrue(mBat > 0 && mMot > 0, "both wide branches carry flow");
    assertTrue(Math.abs(mBat + mMot - 0.4) < 1e-3, "split conserves the pump flow");
    assertTrue(mBat > mMot, "wider battery-branch orifice passes more flow");
    assertTrue(v.get("or3.out.h") < v.get("mix.out.h"), "discretized radiator rejects heat cell by cell");
  }

  @Test void coolantLoopTransient() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    Map<String, Double> ss = solver.solve(coolant(false)).variables();
    var v = solver.solve(coolant(true)).variables();
    // transient battery/motor temperatures relax to the steady operating point
    assertTrue(Math.abs(v.get("tb") - ss.get("batt.port.t")) < 1.0, "battery temp -> steady");
    assertTrue(Math.abs(v.get("tm") - ss.get("motr.port.t")) < 1.0, "motor temp -> steady");
  }

  // ── Refrigerant line with WIDE BRANCHES (split + collect) ─────────────────
  private static final String REF_HELPERS = """
      // post-TXV flash feed: P (= suction) and quality set; mdot free
      COMPONENT LiqFeed(out)
        PARAM fluid$, P, x, domain$ = twophase
        out.P = P
        out.h = Enthalpy(fluid$, P=P, x=x)
      END
      // load-following evaporator at the (shared) suction; TXV holds superheat
      COMPONENT EvapSH(in, out, wall)
        PARAM fluid$, UA, SH, domain$ = twophase
        out.P = in.P
        Tevap = T_sat(fluid$, P=out.P)
        Q     = frac * UA * (wall.T - Tevap)
        out.h = Enthalpy(fluid$, P=out.P, T=Tevap + SH)
        out.mdot = Q / (out.h - in.h)
        in.mdot  = out.mdot
        wall.Qdot = Q
      END
      // suction manifold collect (flow-weighted enthalpy, branches at same suction)
      COMPONENT TwoPhaseMixer(in1, in2, out)
        PARAM domain$ = twophase
        out.P    = in1.P
        out.mdot = in1.mdot + in2.mdot
        out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
      END
      COMPONENT Compressor(in, out)
        PARAM fluid$, eta, domain$ = twophase
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
      COMPONENT MassGen(port)
        PARAM C, Qgen, T0
        der(port.T)  = (Qgen + port.Qdot) / C
        init(port.T) = T0
      END
      """;

  private String refrigerant(String drive, boolean dynamic) {
    String head = REF_HELPERS + """
        LiqFeed     FEED(fluid$=R1234yf, P=350000, x=0.20)
        EvapSH      CHL(fluid$=R1234yf, UA=200, SH=5)
        EvapSH      CAB(fluid$=R1234yf, UA=130, SH=8)
        MassGen     BMASS(C=60000, Qgen=4000, T0=315)
        MassGen     CMASS(C=8000,  Qgen=2500, T0=315)
        TwoPhaseMixer SUC()
        Compressor  CMP(fluid$=R1234yf, eta=0.7)
        CondFloatUA COND(fluid$=R1234yf, UA=1200, Tamb=313)
        TwoPhaseSink LIQ()
        connect(FEED.out, CHL.in, CAB.in)
        connect(CHL.wall, BMASS.port)
        connect(CAB.wall, CMASS.port)
        connect(CHL.out, SUC.in1)
        connect(CAB.out, SUC.in2)
        connect(SUC.out, CMP.in)
        connect(CMP.out, COND.in)
        connect(COND.out, LIQ.in)
        """;
    return dynamic
        ? head + "DYNAMIC ev (method = ida, time = 0 .. 600, points = 1201, rtol = 1e-6, atol = 1e-6)\n" + drive + "END\n"
            + "Tb = FinalValue('bmass.port.t')\nTc = FinalValue('cmass.port.t')\n"
        : head + drive;
  }

  @Test void refrigerantDualEvapSteady() {
    assumeTrue(CoolProp.isAvailable());
    Map<String, Double> v = solver.solve(refrigerant("CHL.frac = 1\nCAB.frac = 1\n", false)).variables();
    double mChl = v.get("chl.in.mdot"), mCab = v.get("cab.in.mdot");
    System.out.printf("REF SPLIT mdot_chiller=%.4f mdot_cabin=%.4f feed=%.4f  Pcond=%.0f%n",
        mChl, mCab, v.get("feed.out.mdot"), v.get("cond.in.p"));
    assertTrue(mChl > 0 && mCab > 0, "both evaporator branches draw refrigerant (split)");
    assertTrue(Math.abs(v.get("feed.out.mdot") - (mChl + mCab)) < 1e-6, "split feed conserves mass");
    assertTrue(v.get("cond.in.p") > 350000, "condensing pressure floats above suction");
  }

  @Test void refrigerantDualEvapTransient() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    var v = solver.solve(refrigerant(
        "  CHL.frac = 0.05 + 0.95 * min(time/5, 1)\n  CAB.frac = 0.05 + 0.95 * min(time/5, 1)\n", true)).variables();
    assertTrue(v.get("tb") < 315, "battery mass cooled by the chiller branch: " + v.get("tb"));
    assertTrue(v.get("tc") < 315, "cabin mass cooled by the cabin branch: " + v.get("tc"));
  }
}
