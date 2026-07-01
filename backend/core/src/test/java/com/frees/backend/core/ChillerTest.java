package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase AC — the EV chiller (twophase↔liquid bridge). Refrigerant evaporates
 * against a coolant loop through a shared wall node; the coolant is chilled.
 * Higher refrigerant flow (proxy for compressor RPM) delivers more cooling.
 */
class ChillerTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private String chiller(double refMdot) {
        return """
                TwoPhaseSource RSRC(fluid$=R134a, mdot=%f, P=350000, x=0.25)
                TwoPhaseSink RSNK()
                LiquidSource CSRC(fluid$=Water, mdot=0.1, P=200000, T=300)
                LiquidSink CSNK()
                Chiller CH(ref$=R134a, cool$=Water, U_tp=2000, U_sh=200, D=0.01, L=5, eps_zone=0.1, UA_cool=600)
                connect(RSRC.out, CH.ref_in)
                connect(CH.ref_out, RSNK.in)
                connect(CSRC.out, CH.cool_in)
                connect(CH.cool_out, CSNK.in)
                """.formatted(refMdot);
    }

    @Test
    void chillerCoolsTheCoolantLoop() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> v = solver.solve(chiller(0.02)).variables();
        // refrigerant absorbs heat; coolant rejects the same heat (wall node balance)
        assertTrue(v.get("ch.ev.q") > 0, "refrigerant absorbs heat: " + v.get("ch.ev.q"));
        assertTrue(Math.abs(v.get("ch.ev.q") - v.get("ch.cl.q")) < 1.0, "wall node balances Q");
        // the coolant is chilled (outlet enthalpy below inlet)
        assertTrue(v.get("ch.cl.out.h") < v.get("ch.cl.in.h"), "coolant is cooled");
        // refrigerant leaves superheated
        assertTrue(v.get("ch.ev.sh") > 0, "refrigerant superheated at exit: " + v.get("ch.ev.sh"));
    }

    @Test
    void higherRefrigerantFlowDeliversMoreCooling() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        // refrigerant mass flow scales with compressor RPM (volumetric); more flow
        // => more evaporator duty => the coolant leaves colder.
        Map<String, Double> lo = solver.solve(chiller(0.015)).variables();
        Map<String, Double> hi = solver.solve(chiller(0.030)).variables();
        assertTrue(hi.get("ch.ev.q") > lo.get("ch.ev.q"), "more flow => more cooling duty");
        assertTrue(hi.get("ch.cl.out.h") < lo.get("ch.cl.out.h"), "coolant supply is colder at higher flow");
    }
}
