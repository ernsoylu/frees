package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Twenty system-design examples exercising the component library across every
 * domain, each solved in STEADY mode (algebraic der→0 operating point) and/or
 * TRANSIENT mode (a storage state integrated through a DYNAMIC block). Where a
 * system has natural storage, the transient asymptote is checked against the
 * direct steady solve (steady ≡ der→0 limit).
 */
class SystemDesignExamplesTest {

  private final EquationSystemSolver solver = new EquationSystemSolver();

  private Map<String, Double> solve(String s) {
    return solver.solve(s).variables();
  }

  // 1. HEAT — a thermal mass between a hot source and ambient (conduction in,
  //    convection out). Steady operating point + transient relaxation to it.
  @Test void ex01_thermalNetwork() {
    String net = """
        ThermalSource hot(T=400)
        Conduction    c1(k=5, area=1, L=0.1)
        ThermalMass   M(C=8000, T0=305)
        Convection    cv(htc=15, area=2)
        ThermalSource amb(T=300)
        connect(hot.port, c1.a)
        connect(c1.b, M.port, cv.a)
        connect(cv.b, amb.port)
        """;
    double tss = solve(net).get("m.port.t");
    assertTrue(tss > 300 && tss < 400, "steady mass T in range: " + tss);
    var v = solve(net + "DYNAMIC r(method = ode45, time = 0 .. 6000, points = 120)\nEND\n"
        + "Tf = FinalValue('m.port.t')\n");
    assertEquals(tss, v.get("tf"), 1.0, "transient asymptote == steady");
  }

  // 2. MECHANICAL — a torque source spins an inertia against a viscous damper.
  //    STEADY (der→0): ω = T/c. TRANSIENT: spins up from rest to that same ω.
  @Test void ex02_drivelineSpinup() {
    String net = """
        TorqueSource     TS(T=12)
        Inertia          J(J=3, w0=0)
        RotationalDamper D(c=0.6)
        MechGround       G()
        connect(TS.a, J.port, D.a)
        connect(TS.b, D.b, G.port)
        """;
    double wss = solve(net).get("j.port.w");                       // STEADY
    assertEquals(12.0 / 0.6, wss, 0.1, "steady speed = T/c");
    var t = solve(net + "DYNAMIC s(method = ode45, time = 0 .. 60, points = 100)\nEND\n"
        + "wf = FinalValue('j.port.w')\nw0 = MinValue('j.port.w')\n");
    assertEquals(wss, t.get("wf"), 0.1, "transient asymptote == steady");  // TRANSIENT
    assertEquals(0.0, t.get("w0"), 1e-6);
  }

  // 3. ELECTRICAL/THERMAL — EV battery pack self-heats under load to a cold-plate
  //    limit while SOC depletes (stiff transient).
  @Test void ex03_evBatteryThermal() {
    String net = """
        BatteryTransient B(Voc=400, R0=0.1, Q0=100, C_th=50000, SOC0=0.9, T0=298)
        Resistor      MOT(R=3.9)
        Ground        G()
        Conduction    PLATE(k=10, area=1, L=0.1)
        ThermalSource COOL(T=298)
        connect(B.p, MOT.a)
        connect(B.n, MOT.b, G.port)
        connect(B.heat, PLATE.a)
        connect(PLATE.b, COOL.port)
        DYNAMIC drive(method = ode23s, time = 0 .. 600, points = 100)
        END
        Tf   = FinalValue('b.t')
        SOCf = FinalValue('b.soc')
        """;
    var v = solve(net);
    assertTrue(v.get("tf") > 298 && v.get("tf") < 320, "pack warms toward plate limit: " + v.get("tf"));
    assertTrue(v.get("socf") < 0.9 && v.get("socf") > 0.6, "SOC depletes: " + v.get("socf"));
  }

  // 4. ELECTRICAL — DC motor driven from a voltage source, loaded by an inertia +
  //    damper; spins up to a steady speed.
  @Test void ex04_dcMotorDrive() {
    String net = """
        VoltageSource    VS(E=48)
        DCMotor          M(Kt=0.2, Ke=0.2, R=0.5)
        Ground           G()
        Inertia          J(J=0.02, w0=0)
        RotationalDamper D(c=0.01)
        MechGround       MG()
        connect(VS.p, M.p)
        connect(VS.n, M.n, G.port)
        connect(M.shaft, J.port, D.a)
        connect(D.b, MG.port)
        DYNAMIC run(method = ode45, time = 0 .. 5, points = 100)
        END
        wf = FinalValue('j.port.w')
        """;
    var v = solve(net);
    assertTrue(v.get("wf") > 0, "motor spins up: " + v.get("wf"));
  }

