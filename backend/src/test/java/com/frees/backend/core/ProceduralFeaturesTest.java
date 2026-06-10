package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Epic 3.4 / 3.5 milestone tests: FUNCTION, PROCEDURE, MODULE, IF-THEN-ELSE, REPEAT-UNTIL.
 *
 * Milestone 3: "Working software that solves arrays using DUPLICATE loops
 * and calculates factorial using internal Procedures."
 */
class ProceduralFeaturesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    // ── FUNCTION tests ────────────────────────────────────────────────────────

    @Test
    void functionFactorial() {
        String source = """
                FUNCTION Factorial(n)
                  IF n <= 1 THEN
                    Factorial := 1
                  ELSE
                    Factorial := n * Factorial(n-1)
                  END
                END

                y = Factorial(5)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(120.0, result.variables().get("y"), 1e-9, "5! should be 120");
    }

    @Test
    void functionSimpleConditional() {
        String source = """
                FUNCTION AbsVal(x)
                  IF x >= 0 THEN
                    AbsVal := x
                  ELSE
                    AbsVal := -x
                  END
                END

                a = AbsVal(-7)
                b = AbsVal(3)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(7.0, result.variables().get("a"), 1e-9);
        assertEquals(3.0, result.variables().get("b"), 1e-9);
    }

    @Test
    void functionRepeatUntil() {
        // Iterative sum: sum 1..n using REPEAT-UNTIL
        String source = """
                FUNCTION SumN(n)
                  i := 1
                  s := 0
                  REPEAT
                    s := s + i
                    i := i + 1
                  UNTIL i > n
                  SumN := s
                END

                result = SumN(10)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        // Sum 1..10 = 55
        assertEquals(55.0, result.variables().get("result"), 1e-9);
    }

    @Test
    void functionUsedInExpression() {
        String source = """
                FUNCTION Square(x)
                  Square := x * x
                END

                z = Square(4) + Square(3)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        // 4^2 + 3^2 = 16 + 9 = 25
        assertEquals(25.0, result.variables().get("z"), 1e-9);
    }

    // ── PROCEDURE tests ───────────────────────────────────────────────────────

    @Test
    void procedureBasicOutputs() {
        String source = """
                PROCEDURE Swap(a, b : c, d)
                  c := b
                  d := a
                END

                CALL Swap(3, 7 : x, y)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(7.0, result.variables().get("x"), 1e-9);
        assertEquals(3.0, result.variables().get("y"), 1e-9);
    }

    @Test
    void procedureWithConditional() {
        String source = """
                PROCEDURE MinMax(a, b : lo, hi)
                  IF a < b THEN
                    lo := a
                    hi := b
                  ELSE
                    lo := b
                    hi := a
                  END
                END

                CALL MinMax(8, 3 : small, large)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(3.0, result.variables().get("small"), 1e-9);
        assertEquals(8.0, result.variables().get("large"), 1e-9);
    }

    // ── MODULE tests ──────────────────────────────────────────────────────────

    @Test
    void moduleBasicGrafting() {
        // MODULE with one equation; calling it twice creates two namespaced copies.
        String source = """
                MODULE Doubler(x : y)
                  y = 2 * x
                END

                CALL Doubler(5 : a)
                CALL Doubler(10 : b)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(10.0, result.variables().get("a"), 1e-9);
        assertEquals(20.0, result.variables().get("b"), 1e-9);
    }

    @Test
    void moduleSolvesInternalEquations() {
        // MODULE with two coupled equations
        String source = """
                MODULE Linear(m, b : y)
                  y = m * x_int + b
                  x_int = 3
                END

                CALL Linear(2, 1 : result)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        // y = 2*3 + 1 = 7
        assertEquals(7.0, result.variables().get("result"), 1e-9);
    }

    // ── Milestone 3 verification ──────────────────────────────────────────────

    @Test
    void milestone3FactorialAndArrays() {
        // DUPLICATE loop (already proven) + FUNCTION factorial (this epic)
        String source = """
                FUNCTION Factorial(n)
                  IF n <= 1 THEN
                    Factorial := 1
                  ELSE
                    Factorial := n * Factorial(n-1)
                  END
                END

                DUPLICATE i = 1, 5
                  f[i] = Factorial(i)
                END
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(1.0,   result.variables().get("f[1]"), 1e-9, "1! = 1");
        assertEquals(2.0,   result.variables().get("f[2]"), 1e-9, "2! = 2");
        assertEquals(6.0,   result.variables().get("f[3]"), 1e-9, "3! = 6");
        assertEquals(24.0,  result.variables().get("f[4]"), 1e-9, "4! = 24");
        assertEquals(120.0, result.variables().get("f[5]"), 1e-9, "5! = 120");
    }
}
