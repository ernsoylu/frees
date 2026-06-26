package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The {@code Friction} component — a smooth (tanh-regularized) Stribeck +
 * Coulomb + viscous model: {@code τ(v) = [Fc + (Fs−Fc)·e^(−(v/vs)²)]·tanh(v/eps)
 * + bv·v}. Regularizing the sign discontinuity with {@code tanh} keeps the model
 * acausal and Newton-solvable with no event machinery (the approach frEES prefers
 * over zero-crossing handling where accuracy allows). Pure algebra, CoolProp-free.
 */
class ComponentFrictionTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void appliedTorqueBalancesFrictionAtSteadySpeed() {
        // A 5 N·m drive against friction (Coulomb 2, viscous 0.5) to ground. Above
        // the Stribeck speed the Coulomb term saturates, so 5 = Fc + bv·ω
        // = 2 + 0.5·ω → ω = 6 rad/s.
        String src = """
                TorqueSource TS(T=5)
                Friction     FR(Fc=2, Fs=3, vs=1, bv=0.5, eps=0.01)
                MechGround   G()
                connect(TS.a, FR.a)
                connect(TS.b, FR.b, G.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(6.0, v.get("fr.a.w"), 1e-3);          // steady sliding speed
        assertEquals(5.0, v.get("fr.a.tau"), 1e-3);        // friction balances the drive
    }
}