  // 5. ELECTROCHEMICAL — PEM fuel-cell stack at a drawn current, heat to coolant.
  @Test void ex05_fuelCellStack() {
    String net = """
        COMPONENT CurrentDraw(p, n)
          PARAM Idraw
          p.I = Idraw
          p.I + n.I = 0
        END
        FuelCellStack FC(ncells=10, area=0.01, i0=10, ilim=20000, Rohm=1e-5, E0=1.18, alpha=0.5, Eth=1.48, T=343)
        CurrentDraw   LOAD(Idraw=50)
        ThermalSource COOL(T=343)
        Convection    HS(htc=200, area=1)
        Ground        G()
        connect(FC.p, LOAD.p)
        connect(FC.n, LOAD.n, G.port)
        connect(FC.heat, HS.a)
        connect(HS.b, COOL.port)
        """;
    var v = solve(net);
    double vstack = v.get("fc.p.v") - v.get("fc.n.v");
    assertTrue(vstack > 5 && vstack < 10 * 1.18, "stack voltage below OCV: " + vstack);
  }

  // 6. PNEUMATIC — STEADY: choked/subsonic blowdown of a supply through an
  //    ISO-6358 orifice to atmosphere. TRANSIENT: that orifice charges a sealed
  //    volume whose pressure rises toward the supply.
  @Test void ex06_pneumatic() {
    String blowdown = """
        PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
        PneumaticOrifice    ORI(fluid$=Air, C=1e-8, b=0.3)
        PneumaticAtmosphere ATM(P=100000)
        connect(SUP.out, ORI.in)
        connect(ORI.out, ATM.port)
        """;
    assertTrue(solve(blowdown).get("ori.in.mdot") > 0, "air flows to atmosphere");

    String charge = """
        COMPONENT GasCap(port)
          PARAM domain$ = gas
          port.mdot = 0
        END
        PneumaticSupply  SUP(fluid$=Air, P=700000, T=300)
        PneumaticOrifice ORI(fluid$=Air, C=1e-8, b=0.3)
        PneumaticVolume  VOL(V=0.001, T=300, R=287, P0=120000)
        GasCap           CAP()
        connect(SUP.out, ORI.in)
        connect(ORI.out, VOL.in)
        connect(VOL.out, CAP.port)
        DYNAMIC fill(method = ode23s, time = 0 .. 30, points = 100)
        END
        Pf = FinalValue('vol.in.p')
        """;
    double pf = solve(charge).get("pf");
    assertTrue(pf > 120000 && pf < 710000, "sealed volume charges toward supply: " + pf);
  }

  // 7. PNEUMATIC — a servo valve meters supply air to atmosphere at a set opening.
  @Test void ex07_pneumaticServo() {
    String net = """
        PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
        PneumaticServoValve SV(fluid$=Air, Cmax=1e-8, b=0.3, u=0.5)
        PneumaticAtmosphere ATM(P=100000)
        connect(SUP.out, SV.in)
        connect(SV.out, ATM.port)
        """;
    assertTrue(solve(net).get("sv.in.mdot") > 0, "servo passes flow");
  }

  // 8. HYDRAULIC — a shaft-driven pump delivers oil through an orifice to tank,
  //    with a relief valve capping the rail.
  @Test void ex08_hydraulicPowerUnit() {
    String net = """
        HydraulicSupply  SUC(P=0)
        SpeedSource      SS(w=150)
        MechGround       G()
        HydraulicPump    PMP(disp=1e-5, rho=850, eta_v=0.95, eta_m=0.9)
        HydraulicOrifice ORI(CdA=1e-5, rho=850)
        HydraulicTank    DIS(P=0)
        connect(SUC.out, PMP.in)
        connect(SS.a, PMP.shaft)
        connect(SS.b, G.port)
        connect(PMP.out, ORI.in)
        connect(ORI.out, DIS.port)
        """;
    assertTrue(solve(net).get("ori.in.mdot") > 0, "pump delivers flow");
  }

  // 9. HYDRAULIC — relief valve cracks open above its setpoint.
  @Test void ex09_hydraulicRelief() {
    String net = """
        HydraulicSupply SUP(P=8000000)
        ReliefValve     RV(Pcrack=5000000, K=1e-6, eps=10000)
        HydraulicTank   TNK(P=0)
        connect(SUP.out, RV.in)
        connect(RV.out, TNK.port)
        """;
    assertTrue(solve(net).get("rv.in.mdot") > 0, "relief passes flow above crack");
  }

