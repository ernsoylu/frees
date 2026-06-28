package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase F (non-event slice) — automotive powertrain breadth that needs no
 * zero-crossing event handling: a mean-value engine (speed-dependent torque
 * curve + FMEP friction), a transmission (gear ratio + efficiency), and a grade
 * road-load. Each component's constitutive relation is checked in isolation, then
 * an engine→transmission→road-load network is solved for its steady operating
 * point (torque balance through the gear ratio). The event-coupled clutch lock-up
 * and the optimizer-in-the-loop ECMS remain deferred (Phase R events / dedicated).
 */
class ComponentPowertrainBreadthTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void meanValueEngineFollowsItsTorqueCurve() {
        // Held at ω = w_peak the WOT torque is Tpeak; at 60 % throttle the indicated
        // torque is 0.6·Tpeak, less FMEP = a + b·ω.
        String src = """
                MeanValueEngine ENG(throttle=0.6, Tpeak=200, w_peak=400, FMEP_a=5, FMEP_b=0.01)
                SpeedSource     SS(w=400)
                MechGround      G()
                connect(SS.a, ENG.shaft)
                connect(SS.b, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double expect = -(0.6 * 200 - (5 + 0.01 * 400));   // engine torque sign: −(T_ind − T_fric)
        assertEquals(expect, v.get("eng.shaft.tau"), 1e-9);
    }

    @Test
    void transmissionScalesSpeedAndTorqueWithEfficiency() {
        // Input spun at 200 rad/s through a 10:1 reduction at 90 % efficiency: the
        // output turns 10× slower and the torque is scaled by ratio·η against a load.
        String src = """
                SpeedSource      SS(w=200)
                MechGround       G()
                Transmission     TR(ratio=10, eta=0.9)
                RotationalDamper LOAD(c=2)
                MechGround       G2()
                connect(SS.a, TR.in)
                connect(SS.b, G.port)
                connect(TR.out, LOAD.a)
                connect(LOAD.b, G2.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(20.0, v.get("tr.out.w"), 1e-9);                 // 200 / 10
        // Output torque drives the damper: τ_out = c·ω_out = 2·20 = 40 N·m.
        double tauOut = v.get("load.a.tau");
        assertEquals(40.0, tauOut, 1e-6);
        // Reflected input torque: τ_in = τ_out / (ratio·η) = 40 / 9 ≈ 4.444.
        assertEquals(40.0 / (10 * 0.9), Math.abs(v.get("tr.in.tau")), 1e-6);
    }

    @Test
    void gradeRoadLoadAddsRollingAeroAndGradeResistance() {
        // At ω = 30 the resisting torque is Crr + Caero·ω² + m·g·sin(grade).
        String src = """
                GradeRoadLoad ROAD(Crr=50, Caero=2, m=1500, g=9.81, grade=0.05)
                SpeedSource   SS(w=30)
                MechGround    G()
                connect(SS.a, ROAD.shaft)
                connect(SS.b, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double expect = 50 + 2 * 30 * 30 + 1500 * 9.81 * Math.sin(0.05);
        assertEquals(expect, v.get("road.shaft.tau"), 1e-6);
    }

    @Test
    void engineTransmissionRoadLoadReachAGearedTorqueBalance() {
        // Steady operating point: the engine torque, stepped up by the
        // transmission, balances the road load at the wheels.
        String src = """
                MeanValueEngine ENG(throttle=0.8, Tpeak=50, w_peak=20, FMEP_a=1, FMEP_b=0.1)
                Transmission    TR(ratio=2, eta=0.9)
                GradeRoadLoad   ROAD(Crr=5, Caero=0.5, m=100, g=9.81, grade=0)
                connect(ENG.shaft, TR.in)
                connect(TR.out, ROAD.shaft)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double wEng = v.get("eng.shaft.w");
        double wWheel = v.get("road.shaft.w");
        assertTrue(wEng > 0 && wWheel > 0, "positive operating speeds");
        assertEquals(2.0, wEng / wWheel, 1e-6);                       // gear ratio
        // Torque balance at the wheel node: |transmission output| = road-load torque.
        double roadTau = 5 + 0.5 * wWheel * wWheel + 100 * 9.81 * Math.sin(0.0);
        assertEquals(roadTau, Math.abs(v.get("tr.out.tau")), 1e-3);
    }
}
