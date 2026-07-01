package com.frees.backend.core;
import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.core.ode.OdeTableResult;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Time-scheduled input to an ACAUSAL COMPONENT in a transient: a refrigerant
 *  source whose mass flow is driven by the compressor RPM ramp via a DYNAMIC-body
 *  equation referencing `time`. Previously non-square (the body ref didn't unify
 *  with the component var); now the DYNAMIC-body rewrite makes it solve. */
class ScheduledInputTest {
  @Test void componentTakesScheduledInput() {
    assumeTrue(CoolProp.isAvailable()); assumeTrue(SundialsIda.isAvailable());
    String src = """
        COMPONENT VInlet(out)
          PARAM fluid$, P, x, domain$ = twophase
          out.P    = P
          out.h    = Enthalpy(fluid$, P=P, x=x)
          out.mdot = msig
        END
        COMPONENT RefEvap(in, out, wall)
          PARAM fluid$, SH_set, domain$ = twophase
          out.mdot = in.mdot
          out.P    = in.P
          Tevap    = T_sat(fluid$, P=in.P)
          out.h    = Enthalpy(fluid$, P=in.P, T=Tevap + SH_set)
          Q        = in.mdot * (out.h - in.h)
          wall.Qdot = Q
        END
        VInlet RIN(fluid$=R1234yf, P=350000, x=0.2)
        RefEvap CHL(fluid$=R1234yf, SH_set=5)
        TwoPhaseSink ROUT()
        ThermalMass BATT(C=60000, T0=315)
        connect(RIN.out, CHL.in)
        connect(CHL.out, ROUT.in)
        connect(CHL.wall, BATT.port)
        DYNAMIC run(method = ida, time = 0 .. 100, points = 10001, rtol = 1e-6, atol = 1e-6)
          RIN.msig = 0.045 * min(time / 5, 1)
        END
        """;
    var res = new EquationSystemSolver().solve(src);
    OdeTableResult t = res.odeTables().get(0);
    List<List<Double>> r = t.rows();
    int ti=t.columns().indexOf("time"), bi=t.columns().indexOf("batt$port$t"),
        mi=t.columns().indexOf("rin$out$mdot"), qi=t.columns().indexOf("chl$q");
    System.out.println("rows="+r.size()+" cols="+t.columns());
    for (int idx : new int[]{0,500,2000,10000})
      System.out.printf("t=%6.2f  mdot=%.4f  Q=%7.1f  Tbatt=%.2f C%n",
        r.get(idx).get(ti), r.get(idx).get(mi), r.get(idx).get(qi), r.get(idx).get(bi)-273.15);
    assertTrue(r.size()==10001, "100 s @ 0.01 s");
    assertTrue(r.get(0).get(mi) < 1e-3, "compressor flow starts at 0");
    assertTrue(Math.abs(r.get(500).get(mi) - 0.045) < 1e-4, "flow at full by t=5 s");
    assertTrue(r.get(10000).get(bi) < r.get(0).get(bi), "battery cooled once the compressor ramped up");
  }
}
