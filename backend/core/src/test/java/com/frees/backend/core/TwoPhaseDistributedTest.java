package com.frees.backend.core;

import com.frees.backend.core.dae.SundialsIda;
import com.frees.backend.props.CoolProp;
import com.frees.backend.core.ode.OdeTableResult;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase T3 — few-cell distributed two-phase behaviour: temperature glide along a
 * coil (steady), and a transient C-R-C relaxation on the SUNDIALS-IDA path
 * (warm-up survives, charge migrates between volumes).
 */
class TwoPhaseDistributedTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void temperatureGlidesAlongAMultiCellCoil() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=500000, x=0.2)
                TwoPhaseFlowRes R1(fluid$=R134a, L=2, D=0.008)
                TwoPhaseSensor S1(fluid$=R134a)
                TwoPhaseFlowRes R2(fluid$=R134a, L=2, D=0.008)
                TwoPhaseSensor S2(fluid$=R134a)
                TwoPhaseSink SNK()
                connect(SRC.out, R1.in)
                connect(R1.out, S1.in)
                connect(S1.out, R2.in)
                connect(R2.out, S2.in)
                connect(S2.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // pressure falls cell to cell
        assertTrue(v.get("s1.in.p") < 500000, "first cell drops pressure");
        assertTrue(v.get("s2.in.p") < v.get("s1.in.p"), "second cell drops further");
        // and the saturation temperature glides down with it
        assertTrue(v.get("s2.tsat") < v.get("s1.tsat"),
                "T_sat glides along the coil: " + v.get("s1.tsat") + " -> " + v.get("s2.tsat"));
    }

    @Test
    void transientCrcRelaxesOnIdaAndMigratesCharge() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        assumeTrue(SundialsIda.isAvailable(), "SUNDIALS IDA not available");
        // C-R-C: HI reservoir -> R1 -> capacitive volume V -> R2 -> LO reservoir.
        // The volume pressure (a state) relaxes from its perturbed initial value;
        // its void-weighted charge migrates as it does. method = ida exercises the
        // S1 BDF integrator on a real two-phase network.
        String src = """
                TwoPhasePressureSource HI(fluid$=R134a, P=520000, x=0.3)
                TwoPhaseFlowRes R1(fluid$=R134a, L=0.5, D=0.01)
                TwoPhaseVolume V(fluid$=R134a, V=0.002, C=1e-6, P0=495000)
                TwoPhaseFlowRes R2(fluid$=R134a, L=0.5, D=0.01)
                TwoPhasePressureSink LO(P=490000)
                connect(HI.out, R1.in)
                connect(R1.out, V.in)
                connect(V.out, R2.in)
                connect(R2.out, LO.in)
                DYNAMIC relax(method = ida, time = 0 .. 8, points = 40)
                END
                P_start = MinValue('v.in.p')
                P_final = FinalValue('v.in.p')
                m_start = MinValue('v.m')
                m_final = FinalValue('v.m')
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double pStart = v.get("p_start");
        double pFinal = v.get("p_final");
        // relaxes to a steady pressure strictly between the two reservoirs
        assertTrue(pFinal > 490000 && pFinal < 520000, "settles between reservoirs: " + pFinal);
        assertTrue(pFinal > pStart, "pressure rises from the low initial value: "
                + pStart + " -> " + pFinal);
        // and the charge inventory changed (migration) without producing NaNs
        assertTrue(Double.isFinite(v.get("m_final")) && v.get("m_final") > 0, "finite charge");
        assertTrue(Math.abs(v.get("m_final") - v.get("m_start")) > 0, "charge migrated");
    }
}
