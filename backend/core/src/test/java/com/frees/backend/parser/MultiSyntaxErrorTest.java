package com.frees.backend.parser;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Multi-error lint: one parse surfaces every broken line — ANTLR's default
 * recovery resyncs per statement, and the ParseException carries each error
 * with its 1-based position so the editor can mark them all.
 */
class MultiSyntaxErrorTest {

    private final EquationParser parser = new EquationParser();

    @Test
    void collectsEveryBrokenLineWithPositions() {
        EquationParser.ParseException e = assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("x = 1 +\ny = 2 +\nz = 3"));

        assertEquals(2, e.syntaxErrors().size());
        assertEquals(1, e.syntaxErrors().get(0).line());
        assertEquals(7, e.syntaxErrors().get(0).column());
        assertEquals(2, e.syntaxErrors().get(1).line());
        assertTrue(e.getMessage().contains("line 1:"), e.getMessage());
        assertTrue(e.getMessage().contains("line 2:"), e.getMessage());
    }

    @Test
    void healthyLinesBetweenBrokenOnesStayClean() {
        EquationParser.ParseException e = assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("a = )\nb = 2\nc = )"));

        assertEquals(2, e.syntaxErrors().size());
        assertEquals(1, e.syntaxErrors().get(0).line());
        assertEquals(3, e.syntaxErrors().get(1).line());
    }

    @Test
    void semanticParseExceptionsCarryNoSyntaxErrorList() {
        EquationParser.ParseException e = assertThrows(EquationParser.ParseException.class,
                () -> parser.parse("A = [1 2 3; 4 5 6]\nd = Determinant(A[1:2,1:3])"));

        assertTrue(e.syntaxErrors().isEmpty());
    }
}
