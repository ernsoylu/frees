package com.frees.backend.api;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.units.UnitRegistry;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * A fluid component's canonical stream members (P, ṁ, h) are the solver's own
 * unknowns — nothing in the document grounds their units — so without an
 * explicit bridge from the stream's physical domain they display dimensionless.
 * The expander now emits SI units for them, threaded through the unit seeding.
 */
class ComponentPortUnitsTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static final String FAN_DUCT = """
            P_atm = 101325 [Pa]
            Fan  F1(a, b, dP0=500 [Pa], Q0=0.6 [m^3/s], eta=0.6, fluid$=Air)
            Pipe D1(b, c, L=100 [m], D=0.3 [m], rough=0.000045 [m], fluid$=Air)
            a.P = P_atm
            a.h = Enthalpy(Air, T=293 [K], P=P_atm)
            c.P = P_atm
            """;

    @Test
    void canonicalFluidMembersAreGrounded() {
        EquationParser.ParseResult parsed = solver.parse(FAN_DUCT);
        Map<String, String> units = SolverApiSupport.unitsByLowerName(parsed, List.of(), solver);

        // Mass flow and enthalpy are grounded nowhere in the document; the domain
        // bridge is what gives them units now (previously dimensionless).
        assertNotNull(units.get("a$mdot"), "stream mass-flow member should carry units");
        assertEquals(UnitRegistry.parse("kg/s"), UnitRegistry.parse(units.get("a$mdot")));
        assertEquals(UnitRegistry.parse("J/kg"), UnitRegistry.parse(units.get("a$h")));
        assertEquals(UnitRegistry.parse("Pa"), UnitRegistry.parse(units.get("a$p")));
        // The downstream stream members are grounded the same way.
        assertEquals(UnitRegistry.parse("kg/s"), UnitRegistry.parse(units.get("b$mdot")));
        assertEquals(UnitRegistry.parse("J/kg"), UnitRegistry.parse(units.get("c$h")));
    }

    @Test
    void componentMemberUnitsAreEmptyForPlainDocuments() {
        EquationParser.ParseResult parsed = solver.parse("x = 1\ny = x + 2");
        assertEquals(Map.of(), parsed.componentMemberUnits());
    }
}
