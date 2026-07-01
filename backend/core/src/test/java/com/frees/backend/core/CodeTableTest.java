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
    void interpolateNameLinearMatchesDirectCall() {
        // classic-solver-compatible Interpolate('table', x) == direct call table(x)
        String text = """
                TABLE flow(re)
                  0     0
                  100   100
                END
                y = Interpolate('flow', 50)
                """;
        var result = solver.solve(text);
        assertEquals(50.0, result.variables().get("y"), 1e-9);
    }

    @Test
    void interpolate2DNameMatchesCurveFamily() {
        // Interpolate2D('table', x, y) == table(x, y) curve-family bilinear
        String text = """
                TABLE htc(re : t = 100, 200)
                  0    0    0
                  10   10   30
                END
                U = Interpolate2D('htc', 5, 150)
                """;
        var result = solver.solve(text);
        assertEquals(10.0, result.variables().get("U"), 1e-9);
    }

    @Test
    void interpolate1CubicSplineThroughCollinearPointsIsLinear() {
        // A natural cubic spline through collinear points reproduces the line.
        String text = """
                TABLE lin(x)
                  0   0
                  1   2
                  2   4
                  3   6
                END
                y = Interpolate1('lin', 1.5)
                """;
        var result = solver.solve(text);
        assertEquals(3.0, result.variables().get("y"), 1e-9);
    }

    @Test
    void lookupCellAndRowCountAndRow() {
        String text = """
                TABLE g(x)
                  10   100
                  20   400
                  30   900
                END
                n = NLookupRows('g')
                c = Lookup('g', 2, 2)
                r = LookupRow('g', 1, 25)
                """;
        var result = solver.solve(text);
        assertEquals(3.0, result.variables().get("n"), 1e-9);   // 3 rows
        assertEquals(400.0, result.variables().get("c"), 1e-9); // row 2, col 2
        assertEquals(2.5, result.variables().get("r"), 1e-9);   // x=25 is halfway between rows 2 and 3
    }

    @Test
    void differentiateTableColumn() {
        // y = x^2 sampled; finite-difference slope between x=20 and x=30 is (900-400)/10 = 50
        String text = """
                TABLE g(x)
                  10   100
                  20   400
                  30   900
                END
                d = Differentiate('g', 2, 1, 25)
                """;
        var result = solver.solve(text);
        assertEquals(50.0, result.variables().get("d"), 1e-9);
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
