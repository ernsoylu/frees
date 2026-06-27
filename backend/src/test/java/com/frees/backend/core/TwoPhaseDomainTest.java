package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase T0 — the two-phase domain foundation: {@code domain$ = twophase} on the
 * slimmed (P, ṁ, h) connector, local x/α/SH derivation, the Friedel resistive
 * line (ΔP glides T_sat), and the {@code never C-C} index-1 rule.
 */
class TwoPhaseDomainTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();
    private final EquationParser parser = new EquationParser();

    @Test
    void twoPhaseChainComputesQualityVoidAndPressureGlide() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                TwoPhaseSource SRC(fluid$=R134a, mdot=0.02, P=500000, x=0.3)
                TwoPhaseFlowRes LINE(fluid$=R134a, L=2, D=0.008)
                TwoPhaseSensor SEN(fluid$=R134a)
                TwoPhaseSink SNK()
                connect(SRC.out, LINE.in)
                connect(LINE.out, SEN.in)
                connect(SEN.out, SNK.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();

        // friction drops the pressure along the two-phase line
        double pIn = v.get("line.in.p");
        double pOut = v.get("line.out.p");
        assertTrue(pOut < pIn, "two-phase line drops pressure: " + pIn + " -> " + pOut);

        // quality derived locally from (P,h) sits near the source quality (h conserved)
        double x = v.get("sen.x");
        assertTrue(x > 0.2 && x < 0.45, "sensed quality: " + x);
        // void fraction is high at this quality for R134a
        assertTrue(v.get("sen.alpha") > 0.8, "void fraction: " + v.get("sen.alpha"));
        // inside the dome the superheat is ~0
        assertTrue(Math.abs(v.get("sen.sh")) < 1.0, "superheat near zero in dome: " + v.get("sen.sh"));

        // ΔP glides the saturation temperature: T_sat downstream < T_sat at the source P
        double tsatSource = CoolProp.propsSI("T", "P", pIn, "Q", 0.0, "R134a");
        assertTrue(v.get("sen.tsat") < tsatSource,
                "T_sat glides down with pressure: " + v.get("sen.tsat") + " < " + tsatSource);
    }

    @Test
    void directCapacitiveToCapacitiveConnectionIsRejected() {
        // Two pressure-storage volumes wired directly (C-C) — the index-2 trap.
        String src = """
                LiquidVolume V1(C=1e-7, P0=200000)
                LiquidVolume V2(C=1e-7, P0=200000)
                connect(V1.out, V2.in)
                """;
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("C-C") || ex.getMessage().contains("capacitive"),
                ex.getMessage());
    }

    @Test
    void capacitiveResistiveCapacitiveChainIsAccepted() {
        // C-R-C: a resistive orifice between the two volumes keeps the DAE index-1.
        String src = """
                LiquidVolume V1(C=1e-7, P0=200000)
                LiquidOrifice R(CdA=1e-6, rho=1000)
                LiquidVolume V2(C=1e-7, P0=200000)
                connect(V1.out, R.in)
                connect(R.out, V2.in)
                """;
        assertDoesNotThrow(() -> parser.parseResult(src));
    }
}
