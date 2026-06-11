package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Story 4.4: Integral(f, t, a, b) with adaptive predictor-corrector. */
class IntegralTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void integratesPolynomialDirectly() {
        // ∫ t^2 dt from 0 to 1 = 1/3
        EquationSystemSolver.Result result = solver.solve("F = Integral(t^2, t, 0, 1)");
        assertEquals(1.0 / 3.0, result.variables().get("F"), 1e-3);
        // The reported state is at the end of integration: t = b.
        assertEquals(1.0, result.variables().get("t"), 1e-12);
    }

    @Test
    void integratesSine() {
        // ∫ sin(t) dt from 0 to pi = 2 (note: f and F would be the same
        // case-insensitive variable, so the result is named Q).
        EquationSystemSolver.Result result =
                solver.solve("f = sin(t)\nQ = Integral(f, t, 0, 3.141592653589793)");
        assertEquals(2.0, result.variables().get("Q"), 1e-3);
    }

    @Test
    void solvesSubsystemAtEveryStep() {
        // x = 2t, so ∫ x^2 dt from 0 to 1 = ∫ 4t^2 dt = 4/3; final x = 2.
        EquationSystemSolver.Result result =
                solver.solve("x = 2*t\nF = Integral(x^2, t, 0, 1)");
        assertEquals(4.0 / 3.0, result.variables().get("F"), 2e-3);
        assertEquals(2.0, result.variables().get("x"), 1e-9);
    }

    @Test
    void solvesInitialValueProblem() {
        // dF/dt = -0.5*(F + 1), F(0) = 0  =>  F(t) = e^(-t/2) - 1
        EquationSystemSolver.Result result =
                solver.solve("F = Integral(-0.5*(F + 1), t, 0, 2)");
        assertEquals(Math.exp(-1.0) - 1.0, result.variables().get("F"), 1e-3);
    }

    @Test
    void supportsFixedStepSize() {
        EquationSystemSolver.Result result =
                solver.solve("F = Integral(t, t, 0, 2, 0.01)");
        assertEquals(2.0, result.variables().get("F"), 1e-6);
    }

    @Test
    void checkAcceptsIntegralSystems() {
        EquationSystemSolver.CheckResult check =
                solver.check("f = sin(t)\nQ = Integral(f, t, 0, 1)");
        assertTrue(check.solvable(), check.message());
    }

    @Test
    void checkRejectsNestedIntegralUsage() {
        EquationSystemSolver.CheckResult check =
                solver.check("F = 2*Integral(t, t, 0, 1)");
        assertFalse(check.solvable());
        assertTrue(check.message().contains("alone on one side"), check.message());
    }

    @Test
    void rejectsNonConstantLimits() {
        SolverException e = assertThrows(SolverException.class,
                () -> solver.solve("F = Integral(t, t, 0, b)"));
        assertTrue(e.getMessage().contains("numeric constant"), e.getMessage());
    }

    @Test
    void rejectsIntegralInComplexMode() {
        SolverSettings complex = new SolverSettings(250, 1e-12, 1e-15, 3600.0, true);
        SolverException e = assertThrows(SolverException.class,
                () -> solver.solve("F = Integral(t, t, 0, 1)", complex, Map.of()));
        assertTrue(e.getMessage().contains("complex mode"), e.getMessage());
    }
}
