package com.frees.backend.parser;

import com.frees.backend.ast.StateTableDef;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * STATE TABLE ... END blocks declare which state-point variables belong to one
 * circuit and the fluid they use. Like PARAMETRIC/PLOT blocks they add no
 * equations to the system — only the parsed declaration is exposed.
 */
class StateTableParseTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void parsesVariablesAndFluidAttribute() {
        String text = """
                STATE TABLE WaterCircuit1(Pw1, Pw_2, Tw1)
                  FLUID = Water
                END
                """;
        var result = parser.parseResult(text);
        assertTrue(result.equations().isEmpty(), "state table block must not add equations");

        List<StateTableDef> tables = result.stateTables();
        assertEquals(1, tables.size());
        StateTableDef t = tables.get(0);
        assertEquals("WaterCircuit1", t.name());
        assertEquals(List.of("pw1", "pw_2", "tw1"), t.variables());
        assertEquals("Water", t.fluid());
    }

    @Test
    void supportsMultipleFluidAwareCircuits() {
        String text = """
                STATE TABLE WaterCircuit(Pw_1, Pw_2)
                  FLUID = Water
                END

                STATE TABLE RefrigerantCircuit(Pref_1, Pref_2, xref1)
                  FLUID = R134a
                END
                """;
        List<StateTableDef> tables = parser.parseResult(text).stateTables();
        assertEquals(2, tables.size());
        assertEquals("Water", tables.get(0).fluid());
        assertEquals("R134a", tables.get(1).fluid());
        assertEquals(List.of("pref_1", "pref_2", "xref1"), tables.get(1).variables());
    }

    @Test
    void fluidIsOptional() {
        String text = """
                STATE TABLE C(P1, T1)
                END
                """;
        StateTableDef t = parser.parseResult(text).stateTables().get(0);
        assertNull(t.fluid());
        assertEquals(List.of("p1", "t1"), t.variables());
    }

    @Test
    void acceptsQuotedFluidName() {
        String text = """
                STATE TABLE C(P1, T1)
                  FLUID = 'R245fa'
                END
                """;
        assertEquals("R245fa", parser.parseResult(text).stateTables().get(0).fluid());
    }

    @Test
    void survivesMarkdownExtraction() {
        // The /api/check and /api/solve paths run the text through the markdown
        // extractor first; it must keep the STATE TABLE block intact (regression
        // for the block being split apart and failing to parse).
        String text = """
                P1 = 10
                T1 = 45
                STATE TABLE C(P1, T1)
                  FLUID = Water
                END
                """;
        String clean = MarkdownEquationExtractor.extract(text).cleanText;
        var result = parser.parseResult(clean);
        assertEquals(1, result.stateTables().size());
        assertEquals("Water", result.stateTables().get(0).fluid());
    }

    @Test
    void numberlessStateVariableIsRejected() {
        // States are always numbered; a bare, indexless member (xrefg) is an error.
        String text = """
                STATE TABLE Refrig(T1, P1, xrefg)
                  FLUID = R134a
                END
                """;
        EquationParser.ParseException e = assertThrows(
                EquationParser.ParseException.class,
                () -> parser.parseResult(text));
        assertTrue(e.getMessage().contains("xrefg"), e.getMessage());
        assertTrue(e.getMessage().contains("no state number"), e.getMessage());
    }

    @Test
    void variableNamedStateStillParsesAsIdentifier() {
        // "STATE TABLE" is a single token; a lone variable named `state` must
        // not be swallowed by it.
        String text = "state = 5\nx = state + 1";
        var result = parser.parseResult(text);
        assertTrue(result.stateTables().isEmpty());
        assertEquals(2, result.equations().size());
    }
}
