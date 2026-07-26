package com.frees.backend.core;

import com.frees.backend.parser.EquationParser;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * In-text GUESS directives: guesses and bounds travel with the document, so
 * a shared link solves identically for its recipient — no Variable
 * Information window required.
 */
class GuessDirectiveTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** The guess selects the root: from -3, x^2 = 4 lands on -2 (the default
     *  guess of 1 finds +2). No specs passed — the text is self-sufficient. */
    @Test
    void guessSelectsTheRoot() {
        assertEquals(2.0, solver.solve("x^2 = 4").variables().get("x"), 1e-9);
        assertEquals(-2.0, solver.solve("GUESS x = -3\nx^2 = 4").variables().get("x"), 1e-9);
    }

    /** Bounds alone keep the iteration in the negative branch. */
    @Test
    void boundsAloneConfineTheSolve() {
        Map<String, Double> v = solver.solve("GUESS x [-10, -0.1]\nx^2 = 4").variables();
        assertEquals(-2.0, v.get("x"), 1e-9);
    }

    /** Text wins over the modal: a passed-in spec pointing at +3 is overridden
     *  by the document's own directive. */
    @Test
    void textWinsOverModalSpecs() {
        Map<String, VariableSpec> modal = Map.of("x", new VariableSpec("x", 3.0, -100, 100));
        Map<String, Double> v = solver.solve("GUESS x = -3\nx^2 = 4",
                SolverSettings.DEFAULTS, modal).variables();
        assertEquals(-2.0, v.get("x"), 1e-9);
    }

    /** Absent parts fall back to the modal spec: text bounds + modal guess.
     *  The stale modal guess (+3) is clamped into the text bounds. */
    @Test
    void absentPartsFallBackAndClamp() {
        Map<String, VariableSpec> modal = Map.of("x", new VariableSpec("x", 3.0, -100, 100, 0.25));
        EquationSystemSolver.Result r = solver.solve("GUESS x [-10, -0.1]\nx^2 = 4\ny = 2*x",
                SolverSettings.DEFAULTS, modal);
        assertEquals(-2.0, r.variables().get("x"), 1e-9);
        // The modal uncertainty survives the merge: y = 2x propagates 2*0.25.
        assertEquals(0.5, r.uncertainties().get("y"), 1e-9);
    }

    /** A bare directive and inverted bounds are parse errors, not silence. */
    @Test
    void malformedDirectivesAreParseErrors() {
        EquationParser.ParseException bare = assertThrows(EquationParser.ParseException.class,
                () -> solver.solve("GUESS x\nx^2 = 4"));
        assertTrue(bare.getMessage().contains("declare a guess"), bare.getMessage());
        EquationParser.ParseException inverted = assertThrows(EquationParser.ParseException.class,
                () -> solver.solve("GUESS x [10, 0]\nx^2 = 4"));
        assertTrue(inverted.getMessage().contains("lower bound"), inverted.getMessage());
        EquationParser.ParseException outside = assertThrows(EquationParser.ParseException.class,
                () -> solver.solve("GUESS x = 20 [0, 10]\nx^2 = 4"));
        assertTrue(outside.getMessage().contains("outside"), outside.getMessage());
    }

    /** Case-insensitive like everything else in the language. */
    @Test
    void directiveIsCaseInsensitive() {
        assertEquals(-2.0, solver.solve("guess X = -3\nx^2 = 4").variables().get("x"), 1e-9);
    }
}
