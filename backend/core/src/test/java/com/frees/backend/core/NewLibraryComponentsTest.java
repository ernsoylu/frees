package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Regression for the standard-library components added for the EV TMS example:
 * {@code MassGen} (heat), {@code LiquidMixer} (liquid), and {@code TwoPhaseMixer}
 * / {@code TwoPhaseEvaporatorUA} / {@code TwoPhaseCondenserFloat} (twophase). A
 * compact two-branch coolant loop feeds a wall-coupled refrigeration loop, so
 * every new component is instantiated from the library (none defined inline).
 */
class NewLibraryComponentsTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  private static final String MODEL = """
      // Coolant loop: pump -> two parallel cold-plate branches -> LiquidMixer -> sink
      LiquidSource  PIN(fluid$=EG50, mdot=0.3, P=200000 [Pa], T=305 [K])
      LiquidOrifice O1(CdA=1.5e-5, rho=1050)
      LiquidOrifice O2(CdA=1.2e-5, rho=1050)
      LiquidWallHX  CP1(fluid$=EG50, UA=300)
      LiquidWallHX  CP2(fluid$=EG50, UA=300)
      LiquidWallHX  CHL(fluid$=EG50, UA=400)
      LiquidMixer   MIX()
      LiquidSink    POUT()
      MassGen       BATT(C=60000, Qgen=4000 [W], T0=305 [K])
      MassGen       MOTOR(C=40000, Qgen=5000 [W], T0=305 [K])

      // Refrigerant loop: feed -> chiller evaporator (wall-coupled) + a second
      // evaporator -> TwoPhaseMixer -> compressor -> floating-head condenser.
      TwoPhasePressureSource FEED(fluid$=R1234yf, P=350000 [Pa], x=0.2)
      TwoPhaseEvaporatorUA   CHLR(fluid$=R1234yf, UA=600, dP=20000, SH=5)
      TwoPhaseEvaporatorUA   AUX(fluid$=R1234yf, UA=200, dP=20000, SH=8)
      TwoPhaseMixer          SUC()
      TwoPhaseCompressor     CMP(fluid$=R1234yf, eta=0.7)
      TwoPhaseCondenserFloat COND(fluid$=R1234yf, UA=1000, T_amb=313)
      TwoPhaseSink           LIQ()
      MassGen                CABIN(C=8000, Qgen=2500 [W], T0=305 [K])

      connect(PIN.out, O1.in, O2.in)
      connect(O1.out, CP1.in)
      connect(CP1.wall, BATT.port)
      connect(CP1.out, CHL.in)
      connect(CHL.out, MIX.in1)
      connect(O2.out, CP2.in)
      connect(CP2.wall, MOTOR.port)
      connect(CP2.out, MIX.in2)
      connect(MIX.out, POUT.in)

      connect(FEED.out, CHLR.in, AUX.in)
      connect(CHLR.out, SUC.in1)
      connect(AUX.out, SUC.in2)
      connect(SUC.out, CMP.in)
      connect(CMP.out, COND.in)
      connect(COND.out, LIQ.in)
      connect(AUX.wall, CABIN.port)
      connect(CHLR.wall, CHL.wall)

      CHLR.frac = 1
      AUX.frac = 1
      """;

  @Test
  void newLibraryComponentsSolve() {
    assumeTrue(CoolProp.isAvailable());
    Map<String, Double> v = solver.solve(MODEL).variables();

    // MassGen rejects its generation at steady state through the cold-plate wall.
    assertTrue(v.get("batt.port.t") > 305, "battery self-heats above coolant inlet");
    assertTrue(v.get("cabin.port.t") < 305, "cabin evaporator cools the cabin load");
    // Wall-coupled UA evaporator drives a positive refrigerant flow and duty.
    assertTrue(v.get("chlr.in.mdot") > 0, "chiller evaporator pulls refrigerant");
    assertTrue(v.get("cmp.w") > 0, "compressor does work");
    // Floating-head condenser sits above the suction pressure.
    assertTrue(v.get("cond.in.p") > 350000, "head pressure floats above the feed");
    // LiquidMixer closed the parallel branch split: both branches carry flow.
    assertTrue(v.get("o1.in.mdot") > 0 && v.get("o2.in.mdot") > 0, "both coolant branches flow");
  }
}
