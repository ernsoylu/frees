package com.frees.backend.api;

import com.frees.backend.parser.EquationParser;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The drawing data the connection payload carries beyond bare topology: the
 * fluid connector type, the working fluid, and the per-endpoint variable
 * prefix. Without these a rendered schematic cannot tell a coolant loop from a
 * refrigerant loop (both are {@code domain=fluid}) and cannot show an
 * endpoint's solved state.
 */
class SchematicPayloadTest {

    private final EquationParser parser = new EquationParser();

    /** Two fluid circuits that a domain-only payload would render identically. */
    private static final String TWO_CIRCUITS = """
            LiquidSource  PUMPIN(fluid$=EG50, mdot=0.4, P=200000 [Pa], T=305 [K])
            LiquidPump    PUMP(fluid$=EG50, eta=0.6)
            LiquidWallHX  BCP(fluid$=EG50, UA=500)
            LiquidSink    PUMPOUT()
            MassGen BATT(C=60000, Qgen=4000, T0=305 [K])

            TwoPhasePressureSource FEED(fluid$=R1234yf, P=350000 [Pa], x=0.20)
            TwoPhaseEvaporatorUA CHLR(fluid$=R1234yf, UA=400, dP=1000, SH=5)
            TwoPhaseCompressor CMP(fluid$=R1234yf, eta=0.7)
            TwoPhaseSink LIQ()

            connect(PUMPIN.out, PUMP.in)
            connect(PUMP.out, BCP.in)
            connect(BCP.wall, BATT.port)
            connect(BCP.out, PUMPOUT.in)
            connect(FEED.out, CHLR.in)
            connect(CHLR.out, CMP.in)
            connect(CMP.out, LIQ.in)
            """;

    @Test
    void separatesTheCoolantAndRefrigerantCircuits() {
        List<SolveDtos.ConnectionDto> dtos = SolveDtos.connectionsOf(parser.parseResult(TWO_CIRCUITS));

        Set<String> fluids = dtos.stream()
                .map(SolveDtos.ConnectionDto::fluid)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        assertEquals(Set.of("eg50", "r1234yf"), fluids,
                "each fluid line is named, so the two circuits draw apart: " + dtos);

        // The domain alone collapses them — which is exactly the gap this fills.
        assertEquals(Set.of("fluid"),
                dtos.stream().filter(d -> d.fluid() != null).map(SolveDtos.ConnectionDto::domain)
                        .collect(Collectors.toSet()),
                "both circuits share one bond-graph domain");
    }

    @Test
    void tagsFluidNodesWithTheirConnectorType() {
        List<SolveDtos.ConnectionDto> dtos = SolveDtos.connectionsOf(parser.parseResult(TWO_CIRCUITS));

        assertEquals("liquid", connectorOf(dtos, "pumpin.out"),
                "the coolant line is a liquid connector");
        assertEquals("twophase", connectorOf(dtos, "feed.out"),
                "the refrigerant line is a two-phase connector");
    }

    @Test
    void carriesNoConnectorOrFluidOutsideTheFluidDomain() {
        SolveDtos.ConnectionDto wall = node(SolveDtos.connectionsOf(parser.parseResult(TWO_CIRCUITS)),
                "bcp.wall");
        assertEquals("heat", wall.domain());
        assertNull(wall.connector(), "a heat node has no fluid connector type");
        assertNull(wall.fluid(), "a heat node carries no working fluid");
    }

    @Test
    void namesTheVariablePrefixOfEveryEndpoint() {
        List<SolveDtos.ConnectionDto> dtos = SolveDtos.connectionsOf(parser.parseResult(TWO_CIRCUITS));
        SolveDtos.ConnectionDto feed = node(dtos, "feed.out");

        assertEquals(feed.endpoints().size(), feed.streams().size(),
                "one prefix per endpoint, aligned by index");
        // A connect-wired free port's members are FEED.out.P, FEED.out.mdot, …
        assertEquals(List.of("feed.out", "chlr.in"), feed.streams(),
                "canonical lowercase, matching the solved-variable keys the drawing looks up");
    }

    @Test
    void sharedStreamWiringReportsTheStreamAsWritten() {
        String src = """
                LiquidSource PUMPIN(s1, fluid$=EG50, mdot=0.4, P=200000 [Pa], T=305 [K])
                LiquidPump   PUMP(s1, s2, fluid$=EG50, eta=0.6)
                LiquidSink   PUMPOUT(s2)
                """;
        List<SolveDtos.ConnectionDto> dtos = SolveDtos.connectionsOf(parser.parseResult(src));
        SolveDtos.ConnectionDto s1 = node(dtos, "pumpin.out");

        assertEquals(List.of("s1", "s1"), s1.streams(),
                "a shared-name stream names every endpoint's variables");
        assertEquals("eg50", s1.fluid());
    }

    @Test
    void topologyOnlyDocumentsStillReportDomainAndEndpoints() {
        // A network with no fluid at all must not regress: domain + endpoints
        // stay populated and the new fields are simply absent.
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
        SolveDtos.ConnectionDto dto = node(SolveDtos.connectionsOf(parser.parseResult(src)), "b.p");
        assertEquals("electrical", dto.domain());
        assertNull(dto.connector());
        assertNotNull(dto.streams());
        assertEquals(dto.endpoints().size(), dto.streams().size());
    }

    private static SolveDtos.ConnectionDto node(List<SolveDtos.ConnectionDto> dtos, String endpoint) {
        return dtos.stream()
                .filter(d -> d.endpoints().stream().anyMatch(e -> e.equalsIgnoreCase(endpoint)))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no node joins " + endpoint + " in " + dtos));
    }

    private static String connectorOf(List<SolveDtos.ConnectionDto> dtos, String endpoint) {
        return node(dtos, endpoint).connector();
    }

    @Test
    void everyFluidNodeOfATwoCircuitModelIsAttributed() {
        List<SolveDtos.ConnectionDto> dtos = SolveDtos.connectionsOf(parser.parseResult(TWO_CIRCUITS));
        assertTrue(dtos.stream().filter(d -> "fluid".equals(d.domain()))
                        .allMatch(d -> d.connector() != null && d.fluid() != null),
                "no fluid node is left un-attributed: " + dtos);
    }
}
