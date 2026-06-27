package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase C — ε-NTU coupled heat exchangers with FLOATING pressure.
 *
 * The "meaningful steady" target: the condensing/evaporating pressure is not
 * pinned by the modeller but SOLVED from the heat-exchanger balance against the
 * environment. An ε-NTU condenser writes the duty two ways — Q = ṁ·(h_in − h_f(P))
 * (enthalpy to saturated liquid) and Q = ε·C_sec·(T_sat(P) − T_air) (ε-NTU to the
 * air it faces) — and the condensing pressure P is the unknown that makes them
 * equal. ε-NTU (clipped, no moving-boundary zones) is well-conditioned, so this
 * solves robustly from a cold start where the moving-boundary form NaN'd.
 */
class EpsNtuFloatingTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static final String COMPONENTS = """
            // ε-NTU condenser, saturated-liquid outlet, CONDENSING PRESSURE FLOATS.
            // Cr→0 (phase-changing refrigerant) => ε = 1 − exp(−UA/C_sec).
            COMPONENT CondNTUFloat(in, out, wall)
              PARAM fluid$, UA, Csec, domain$ = twophase
              out.mdot = in.mdot
              out.P    = in.P
              Tcond    = T_sat(fluid$, P=in.P)
              hf       = Enthalpy(fluid$, P=in.P, x=0)
              out.h    = hf
              eps      = 1 - exp(-UA / Csec)
              Q        = in.mdot * (in.h - out.h)
              Q        = eps * Csec * (Tcond - wall.T)
              wall.Qdot = -Q
            END
            """;

    /** Solve the floating condenser at a given ambient air temperature. */
    private Map<String, Double> atAmbient(double tAir) {
        String src = COMPONENTS + """
                // superheated discharge into the condenser (ṁ, h fixed; P FREE)
                TwoPhaseEnthalpySource DIS(mdot=0.05, h=440000)
                CondNTUFloat COND(fluid$=R1234yf, UA=900, Csec=600)
                ThermalSource AIR(T=%f)
                TwoPhaseSink LIQ()
                connect(DIS.out, COND.in)
                connect(COND.wall, AIR.port)
                connect(COND.out, LIQ.in)
                """.formatted(tAir);
        return solver.solve(src).variables();
    }

    /** ε-NTU evaporator, saturated-vapor outlet, EVAPORATING PRESSURE FLOATS:
     *  Q = ṁ·(h_g(P) − h_in) = ε·C_sec·(T_sec − T_sat(P)) solves P_evap. */
    private static final String EVAP_FLOAT = """
            COMPONENT EvapNTUFloat(in, out, wall)
              PARAM fluid$, UA, Csec, domain$ = twophase
              out.mdot = in.mdot
              out.P    = in.P
              Tevap    = T_sat(fluid$, P=in.P)
              hg       = Enthalpy(fluid$, P=in.P, x=1)
              out.h    = hg
              eps      = 1 - exp(-UA / Csec)
              Q        = in.mdot * (out.h - in.h)
              Q        = eps * Csec * (wall.T - Tevap)
              wall.Qdot = Q
            END
            """;

    private Map<String, Double> evapAtLoad(double tSec) {
        String src = EVAP_FLOAT + """
                TwoPhaseEnthalpySource LIQ(mdot=0.04, h=250000)
                EvapNTUFloat EVAP(fluid$=R1234yf, UA=500, Csec=350)
                ThermalSource SEC(T=%f)
                TwoPhaseSink VAP()
                connect(LIQ.out, EVAP.in)
                connect(EVAP.wall, SEC.port)
                connect(EVAP.out, VAP.in)
                """.formatted(tSec);
        return solver.solve(src).variables();
    }

    @Test
    void evaporatingPressureFloatsWithLoad() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> warm = evapAtLoad(303.0);  // 30 °C secondary (battery coolant)
        Map<String, Double> cool = evapAtLoad(288.0);  // 15 °C secondary
        double pWarm = warm.get("evap.in.p");
        double pCool = cool.get("evap.in.p");
        System.out.printf("evap load 30C: P_evap=%.0f Pa  |  15C: P_evap=%.0f Pa%n", pWarm, pCool);
        assertTrue(Double.isFinite(pWarm) && pWarm > 1.5e5 && pWarm < 2.0e6, "physical P_evap: " + pWarm);
        // the meaningful-steady behaviour: a warmer secondary RAISES the evaporating pressure
        assertTrue(pWarm > pCool + 3e4, "evaporating pressure rises with load temperature: "
                + pCool + " -> " + pWarm);
    }

    @Test
    void condensingPressureFloatsWithAmbient() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> hot = atAmbient(318.0);   // 45 °C ambient
        Map<String, Double> mild = atAmbient(303.0);   // 30 °C ambient

        double pHot = hot.get("cond.in.p");
        double pMild = mild.get("cond.in.p");
        double tcHot = hot.get("cond.tcond");
        System.out.printf("ambient 45C: P_cond=%.0f Pa (T_cond=%.1f K)  |  ambient 30C: P_cond=%.0f Pa%n",
                pHot, tcHot, pMild);

        // both solved from a cold start to a physical R1234yf condensing pressure
        assertTrue(Double.isFinite(pHot) && pHot > 5e5 && pHot < 3.0e6, "physical P_cond: " + pHot);
        // the KEY meaningful-steady behaviour: a hotter ambient RAISES the condensing pressure
        assertTrue(pHot > pMild + 5e4, "condensing pressure rises with ambient: " + pMild + " -> " + pHot);
        // condensing temperature sits above the air it rejects to (positive approach)
        assertTrue(tcHot > 318.0, "T_cond above ambient: " + tcHot);
    }
}