  // 10. CONTROL — a PI thermostat holds a thermal mass above ambient (closed loop).
  @Test void ex10_piThermostatControl() {
    String net = """
        PIThermostat  TC(Kp=100, Ki=0.5, Tref=350)
        ThermalMass   M(C=5000, T0=300)
        Conduction    wall(k=2, area=1, L=0.1)
        ThermalSource amb(T=300)
        connect(TC.port, M.port, wall.a)
        connect(wall.b, amb.port)
        DYNAMIC loop(time = 0 .. 1200, points = 120)
        END
        Tf = FinalValue('m.port.t')
        """;
    var v = solve(net);
    assertTrue(v.get("tf") > 300 && v.get("tf") <= 351, "thermostat drives mass toward Tref: " + v.get("tf"));
  }

  // 11. LIQUID COOLING — EG50 pump loop: cold plate adds heat, radiator rejects it.
  @Test void ex11_liquidCoolingLoop() {
    assumeTrue(CoolProp.isAvailable());
    String net = """
        LiquidSource    SRC(fluid$=EG50, mdot=0.3, P=200000, T=315)
        LiquidPump      PUMP(fluid$=EG50, eta=0.6)
        LiquidColdPlate CP(Q=5000)
        LiquidWallHX    RAD(fluid$=EG50, UA=800)
        ThermalSource   AMB(T=298)
        LiquidSink      OUT()
        connect(SRC.out, PUMP.in)
        connect(PUMP.out, CP.in)
        connect(CP.out, RAD.in)
        connect(RAD.wall, AMB.port)
        connect(RAD.out, OUT.in)
        OUT.in.P = 200000
        """;
    var v = solve(net);
    assertTrue(v.get("cp.out.h") > v.get("cp.in.h"), "cold plate heats the coolant");
    assertTrue(v.get("rad.out.h") < v.get("rad.in.h"), "radiator rejects heat to ambient");
  }

  // 12. HVAC — air-handling unit: mix outdoor + return air, cool, then reheat.
  @Test void ex12_moistAirAHU() {
    assumeTrue(CoolProp.isAvailable());
    String net = """
        MoistAirSource OA(P=101325, T=308.15, W=0.016, mdot=1)
        MoistAirSource RA(P=101325, T=297.15, W=0.009, mdot=2)
        MixingBox      MB()
        CoolingCoil    CC(Tout=285.15)
        HeatingCoil    RH(Q=3000)
        MoistAirSink   SNK()
        connect(OA.out, MB.in1)
        connect(RA.out, MB.in2)
        connect(MB.out, CC.in)
        connect(CC.out, RH.in)
        connect(RH.out, SNK.in)
        """;
    var v = solve(net);
    assertTrue(v.get("cc.out.h") < v.get("mb.out.h"), "cooling coil removes enthalpy");
    assertTrue(v.get("rh.out.h") > v.get("cc.out.h"), "reheat raises supply-air enthalpy");
  }

  // 13. HVAC — steam humidifier raises the humidity ratio of an air stream.
  @Test void ex13_humidifier() {
    assumeTrue(CoolProp.isAvailable());
    String net = """
        MoistAirSource SRC(P=101325, T=295, W=0.005, mdot=2)
        Humidifier     HUM(mdot_w=0.002, h_w=2.5e6)
        MoistAirSink   SNK()
        connect(SRC.out, HUM.in)
        connect(HUM.out, SNK.in)
        """;
    assertTrue(solve(net).get("hum.out.w") > 0.005, "humidity ratio increases");
  }

  // 14. GAS MIXTURE — two species streams blend; composition rides as .y.
  @Test void ex14_gasMixtureBlend() {
    String net = """
        GasSource S1(a, y=1.0, mdot=2, P=100000, h0=300000)
        GasSource S2(b, y=0.0, mdot=3, P=100000, h0=290000)
        GasMixer  MIX(a, b, c)
        """;
    assertEquals(0.4, solve(net).get("c.y"), 1e-3, "flow-weighted composition (2·1+3·0)/5");
  }

