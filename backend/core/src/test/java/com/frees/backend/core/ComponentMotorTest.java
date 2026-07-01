package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The {@code DCMotor} electro-mechanical transducer (electrical port ↔ mechanical
 * port: {@code V = R·I + Ke·ω}, {@code τ = Kt·I}) completes the EV powertrain
 * alongside the battery-thermal flagship: a battery drives a motor that drives a
 * road-load, the electrical and mechanical networks closing in one solve. Pure
 * algebra, so CoolProp-free.
 */
class ComponentMotorTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void batteryDrivesMotorAgainstRoadLoadAcrossDomains() {
        // 48 V pack (R0=0.1) → DC motor (Kt=Ke=0.5, R=1 Ω) → linear road-load
        // (c=0.1). Steady: I=13.33 A, ω=66.7 rad/s, shaft torque 6.67 N·m, the
        // pack terminal sagging to 46.67 V under the 13.33 A draw.
        String src = """
                BatteryThermal   B(Voc=48, R0=0.1)
                DCMotor          MOT(Kt=0.5, Ke=0.5, R=1)
                RotationalDamper LOAD(c=0.1)
                Ground           G()
                MechGround       MG()
                ThermalSource    COOL(T=300)
                connect(B.p, MOT.p)
                connect(B.n, MOT.n, G.port)
                connect(MOT.shaft, LOAD.a)
                connect(LOAD.b, MG.port)
                connect(B.heat, COOL.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(13.333333, v.get("mot.p.i"), 1e-4);     // motor current
        assertEquals(66.666667, v.get("load.a.w"), 1e-4);    // shaft speed (rad/s)
        assertEquals(6.666667, v.get("load.a.tau"), 1e-4);   // torque to the road-load
        assertEquals(46.666667, v.get("b.p.v"), 1e-4);       // pack terminal under load
        // Cross-domain power balance: electrical in = copper loss + mechanical out.
        double pElec = v.get("b.p.v") * v.get("mot.p.i");
        double pMech = v.get("load.a.tau") * v.get("load.a.w");
        double copper = v.get("mot.p.i") * v.get("mot.p.i") * 1.0;
        assertEquals(pElec, pMech + copper, 1e-3);
    }
}
