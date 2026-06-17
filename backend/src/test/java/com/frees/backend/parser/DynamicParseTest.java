package com.frees.backend.parser;

import com.frees.backend.ast.DynamicSystem;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * DYNAMIC ... END blocks declare a transient / ODE system. Like
 * PARAMETRIC/PLOT/STATE TABLE blocks they are routed out of the analytic
 * equation stream — they add no equations to the algebraic system; only the
 * parsed {@link DynamicSystem} is exposed. The analytic solver never sees a
 * der() operator.
 */
class DynamicParseTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void parsesHeaderOptionsBodyInitialsAndEvents() {
        String text = """
                k = 0.05
                T_inf = 25 [C]
                m = 0.3
                cp = 4180
                DYNAMIC cooling (method = ode45, time = 0 .. 600 [s], points = 200, rtol = 1e-6)
                  der(T) = -k * (T - T_inf)
                  T(0) = 95 [C]
                  Q_dot = m * cp * der(T)
                  EVENT cool: T = T_inf | falling -> stop
                END
                """;
        var result = parser.parseResult(text);

        // The DYNAMIC body adds nothing to the analytic system.
        assertEquals(4, result.equations().size(), "only the 4 outer equations remain analytic");

        List<DynamicSystem> systems = result.dynamicSystems();
        assertEquals(1, systems.size());
        DynamicSystem ds = systems.get(0);
        assertEquals("cooling", ds.name());

        DynamicSystem.Options o = ds.options();
        assertEquals("ode45", o.method());
        assertEquals(0.0, o.t0(), 1e-12);
        assertEquals(600.0, o.tf(), 1e-12);
        assertEquals(200, o.points());
        assertEquals(1e-6, o.rtol(), 1e-18);

        // der(T) = ... and Q_dot = ... are body equations; the initial and the
        // event are sorted into their own lists.
        assertEquals(2, ds.bodyEquations().size());
        assertEquals(1, ds.initials().size());
        DynamicSystem.InitialCondition ic = ds.initials().get(0);
        assertEquals("t", ic.state());           // T -> t (case-insensitive)
        assertTrue(ic.indices().isEmpty());
        // 95 [C] is converted to SI kelvin at build time.
        assertEquals(368.15, ((Expr.Num) ic.value()).value(), 1e-9);

        assertEquals(1, ds.events().size());
        DynamicSystem.Event ev = ds.events().get(0);
        assertEquals("cool", ev.name());
        assertEquals("falling", ev.direction());
        assertEquals("stop", ev.action());
    }

    @Test
    void eventDirectionDefaultsToAny() {
        String text = """
                DYNAMIC d (t = 0 .. 10)
                  der(x) = -x
                  x(0) = 1
                  EVENT hit: x = 0 -> record
                END
                """;
        DynamicSystem ds = parser.parseResult(text).dynamicSystems().get(0);
        assertEquals("any", ds.events().get(0).direction());
        assertEquals("record", ds.events().get(0).action());
    }

    @Test
    void parsesArrayStateInitialCondition() {
        // Method-of-lines vector initial: T[1..N](0) = T_init.
        String text = """
                DYNAMIC rod (t = 0 .. 60, points = 100)
                  FOR i = 1 TO 5
                    der(T[i]) = T[i]
                  END
                  T[1..5](0) = 300
                END
                """;
        DynamicSystem ds = parser.parseResult(text).dynamicSystems().get(0);
        assertEquals(1, ds.forBlocks().size());
        assertEquals(1, ds.initials().size());
        DynamicSystem.InitialCondition ic = ds.initials().get(0);
        assertEquals("t", ic.state());
        assertEquals(1, ic.indices().size());
        assertTrue(ic.indices().get(0) instanceof Expr.Range);
    }

    @Test
    void missingTimeSpanIsRejected() {
        String text = """
                DYNAMIC d (method = ode45)
                  der(x) = -x
                  x(0) = 1
                END
                """;
        EquationParser.ParseException e = assertThrows(
                EquationParser.ParseException.class,
                () -> parser.parseResult(text));
        assertTrue(e.getMessage().contains("time span"), e.getMessage());
    }

    @Test
    void unknownOptionIsRejected() {
        String text = """
                DYNAMIC d (t = 0 .. 1, bogus = 5)
                  der(x) = -x
                  x(0) = 1
                END
                """;
        EquationParser.ParseException e = assertThrows(
                EquationParser.ParseException.class,
                () -> parser.parseResult(text));
        assertTrue(e.getMessage().contains("bogus"), e.getMessage());
    }

    @Test
    void survivesMarkdownExtraction() {
        // The /api/check and /api/solve paths run the text through the markdown
        // extractor first; it must keep the DYNAMIC block intact.
        String text = """
                # Newton cooling
                k = 0.05
                DYNAMIC cooling (time = 0 .. 600)
                  der(T) = -k * T
                  T(0) = 95
                END
                """;
        String clean = MarkdownEquationExtractor.extract(text).cleanText;
        var result = parser.parseResult(clean);
        assertEquals(1, result.dynamicSystems().size());
        assertEquals("cooling", result.dynamicSystems().get(0).name());
        // Only k = 0.05 survives as an analytic equation.
        assertEquals(1, result.equations().size());
    }
}
