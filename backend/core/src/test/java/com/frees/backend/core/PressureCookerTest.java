package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Pressure-cooker transient exercising the new {@code BoilingVessel} (rigid
 * variable-mass two-phase control volume closed by a (rho,u) flash) and
 * {@code SteamReliefValve} (compressible crack-pressure vent): 5 L rigid vessel,
 * 3 kg water at 15 C, 3 kW heat, a steam relief valve cracking at 1.1 atm. The
 * undersized 2 mm^2 orifice cannot hold 1.1 atm, so the cooker over-pressurises —
 * a physics-first result the model surfaces rather than assumes.
 */
class PressureCookerTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  private static final String MODEL = """
      BoilingVessel   COOK(fluid$=Water, V=0.005, m0=3.0, T0=288.15)
      SteamReliefValve PRV(fluid$=Water, A=2e-6, Pset=111458, Cd=0.8, kgas=1.14, Rgas=461.5, eps=1000)
      TwoPhasePressureSink ATM(P=101325)

      connect(COOK.vent, PRV.in)
      connect(PRV.out, ATM.in)
      COOK.wall.Qdot = 3000          // 3 kW electric heater (I = 3000/220 = 13.6 A)

      DYNAMIC cook (method = ida, time = 0 .. 1200, points = 25, rtol = 1e-5, atol = 1e-4)
      END
      """;

  @Test
  void cookerOverPressurisesWithUndersizedValve() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    var table = solver.solve(MODEL).odeTables().get(0);
    List<String> cols = table.columns();
    int cT = cols.indexOf("cook$t_cv");
    int cP = cols.indexOf("cook$vent$p");
    int cM = cols.indexOf("cook$mass");
    List<Double> first = table.rows().get(0);
    List<Double> last = table.rows().get(table.rows().size() - 1);

    assertTrue(first.get(cT) < 290 && first.get(cM) > 2.99, "starts cold and full (~15 C, 3 kg)");
    assertTrue(last.get(cT) - 273.15 > 130, "water heats well past boiling: " + (last.get(cT) - 273.15) + " C");
    assertTrue(last.get(cP) > 3 * 101325, "undersized valve over-pressurises above 3 atm: " + last.get(cP) / 101325 + " atm");
    assertTrue(last.get(cM) < first.get(cM) - 0.5, "mass drops as steam vents: " + last.get(cM) + " kg");
  }
}
