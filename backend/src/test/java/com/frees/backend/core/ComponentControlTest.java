package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 4 — plant → control coupling. A {@code LINEARIZE} block numerically
 * linearizes a transient component network about its operating point into the
 * state-space matrices {@code A, B, C, D}, which then feed the shipped control
 * suite ({@code lqr}, {@code eig}, …) in the same solve. This is the
 * Simscape→Simulink "build physical plant → auto-linearize → design controller"
 * workflow in one document. Pure-algebra plant, so CoolProp-free.
 */
class ComponentControlTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    // A lumped thermal mass (C=5000) heated by an input Q_in and losing heat
    // through k·A/L = 20 W/K to a 300 K ambient: dT/dt = (Q_in − 20·(T−300))/5000.
    // Exact linearization: A = −20/5000 = −0.004, B = 1/5000 = 2e−4, C = 1, D = 0.
    private static final String PLANT = """
            COMPONENT HeatSource(port)
              PARAM Q
              port.Qdot = -Q
            END
            Q_in = 1000
            HeatSource    HS(Q=Q_in)
            ThermalMass   M(C=5000, T0=300)
            Conduction    wall(k=2, area=1, L=0.1)
            ThermalSource amb(T=300)
            connect(HS.port, M.port, wall.a)
            connect(wall.b, amb.port)
            DYNAMIC warmup(time = 0 .. 1)
            END
            LINEARIZE plant(block = warmup, a = A, b = B, c = C, d = D)
              INPUT  Q_in
              OUTPUT m.port.T
            END
            """;

    @Test
    void linearizesThermalPlantToStateSpace() {
        Map<String, Double> v = solver.solve(PLANT).variables();
        assertEquals(-0.004, v.get("A[1,1]"), 1e-6);     // −(kA/L)/C
        assertEquals(2.0e-4, v.get("B[1]"), 1e-9);       // 1/C
        assertEquals(1.0, v.get("C[1,1]"), 1e-6);        // output = state temperature
        assertEquals(0.0, v.get("D[1,1]"), 1e-9);        // no direct feedthrough
    }

    @Test
    void designsLqrFromTheLinearizedPlant() {
        // The linearized (A, B) matrices feed the lqr solver directly.
        String src = PLANT + """
                Q[1,1] = 1
                R = 1
                CALL lqr(A[1:1,1:1], B[1:1], Q[1:1,1:1], R : K[1:1])
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Scalar Riccati B²K_P² − 2A·K_P − Q = 0, gain K = B·K_P/R ≈ 0.025.
        assertTrue(v.get("K[1]") > 0, "LQR gain must be positive (stabilizing)");
        assertEquals(0.025, v.get("K[1]"), 2e-3);
    }

    @Test
    void closesTheLoopWithAFeedbackControllerInDynamic() {
        // Closing the loop with DYNAMIC: a proportional thermostat reads the mass
        // temperature and injects heat Kp·(Tref−T). The closed loop
        // C·dT/dt = Kp(Tref−T) − G(T−Tamb) settles at the proportional set-point
        // (Kp·Tref + G·Tamb)/(Kp+G) with a faster τ = C/(Kp+G) than open-loop.
        String src = """
                COMPONENT Thermostat(port)
                  PARAM Kp, Tref
                  port.Qdot = -Kp * (Tref - port.T)
                END
                ThermalMass   M(C=5000, T0=300)
                Thermostat    TC(Kp=100, Tref=350)
                Conduction    wall(k=2, area=1, L=0.1)
                ThermalSource amb(T=300)
                connect(TC.port, M.port, wall.a)
                connect(wall.b, amb.port)
                DYNAMIC loop(time = 0 .. 600, points = 100)
                END
                T_final = FinalValue('m.port.t')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Kp=100, G=20, Tref=350, Tamb=300 → (100·350 + 20·300)/120 = 341.67 K.
        assertEquals((100.0 * 350 + 20.0 * 300) / 120.0, v.get("t_final"), 0.2);
        assertTrue(v.get("t_final") > 300.0, "controller drives the mass above ambient");
    }

    @Test
    void piControllerEliminatesSteadyStateError() {
        // A PI thermostat (integral state) holds the mass at the setpoint with
        // zero steady-state offset — unlike the proportional thermostat above,
        // which settled below Tref. der(integ)=err drives err→0 ⇒ T→Tref exactly.
        String src = """
                ThermalMass   M(C=5000, T0=300)
                PIThermostat  TC(Kp=50, Ki=5, Tref=350)
                Conduction    wall(k=2, area=1, L=0.1)
                ThermalSource amb(T=300)
                connect(TC.port, M.port, wall.a)
                connect(wall.b, amb.port)
                DYNAMIC ctrl(method = ode45, time = 0 .. 1000, points = 200)
                END
                T_final = FinalValue('m.port.t')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(350.0, v.get("t_final"), 0.2);   // setpoint reached, no offset
    }
}
