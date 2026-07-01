package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase 1.5 of the component layer: the {@code connect(...)} surface syntax and
 * loop-closure handling. Components are instantiated with <em>free ports</em>
 * (no positional streams) and wired explicitly; {@code connect} ties endpoints
 * into a node — pressure and enthalpy equal, mass conserved — and a connection
 * that closes a loop adds no redundant equation. Pure-algebra components keep
 * these tests CoolProp-free.
 */
class ComponentConnectTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();
    private final EquationParser parser = new EquationParser();

    private static final String HEATER = """
            COMPONENT Heater(in, out)
              PARAM Q
              out.mdot = in.mdot
              out.P    = in.P
              out.h    = in.h + Q / in.mdot
            END
            """;

    @Test
    void connectWiresFreePortInstancesInSeries() {
        String src = HEATER + """
                Heater H1(Q=5000)
                Heater H2(Q=3000)
                connect(H1.out, H2.in)

                H1.in.P    = 100000
                H1.in.mdot = 2
                H1.in.h    = 10000
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Mass and pressure pass through the connected node.
        assertEquals(2.0, v.get("h2.in.mdot"), 1e-9);
        assertEquals(2.0, v.get("h2.out.mdot"), 1e-9);
        assertEquals(100000.0, v.get("h2.out.p"), 1e-6);
        // Enthalpy accumulates across both heaters: 10000 + 5000/2 + 3000/2.
        assertEquals(10000.0 + 2500.0 + 1500.0, v.get("h2.out.h"), 1e-6);
    }

    @Test
    void connectBranchesMassAtAThreeWayNode() {
        // A source feeds two draws; the 3-way connect conserves mass
        // (out = in1 + in2) and equates P and h across the node.
        String src = """
                COMPONENT Source(out)
                  PARAM mdot, P, h
                  out.mdot = mdot
                  out.P    = P
                  out.h    = h
                END
                COMPONENT Draw(in)
                  PARAM mdot
                  in.mdot = mdot
                END
                COMPONENT Sink(in)
                  drain = in.mdot
                END
                Source S(mdot=3, P=100000, h=5000)
                Draw   D1(mdot=1)
                Sink   D2()
                connect(S.out, D1.in, D2.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Conservation determines the unpinned branch: 3 = 1 + D2.
        assertEquals(2.0, v.get("d2.in.mdot"), 1e-9);
        assertEquals(2.0, v.get("d2.drain"), 1e-9);
        // Pressure and enthalpy are common across the node.
        assertEquals(100000.0, v.get("d1.in.p"), 1e-6);
        assertEquals(5000.0, v.get("d2.in.h"), 1e-6);
    }

    @Test
    void connectClosesALoopWithoutOverDetermining() {
        // A pump and a pipe form a closed ring (pump raises P, pipe drops it).
        // The second connect closes the loop; without loop-closure handling the
        // system is over-determined and rejected. With it, the cycle solves.
        String src = """
                COMPONENT Pump2(in, out)
                  PARAM dP
                  out.mdot = in.mdot
                  out.P    = in.P + dP
                  out.h    = in.h
                END
                COMPONENT Pipe2(in, out)
                  PARAM dP
                  out.mdot = in.mdot
                  out.P    = in.P - dP
                  out.h    = in.h
                END
                Pump2 P(dP=50000)
                Pipe2 L(dP=50000)
                connect(P.out, L.in)
                connect(L.out, P.in)

                P.in.P    = 100000
                P.in.mdot = 5
                P.in.h    = 1000
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Mass conserved around the ring.
        assertEquals(5.0, v.get("l.out.mdot"), 1e-9);
        // Pump rise then pipe drop returns to the anchored inlet pressure.
        assertEquals(150000.0, v.get("p.out.p"), 1e-6);
        assertEquals(100000.0, v.get("l.out.p"), 1e-6);
        assertEquals(1000.0, v.get("p.out.h"), 1e-6);
    }

    @Test
    void connectAcceptsBareStreamNames() {
        // connect can also tie bare stream names (shared-name endpoints).
        String src = HEATER + """
                Heater H1(s1, s2, Q=4000)
                connect(s2, s3)
                s1.P = 100000
                s1.mdot = 4
                s1.h = 0
                s3.extra = 7
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(4000.0 / 4.0, v.get("s3.h"), 1e-6);   // h carried onto s3
        assertEquals(4.0, v.get("s3.mdot"), 1e-9);
        assertEquals(7.0, v.get("s3.extra"), 1e-9);
    }

    @Test
    void connectBranchesAndRemergesThroughThreePortNodes() {
        // A Splitter feeds two legs that recombine at a Mixer — the connection
        // graph forms a cycle through two 3-port nodes, but it is NOT a redundant
        // loop: the Mixer's second inlet is a genuine input fed only by its
        // branch connect. This must stay zero-DOF and solve (regression guard:
        // seeding a 3-port node's ports into the loop-closure union-find would
        // wrongly drop the final branch connect and under-determine the Mixer).
        String src = """
                COMPONENT Split(in, out1, out2)
                  in.mdot = out1.mdot + out2.mdot
                  out1.P  = in.P
                  out2.P  = in.P
                  out1.h  = in.h
                  out2.h  = in.h
                END
                COMPONENT Leg(in, out)
                  PARAM Q
                  out.mdot = in.mdot
                  out.P    = in.P
                  out.h    = in.h + Q / in.mdot
                END
                COMPONENT Join(in1, in2, out)
                  out.mdot      = in1.mdot + in2.mdot
                  out.P         = in1.P
                  out.mdot * out.h = in1.mdot * in1.h + in2.mdot * in2.h
                END
                Split SP()
                Leg   L1(Q=1000)
                Leg   L2(Q=2000)
                Join  JN()
                connect(SP.out1, L1.in)
                connect(SP.out2, L2.in)
                connect(L1.out, JN.in1)
                connect(L2.out, JN.in2)
                SP.in.P    = 100000
                SP.in.mdot = 4
                SP.in.h    = 0
                SP.out1.mdot = 1
                """;
        Map<String, Double> v = solver.solve(src).variables();
        // Mass conserved through the branches: out1=1, out2=3, recombined=4.
        assertEquals(4.0, v.get("jn.out.mdot"), 1e-9);
        // Enthalpy mixes: leg1 gains 1000/1, leg2 gains 2000/3; mass-weighted mix
        // at the Join = (1*1000 + 3*(2000/3)) / 4 = 3000/4 = 750.
        assertEquals(750.0, v.get("jn.out.h"), 1e-6);
        assertEquals(100000.0, v.get("jn.out.p"), 1e-3);
    }

    @Test
    void sourceAndSinkBoundariesBracketAnOpenChain() {
        // Standard-library boundary components: Source fixes the entering state
        // (mdot, P, h-from-(P,T)) and Sink reads the arriving stream into named
        // readouts. A Source -> Boiler -> Sink chain wired by connect solves at
        // zero DOF, all values evaluated forward (no property inversion).
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String src = """
                Source S(fluid$=Water, mdot=2, P=8000000, T=773.15)
                Boiler B()
                Sink   K()
                connect(S.out, B.in)
                connect(B.out, K.in)

                B.Q = 1000000
                """;
        Map<String, Double> v = solver.solve(src).variables();
        double hIn = v.get("s.out.h");
        // The Sink reads the boiler outlet: mass and pressure pass through
        // (isobaric), enthalpy rises by Q/mdot.
        assertEquals(2.0, v.get("k.mdot"), 1e-9);
        assertEquals(8000000.0, v.get("k.p"), 1e-3);
        assertEquals(hIn + 1000000.0 / 2.0, v.get("k.h"), 1e-3);
        // Source computed a physical superheated-steam enthalpy forward.
        assertTrue(hIn > 3.0e6 && hIn < 3.8e6, "source enthalpy out of range: " + hIn);
    }

    @Test
    void connectWithUndeterminableDirectionAtBranchIsRejected() {
        // A 3-way node whose ports don't encode in/out cannot have its mass
        // balance signed — a clear error, not a silent wrong equation.
        String src = """
                COMPONENT Node3(a, b, c)
                  drain = a.mdot
                END
                Node3 N(a, b, c)
                connect(N.a, N.b, N.c)
                """;
        EquationParser.ParseException ex = assertThrows(EquationParser.ParseException.class,
                () -> parser.parseResult(src));
        assertTrue(ex.getMessage().contains("inlet or an outlet"), ex.getMessage());
    }
}
