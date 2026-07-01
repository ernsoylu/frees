package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase T2 — refrigerant charge inventory. Charge becomes an input: the
 * void-weighted mass M = Σ ρ̄·V pins a released DOF — the high-side pressure and
 * subcooling (UA condenser), or the receiver liquid level (which buffers).
 */
class TwoPhaseChargeTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void chargeSetsCondensingPressureAndSubcooling() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String tmpl = """
                TwoPhaseEnthalpySource SRC(mdot=0.02, h=435000)
                TwoPhaseCondenserUA COND(fluid$=R134a, UA=400, T_amb=305, V=0.002)
                TwoPhaseSink SNK()
                connect(SRC.out, COND.in)
                connect(COND.out, SNK.in)
                COND.m = %f
                """;
        Map<String, Double> lo = solver.solve(tmpl.formatted(0.8)).variables();
        Map<String, Double> hi = solver.solve(tmpl.formatted(1.2)).variables();

        // more charge -> higher condensing pressure, more subcooling, more duty
        assertTrue(hi.get("cond.in.p") > lo.get("cond.in.p"),
                "condensing pressure rises with charge: " + lo.get("cond.in.p") + " -> " + hi.get("cond.in.p"));
        assertTrue(hi.get("cond.sc") > lo.get("cond.sc"),
                "subcooling rises with charge: " + lo.get("cond.sc") + " -> " + hi.get("cond.sc"));
        assertTrue(hi.get("cond.q") > lo.get("cond.q"), "duty rises with charge");
    }

    @Test
    void receiverBuffersChargeInItsLevel() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String tmpl = """
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=900000, x=0.05)
                TwoPhaseReceiver RCV(fluid$=R134a, V=0.002)
                TwoPhaseSink SNK()
                connect(SRC.out, RCV.in)
                connect(RCV.out, SNK.in)
                RCV.m = %f
                """;
        Map<String, Double> lo = solver.solve(tmpl.formatted(0.5)).variables();
        Map<String, Double> hi = solver.solve(tmpl.formatted(1.0)).variables();

        // charge goes into the receiver level, which stays within (0,1)
        assertTrue(hi.get("rcv.ll") > lo.get("rcv.ll"), "receiver level rises with charge");
        assertTrue(lo.get("rcv.ll") > 0 && hi.get("rcv.ll") < 1, "level within (0,1)");
        // the receiver always delivers saturated liquid downstream (buffered feed)
        double hfSat = CoolProp.propsSI("H", "P", 900000, "Q", 0.0, "R134a");
        assertEquals(hfSat, hi.get("rcv.out.h"), 1e-3, "receiver outlet is saturated liquid");
    }

    @Test
    void inventoryMassUsesVoidWeightedDensity() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=500000, x=0.5)
                TwoPhaseInventory INV(fluid$=R134a, V=0.001)
                TwoPhaseSink SNK()
                connect(SRC.out, INV.in)
                connect(INV.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // slip (Zivi) holds more liquid than homogeneous, so the inventory density
        // exceeds CoolProp's no-slip (P,h) density at the same state.
        double hMix = CoolProp.propsSI("H", "P", 500000, "Q", 0.5, "R134a");
        double rhoHomog = CoolProp.propsSI("D", "P", 500000, "H", hMix, "R134a");
        assertTrue(v.get("inv.rho_mix") > rhoHomog,
                "void-weighted density " + v.get("inv.rho_mix") + " > homogeneous " + rhoHomog);
        assertEquals(0.001 * v.get("inv.rho_mix"), v.get("inv.m"), 1e-9, "m = V * rho_mix");
        assertTrue(v.get("inv.alpha") > 0.9, "high void fraction at x=0.5: " + v.get("inv.alpha"));
    }
}
