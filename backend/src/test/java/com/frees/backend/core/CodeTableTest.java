package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 1: tables defined in the editor text via a TABLE ... END block,
 * callable as interpolation functions just like Graph Digitizer tables.
 */
class CodeTableTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void oneDimensionalTableInterpolates() {
        String text = """
                TABLE fanPressure(rpm)
                  // rpm   dP
                  1000     120
                  2000     310
                  3000     560
                END
                dP = fanPressure(2500)
                """;
        var result = solver.solve(text);
        // midpoint of (2000,310)-(3000,560) -> 435
        assertEquals(435.0, result.variables().get("dP"), 1e-9);
    }

    @Test
    void mixedCaseCallResolvesToTable() {
        String text = """
                TABLE fanPressure(rpm)
                  1000   100
                  2000   200
                END
                dP = FANPRESSURE(1500)
                """;
        var result = solver.solve(text);
        assertEquals(150.0, result.variables().get("dP"), 1e-9);
    }

    @Test
    void negativeArgumentsAreSupported() {
        String text = """
                TABLE shift(x)
                  -50   -10
                   50    30
                END
                y = shift(0)
                """;
        var result = solver.solve(text);
        assertEquals(10.0, result.variables().get("y"), 1e-9);
    }

    @Test
    void clampsOutsideRange() {
        String text = """
                TABLE pumpHead(q)
                  0      50
                  10     30
                END
                h1 = pumpHead(-5)
                h2 = pumpHead(999)
                """;
        var result = solver.solve(text);
        assertEquals(50.0, result.variables().get("h1"), 1e-9);
        assertEquals(30.0, result.variables().get("h2"), 1e-9);
    }

    @Test
    void logAxesInterpolateAsPowerLaw() {
        String text = """
                TABLE flow(re) XLOG YLOG
                  10      10
                  1000    1000
                END
                y = flow(100)
                """;
        var result = solver.solve(text);
        assertEquals(100.0, result.variables().get("y"), 1e-9);
    }

    @Test
    void twoDimensionalCurveFamilyInterpolates() {
        // T=100 -> U = Re ; T=200 -> U = 3*Re ; at T=150, Re=5 -> (5+15)/2 = 10
        String text = """
                TABLE htc(re : t = 100, 200)
                  0    0    0
                  10   10   30
                END
                U = htc(5, 150)
                """;
        var result = solver.solve(text);
        assertEquals(10.0, result.variables().get("U"), 1e-9);
    }

    @Test
    void tableFunctionParticipatesInNewtonSolve() {
        String text = """
                TABLE htc(re)
                  1000   50
                  2000   80
                  4000   120
                END
                Re = 2000
                A = 2.5
                U = htc(Re)
                Q = U * A
                """;
        var result = solver.solve(text);
        assertEquals(200.0, result.variables().get("Q"), 1e-9);
    }

    @Test
    void checkAcceptsCodeTable() {
        String text = """
                TABLE htc(re)
                  1000   50
                  2000   80
                END
                Re = 1500
                U = htc(Re)
                """;
        var check = solver.check(text);
        assertTrue(check.solvable(), check.message());
    }
}
