package com.frees.backend.core;
import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.core.ode.OdeTableResult;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * EV TMS step 3: TWO evaporators on ONE compressor suction (the realistic
 * single-compressor dual-evaporator AC). The battery chiller and the cabin
 * evaporator share a COMMON, FLOATING suction pressure P_suc; each has its own
 * TXV setting a DIFFERENT superheat. Both vapor exits mix into one suction node
 * -> one real (isentropic) compressor -> one condenser (floating head pressure).
 *
 * Solver view: P_suc is closed by the COMPRESSOR-DISPLACEMENT balance -- the
 * compressor swallows a fixed volume so mdot = frac*disp*rho(P_suc); P_suc
 * settles where that equals the combined evaporator demand mdot1+mdot2. P_cond
 * is closed by the condenser UA-to-ambient duty. Both float; nothing is pinned.
 *
 * Evaluated BOTH ways from one model:
 *  - STEADY: full compressor capacity, storage at equilibrium (der=0).
 *  - TRANSIENT: capacity ramps 0->full over 5 s, storage integrated 600 s.
 */
class EvTmsCabinTest {

  /** components + network; {@code drive} supplies the machine capacity signal. */
  private String model(String drive, boolean dynamic) {
    String head = """
        COMPONENT MassGen(port)
          PARAM C, Qgen, T0
          der(port.T)  = (Qgen + port.Qdot) / C
          init(port.T) = T0
        END
        // evaporator with a TXV holding a SET SUPERHEAT, at the shared suction
        // pressure (out.P). in.h is the post-TXV enthalpy = condenser liquid
        // (TXV isenthalpic), pinned top-level from the floating P_cond. Duty
        // Q = frac*UA*(T_wall - Tevap) is load-following (stable); the flow the
        // TXV meters follows: mdot = Q / (h_superheat - h_in).
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
        // post-TXV flash feed: P (= suction) and quality set; mdot FREE (the
        // evaporator's TXV meters it). Anchors + seeds each branch's suction P.
        COMPONENT LiqFeed(out)
          PARAM fluid$, P, x, domain$ = twophase
          out.P = P
          out.h = Enthalpy(fluid$, P=P, x=x)
        END
        // suction manifold: both branches arrive at the SAME suction pressure
        // (set by their feeds), so we mix mass + enthalpy without re-equating P.
        COMPONENT TwoPhaseMixer(in1, in2, out)
          PARAM domain$ = twophase
          out.P    = in1.P
          out.mdot = in1.mdot + in2.mdot
          out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
        END
        // real compressor: pulls the combined suction flow, real-gas isentropic
        // head from the (floating) suction to the (floating) condenser pressure.
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
        COMPONENT LiquidMixer(in1, in2, out)
          PARAM domain$ = liquid
          out.P    = in1.P
          in2.P    = in1.P
          out.mdot = in1.mdot + in2.mdot
          out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
        END

        MassGen BATT(C=60000, Qgen=4000, T0=315)
        MassGen MOTOR(C=40000, Qgen=5000, T0=315)
        MassGen CABIN(C=8000, Qgen=2500, T0=315)

        LiquidSource    PUMPIN(fluid$=EG50, mdot=0.25, P=200000, T=310)
        LiquidPump      PUMP(fluid$=EG50, eta=0.6)
        LiquidOrifice   MOTR(CdA=1.2e-5, rho=1050)
        LiquidWallHX    MOTOR_CP(fluid$=EG50, UA=400)
        LiquidWallHX    RADL(fluid$=EG50, UA=600)
        MoistAirWallHX  RADA(eps=0.5)
        MoistAirSource  OAIR(P=101325, T=313, W=0.010, mdot=0.8)
        MoistAirSink    OAOUT()
        LiquidOrifice   VLV(CdA=1.5e-5, rho=1050)
        LiquidWallHX    CHL(fluid$=EG50, UA=500)
        LiquidWallHX    BATT_CP(fluid$=EG50, UA=400)
        LiquidMixer     MIX()
        LiquidSink      PUMPOUT()

        // ONE refrigerant circuit: two evaporators -> common suction -> one
        // compressor -> one condenser. Both evaporating + condensing pressures float.
        LiqFeed     FCHL(fluid$=R1234yf, P=350000, x=0.20)
        LiqFeed     FCAB(fluid$=R1234yf, P=350000, x=0.20)
        EvapSH      CHLR(fluid$=R1234yf, UA=200, SH=5)
        EvapSH      CABE(fluid$=R1234yf, UA=130, SH=8)
        TwoPhaseMixer SUC()
        Compressor  CMP(fluid$=R1234yf, eta=0.7)
        CondFloatUA COND(fluid$=R1234yf, UA=1200, Tamb=313)
        TwoPhaseSink LIQ()

        // coolant loop
        connect(PUMPIN.out, PUMP.in)
        connect(PUMP.out, MOTR.in, VLV.in)
        connect(MOTR.out, MOTOR_CP.in)
        connect(MOTOR_CP.wall, MOTOR.port)
        connect(MOTOR_CP.out, RADL.in)
        connect(RADL.wall, RADA.wall)
        connect(OAIR.out, RADA.in)
        connect(RADA.out, OAOUT.in)
        connect(RADL.out, MIX.in1)
        connect(VLV.out, CHL.in)
        connect(CHL.wall, CHLR.wall)
        connect(CHL.out, BATT_CP.in)
        connect(BATT_CP.wall, BATT.port)
        connect(BATT_CP.out, MIX.in2)
        connect(MIX.out, PUMPOUT.in)
        PUMPOUT.in.P = 200000

        // refrigerant: each evaporator fed by its post-TXV flash state at the
        // shared suction pressure; two TXVs hold different superheat (SH param).
        connect(FCHL.out, CHLR.in)
        connect(FCAB.out, CABE.in)
        connect(CHLR.out, SUC.in1)
        connect(CABE.out, SUC.in2)
        connect(SUC.out, CMP.in)
        connect(CMP.out, COND.in)
        connect(COND.out, LIQ.in)
        connect(CABE.wall, CABIN.port)
        """;
    if (dynamic) {
      return head + "DYNAMIC ev (method = ida, time = 0 .. 600, points = 6001, rtol = 1e-6, atol = 1e-6)\n" + drive + "END\n";
    }
    return head + drive;  // steady: constant drive at top level, storage -> der=0
  }

