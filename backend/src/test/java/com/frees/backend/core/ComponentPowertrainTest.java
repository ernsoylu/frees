package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 6 powertrain breadth — a mean-value {@code Engine}, a quadratic
 * {@code RoadLoad}, a smooth slipping {@code Clutch}, and a torsional
 * {@code RotationalSpring}. All rotational-mechanical, pure algebra (the spring
 * carries a transient angle state), so CoolProp-free.
 */
class ComponentPowertrainTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void engineBalancesRoadLoadAtSteadySpeed() {
        // Engine torque (throttle·Tmax − bf·ω) = road load (Crr + Caero·ω²):
        // 100 − 0.1ω = 10 + 0.01ω² → 0.01ω² + 0.1ω − 90 = 0 → ω = 90 rad/s.
        String src = """
                Engine   ENG(Tmax=200, throttle=0.5, bf=0.1)
                RoadLoad RL(Crr=10, Caero=0.01)
                connect(ENG.shaft, RL.shaft)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(90.0, v.get("eng.shaft.w"), 1e-6);
        assertEquals(91.0, v.get("rl.shaft.tau"), 1e-6);   // 10 + 0.01·90² resistive torque
    }

    @Test
    void slippingClutchTransmitsTorqueToAccelerateTheDrivenSide() {
        // The clutch (engaged, Tmax=50) transmits torque from the driven motor to
        // a damper load; at steady slip the transmitted torque balances the load.
        String src = """
                TorqueSource     TS(T=30)
                Clutch           CL(Tmax=50, eng=1, eps=0.01)
                RotationalDamper LOAD(c=2)
                MechGround       GS()
                MechGround       GL()
                connect(TS.a, CL.a)
                connect(TS.b, GS.port)
                connect(CL.b, LOAD.a)
                connect(LOAD.b, GL.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // The clutch passes the 30 N·m drive (< Tmax) to the load: ω = 30/c = 15.
        assertEquals(15.0, v.get("load.a.w"), 1e-3);
        assertEquals(30.0, v.get("cl.a.tau"), 1e-3);
    }

    @Test
    void springMassDamperSettlesAtTheStaticTwist() {
        // A torsional spring-mass-damper (J=1, k=4, c=2 → underdamped, ζ=0.5)
        // driven by a 5 N·m torque settles at the static wind-up θ = T/k = 1.25.
        String src = """
                TorqueSource     TS(T=5)
                Inertia          J(J=1, w0=0)
                RotationalSpring SP(k=4, theta0=0)
                RotationalDamper D(c=2)
                MechGround       GS()
                MechGround       GA()
                MechGround       GD()
                connect(TS.a, J.port, SP.a, D.a)
                connect(TS.b, GS.port)
                connect(SP.b, GA.port)
                connect(D.b, GD.port)
                DYNAMIC smd(method = ode45, time = 0 .. 50, points = 200)
                END
                theta_final = FinalValue('sp.theta')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(5.0 / 4.0, v.get("theta_final"), 5e-3);   // static twist T/k
        assertTrue(v.get("theta_final") > 0);
    }
}
