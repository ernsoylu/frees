package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * The meaningful-steady refrigeration model done the library-consistent way: an
 * OPEN design-point chain (the pattern every shipped two-phase cycle test uses)
 * with the CONDENSING PRESSURE FLOATED by the refrigerant CHARGE — the physical
 * absolute anchor (T2 mechanism, `TwoPhaseCondenserUA`). The suction state is the
 * design input; the high side responds to ambient and charge, the classic
 * "head pressure rises on a hot day / with overcharge" behaviour.
 *
 * (Floating BOTH pressures requires a topologically CLOSED loop, which is
 * structurally singular with the current component set + checker — see
 * ClosedLoopDiagnosisTest; the standalone floating evaporator in EpsNtuFloatingTest
 * shows the low side floats too, just not simultaneously in one closed loop yet.)
 */
class ChargeClosedCycleTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private String chain(double tAmb, double charge) {
        // discharge state (ṁ, h after the compressor) is the design input; P_cond
        // is FREE and floated by the UA-to-ambient duty balance + the pinned charge.
        return """
                TwoPhaseEnthalpySource DIS(mdot=0.02, h=435000)
                TwoPhaseCondenserUA CND(fluid$=R134a, UA=400, T_amb=%f, V=0.002)
                TwoPhaseSink SNK()
                connect(DIS.out, CND.in)
                connect(CND.out, SNK.in)
                CND.m = %f
                """.formatted(tAmb, charge);
    }

    @Test
    void chargeChainIsWellPosed() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        EquationSystemSolver.CheckResult r = solver.check(chain(320, 1.0));
        System.out.printf("charge-floated chain: eqs=%d vars=%d (DOF %+d) solvable=%b%n",
                r.equationCount(), r.unknownCount(),
                r.equationCount() - r.unknownCount(), r.solvable());
        assertTrue(r.solvable(), "open charge-floated chain is well-posed");
    }

    @Test
    void condensingPressureFloatsWithAmbientAndCharge() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        double pHotAmb  = solver.solve(chain(320, 1.0)).variables().get("cnd.in.p"); // 45 C
        double pMildAmb = solver.solve(chain(305, 1.0)).variables().get("cnd.in.p"); // 30 C
        double pMoreChg = solver.solve(chain(320, 1.2)).variables().get("cnd.in.p"); // overcharge
        System.out.printf("P_cond: 47C=%.0f Pa  32C=%.0f Pa  47C+charge=%.0f Pa%n",
                pHotAmb, pMildAmb, pMoreChg);
        assertTrue(pHotAmb > 5e5 && pHotAmb < 3.0e6, "physical floated P_cond: " + pHotAmb);
        assertTrue(pHotAmb > pMildAmb + 5e4, "head pressure rises with ambient: " + pMildAmb + " -> " + pHotAmb);
        assertTrue(pMoreChg > pHotAmb + 1e4, "head pressure rises with charge: " + pHotAmb + " -> " + pMoreChg);
    }
}
