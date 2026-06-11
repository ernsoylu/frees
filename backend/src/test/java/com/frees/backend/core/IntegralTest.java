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
    void solvesVariableUpperLimit() {
        // ∫ 2t dt from 0 to b = b² = 9, so b = 3 (the root Newton reaches
        // from the default guess 1); t lands on the upper limit, as in EES.
        EquationSystemSolver.Result result =
                solver.solve("F = Integral(2*t, t, 0, b)\nF = 9");
        assertEquals(3.0, result.variables().get("b"), 1e-6);
        assertEquals(9.0, result.variables().get("F"), 1e-6);
        assertEquals(3.0, result.variables().get("t"), 1e-6);
    }

    @Test
    void variableLimitInlinesIntegrandDefinitions() {
        // The integrand g = 3*t^2 is defined by its own equation and must be
        // substituted into the quadrature; ∫ 3t² dt from 0 to b = b³ = 8.
        EquationSystemSolver.Result result =
                solver.solve("g = 3 * t^2\nF = Integral(g, t, 0, b)\nF = 8");
        assertEquals(2.0, result.variables().get("b"), 1e-6);
    }

    @Test
    void freeVariableLimitIsRejected() {
        // Nothing determines b: one more unknown than equations.
        assertThrows(SolverException.class,
                () -> solver.solve("F = Integral(t, t, 0, b)"));
    }

    @Test
    void adiabaticFlameTemperature() {
        // Methane combustion with polynomial c_p fits: the upper limit of the
        // sensible-enthalpy integrals is the unknown flame temperature,
        // closed by the energy balance.
        String source = """
                T_reactants = 298.15 [K]
                hf_ch4 = -74850
                hf_o2 = 0
                hf_n2 = 0
                hf_co2 = -393520
                hf_h2o = -241820
                H_reactants = 1 * hf_ch4 + 2 * hf_o2 + 7.52 * hf_n2
                dH_co2 = Integral(Cp_co2, T, 298.15, T_flame)
                dH_h2o = Integral(Cp_h2o, T, 298.15, T_flame)
                dH_n2 = Integral(Cp_n2, T, 298.15, T_flame)
                Cp_co2 = 22.26 + 5.981e-2 * T - 3.501e-5 * T^2 + 7.469e-9 * T^3
                Cp_h2o = 32.24 + 0.1923e-2 * T + 1.055e-5 * T^2 - 3.595e-9 * T^3
                Cp_n2 = 28.90 - 0.1571e-2 * T + 0.8081e-5 * T^2 - 2.873e-9 * T^3
                H_products = 1 * (hf_co2 + dH_co2) + 2 * (hf_h2o + dH_h2o) + 7.52 * (hf_n2 + dH_n2)
                H_reactants = H_products
                """;
        EquationSystemSolver.Result result = solver.solve(source);
        double tFlame = result.variables().get("T_flame");
        // The exact value depends only on these polynomial fits; what must
        // hold is a physically plausible temperature, a tightly closed
        // energy balance, and T landing on the upper limit.
        assertTrue(tFlame > 2000 && tFlame < 3000, "T_flame = " + tFlame);
        assertEquals(result.variables().get("H_reactants"),
                result.variables().get("H_products"), 1e-3);
        assertEquals(tFlame, result.variables().get("T"), 1e-9);

        EquationSystemSolver.CheckResult check = solver.check(source);
        assertTrue(check.solvable(), check.message());
    }

    @Test
    void rejectsIntegralInComplexMode() {
        SolverSettings complex = new SolverSettings(250, 1e-12, 1e-15, 3600.0, true);
        SolverException e = assertThrows(SolverException.class,
                () -> solver.solve("F = Integral(t, t, 0, 1)", complex, Map.of()));
        assertTrue(e.getMessage().contains("complex mode"), e.getMessage());
    }
}
