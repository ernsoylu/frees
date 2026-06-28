package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * The FUSED EV thermal-management system: the coolant line and the refrigerant
 * line in ONE coupled model, joined where the chiller refrigerant evaporator wall
 * meets the battery-branch coolant (a cross-domain heat node). Both lines carry
 * their wide branches; the coolant has a discretized radiator pipe; battery,
 * motor and cabin are thermal-mass states so the one model solves a steady
 * operating point and a transient pull-down.
 *
 *   battery heat → coolant (cold plate) → CHILLER → refrigerant → compressor →
 *   condenser → ambient;   motor heat → coolant → discretized radiator → ambient;
 *   cabin heat → refrigerant cabin evaporator → … the SAME compressor.
 */
class EvTmsCoupledTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  static final String MODEL_HEAD = """
      COMPONENT LiqMix(in1, in2, out)
        PARAM domain$ = liquid
        out.P = in1.P
        in2.P = in1.P
        out.mdot = in1.mdot + in2.mdot
        out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
      END
      COMPONENT TwoPhaseMixer(in1, in2, out)
        PARAM domain$ = twophase
        out.P = in1.P
        out.mdot = in1.mdot + in2.mdot
        out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
      END
      COMPONENT MassGen(port)
        PARAM C, Qgen, T0
        der(port.T)  = (Qgen + port.Qdot) / C
        init(port.T) = T0
      END
      COMPONENT LiqFeed(out)
        PARAM fluid$, P, x, domain$ = twophase
        out.P = P
        out.h = Enthalpy(fluid$, P=P, x=x)
      END
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

      // ── Coolant line (EG50): pump → wide-branch split → battery & motor
      //    branches → collect → discretized radiator → pump ───────────────────
      LiquidSource  PUMPIN(fluid$=EG50, mdot=0.4, P=200000, T=305)
      LiquidPump    PUMP(fluid$=EG50, eta=0.6)
      LiquidOrifice OBAT(CdA=1.6e-5, rho=1050)
      LiquidOrifice OMOT(CdA=1.2e-5, rho=1050)
      LiquidWallHX  BCP(fluid$=EG50, UA=600)
      LiquidWallHX  CHLC(fluid$=EG50, UA=600)
      LiquidWallHX  MCP(fluid$=EG50, UA=500)
      LiqMix        MIX()
      LiquidWallHX  RAD1(fluid$=EG50, UA=400)
      LiquidOrifice OR1(CdA=1.2e-4, rho=1050)
      LiquidWallHX  RAD2(fluid$=EG50, UA=400)
      LiquidOrifice OR2(CdA=1.2e-4, rho=1050)
      LiquidWallHX  RAD3(fluid$=EG50, UA=400)
      LiquidOrifice OR3(CdA=1.2e-4, rho=1050)
      ThermalSource AMB(T=313)
      LiquidSink    PUMPOUT()

      // ── Loads (thermal-mass states) ────────────────────────────────────────
      MassGen BATT(C=60000, Qgen=4000, T0=305)
      MassGen MOTOR(C=40000, Qgen=5000, T0=305)
      MassGen CABIN(C=8000,  Qgen=2500, T0=305)

      // ── Refrigerant line (R1234yf): feed → wide-branch split → chiller &
      //    cabin evaporators → collect at suction → compressor → condenser ─────
      LiqFeed       FEED(fluid$=R1234yf, P=350000, x=0.20)
      EvapSH        CHLR(fluid$=R1234yf, UA=300, SH=5)
      EvapSH        CABE(fluid$=R1234yf, UA=130, SH=8)
      TwoPhaseMixer SUC()
      Compressor    CMP(fluid$=R1234yf, eta=0.7)
      CondFloatUA   COND(fluid$=R1234yf, UA=1500, Tamb=313)
      TwoPhaseSink  LIQ()

      // coolant network
      connect(PUMPIN.out, PUMP.in)
      connect(PUMP.out, OBAT.in, OMOT.in)
      connect(OBAT.out, BCP.in)
      connect(BCP.wall, BATT.port)
      connect(BCP.out, CHLC.in)
      connect(CHLC.out, MIX.in1)
      connect(OMOT.out, MCP.in)
      connect(MCP.wall, MOTOR.port)
      connect(MCP.out, MIX.in2)
      connect(MIX.out, RAD1.in)
      connect(RAD1.out, OR1.in)
      connect(OR1.out, RAD2.in)
      connect(RAD2.out, OR2.in)
      connect(OR2.out, RAD3.in)
      connect(RAD3.out, OR3.in)
      connect(OR3.out, PUMPOUT.in)
      connect(AMB.port, RAD1.wall, RAD2.wall, RAD3.wall)
      PUMPOUT.in.P = 200000

      // refrigerant network
      connect(FEED.out, CHLR.in, CABE.in)
      connect(CHLR.out, SUC.in1)
      connect(CABE.out, SUC.in2)
      connect(SUC.out, CMP.in)
      connect(CMP.out, COND.in)
      connect(COND.out, LIQ.in)
      connect(CABE.wall, CABIN.port)

      // CROSS-DOMAIN BRIDGE: chiller refrigerant evaporator wall <-> coolant chiller
      connect(CHLR.wall, CHLC.wall)
      """;

  private String model(String drive, boolean dynamic) {
    return dynamic
        ? MODEL_HEAD + "DYNAMIC ev (method = ida, time = 0 .. 600, points = 1201, rtol = 1e-6, atol = 1e-6)\n"
            + drive + "END\n"
            + "Tb = FinalValue('batt.port.t')\nTm = FinalValue('motor.port.t')\nTc = FinalValue('cabin.port.t')\n"
        : MODEL_HEAD + drive;
  }

  @Test void coupledSteady() {
    assumeTrue(CoolProp.isAvailable());
    Map<String, Double> v = solver.solve(model("CHLR.frac = 1\nCABE.frac = 1\n", false)).variables();
    System.out.printf("COUPLED STEADY  Tbatt=%.2f Tmotor=%.2f Tcabin=%.2f C%n",
        v.get("batt.port.t") - 273.15, v.get("motor.port.t") - 273.15, v.get("cabin.port.t") - 273.15);
    System.out.printf("  coolant split: batt=%.4f motor=%.4f kg/s | ref split: chiller=%.4f cabin=%.4f kg/s | Pcond=%.0f W=%.0f%n",
        v.get("obat.in.mdot"), v.get("omot.in.mdot"), v.get("chlr.in.mdot"), v.get("cabe.in.mdot"),
        v.get("cond.in.p"), v.get("cmp.w"));
    // wide branches on both lines
    assertTrue(v.get("obat.in.mdot") > 0 && v.get("omot.in.mdot") > 0, "coolant wide branches flow");
    assertTrue(v.get("chlr.in.mdot") > 0 && v.get("cabe.in.mdot") > 0, "refrigerant wide branches flow");
    // cross-domain bridge transports the battery heat: chiller duty matches across the wall
    assertTrue(Math.abs(v.get("chlr.q") - v.get("chlc.q")) < 1.0, "chiller duty conserved across the wall");
    assertTrue(v.get("cond.in.p") > 350000, "condensing pressure floats above suction");
    // every load held below its 305 K start-ish band (cooled), cabin coolest
    assertTrue(v.get("cabin.port.t") < 305, "cabin cooled by its evaporator");
  }

  @Test void coupledTransient() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    Map<String, Double> ss = solver.solve(model("CHLR.frac = 1\nCABE.frac = 1\n", false)).variables();
    var v = solver.solve(model(
        "  CHLR.frac = 0.05 + 0.95 * min(time/5, 1)\n  CABE.frac = 0.05 + 0.95 * min(time/5, 1)\n", true)).variables();
    System.out.printf("COUPLED TRANSIENT @600s  Tbatt=%.2f Tmotor=%.2f Tcabin=%.2f C%n",
        v.get("tb") - 273.15, v.get("tm") - 273.15, v.get("tc") - 273.15);
    assertTrue(Math.abs(v.get("tb") - ss.get("batt.port.t")) < 1.5, "battery temp -> steady");
    assertTrue(Math.abs(v.get("tc") - ss.get("cabin.port.t")) < 1.5, "cabin temp -> steady");
  }
}
