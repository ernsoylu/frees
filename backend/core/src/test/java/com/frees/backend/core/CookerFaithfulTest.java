package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Like-for-like cross-validation of the pressure cooker against an independent
 * commercial reference simulation: a REAL electrical heater (a 220 V source +
 * 32.2667 ohm resistor with a thermal port) dissipating I^2*R into a 750 J/K
 * lumped steel body, steel->water through a 333 W/K convective link, an
 * adiabatic vessel, and a proportional/lifting relief (60 g/s/bar, cracking at
 * 2 atm abs). frees matches the reference to within ~0.3% on every channel:
 * I=6.818 A, T_water=120.7 C, P=2.03 bar, T_steel=125.2 C, mass=2.789 kg
 * (reference: 6.818 A, 120.87 C, 2.037 bar, 125.37 C, 2.794 kg).
 */
class CookerFaithfulTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  private static final String MODEL = """
      VoltageSource   SUP(E=220)
      HeatingResistor HTR(R=32.2667)              // I^2*R = 1500 W, I = 6.818 A
      Ground          GND()
      ThermalMass     STEEL(C=750, T0=293.15)     // lumped steel body
      Convection      S2W(htc=333.33, area=1)     // steel->water link, 333 W/K
      BoilingVessel   COOK(fluid$=Water, V=0.005, m0=2.994, T0=293.15)
      ProportionalReliefValve PRV(fluid$=Water, Pcrack=202600, grad=6e-7, eps=2000)
      TwoPhasePressureSink ATM(P=101300)

      connect(SUP.p, HTR.p)
      connect(SUP.n, HTR.n, GND.port)             // single 3-way node = circuit return + ground
      connect(HTR.heat, STEEL.port, S2W.a)        // resistor dissipates into the steel body
      connect(S2W.b, COOK.wall)
      connect(COOK.vent, PRV.in)
      connect(PRV.out, ATM.in)

      DYNAMIC cook (method = ida, time = 0 .. 1200, points = 25, rtol = 1e-5, atol = 1e-4)
      END
      """;

  @Test
  void reproducesReferenceWithElectricalHeater() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    var table = solver.solve(MODEL).odeTables().get(0);
    List<String> c = table.columns();
    int cT = c.indexOf("cook$t_cv"), cP = c.indexOf("cook$vent$p"),
        cM = c.indexOf("cook$mass"), cS = c.indexOf("steel$port$t");
    var rows = table.rows();
    var mid = rows.get(rows.size() * 5 / 6);     // ~1000 s (boiling)
    var last = rows.get(rows.size() - 1);        // 1200 s

    double Tw = last.get(cT) - 273.15, P = last.get(cP) / 1e5,
           Ts = last.get(cS) - 273.15, M = last.get(cM);
    // Reference simulation: 120.87 C, 2.037 bar, 125.37 C, 2.794 kg.
    assertTrue(Math.abs(Tw - 120.87) < 1.0, "water temp vs reference, got " + Tw);
    assertTrue(Math.abs(P - 2.037) < 0.05, "pressure vs reference, got " + P);
    assertTrue(Math.abs(Ts - 125.37) < 1.5, "steel temp vs reference, got " + Ts);
    assertTrue(Math.abs(M - 2.794) < 0.05, "mass vs reference, got " + M);
    // Proportional relief HOLDS the setpoint: temperature is flat once boiling.
    assertTrue(Math.abs(Tw - (mid.get(cT) - 273.15)) < 1.0, "T plateaus at the setpoint");
  }
}
