package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase T1 — a lumped R134a vapor-compression cycle on the twophase domain:
 * evaporator → compressor → condenser → expansion valve, in cycle order. With
 * non-isobaric heat exchangers the compressor suction pressure falls below the
 * evaporating pressure and the COP drops versus the optimistic isobaric limit.
 */
class TwoPhaseCycleTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private String cycle(double evapDp, double condDp) {
        return """
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=350000, x=0.2)
                TwoPhaseEvaporator EVAP(fluid$=R134a, SH_set=8, dP=%f)
                TwoPhaseCompressor CMP(fluid$=R134a, eta=0.7)
                TwoPhaseCondenser COND(fluid$=R134a, SC_set=5, dP=%f)
                TwoPhaseExpansionValve EXV(fluid$=R134a, Cv=5.7e-7)
                TwoPhaseSink SNK()
                connect(SRC.out, EVAP.in)
                connect(EVAP.out, CMP.in)
                connect(CMP.out, COND.in)
                connect(COND.out, EXV.in)
                connect(EXV.out, SNK.in)
                CMP.out.P = 900000
                """.formatted(evapDp, condDp);
    }

    @Test
    void nonIsobaricCycleHasSuctionBelowEvaporatingPressureAndPlausibleCop() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> v = solver.solve(cycle(15000, 20000)).variables();

        // refrigerant ΔP: the compressor suction (evaporator exit) is below the
        // evaporating pressure (evaporator inlet)
        double evaporating = v.get("evap.in.p");
        double suction = v.get("cmp.in.p");
        assertTrue(suction < evaporating, "suction " + suction + " < evaporating " + evaporating);
        assertTrue(evaporating - suction > 1e4, "meaningful evaporator ΔP");

        double qEvap = v.get("evap.q");
        double work = v.get("cmp.w");
        double cop = qEvap / work;
        assertTrue(qEvap > 0 && work > 0, "duties positive: Q=" + qEvap + " W=" + work);
        assertTrue(cop > 2.0 && cop < 8.0, "plausible R134a COP: " + cop);
    }

    @Test
    void copDropsVersusIsobaricBaseline() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> nonIso = solver.solve(cycle(15000, 20000)).variables();
        Map<String, Double> iso = solver.solve(cycle(0, 0)).variables();

        double copNonIso = nonIso.get("evap.q") / nonIso.get("cmp.w");
        double copIso = iso.get("evap.q") / iso.get("cmp.w");
        assertTrue(copNonIso < copIso,
                "non-isobaric COP " + copNonIso + " < isobaric COP " + copIso);
        // and the isobaric model forces suction == evaporating pressure
        assertTrue(Math.abs(iso.get("cmp.in.p") - iso.get("evap.in.p")) < 1e-6,
                "isobaric baseline: suction == evaporating");
    }
}
