package com.frees.backend.core;

import com.frees.backend.ast.ProcDef;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Epic 8 Story 8.8: Curve Table functions — the table name is callable from
 * equations, evaluated by interpolating the tabulated curves.
 */
class CurveFunctionTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static Map<String, ProcDef> singleCurve(String name, boolean xLog, boolean yLog,
                                                    double[] xs, double[] ys) {
        return Map.of(name, new ProcDef.FunctionTableDef(name, List.of("re"), xLog, yLog,
                List.of(new ProcDef.Curve(null, xs, ys))));
    }

    private static Map<String, ProcDef> family(String name) {
        // U(Re) lines at two temperatures: T=100 -> U = Re, T=200 -> U = 3*Re
        return Map.of(name, new ProcDef.FunctionTableDef(name, List.of("re", "t"), false, false,
                List.of(
                        new ProcDef.Curve(100.0, new double[]{0, 10}, new double[]{0, 10}),
                        new ProcDef.Curve(200.0, new double[]{0, 10}, new double[]{0, 30}))));
    }

    @Test
    void interpolatesSingleCurveLinearly() {
        var defs = singleCurve("htc", false, false,
                new double[]{1000, 2000, 4000}, new double[]{50, 80, 120});
        var result = solver.solve("Re = 3000\nU = htc(Re)", SolverSettings.DEFAULTS,
                Map.of(), defs);
        assertEquals(100.0, result.variables().get("U"), 1e-9);
    }

    @Test
    void adjustsOutofRangeGuessesToRangeAverage() {
        var defs = singleCurve("htc", false, false,
                new double[]{1000, 2000, 4000}, new double[]{50, 80, 120});
        // Without guess adjustment, a default guess of 1.0 (or 0.0) clamps to 1000.0,
        // has a derivative of 0, and Newton fails/stalls.
        // With guess adjustment, Re's guess of 0.0 becomes (1000 + 4000)/2 = 2500.0,
        // and Newton converges to 3000.0.
        var result = solver.solve("U = 100\nU = htc(Re)", SolverSettings.DEFAULTS,
                Map.of("re", new VariableSpec("re", 0.0, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY)), defs);
        assertEquals(3000.0, result.variables().get("Re"), 1e-6);
    }

    @Test
    void solvesInverseProblemThroughNewton() {
        // The unknown is the argument: which Re gives U = 100?
        var defs = singleCurve("htc", false, false,
                new double[]{1000, 2000, 4000}, new double[]{50, 80, 120});
        var result = solver.solve("U = 100\nU = htc(Re)", SolverSettings.DEFAULTS,
                Map.of("re", new VariableSpec("re", 2500, 1000, 4000)), defs);
        assertEquals(3000.0, result.variables().get("Re"), 1e-6);
    }

    @Test
    void clampsOutsideTheTabulatedRange() {
        var defs = singleCurve("htc", false, false,
                new double[]{1000, 2000}, new double[]{50, 80});
        var result = solver.solve("U = htc(99000)", SolverSettings.DEFAULTS, Map.of(), defs);
        assertEquals(80.0, result.variables().get("U"), 1e-9);
        result = solver.solve("U = htc(1)", SolverSettings.DEFAULTS, Map.of(), defs);
        assertEquals(50.0, result.variables().get("U"), 1e-9);
    }

    @Test
    void logAxesInterpolateAsPowerLaws() {
        // A straight segment on log-log paper is y = x: between (10, 10) and
        // (1000, 1000), the midpoint in log space x = 100 must give exactly
        // y = 100 (linear interpolation would give 505).
        var defs = singleCurve("flow", true, true,
                new double[]{10, 1000}, new double[]{10, 1000});
        var result = solver.solve("y = flow(100)", SolverSettings.DEFAULTS, Map.of(), defs);
        assertEquals(100.0, result.variables().get("y"), 1e-9);
    }

    @Test
    void interpolatesAcrossTheCurveFamilyParameter() {
        // T=150 sits halfway between the T=100 (U=Re) and T=200 (U=3Re)
        // curves: U(5, 150) = (5 + 15) / 2 = 10.
        var result = solver.solve("U = htc(5, 150)", SolverSettings.DEFAULTS,
                Map.of(), family("htc"));
        assertEquals(10.0, result.variables().get("U"), 1e-9);
    }

    @Test
    void familyParameterClampsToOuterCurves() {
        var result = solver.solve("U = htc(5, 50)", SolverSettings.DEFAULTS,
                Map.of(), family("htc"));
        assertEquals(5.0, result.variables().get("U"), 1e-9);
        result = solver.solve("U = htc(5, 999)", SolverSettings.DEFAULTS,
                Map.of(), family("htc"));
        assertEquals(15.0, result.variables().get("U"), 1e-9);
    }

    @Test
    void checkAcceptsCurveFunctionCalls() {
        var defs = singleCurve("htc", false, false,
                new double[]{1000, 2000}, new double[]{50, 80});
        var check = solver.check("Re = 1500\nU = htc(Re)", false, defs);
        assertTrue(check.solvable(), check.message());
    }

    @Test
    void curveFunctionsWorkInsideLargerSystems() {
        // The curve function participates in Newton residuals like any
        // intrinsic: Q = U*A with U looked up from the chart.
        var defs = singleCurve("htc", false, false,
                new double[]{1000, 2000, 4000}, new double[]{50, 80, 120});
        var result = solver.solve("""
                Re = 2000
                A = 2.5
                U = htc(Re)
                Q = U * A
                """, SolverSettings.DEFAULTS, Map.of(), defs);
        assertEquals(200.0, result.variables().get("Q"), 1e-9);
    }
}
