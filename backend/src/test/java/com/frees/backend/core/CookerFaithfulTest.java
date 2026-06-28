package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Faithful cooker (vs AMESim): proportional relief valve + steel thermal mass + heat loss. */
class CookerFaithfulTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  private static final String MODEL = """
      HeatSource     HTR(Q=1500)
      ThermalMass    STEEL(C=900, T0=293.15)
      Convection     S2W(htc=335, area=1)          // steel -> water, UA = 335 W/K
      Convection     LOSS(htc=1.5, area=1)         // steel -> ambient, UA = 1.5 W/K
      ThermalSource  AMB(T=293.15)
      BoilingVessel  COOK(fluid$=Water, V=0.005, m0=3.0, T0=293.15)
      ProportionalReliefValve PRV(fluid$=Water, Pcrack=202650, grad=5e-7, eps=500)
      TwoPhasePressureSink ATM(P=101300)

      connect(HTR.port, STEEL.port, S2W.a, LOSS.a)
      connect(S2W.b, COOK.wall)
      connect(LOSS.b, AMB.port)
      connect(COOK.vent, PRV.in)
      connect(PRV.out, ATM.in)

      DYNAMIC cook (method = ida, time = 0 .. 1200, points = 25, rtol = 1e-5, atol = 1e-4)
      END
      """;

  @Test
  void faithfulModelHoldsSetpointLikeAmesim() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    var table = solver.solve(MODEL).odeTables().get(0);
    List<String> c = table.columns();
    int cT = c.indexOf("cook$t_cv"), cP = c.indexOf("cook$vent$p"), cM = c.indexOf("cook$mass");
    var rows = table.rows();
    var mid = rows.get(rows.size() * 5 / 6);     // ~1000 s, boiling
    var last = rows.get(rows.size() - 1);        // 1200 s

    double Tlast = last.get(cT) - 273.15, Plast = last.get(cP) / 1e5;
    // Proportional relief HOLDS the ~2 atm setpoint (AMESim: 120.9 C, 2.037 bar).
    assertTrue(Math.abs(Tlast - 120.9) < 3, "water holds ~121 C, got " + Tlast);
    assertTrue(Math.abs(Plast - 2.037) < 0.1, "pressure holds ~2.04 bar, got " + Plast);
    // Plateau: temperature is flat once boiling (not drifting up like a choked orifice).
    assertTrue(Math.abs(Tlast - (mid.get(cT) - 273.15)) < 1.0, "T plateaus (no over-pressure drift)");
    // Mass drops as steam vents (AMESim 2.79 kg).
    assertTrue(last.get(cM) < 2.95 && last.get(cM) > 2.7, "mass vented to ~2.8 kg, got " + last.get(cM));
  }
}
