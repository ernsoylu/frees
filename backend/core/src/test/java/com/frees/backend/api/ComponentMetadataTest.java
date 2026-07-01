package com.frees.backend.api;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ComponentMetadataTest {

    @Test
    void resolvesVariableLiteralAndStringParamBindings() {
        String src = """
                UA_chl_r = 575.46
                TwoPhaseEvaporatorUA CHLR(fluid$=R1234yf, UA=UA_chl_r, SH=5)
                """;
        // Solved variable feeding the UA binding (display name preserves case).
        List<SolveDtos.VariableDto> vars = List.of(
                new SolveDtos.VariableDto("UA_chl_r", 575.46, "W/K"));

        List<SolveDtos.ComponentDto> comps = ComponentMetadata.build(src, vars);
        assertEquals(1, comps.size());
        SolveDtos.ComponentDto chlr = comps.get(0);
        // Display name/type recover their original spelling from the source even
        // though the AST lowercases both for case-insensitive lookup.
        assertEquals("CHLR", chlr.name());
        assertEquals("TwoPhaseEvaporatorUA", chlr.type());

        var byName = chlr.params().stream()
                .collect(java.util.stream.Collectors.toMap(SolveDtos.ComponentParamDto::name, p -> p));

        // Variable binding resolves to its solved value + units, shown by symbol.
        SolveDtos.ComponentParamDto ua = byName.get("ua");
        assertEquals("UA_chl_r", ua.ref());
        assertEquals(575.46, ua.value());
        assertEquals("W/K", ua.units());

        // Numeric literal carries its own value, no backing variable.
        SolveDtos.ComponentParamDto sh = byName.get("sh");
        assertEquals(5.0, sh.value());

        // A bare-identifier string parameter (a fluid name) has no backing
        // variable, so it shows the identifier (lowercased) with no value.
        SolveDtos.ComponentParamDto fluid = byName.get("fluid$");
        assertEquals("r1234yf", fluid.ref());
        assertNull(fluid.value());
    }

    @Test
    void sharedVariableResolvesToSameValueUnderEachInstance() {
        String src = """
                UA_rad = 361.5
                LiquidWallHX RAD1(fluid$=EG50, UA=UA_rad)
                LiquidWallHX RAD2(fluid$=EG50, UA=UA_rad)
                """;
        List<SolveDtos.VariableDto> vars = List.of(
                new SolveDtos.VariableDto("UA_rad", 361.5, "W/K"));

        List<SolveDtos.ComponentDto> comps = ComponentMetadata.build(src, vars);
        assertEquals(2, comps.size());
        for (SolveDtos.ComponentDto c : comps) {
            SolveDtos.ComponentParamDto ua = c.params().stream()
                    .filter(p -> p.name().equals("ua")).findFirst().orElseThrow();
            assertEquals("UA_rad", ua.ref());
            assertEquals(361.5, ua.value());
        }
    }

    @Test
    void returnsEmptyWhenNoComponents() {
        assertTrue(ComponentMetadata.build("x = 1\ny = x + 2", List.of()).isEmpty());
    }
}
