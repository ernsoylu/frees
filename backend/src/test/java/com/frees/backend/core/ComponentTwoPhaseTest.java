package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import com.frees.backend.props.FlowResistance;
import com.frees.backend.props.TwoPhase;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase C — two-phase / moving-boundary thermofluid depth. A {@code TwoPhasePipe}
 * applies the Lockhart–Martinelli / Chisholm multiplier to the liquid-alone Darcy
 * drop; a {@code TXVSuperheat} meters refrigerant flow from the sensed
 * evaporator-outlet superheat; a {@code ThreeZoneHX} subsystem discretizes a
 * counterflow exchanger into three ε-NTU cells. Test 1 is CoolProp-free (explicit
 * phase properties, checked against the backend correlations); Tests 2–3 are
 * CoolProp-gated.
 */
class ComponentTwoPhaseTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void twoPhasePipeAppliesTheLockhartMartinelliMultiplier() {
        // Explicit phase properties so the drop is checkable against the backend
        // correlations directly (no CoolProp).
        String src = """
                COMPONENT RSrc(out)
                  PARAM P, h0, mdot
                  out.P = P
                  out.h = h0
                  out.mdot = mdot
                END
                COMPONENT PSink(in)
                  PARAM P
                  in.P = P
                END
                RSrc        SRC(P=500000, h0=250000, mdot=0.05)
                TwoPhasePipe TP(fluid$=R134a, L=2, D=0.01, rough=1e-5, x=0.3, rho_l=1200, rho_g=20, mu_l=2e-4, mu_g=1e-5)
                Sink        SNK()
                connect(SRC.out, TP.in)
                connect(TP.out, SNK.in)
                """;
        // Predict the outlet pressure with the same correlations the component uses.
        double a = Math.PI / 4 * 0.01 * 0.01;
        double vL = 0.05 * (1 - 0.3) / (1200 * a);
        double reL = FlowResistance.reynolds(1200, vL, 0.01, 2e-4);
        double fL = FlowResistance.frictionFactor(reL, 1e-5 / 0.01);
        double dPl = fL * (2 / 0.01) * 1200 * vL * vL / 2;
        double xtt = TwoPhase.lmMartinelliTt(0.3, 1200, 20, 2e-4, 1e-5);
        double phi2 = TwoPhase.lmPhi2(xtt, 20);
        double expectedOut = 500000 - phi2 * dPl;

        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(expectedOut, v.get("tp.out.p"), 1.0);
        assertTrue(phi2 > 1.0, "two-phase multiplier amplifies the liquid drop: " + phi2);
    }

    @Test
    void txvMetersFlowFromSensedSuperheat() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        // R134a at 3 bar evaporator pressure; a 10 °C bulb gives superheat above
        // the 5 K setpoint, so the valve opens proportionally: ṁ = Kv·(SH − SH_set).
        String src = """
                COMPONENT RSrc(out)
                  PARAM P, h0, domain$ = twophase
                  out.P = P
                  out.h = h0
                END
                COMPONENT PSink(in)
                  PARAM P, domain$ = twophase
                  in.P = P
                END
                RSrc          SRC(P=900000, h0=270000)
                TXVSuperheat  TXV(fluid$=R134a, Kv=0.001, SH_set=5)
                PSink         SNK(P=300000)
                ThermalSource BULB(T=283.15)
                connect(SRC.out, TXV.in)
                connect(TXV.out, SNK.in)
                connect(TXV.bulb, BULB.port)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double tSat = CoolProp.propsSI("T", "P", 300000, "Q", 1, "R134a");
        double expect = 0.001 * (283.15 - tSat - 5);
        assertEquals(expect, v.get("txv.in.mdot"), 1e-6);
        assertTrue(expect > 0, "superheat above setpoint opens the valve");
    }

    @Test
    void threeZoneCounterflowHxIsEnergyBalanced() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                h_hot_in = Enthalpy(Water, P=200000, T=350)
                h_cold_in = Enthalpy(Water, P=200000, T=290)
                ThreeZoneHX HX(h1, h2, c1, c2, UA=2000, hot$=Water, cold$=Water, arr$=counterflow)
                h1.P = 200000
                h1.h = h_hot_in
                h1.mdot = 0.5
                c1.P = 200000
                c1.h = h_cold_in
                c1.mdot = 0.5
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double qHot = 0.5 * (v.get("h1.h") - v.get("h2.h"));
        double qCold = 0.5 * (v.get("c2.h") - v.get("c1.h"));
        assertEquals(qHot, qCold, 1.0);                          // energy balance
        assertTrue(qHot > 0, "hot stream loses heat: " + qHot);
        assertTrue(v.get("h2.h") < v.get("h1.h"), "hot outlet cooler than inlet");
    }
}
