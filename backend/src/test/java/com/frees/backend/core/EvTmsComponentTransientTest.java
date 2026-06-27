package com.frees.backend.core;
import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.core.ode.OdeTableResult;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Full three-domain EV thermal-management transient on the ACAUSAL COMPONENT
 * network, with a FLOATING condensing pressure. Battery + motor are thermal
 * masses (states); the EG50 coolant loop transports their heat; the motor branch
 * rejects to outdoor air through the radiator; the battery branch is chilled by
 * the R1234yf refrigerant. The refrigerant flow is the compressor RPM ramp
 * (0->2500 over 5 s, a scheduled input). The CONDENSING PRESSURE floats from the
 * ambient and the (ramping) heat-rejection duty, so the head pressure RISES as
 * the compressor spins up — at ṁ=0 it sits at Psat(T_amb), then climbs with load.
 */
class EvTmsComponentTransientTest {
  @Test void fullNetworkTransientBothPressuresFloat() {
    assumeTrue(CoolProp.isAvailable()); assumeTrue(SundialsIda.isAvailable());
    String src = """
        COMPONENT MassGen(port)
          PARAM C, Qgen, T0
          der(port.T)  = (Qgen + port.Qdot) / C
          init(port.T) = T0
        END
        // refrigerant inlet: fixed quality, flow = compressor ramp; PRESSURE FLOATS
        COMPONENT VInletQ(out)
          PARAM fluid$, x, domain$ = twophase
          out.h    = Enthalpy(fluid$, P=out.P, x=x)
          out.mdot = msig
        END
        // floating-pressure chiller evaporator: sat-vapor outlet (absolute anchor);
        // in.P (evaporating pressure) FLOATS from Q = ṁ(h_g(P) - h_in) = UA(T_wall - T_sat(P)).
        // At ṁ=0 -> Q=0 -> T_sat=T_wall -> P_evap = Psat(coolant temp); drops with load.
        COMPONENT EvapFloatUA(in, out, wall)
          PARAM fluid$, UA, domain$ = twophase
          out.mdot = in.mdot
          out.P    = in.P
          Tevap    = T_sat(fluid$, P=in.P)
          out.h    = Enthalpy(fluid$, P=in.P, x=1)
          Q        = in.mdot * (out.h - in.h)
          Q        = UA * (wall.T - Tevap)
          wall.Qdot = Q
        END
        COMPONENT CompDh(in, out)
          PARAM dh, domain$ = twophase
          out.mdot = in.mdot
          out.h    = in.h + dh
        END
        // condenser: sat-liquid outlet (absolute enthalpy anchor); the condensing
        // pressure (in.P) FLOATS from Q = ṁ*(in.h - h_f(P)) = UA*(T_sat(P) - T_amb).
        // At ṁ=0 -> Q=0 -> T_sat=T_amb -> P = Psat(T_amb); rises with the ramping duty.
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

        // refrigerant: chiller (evaporates against coolant) -> compressor ->
        // floating-head condenser (rejects to ambient) -> liquid line
        VInletQ RIN(fluid$=R1234yf, x=0.2)
        EvapFloatUA CHLR(fluid$=R1234yf, UA=600)
        CompDh  CMP(dh=45000)
        CondFloatUA COND(fluid$=R1234yf, UA=350, Tamb=313)
        TwoPhaseSink RLIQ()

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
        connect(RIN.out, CHLR.in)
        connect(CHLR.out, CMP.in)
        connect(CMP.out, COND.in)
        connect(COND.out, RLIQ.in)

        DYNAMIC ev (method = ida, time = 0 .. 600, points = 60001, rtol = 1e-6, atol = 1e-6)
          RIN.msig = 0.05 * min(time / 5, 1)
        END
        """;
    var res = new EquationSystemSolver().solve(src);
    OdeTableResult t = res.odeTables().get(0);
    List<List<Double>> r = t.rows();
    int ti=t.columns().indexOf("time"), bi=t.columns().indexOf("batt$port$t"),
        mi=t.columns().indexOf("motor$port$t"), fi=t.columns().indexOf("rin$out$mdot"),
        pc=t.columns().indexOf("cond$in$p"), tc=t.columns().indexOf("cond$tcond"),
        pe=t.columns().indexOf("chlr$in$p"), te=t.columns().indexOf("chlr$tevap");
    System.out.println("rows="+r.size());
    for (int idx : new int[]{0,500,6000,30000,60000})
      System.out.printf("t=%6.2f s  mdot=%.4f  Pevap=%8.0f (Te=%.1fC)  Pcond=%8.0f (Tc=%.1fC)  Tbatt=%5.2f  Tmotor=%5.2f%n",
        r.get(idx).get(ti), r.get(idx).get(fi), r.get(idx).get(pe), r.get(idx).get(te)-273.15,
        r.get(idx).get(pc), r.get(idx).get(tc)-273.15, r.get(idx).get(bi)-273.15, r.get(idx).get(mi)-273.15);
    assertTrue(r.size()==60001, "600 s @ 0.01 s");
    double pcStart=r.get(0).get(pc), pcEnd=r.get(60000).get(pc);
    double peStart=r.get(0).get(pe), peEnd=r.get(60000).get(pe);
    assertTrue(pcEnd > pcStart + 1e5, "head pressure ROSE with the ramp: " + pcStart + " -> " + pcEnd);
    assertTrue(peEnd < peStart - 5e4, "evaporating pressure DROPPED as the chiller loaded: " + peStart + " -> " + peEnd);
    assertTrue(peEnd < pcEnd, "evaporating below condensing at load");
    assertTrue(r.get(60000).get(bi) < r.get(0).get(bi), "battery cooled by the chiller");
  }
}
