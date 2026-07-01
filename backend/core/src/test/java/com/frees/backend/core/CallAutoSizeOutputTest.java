package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Guards CALL output auto-sizing: a bare output name (e.g. {@code lambda}) must produce exactly
 * the same solved variables as the equivalent explicitly-sized slice ({@code lambda[1:n]}). Each
 * case solves both forms and compares, so a wrong size rule in
 * {@code EquationParser.autoSizeCallOutputs} fails loudly rather than drifting.
 */
class CallAutoSizeOutputTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /** Assert the named output bases resolve identically between a bare-output and an explicit-slice solve. */
    private void assertBareMatchesExplicit(String setup, String bareCall, String explicitCall, String... outputBases) {
        EquationSystemSolver.Result bare = solver.solve(setup + bareCall);
        EquationSystemSolver.Result explicit = solver.solve(setup + explicitCall);
        Map<String, Double> e = explicit.variables();
        Map<String, Double> b = bare.variables();
        boolean comparedAny = false;
        for (String base : outputBases) {
            String lo = base.toLowerCase();
            for (Map.Entry<String, Double> entry : e.entrySet()) {
                String key = entry.getKey();
                String klo = key.toLowerCase();
                if (klo.equals(lo) || klo.startsWith(lo + "[")) {
                    assertTrue(b.containsKey(key), "bare form missing " + key);
                    assertEquals(entry.getValue(), b.get(key), 1e-8, "mismatch at " + key);
                    comparedAny = true;
                }
            }
        }
        assertTrue(comparedAny, "no output variables were compared for " + bareCall);
    }

    @Test
    void ss2tfNumDenSizedFromStateMatrix() {
        String setup = "A = [0, 1; -2, -3]\nB = [0; 1]\nC = [1, 0]\nD = [0]\n";
        assertBareMatchesExplicit(setup,
                "CALL ss2tf(A, B, C, D : num, den)",
                "CALL ss2tf(A, B, C, D : num[1:3], den[1:3])",
                "num", "den");
    }

    @Test
    void eigenvaluesSizedFromMatrixDimension() {
        String setup = "A = [2, 0; 0, 3]\n";
        assertBareMatchesExplicit(setup,
                "CALL Eigenvalues(A : lambda)",
                "CALL Eigenvalues(A : lambda[1:2])",
                "lambda");
    }

    @Test
    void tf2ssSizedFromDenominatorDegree() {
        String setup = "num = [0, 0, 1]\nden = [1, 3, 2]\n";
        assertBareMatchesExplicit(setup,
                "CALL tf2ss(num, den : Aout, Bout, Cout, Dout)",
                "CALL tf2ss(num, den : Aout[1:2,1:2], Bout[1:2], Cout[1:2], Dout)",
                "aout", "bout", "cout", "dout");
    }

    @Test
    void residueSizedFromDenominatorDegree() {
        String setup = "num = [1]\nden = [1, 3, 2]\n";
        assertBareMatchesExplicit(setup,
                "CALL residue(num, den : rr, ri, pr, pi, k)",
                "CALL residue(num, den : rr[1:2], ri[1:2], pr[1:2], pi[1:2], k)",
                "rr", "ri", "pr", "pi", "k");
    }

    @Test
    void seriesSizedFromCombinedDegrees() {
        String setup = "num1 = [0, 1]\nden1 = [1, 1]\nnum2 = [0, 1]\nden2 = [1, 2]\n";
        assertBareMatchesExplicit(setup,
                "CALL series(num1, den1, num2, den2 : num, den)",
                "CALL series(num1, den1, num2, den2 : num[1:3], den[1:3])",
                "num", "den");
    }

    @Test
    void c2dSizedFromDenominatorLength() {
        String setup = "num = [0, 1]\nden = [1, 1]\nTs = 0.1\n";
        assertBareMatchesExplicit(setup,
                "CALL c2d(num, den, Ts, 'tustin' : numz, denz)",
                "CALL c2d(num, den, Ts, 'tustin' : numz[1:2], denz[1:2])",
                "numz", "denz");
    }

    @Test
    void bodeSizedFromOmegaLength() {
        String setup = "num = [0, 1]\nden = [1, 1]\nomega = [1, 10, 100]\n";
        assertBareMatchesExplicit(setup,
                "CALL bode(num, den, omega : mag, phase)",
                "CALL bode(num, den, omega : mag[1:3], phase[1:3])",
                "mag", "phase");
    }
}
