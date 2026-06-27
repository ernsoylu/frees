package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Strict connector-domain separation: a {@code connect} node must be a single
 * physical domain. The fluid-family triple — pneumatic ({@code gas}), hydraulic
 * ({@code oil}) and thermofluid ({@code fluid}) — shares the same {@code (P,ṁ,h)}
 * bond algebra but models incompatible working fluids, so wiring one to another
 * is a hard error (the {@code domain$} connector type); and the through-variable
 * guard rejects mixing different bond-graph domains (heat↔electrical, fluid↔
 * mechanical, …) in one node. This prevents silently solving a nonsense network.
 */
class ComponentDomainSeparationTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private String error(String src) {
        return assertThrows(EquationParser.ParseException.class,
                () -> solver.solve(src)).getMessage();
    }

    @Test
    void pneumaticCannotConnectToHydraulic() {
        String src = """
                PneumaticSupply  SUP(fluid$=Air, P=700000, T=300)
                HydraulicTank    TNK(P=0)
                connect(SUP.out, TNK.port)
                """;
        String msg = error(src);
        assertTrue(msg.contains("gas") && msg.contains("oil"),
                "error names the incompatible connector types: " + msg);
    }

    @Test
    void pneumaticCannotConnectToGenericThermofluid() {
        // A generic thermo-fluid sink (default 'fluid') must reject a 'gas' line.
        String src = """
                COMPONENT PSink(in)
                  PARAM P
                  in.P = P
                END
                PneumaticSupply SUP(fluid$=Air, P=700000, T=300)
                PSink           SNK(P=100000)
                connect(SUP.out, SNK.in)
                """;
        String msg = error(src);
        assertTrue(msg.contains("gas") && msg.contains("fluid"),
                "error names gas vs fluid: " + msg);
    }

    @Test
    void heatCannotConnectToElectrical() {
        // Different bond-graph domains (Qdot vs I) in one node → through-variable guard.
        String src = """
                ThermalSource TS(T=300)
                Resistor      R(R=10)
                connect(TS.port, R.a)
                """;
        String msg = error(src);
        assertTrue(msg.toLowerCase().contains("domain"),
                "error flags the domain mix: " + msg);
    }

    @Test
    void fluidCannotConnectToMechanicalShaft() {
        String src = """
                COMPONENT FSrc(out)
                  PARAM mdot, P, h0
                  out.mdot = mdot
                  out.P    = P
                  out.h    = h0
                END
                FSrc        SRC(mdot=1, P=100000, h0=0)
                MechGround  G()
                connect(SRC.out, G.port)
                """;
        // SRC.out carries mdot, G.port carries w → fluid vs mechanical: rejected.
        String msg = error(src);
        assertTrue(msg.toLowerCase().contains("domain"), "error flags the domain mix: " + msg);
    }

    @Test
    void sameConnectorTypesStillConnectCleanly() {
        // Sanity: an all-gas circuit is unaffected by the new guards.
        String src = """
                PneumaticSupply     SUP(fluid$=Air, P=700000, T=300)
                PneumaticOrifice    ORI(fluid$=Air, C=1e-8, b=0.3)
                PneumaticAtmosphere ATM(P=100000)
                connect(SUP.out, ORI.in)
                connect(ORI.out, ATM.port)
                """;
        double m = solver.solve(src).variables().get("ori.in.mdot");
        assertTrue(m > 0, "all-gas circuit still solves: " + m);
    }
}
