package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Regression: TXVSuperheat now carries domain$=twophase so it wires into a
 *  two-phase circuit (previously defaulted to 'fluid' and was unusable there). */
class TxvSuperheatDomainTest {
    @Test
    void txvSuperheatConnectsToTwoPhaseLines() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                TwoPhasePressureSource HI(fluid$=R134a, P=900000, x=0)
                TXVSuperheat V(fluid$=R134a, Kv=5e-7, SH_set=5)
                TwoPhasePressureSink LO(P=350000)
                ThermalSource BULB(T=288)
                connect(HI.out, V.in)
                connect(V.out, LO.in)
                connect(V.bulb, BULB.port)
                """;
        Map<String, Double> v = new EquationSystemSolver().solve(src).variables();
        assertTrue(Double.isFinite(v.get("v.in.mdot")), "wired + solved: mdot=" + v.get("v.in.mdot"));
    }
}
