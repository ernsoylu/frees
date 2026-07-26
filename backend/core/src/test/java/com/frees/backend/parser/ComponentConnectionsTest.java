package com.frees.backend.parser;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Connection topology in the parse payload — the rendered schematic's data
 * layer. Domains come from the expander's own node classification, so the
 * payload can never disagree with the solve.
 */
class ComponentConnectionsTest {

    private final EquationParser parser = new EquationParser();

    private static final String ELECTRICAL_DEFS = """
            COMPONENT Batt(p)
            p.v = 12
            END
            COMPONENT Load(a, b)
            a.i = (a.v - b.v) / 10
            b.i = 0 - a.i
            END
            COMPONENT Gnd(g)
            g.v = 0
            END
            """;

    /** Explicit connect(...) nodes keep their endpoints as written. */
    @Test
    void explicitConnectsCarryDomainAndEndpoints() {
        String src = ELECTRICAL_DEFS + """
                Batt B(x1)
                Load L(x2, x3)
                Gnd G(x4)
                connect(B.p, L.a)
                connect(L.b, G.g)
                """;
        List<ComponentExpander.Connection> conns =
                parser.parseResult(src).componentConnections();
        List<ComponentExpander.Connection> explicit = conns.stream()
                .filter(c -> c.endpoints().get(0).contains("."))
                .toList();
        assertEquals(2, explicit.size(), "two connect nodes: " + conns);
        assertEquals("electrical", explicit.get(0).domain());
        assertEquals(List.of("b.p", "l.a"), explicit.get(0).endpoints());
        assertEquals(List.of("l.b", "g.g"), explicit.get(1).endpoints());
    }

    /** Shared-stream junctions surface as instance.port pairs. */
    @Test
    void sharedStreamJunctionsSurfaceAsEdges() {
        String src = ELECTRICAL_DEFS + """
                Batt B(n1)
                Load L(n1, n2)
                Gnd G(n2)
                """;
        List<ComponentExpander.Connection> conns =
                parser.parseResult(src).componentConnections();
        List<ComponentExpander.Connection> junctions = conns.stream()
                .filter(c -> c.endpoints().size() >= 2)
                .toList();
        assertEquals(2, junctions.size(), "n1 and n2 junctions: " + conns);
        assertTrue(junctions.stream().allMatch(c -> "electrical".equals(c.domain())));
        assertTrue(junctions.stream().anyMatch(c ->
                c.endpoints().containsAll(List.of("b.p", "l.a"))), "n1 joins B.p and L.a: " + conns);
        assertTrue(junctions.stream().anyMatch(c ->
                c.endpoints().containsAll(List.of("l.b", "g.g"))), "n2 joins L.b and G.g: " + conns);
    }

    /** A heat-domain node classifies as heat, not fluid. */
    @Test
    void heatNodesClassifyAsHeat() {
        String src = """
                COMPONENT Hot(s)
                s.t = 400
                END
                COMPONENT Wall(a, b)
                a.qdot = (a.t - b.t) / 0.5
                b.qdot = 0 - a.qdot
                END
                Hot H(w1)
                Wall W(w1, w2)
                """;
        List<ComponentExpander.Connection> conns =
                parser.parseResult(src).componentConnections();
        assertTrue(conns.stream().anyMatch(c -> "heat".equals(c.domain())),
                "expected a heat junction: " + conns);
    }

    /** A document with no components carries an empty topology. */
    @Test
    void plainDocumentsHaveNoTopology() {
        assertEquals(List.of(), parser.parseResult("x = 2\ny = x + 1").componentConnections());
    }
}
