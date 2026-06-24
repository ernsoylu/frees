package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * MATLAB-style multi-output destructuring of CALL intrinsics:
 *   [A, B, C, D] = tf2ss(num, den)   (full)
 *   [~, ~, V]    = svd(A)            ('~' discards an output slot)
 *   [A, B]       = tf2ss(num, den)   (omit trailing outputs)
 *
 * Each case is checked against the equivalent {@code CALL name(in : out...)} form so the
 * destructuring sugar can never drift from the colon form, and asserts that discarded/omitted
 * outputs are never surfaced as variables (no {@code ~ignored~} sink leaks).
 */
class MultiOutputDestructuringTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** Solved values whose canonical name (or array base) matches one of the named bases must agree. */
    private void assertOutputsMatch(Map<String, Double> ref, Map<String, Double> got, String... bases) {
        boolean comparedAny = false;
        for (String base : bases) {
            String lo = base.toLowerCase();
            for (Map.Entry<String, Double> entry : ref.entrySet()) {
                String klo = entry.getKey().toLowerCase();
                if (klo.equals(lo) || klo.startsWith(lo + "[")) {
                    assertTrue(got.containsKey(entry.getKey()), "destructured form missing " + entry.getKey());
                    assertEquals(entry.getValue(), got.get(entry.getKey()), 1e-8, "mismatch at " + entry.getKey());
                    comparedAny = true;
                }
            }
        }
        assertTrue(comparedAny, "no output variables were compared");
    }

    private void assertNoSinksLeak(Map<String, Double> vars) {
        assertFalse(vars.keySet().stream().anyMatch(k -> k.toLowerCase().contains("~ignored~")),
                "ignored-output sink variables leaked into the result: " + vars.keySet());
    }

    @Test
    void tf2ssFullDestructuringMatchesCallForm() {
        String setup = "num = [0, 0, 1]\nden = [1, 3, 2]\n";
        Map<String, Double> ref = solver.solve(setup
                + "CALL tf2ss(num, den : A[1:2,1:2], B[1:2], C[1:2], D)").variables();
        Map<String, Double> got = solver.solve(setup
                + "[A, B, C, D] = tf2ss(num, den)").variables();
        assertOutputsMatch(ref, got, "a", "b", "c", "d");
        assertNoSinksLeak(got);
    }

    @Test
    void ss2tfDestructuring() {
        String setup = "A = [0, 1; -2, -3]\nB = [0; 1]\nC = [1, 0]\nD = [0]\n";
        Map<String, Double> ref = solver.solve(setup
                + "CALL ss2tf(A, B, C, D : num, den)").variables();
        Map<String, Double> got = solver.solve(setup
                + "[num, den] = ss2tf(A, B, C, D)").variables();
        assertOutputsMatch(ref, got, "num", "den");
        assertNoSinksLeak(got);
    }

    @Test
    void svdDiscardWithTilde() {
        String setup = "A = [2, 0; 0, 3]\n";
        Map<String, Double> ref = solver.solve(setup
                + "CALL svd(A : U[1:2,1:2], S[1:2,1:2], V[1:2,1:2])").variables();
        Map<String, Double> got = solver.solve(setup
                + "[~, ~, V] = svd(A)").variables();
        assertOutputsMatch(ref, got, "v");
        // U and S were discarded: they must not appear at all.
        assertFalse(got.keySet().stream().anyMatch(k -> k.toLowerCase().startsWith("u[")),
                "discarded U surfaced: " + got.keySet());
        assertNoSinksLeak(got);
    }

    @Test
    void tf2ssPartialTrailingOmission() {
        String setup = "num = [0, 0, 1]\nden = [1, 3, 2]\n";
        Map<String, Double> ref = solver.solve(setup
                + "CALL tf2ss(num, den : A[1:2,1:2], B[1:2], C[1:2], D)").variables();
        Map<String, Double> got = solver.solve(setup
                + "[A, B] = tf2ss(num, den)").variables();
        assertOutputsMatch(ref, got, "a", "b");
        // C and D were omitted (trailing): they must not appear.
        assertFalse(got.keySet().stream().anyMatch(k -> k.toLowerCase().startsWith("c[")),
                "omitted C surfaced: " + got.keySet());
        assertFalse(got.containsKey("d"), "omitted D surfaced");
        assertNoSinksLeak(got);
    }

    @Test
    void midListTildeOnTwoOutput() {
        String setup = "num = [0, 1]\nden = [1, 1]\nomega = [1, 10, 100]\n";
        Map<String, Double> ref = solver.solve(setup
                + "CALL bode(num, den, omega : mag, phase)").variables();
        Map<String, Double> got = solver.solve(setup
                + "[mag, ~] = bode(num, den, omega)").variables();
        assertOutputsMatch(ref, got, "mag");
        assertFalse(got.keySet().stream().anyMatch(k -> k.toLowerCase().startsWith("phase[")),
                "discarded phase surfaced: " + got.keySet());
        assertNoSinksLeak(got);
    }

    @Test
    void colonFormPartialOmissionAlsoWorks() {
        // Trailing omission applies to the CALL colon form too, not just destructuring.
        String setup = "num = [0, 0, 1]\nden = [1, 3, 2]\n";
        Map<String, Double> ref = solver.solve(setup
                + "CALL tf2ss(num, den : A[1:2,1:2], B[1:2], C[1:2], D)").variables();
        Map<String, Double> got = solver.solve(setup
                + "CALL tf2ss(num, den : A, B)").variables();
        assertOutputsMatch(ref, got, "a", "b");
        assertNoSinksLeak(got);
    }

    @Test
    void userMultiOutputFunctionStillWorks() {
        // Regression: the destructuring grammar change must not break user FUNCTIONs.
        String source = """
                FUNCTION [q, r] = DivMod(a, b)
                  q := trunc(a / b)
                  r := a - q * b
                END

                [whole, rem] = DivMod(17, 5)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(3.0, result.variables().get("whole"), 1e-9);
        assertEquals(2.0, result.variables().get("rem"), 1e-9);
    }

    @Test
    void userFunctionWithTildeDiscard() {
        String source = """
                FUNCTION [q, r] = DivMod(a, b)
                  q := trunc(a / b)
                  r := a - q * b
                END

                [whole, ~] = DivMod(17, 5)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(3.0, result.variables().get("whole"), 1e-9);
        assertFalse(result.variables().containsKey("r"), "discarded remainder surfaced");
        assertNoSinksLeak(result.variables());
    }
}
