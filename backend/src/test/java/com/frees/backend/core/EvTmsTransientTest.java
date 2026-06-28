package com.frees.backend.core;
import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.core.ode.OdeTableResult;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Time-dependent EV thermal-management model: compressor RPM ramps 0->2500 over
 * 5 s; run 100 s at 0.01 s intervals. frees DYNAMIC has no time-scheduled
 * component input, so the ramp is a lumped state-ODE referencing the integration
 * variable `time` (plain DYNAMIC equations, which ARE assembled). Battery + cabin
 * cool as the compressor spins up; the motor settles on its radiator.
 */
class EvTmsTransientTest {
  @Test void compressorRampTransient() {
    assumeTrue(SundialsIda.isAvailable(), "SUNDIALS IDA not available");
    String src = """
        Q_batt = 4000
        Q_motor = 5000
        Q_cabin = 2000
        UA_chl = 300
        UA_rad = 200
        UA_cab = 250
        T_evap = 283
        T_amb = 313
        C_batt = 80000
        C_motor = 40000
        C_cabin = 8000
        DYNAMIC ev_tms (method = ida, time = 0 .. 100, points = 10001, rtol = 1e-6, atol = 1e-6)
          rpm  = 2500 * min(time / 5, 1)
          frac = rpm / 2500
          Qchl  = frac * UA_chl * (Tbatt - T_evap)
          Qrad  = UA_rad * (Tmotor - T_amb)
          Qevap = frac * UA_cab * (Tcab - T_evap)
          der(Tbatt)  = (Q_batt  - Qchl)  / C_batt
          der(Tmotor) = (Q_motor - Qrad)  / C_motor
          der(Tcab)   = (Q_cabin - Qevap) / C_cabin
          Tbatt(0)  = 313
          Tmotor(0) = 313
          Tcab(0)   = 313
        END
        """;
    var res = new EquationSystemSolver().solve(src);
    OdeTableResult t = res.odeTables().get(0);
    List<List<Double>> rows = t.rows();
    int ti=t.columns().indexOf("time"), bi=t.columns().indexOf("tbatt"),
        ci=t.columns().indexOf("tcab"), mi=t.columns().indexOf("tmotor"), ri=t.columns().indexOf("rpm");
    System.out.println("rows="+rows.size()+" cols="+t.columns());
    for (int idx : new int[]{0,500,2000,6000,10000}) {
      List<Double> row = rows.get(idx);
      System.out.printf("t=%6.2f s  rpm=%6.0f  Tbatt=%5.2f C  Tcab=%5.2f C  Tmotor=%5.2f C%n",
          row.get(ti), row.get(ri), row.get(bi)-273.15, row.get(ci)-273.15, row.get(mi)-273.15);
    }
    assertTrue(rows.size() == 10001, "0.01 s intervals over 100 s -> 10001 points");
    assertTrue(rows.get(0).get(ri) < 1.0, "compressor starts at 0 rpm");
    assertTrue(Math.abs(rows.get(500).get(ri) - 2500) < 1, "compressor at 2500 rpm by t=5 s");
    double tBattEnd = rows.get(10000).get(bi) - 273.15;
    assertTrue(tBattEnd < 39 && tBattEnd > 17, "battery cooling as compressor spun up: " + tBattEnd + " C");
    double tCabEnd = rows.get(10000).get(ci) - 273.15;
    assertTrue(tCabEnd < 25, "cabin pulled down by the evaporator: " + tCabEnd + " C");
  }
}
