package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The causal SIGNAL connector domain: a port member {@code sig} marks a
 * control/command value. A signal {@code connect} node is across-only — it
 * equates the value at every endpoint and carries NO flow member — so one
 * writer broadcasts to any number of readers (conventional block-diagram signal-wire
 * semantics), and the strict domain-separation guard keeps a signal wire from
 * ever landing on a physical (bond-graph) port.
 */
class SignalDomainTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** User-defined blocks so this test exercises the expander mechanism itself,
     *  independent of the signal standard library built on top of it. */
    private static final String BLOCKS = """
            COMPONENT SigConst(out)
              PARAM k
              out.sig = k
            END
            COMPONENT SigGain(in, out)
              PARAM k
              out.sig = k * in.sig
            END
            COMPONENT SigSum(in1, in2, out)
              out.sig = in1.sig + in2.sig
            END
            """;

    @Test
    void chainedSignalBlocksPropagateTheValue() {
        String src = BLOCKS + """
                SigConst SRC(k=2)
                SigGain  G1(k=3)
                SigGain  G2(k=5)
                connect(SRC.out, G1.in)
                connect(G1.out, G2.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(2.0, v.get("g1.in.sig"), 1e-12);
        assertEquals(6.0, v.get("g2.in.sig"), 1e-12);
        assertEquals(30.0, v.get("g2.out.sig"), 1e-12);
    }

    @Test
    void oneWriterBroadcastsToTwoReaders() {
        // A 3-endpoint signal node needs NO flow balance and no in/out direction
        // naming — the across equality alone wires one source to two readers.
        String src = BLOCKS + """
                SigConst SRC(k=2)
                SigGain  A(k=3)
                SigGain  B(k=5)
                connect(SRC.out, A.in, B.in)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(6.0, v.get("a.out.sig"), 1e-12);
        assertEquals(10.0, v.get("b.out.sig"), 1e-12);
    }

    @Test
    void algebraicFeedbackLoopSolves() {
        // Negative feedback: e = r − y, y = K·e ⇒ y = K·r/(1+K) = 8·1/9.
        String src = BLOCKS + """
                SigConst R(k=1)
                SigGain  FWD(k=8)
                COMPONENT SigDiff(inp, inm, out)
                  out.sig = inp.sig - inm.sig
                END
                SigDiff  ERR()
                connect(R.out, ERR.inp)
                connect(ERR.out, FWD.in)
                connect(FWD.out, ERR.inm)
                """;
        Map<String, Double> v = solver.solve(src).variables();
        assertEquals(8.0 / 9.0, v.get("fwd.out.sig"), 1e-9);
        assertEquals(1.0 / 9.0, v.get("err.out.sig"), 1e-9);
    }

    @Test
    void signalCannotConnectToAHeatPort() {
        String src = BLOCKS + """
                SigConst   SRC(k=300)
                ThermalMass M(C=100, T0=300)
                connect(SRC.out, M.port)
                """;
        String msg = assertThrows(EquationParser.ParseException.class,
                () -> solver.solve(src)).getMessage();
        assertTrue(msg.contains("signal") && msg.contains("heat"),
                "error names the mixed domains: " + msg);
    }

    @Test
    void signalCannotConnectToAFluidPort() {
        String src = BLOCKS + """
                SigConst SRC(k=100000)
                Source   S(fluid$=Air, mdot=1, P=100000, T=300)
                Sink     K()
                connect(SRC.out, K.in)
                connect(S.out, K.in)
                """;
        String msg = assertThrows(EquationParser.ParseException.class,
                () -> solver.solve(src)).getMessage();
        assertTrue(msg.contains("signal") && msg.contains("fluid"),
                "error names the mixed domains: " + msg);
    }
}
