package com.frees.backend.api;

import com.frees.backend.parser.EquationParser;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** The wire mapping of the connection topology: domains and endpoints reach
 *  the DTO exactly as the expander classified them. */
class SolveDtosConnectionsTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void mapsExpanderConnectionsOntoTheWireDto() {
        String src = """
                COMPONENT Batt(p)
                p.v = 12
                END
                COMPONENT Load(a, b)
                a.i = (a.v - b.v) / 10
                b.i = 0 - a.i
                END
                Batt B(x1)
                Load L(x2, x3)
                connect(B.p, L.a)
                """;
        List<SolveDtos.ConnectionDto> dtos =
                SolveDtos.connectionsOf(parser.parseResult(src));

        assertTrue(dtos.stream().anyMatch(d -> d.endpoints().equals(List.of("b.p", "l.a"))
                        && "electrical".equals(d.domain())),
                "the explicit connect reaches the wire (canonical lowercase): " + dtos);
        assertTrue(dtos.stream().allMatch(d -> d.endpoints().size() >= 2),
                "every reported node joins at least two endpoints: " + dtos);
    }

    @Test
    void plainDocumentsMapToAnEmptyList() {
        assertEquals(List.of(), SolveDtos.connectionsOf(parser.parseResult("x = 2\ny = x + 1")));
    }
}
