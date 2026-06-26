package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase 3 (first slice) — a component network with storage runs transiently.
 * A {@code ThermalMass} declares a state with {@code der(port.T)=port.Qdot/C} and
 * its initial value with {@code init(port.T)=T0}; the parser routes the whole
 * component network into the document's {@code DYNAMIC} block, where the ODE
 * engine integrates the state while its per-step algebraic solve resolves the
 * surrounding conduction/ambient network at each instant. The same components
 * that solve a steady operating point (Phase 2) thus also run a transient — here
 * the lumped-capacitance relaxation of a hot mass toward ambient. The transient
 * state is addressed by its natural dotted display name ({@code 'm.port.t'}) in
 * the ODE accessors. Pure algebra, so CoolProp-free.
 */
class ComponentTransientTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void thermalMassRelaxesTowardAmbient() {
        // C = 5000 J/K mass at 400 K loses heat through k·A/L = 20 W/K to a 300 K
        // ambient → first-order decay with τ = C/(kA/L) = 250 s.
        String src = """
                ThermalMass   M(C=5000, T0=400)
                ThermalSource amb(T=300)
                Conduction    wall(k=2, area=1, L=0.1)
                connect(M.port, wall.a)
                connect(wall.b, amb.port)
                DYNAMIC warmup(method = ode45, time = 0 .. 2000, points = 100)
                END
                T_final = FinalValue('m.port.t')
                T_peak  = MaxValue('m.port.t')
                t_half  = TimeAt('m.port.t', 350)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Relaxes to ambient: 300 + 100·e^(−2000/250) ≈ 300.03 K (steady limit =
        // the Phase-2 operating point, ambient temperature).
        assertEquals(300.0 + 100.0 * Math.exp(-2000.0 / 250.0), v.get("t_final"), 1e-2);
        // Starts at the initial condition.
        assertEquals(400.0, v.get("t_peak"), 1e-6);
        // Crosses the half-way temperature 350 K at t = τ·ln2 = 250·ln2 ≈ 173 s.
        assertEquals(250.0 * Math.log(2.0), v.get("t_half"), 1.0);
    }

    @Test
    void inertiaSpinsUpUnderTorqueAgainstADamper() {
        // J·dω/dt = τ − c·ω. Torque 10 N·m, J = 2, damper c = 0.5 → steady ω = 20,
        // τ_t = J/c = 4 s.
        String src = """
                TorqueSource     TS(T=10)
                Inertia          IN(J=2, w0=0)
                RotationalDamper D(c=0.5)
                MechGround       G()
                connect(TS.a, IN.port, D.a)
                connect(TS.b, D.b, G.port)
                DYNAMIC spinup(method = ode45, time = 0 .. 40, points = 100)
                END
                w_final = FinalValue('in.port.w')
                w_start = MinValue('in.port.w')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(20.0, v.get("w_final"), 1e-2);     // steady speed τ/c... = 20
        assertEquals(0.0, v.get("w_start"), 1e-6);      // started from rest
    }

    @Test
    void rcCircuitChargesThroughItsTimeConstant() {
        // 10 V source, 1 kΩ, 1 mF → RC = 1 s, charges to 10 V.
        String src = """
                VoltageSource VS(E=10)
                Resistor      R(R=1000)
                Capacitor     CAP(C=0.001, V0=0)
                Ground        G()
                connect(VS.p, R.a)
                connect(R.b, CAP.p)
                connect(CAP.n, VS.n, G.port)
                DYNAMIC charge(method = ode45, time = 0 .. 5, points = 100)
                END
                V_final = FinalValue('cap.vc')
                t_half  = TimeAt('cap.vc', 5)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(10.0 * (1 - Math.exp(-5.0)), v.get("v_final"), 1e-2);   // ≈ 9.93 V
        assertEquals(Math.log(2.0), v.get("t_half"), 1e-2);                  // RC·ln2 ≈ 0.69 s
    }

    @Test
    void evBatteryWarmsUpAndDepletesUnderLoad() {
        // The transient EV battery-thermal flagship: a 400 V pack under a constant
        // motor load self-heats (1000 W) toward a cold-plate steady (10 K above the
        // 298 K coolant, τ = C_th/G = 500 s) while its SOC depletes linearly.
        // Solved with the stiff method (ode23s).
        String src = """
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
                T_final   = FinalValue('b.t')
                SOC_final = FinalValue('b.soc')
                SOC_start = MaxValue('b.soc')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Pack temperature: 308 − 10·e^(−600/500).
        assertEquals(308.0 - 10.0 * Math.exp(-600.0 / 500.0), v.get("t_final"), 5e-2);
        // SOC: 0.9 − (I / 3600·Q0)·t = 0.9 − (100/360000)·600 = 0.7333.
        assertEquals(0.9 - (100.0 / (3600.0 * 100.0)) * 600.0, v.get("soc_final"), 1e-3);
        assertEquals(0.9, v.get("soc_start"), 1e-9);
    }

    @Test
    void fluidAccumulatorPressurizesUntilInflowMeetsOutflow() {
        // Fluid-domain storage: a constant 0.1 kg/s inflow charges a compliance
        // volume that drains through a linear resistance to a 1 bar sink. The
        // volume pressure rises (τ = R·C = 1 s) until outflow = inflow → steady
        // ΔP = ṁ·R = 0.1·1e6 = 1e5 Pa above the sink (2 bar).
        String src = """
                COMPONENT FlowSource(out)
                  PARAM mdot, h0
                  out.mdot = mdot
                  out.h    = h0
                END
                COMPONENT LinRes(in, out)
                  PARAM R
                  out.mdot = in.mdot
                  out.h    = in.h
                  in.mdot  = (in.P - out.P) / R
                END
                COMPONENT PSink(in)
                  PARAM P
                  in.P = P
                END
                FlowSource  SRC(mdot=0.1, h0=0)
                Accumulator ACC(C=1e-6, P0=100000)
                LinRes      RES(R=1e6)
                PSink       SNK(P=100000)
                connect(SRC.out, ACC.in)
                connect(ACC.out, RES.in)
                connect(RES.out, SNK.in)
                DYNAMIC fill(method = ode45, time = 0 .. 6, points = 100)
                END
                P_final = FinalValue('acc.in.p')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // 200000 − 100000·e^(−6) ≈ 1.9998e5 Pa.
        assertEquals(200000.0 - 100000.0 * Math.exp(-6.0), v.get("p_final"), 50.0);
    }

    @Test
    void sameStorageModelSolvesSteadyWithNoDynamicBlock() {
        // Steady/transient duality: the very ThermalMass network above, with no
        // DYNAMIC block, solves its steady operating point (der(T)=0 ⇒ the mass
        // sits at the ambient temperature) — the transient's t→∞ limit.
        String src = """
                ThermalMass   M(C=5000, T0=400)
                ThermalSource amb(T=300)
                Conduction    wall(k=2, area=1, L=0.1)
                connect(M.port, wall.a)
                connect(wall.b, amb.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(300.0, v.get("m.port.t"), 1e-9);
    }
}