  @Test void steadyOperatingPoint() {
    assumeTrue(CoolProp.isAvailable());
    Map<String,Double> v = new EquationSystemSolver().solve(
        model("CHLR.frac = 1\nCABE.frac = 1\n", false)).variables();
    double cop = (v.get("chlr.q") + v.get("cabe.q")) / v.get("cmp.w");
    System.out.printf("STEADY: Tbatt=%.2f Tmotor=%.2f Tcabin=%.2f C  Psuc=%.0f (Tevap=%.1f C)  Pcond=%.0f (Tcond=%.1f C)%n",
        v.get("batt.port.t")-273.15, v.get("motor.port.t")-273.15, v.get("cabin.port.t")-273.15,
        v.get("cmp.in.p"), v.get("chlr.tevap")-273.15, v.get("cond.in.p"), v.get("cond.tcond")-273.15);
    System.out.printf("        mdot_chl=%.4f mdot_cab=%.4f mdot_suc=%.4f kg/s  Qchl=%.0f Qcab=%.0f W  W=%.0f COP=%.2f%n",
        v.get("chlr.in.mdot"), v.get("cabe.in.mdot"), v.get("cmp.in.mdot"),
        v.get("chlr.q"), v.get("cabe.q"), v.get("cmp.w"), cop);
    assertTrue(cop > 1.5 && cop < 12, "plausible system COP: " + cop);
    assertTrue(v.get("cabin.port.t") < 315, "cabin cooled below initial at steady");
    assertTrue(v.get("chlr.in.mdot") > 0 && v.get("cabe.in.mdot") > 0, "both evaporators draw flow");
    // the two TXVs hold DIFFERENT superheats at the SAME suction pressure
    assertTrue(Math.abs(v.get("chlr.in.p") - v.get("cabe.in.p")) < 1.0, "common suction pressure");
  }

  @Test void transientRamp() {
    assumeTrue(CoolProp.isAvailable()); assumeTrue(SundialsIda.isAvailable());
    // 2% capacity floor: a real compressor idles; keeps refrigerant flow nonzero
    // so the suction mixer enthalpy stays well-posed (no 0/0 at t=0).
    var res = new EquationSystemSolver().solve(
        model("  CHLR.frac = 0.02 + 0.98 * min(time/5, 1)\n  CABE.frac = 0.02 + 0.98 * min(time/5, 1)\n", true));
    OdeTableResult t = res.odeTables().get(0);
    List<List<Double>> r = t.rows();
    int ti=t.columns().indexOf("time"), bi=t.columns().indexOf("batt$port$t"),
        ci=t.columns().indexOf("cabin$port$t"), mi=t.columns().indexOf("motor$port$t");
    System.out.println("rows="+r.size());
    for (int idx : new int[]{0,500,6000})
      System.out.printf("t=%6.1f s  Tbatt=%.2f  Tcabin=%.2f  Tmotor=%.2f C%n",
        r.get(idx).get(ti), r.get(idx).get(bi)-273.15, r.get(idx).get(ci)-273.15, r.get(idx).get(mi)-273.15);
    assertTrue(r.size()==6001, "600 s");
    assertTrue(r.get(6000).get(ci) < r.get(0).get(ci), "cabin cooled over the run");
    assertTrue(r.get(6000).get(bi) < r.get(0).get(bi), "battery cooled over the run");
  }
}
