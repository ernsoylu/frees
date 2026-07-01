package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 6 machinery — a {@code PMSM} (surface-mount, id=0 control: torque ∝ q-axis
 * current, back-EMF from the magnet flux) and an ideal-gas {@code Turbocharger}
 * (turbine power = compressor power → boost pressure). Pure algebra, CoolProp-free.
 */
class ComponentMachineryTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void pmsmDeliversTorqueProportionalToCurrent() {
        // Kt = 1.5·poles·λ_pm = 1.5·4·0.1 = 0.6. 48 V across Rs=0.5 driving a damper
        // load c=0.05: balance Kt·I = c·ω with ω = Kt·I/c and V = Rs·I + Kt·ω.
        String src = """
                VoltageSource    VS(E=48)
                PMSM             M(Rs=0.5, lambda_pm=0.1, poles=4)
                RotationalDamper LOAD(c=0.05)
                Ground           G()
                MechGround       MG()
                connect(VS.p, M.p)
                connect(VS.n, M.n, G.port)
                connect(M.shaft, LOAD.a)
                connect(LOAD.b, MG.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Kt=0.6: ω=Kt·I/c=12·I; V=Rs·I+Kt·ω=0.5·I+0.6·12·I=7.7·I=48 → I=6.234 A.
        double i = 48.0 / (0.5 + 0.6 * 0.6 / 0.05);
        assertEquals(i, v.get("m.p.i"), 1e-4);
        assertEquals(0.6 * i, v.get("load.a.tau"), 1e-4);     // shaft torque Kt·I
    }

    @Test
    void turbochargerBalancesTurbineAndCompressorPowerToSetBoost() {
        // Exhaust turbine (900 K, 2:1 expansion) drives the intake compressor; the
        // shaft power balance fixes the boost pressure (~2.76 bar from 1 bar).
        String src = """
                Turbocharger TC(t1, t2, c1, c2, cp=1005, eta_t=0.8, eta_c=0.78, gam=1.4)
                t1.T = 900
                t1.P = 200000
                t1.mdot = 0.1
                t2.P = 100000
                c1.T = 300
                c1.P = 100000
                c1.mdot = 0.1
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(v.get("tc.wt"), v.get("tc.wc"), 1e-3);           // shaft power balance
        assertTrue(v.get("c2.p") > 100000, "compressor produces boost: " + v.get("c2.p"));
        assertEquals(276300.0, v.get("c2.p"), 3000.0);               // ~2.76 bar boost
    }
}
