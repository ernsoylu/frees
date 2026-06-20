package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Epic 3.4 / 3.5 milestone tests: FUNCTION, PROCEDURE, MODULE, IF-THEN-ELSE, REPEAT-UNTIL.
 *
 * Milestone 3: "Working software that solves arrays using FOR loops
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
        // Iterative sum: sum 1:n using REPEAT-UNTIL
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
        // Sum 1:10 = 55
        assertEquals(55.0, result.variables().get("result"), 1e-9);
    }

    @Test
    void functionWhileLoop() {
        // Iterative sum: sum 1:n using WHILE-DO
        String source = """
                FUNCTION SumWhile(n)
                  i := 1
                  s := 0
                  WHILE i <= n DO
                    s := s + i
                    i := i + 1
                  END
                  SumWhile := s
                END

                result = SumWhile(10)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        // Sum 1:10 = 55
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

    // ── MATLAB-style multi-output FUNCTION tests ────────────────────────────────

    @Test
    void multiOutputFunctionBasic() {
        // FUNCTION [outs] = name(...) is a procedure consumed MATLAB-style with
        // [a, b] = name(...). Outputs are assigned by name in the body via :=.
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
    void multiOutputFunctionWithConditional() {
        String source = """
                FUNCTION [lo, hi] = Order(a, b)
                  IF a < b THEN
                    lo := a
                    hi := b
                  ELSE
                    lo := b
                    hi := a
                  END
                END

                [small, large] = Order(8, 3)
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

    @Test
    void moduleNamespacesFunctionCallsAndNegation() {
        // The module body mixes negation and a function call; both must be
        // rewritten into the instance namespace.
        String source = """
                MODULE Shift(x : y)
                  buf = -x + sin(0)
                  y = buf + 1
                END

                CALL Shift(4 : out)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(-3.0, result.variables().get("out"), 1e-9);
    }

    // ── Milestone 3 verification ──────────────────────────────────────────────

    @Test
    void milestone3FactorialAndArrays() {
        // FOR loop (already proven) + FUNCTION factorial (this epic)
        String source = """
                FUNCTION Factorial(n)
                  IF n <= 1 THEN
                    Factorial := 1
                  ELSE
                    Factorial := n * Factorial(n-1)
                  END
                END

                FOR i = 1 TO 5
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

    @Test
    void nestedForInsideFunctionAccumulatesCorrectly() {
        // Nested FOR inside a FUNCTION body must execute (previously the inner
        // loop was silently dropped). DoubleSum(3) = sum_{i,j=1..3} i*j = 36.
        String source = """
                FUNCTION DoubleSum(n)
                  s := 0
                  FOR i = 1 TO n
                    FOR j = 1 TO n
                      s = s + i * j
                    END
                  END
                  DoubleSum := s
                END

                x = DoubleSum(3)
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        assertEquals(36.0, result.variables().get("x"), 1e-9);
    }

    @Test
    void callInsideProcedureForIsRejectedNotSilentlyDropped() {
        // A CALL inside a FOR within a FUNCTION has no procedural meaning; it must
        // raise a clear error rather than being silently skipped.
        String source = """
                FUNCTION Bad(n)
                  FOR i = 1 TO n
                    CALL pole(i, i : a, b)
                  END
                  Bad := 1
                END

                y = Bad(2)
                """;
        Exception ex = assertThrows(Exception.class, () -> solver.solve(source));
        assertTrue(ex.getMessage() != null && ex.getMessage().contains("CALL"),
                "expected a clear 'CALL not supported' error, got: " + ex.getMessage());
    }
}
