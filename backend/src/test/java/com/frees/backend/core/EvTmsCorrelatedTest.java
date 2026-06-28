package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * The coupled EV TMS with its heat-exchanger UA and dP GEOMETRY-DRIVEN: each
 * exchanger's UA (and the evaporator pressure drops) is computed OUTSIDE the
 * component from the correlation toolkit (htc_* + ua_hx + dp_2phase) at design-
 * point flows and INJECTED into the component parameters — no hand-tuned UA
 * lumps. The air side of the condenser and radiator uses the external-flow
 * correlation (htc_extair), so air-coupled UA is physically grounded, not
 * internal-pipe-flow approximated.
 */
class EvTmsCorrelatedTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  private String model(String drive, boolean dynamic) {
    String head = """
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
          PARAM fluid$, UA, dP, SH, domain$ = twophase
          out.P = in.P - dP
          Tevap = T_sat(fluid$, P=in.P)
          Q     = frac * UA * (wall.T - Tevap)
          out.h = Enthalpy(fluid$, P=out.P, T=Tevap + SH)
          in.mdot  = Q / (out.h - in.h)
          out.mdot = in.mdot
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
        COMPONENT LiqWallUA(in, out, wall)
          PARAM fluid$, UA, domain$ = liquid
          out.mdot = in.mdot
          out.P    = in.P
          T_in     = Temperature(fluid$, P=in.P, h=in.h)
          Q        = UA * (T_in - wall.T)
          out.h    = in.h - Q / in.mdot
          wall.Qdot = -Q
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

        // ── UA / dP objects from correlation + geometry (design-point flows) ──
        // chiller: R1234yf boiling (refrigerant side) and EG50 coolant side
        h_chl_r = htc_evap('R1234yf', 350000, 0.5, 0.05, 0.006, 8e-5)
        h_chl_c = htc_1phase('EG50', 200000, 290, 0.23, 0.008, 1.5e-4)
        UA_chl_r = h_chl_r * 0.05
        UA_chl_c = h_chl_c * 0.35
        dP_chl   = dp_2phase('R1234yf', 350000, 0.5, 0.05, 0.006, 1.2e-4, 0.4)
        // cabin evaporator (refrigerant boiling, set by its own UA)
        h_cab_r = htc_evap('R1234yf', 350000, 0.5, 0.02, 0.006, 8e-5)
        UA_cab   = h_cab_r * 0.03
        dP_cab   = dp_2phase('R1234yf', 350000, 0.5, 0.02, 0.006, 1.2e-4, 0.4)
        // condenser: R1234yf condensation <-> external AIR (htc_extair)
        h_cnd_r = htc_cond('R1234yf', 1200000, 0.5, 0.07, 0.006, 8e-5)
        h_cnd_a = htc_extair('Air', 101325, 313, 0.6, 0.01, 0.03)
        UA_cond = ua_hx(h_cnd_r, 1.0, h_cnd_a, 6.0, 1e-4)
        // radiator cell: EG50 coolant <-> external AIR
        h_rad_c = htc_1phase('EG50', 200000, 320, 0.4, 0.008, 1.5e-4)
        h_rad_a = htc_extair('Air', 101325, 313, 0.5, 0.01, 0.03)
        UA_rad  = ua_hx(h_rad_c, 0.4, h_rad_a, 2.5, 1e-4)
        // battery / motor cold plates (coolant side film * area)
        UA_bcp  = h_chl_c * 0.5
        UA_mcp  = htc_1phase('EG50', 200000, 320, 0.17, 0.008, 1.5e-4) * 0.5

        // ── Coolant line ──
        LiquidSource  PUMPIN(fluid$=EG50, mdot=0.4, P=200000, T=305)
        LiquidPump    PUMP(fluid$=EG50, eta=0.6)
        LiquidOrifice OBAT(CdA=1.6e-5, rho=1050)
        LiquidOrifice OMOT(CdA=1.2e-5, rho=1050)
        LiqWallUA     BCP(fluid$=EG50, UA=UA_bcp)
        LiqWallUA     CHLC(fluid$=EG50, UA=UA_chl_c)
        LiqWallUA     MCP(fluid$=EG50, UA=UA_mcp)
        LiqMix        MIX()
        LiqWallUA     RAD1(fluid$=EG50, UA=UA_rad)
        LiquidOrifice OR1(CdA=1.2e-4, rho=1050)
        LiqWallUA     RAD2(fluid$=EG50, UA=UA_rad)
        LiquidOrifice OR2(CdA=1.2e-4, rho=1050)
        LiqWallUA     RAD3(fluid$=EG50, UA=UA_rad)
        LiquidOrifice OR3(CdA=1.2e-4, rho=1050)
        ThermalSource AMB(T=313)
        LiquidSink    PUMPOUT()

        MassGen BATT(C=60000, Qgen=4000, T0=305)
        MassGen MOTOR(C=40000, Qgen=5000, T0=305)
        MassGen CABIN(C=8000,  Qgen=2500, T0=305)

        // ── Refrigerant line ──
        LiqFeed       FEED(fluid$=R1234yf, P=350000, x=0.20)
        EvapSH        CHLR(fluid$=R1234yf, UA=UA_chl_r, dP=dP_chl, SH=5)
        EvapSH        CABE(fluid$=R1234yf, UA=UA_cab,  dP=dP_cab, SH=8)
        TwoPhaseMixer SUC()
        Compressor    CMP(fluid$=R1234yf, eta=0.7)
        CondFloatUA   COND(fluid$=R1234yf, UA=UA_cond, Tamb=313)
        TwoPhaseSink  LIQ()

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

        connect(FEED.out, CHLR.in, CABE.in)
        connect(CHLR.out, SUC.in1)
        connect(CABE.out, SUC.in2)
        connect(SUC.out, CMP.in)
        connect(CMP.out, COND.in)
        connect(COND.out, LIQ.in)
        connect(CABE.wall, CABIN.port)
        connect(CHLR.wall, CHLC.wall)
        """;
    return dynamic
        ? head + "DYNAMIC ev (method = ida, time = 0 .. 600, points = 1201, rtol = 1e-6, atol = 1e-6)\n"
            + drive + "END\n"
            + "Tb = FinalValue('batt.port.t')\nTc = FinalValue('cabin.port.t')\n"
        : head + drive;
  }

  @Test void correlatedCoupledSteady() {
    assumeTrue(CoolProp.isAvailable());
    Map<String, Double> v = solver.solve(model("CHLR.frac = 1\nCABE.frac = 1\n", false)).variables();
    System.out.printf("CORRELATED  UA_chl_r=%.0f UA_chl_c=%.0f UA_cond=%.0f UA_rad=%.0f W/K  dP_chl=%.0f Pa%n",
        v.get("ua_chl_r"), v.get("ua_chl_c"), v.get("ua_cond"), v.get("ua_rad"), v.get("dp_chl"));
    System.out.printf("STEADY  Tbatt=%.2f Tmotor=%.2f Tcabin=%.2f C  Pcond=%.0f W=%.0f%n",
        v.get("batt.port.t") - 273.15, v.get("motor.port.t") - 273.15, v.get("cabin.port.t") - 273.15,
        v.get("cond.in.p"), v.get("cmp.w"));
    assertTrue(v.get("ua_cond") > 0 && v.get("ua_rad") > 0, "correlation UAs computed");
    assertTrue(v.get("obat.in.mdot") > 0 && v.get("chlr.in.mdot") > 0, "both lines' wide branches flow");
    assertTrue(v.get("cabin.port.t") < 305, "cabin cooled");
    assertTrue(v.get("cond.in.p") > 350000, "head pressure floats above suction");
    assertTrue(v.get("chlr.in.p") - v.get("chlr.out.p") > 0, "injected evaporator dP applied");
  }

  @Test void correlatedCoupledTransient() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    Map<String, Double> ss = solver.solve(model("CHLR.frac = 1\nCABE.frac = 1\n", false)).variables();
    var v = solver.solve(model(
        "  CHLR.frac = 0.05 + 0.95 * min(time/5, 1)\n  CABE.frac = 0.05 + 0.95 * min(time/5, 1)\n", true)).variables();
    System.out.printf("CORRELATED TRANSIENT @600s  Tbatt=%.2f Tcabin=%.2f C%n", v.get("tb") - 273.15, v.get("tc") - 273.15);
    assertTrue(Math.abs(v.get("tb") - ss.get("batt.port.t")) < 2.0, "battery temp -> steady");
    assertTrue(Math.abs(v.get("tc") - ss.get("cabin.port.t")) < 2.0, "cabin temp -> steady");
  }
}