  // 15. REFRIGERATION — CLOSED vapor-compression cycle (two (P,h) chambers,
  //     displacement compressor, expansion valve); integrate-to-steady, both
  //     pressures float (the charge-distribution capability just added).
  @Test void ex15_refrigerationClosedCycle() {
    assumeTrue(CoolProp.isAvailable());
    assumeTrue(SundialsIda.isAvailable());
    double he0 = CoolProp.propsSI("Hmass", "P", 350000, "Q", 0.9, "R1234yf");
    double hc0 = CoolProp.propsSI("Hmass", "P", 1200000, "Q", 0.1, "R1234yf");
    String net = ("""
        ThermalSource WEVAP(T=288)
        ThermalSource WCOND(T=313)
        TwoPhaseChamber EVAP(fluid$=R1234yf, V=0.02, C=1.5e-5, UA=200,  P0=350000,  h0=%f)
        TwoPhaseCompressor CMP(fluid$=R1234yf, model$=volumetric, eta=0.7, eta_v=0.9, disp=5.5e-5, rpm=3000)
        TwoPhaseChamber COND(fluid$=R1234yf, V=0.02, C=1.5e-5, UA=1200, P0=1200000, h0=%f)
        TwoPhaseExpansionValve TX(fluid$=R1234yf, Cv=1.2e-6)
        connect(EVAP.wall, WEVAP.port)
        connect(COND.wall, WCOND.port)
        connect(EVAP.out, CMP.in)
        connect(CMP.out, COND.in)
        connect(COND.out, TX.in)
        connect(TX.out, EVAP.in)
        DYNAMIC cyc (method = ida, time = 0 .. 200, points = 801, rtol = 1e-6, atol = 1e-6)
        END
        Pe = FinalValue('evap$in$p')
        Pc = FinalValue('cond$in$p')
        """).formatted(he0, hc0);
    var v = solve(net);
    assertTrue(v.get("pc") > v.get("pe") + 1e5, "discharge floats above suction: " + v.get("pe") + " -> " + v.get("pc"));
  }

  // 16. TWO-PHASE HX — moving-boundary evaporator boils refrigerant against a warm wall.
  @Test void ex16_movingBoundaryEvaporator() {
    assumeTrue(CoolProp.isAvailable());
    String net = """
        TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=350000, x=0.2)
        MovingBoundaryEvaporator EV(fluid$=R134a, U_tp=2000, U_sh=500, D=0.01, L=6, eps_zone=0.05)
        ThermalSource  WALL(T=298)
        TwoPhaseSink   SNK()
        connect(SRC.out, EV.in)
        connect(EV.wall, WALL.port)
        connect(EV.out, SNK.in)
        """;
    assertTrue(solve(net).get("ev.out.h") > solve(net).get("ev.in.h"), "refrigerant gains enthalpy (boils)");
  }

  // 17. AC — electronic expansion valve meters refrigerant by opening fraction.
  @Test void ex17_acExpansionValve() {
    assumeTrue(CoolProp.isAvailable());
    String net = """
        TwoPhasePressureSource HI(fluid$=R134a, P=900000, x=0)
        EXV V(fluid$=R134a, CdA_max=2e-6, u=0.6)
        TwoPhasePressureSink LO(P=350000)
        connect(HI.out, V.in)
        connect(V.out, LO.in)
        """;
    assertTrue(solve(net).get("v.in.mdot") > 0, "EXV passes flow at its opening");
  }

  // 18. POWERTRAIN — engine through a gearbox against a road load: a geared
  //     torque balance sets the running speed (steady).
  @Test void ex18_powertrainVehicle() {
    String net = """
        MeanValueEngine ENG(throttle=0.8, Tpeak=50, w_peak=20, FMEP_a=1, FMEP_b=0.1)
        Transmission    TR(ratio=2, eta=0.9)
        GradeRoadLoad   ROAD(Crr=5, Caero=0.5, m=100, g=9.81, grade=0)
        connect(ENG.shaft, TR.in)
        connect(TR.out, ROAD.shaft)
        """;
    assertTrue(solve(net).get("eng.shaft.w") > 0, "engine reaches a running speed");
  }

  // 19. ELECTRICAL — 2-RC Thévenin battery discharging into a load (transient).
  @Test void ex19_battery2rcDischarge() {
    String net = """
        Battery2RC B(Voc=400, R0=0.05, R1=0.01, C1=1000, R2=0.02, C2=5000, Vrc1_0=0, Vrc2_0=0)
        Resistor   RL(R=4)
        Ground     G()
        connect(B.p, RL.a)
        connect(B.n, RL.b, G.port)
        DYNAMIC d(method = ode45, time = 0 .. 200, points = 100)
        END
        Vf = FinalValue('b.p.v')
        """;
    var v = solve(net);
    assertTrue(v.get("vf") > 300 && v.get("vf") < 400, "terminal voltage sags under load: " + v.get("vf"));
  }

  // 20. ZEOTROPIC BLEND — two blend streams mix; the bulk composition z rides along.
  @Test void ex20_zeotropicBlend() {
    assumeTrue(CoolProp.isAvailable());
    String net = """
        BlendSource S1(fluid$=R134a, mdot=0.01, P=400000, x=0.3, z=0.2)
        BlendSource S2(fluid$=R134a, mdot=0.03, P=400000, x=0.3, z=0.6)
        BlendMixer  MIX()
        BlendSink   SNK()
        connect(S1.out, MIX.in1)
        connect(S2.out, MIX.in2)
        connect(MIX.out, SNK.in)
        """;
    double z = solve(net).get("mix.out.z");
    assertTrue(z > 0.2 && z < 0.6, "blended composition between the two feeds: " + z);
  }
}
