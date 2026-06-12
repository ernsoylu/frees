package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IntegralSolverTest {

    @Test
    void rejectsInvalidIntegralArgsCount() {
        EquationSystemSolver solver = new EquationSystemSolver();
        assertThrows(SolverException.class, () ->
                solver.solve("F = Integral(t^2, t, 0)"));
    }

    @Test
    void rejectsInvalidIntegrationVariableType() {
        EquationSystemSolver solver = new EquationSystemSolver();
        assertThrows(SolverException.class, () ->
                solver.solve("F = Integral(t^2, 5, 0, 1)"));
    }

    @Test
    void rejectsNonConstantStep() {
        EquationSystemSolver solver = new EquationSystemSolver();
        assertThrows(SolverException.class, () ->
                solver.solve("F = Integral(t^2, t, 0, 1, h)"));
    }

    @Test
    void structuralViewExcludesIntegralsCorrectly() {
        Equation eq = new Equation(new Expr.Var("F"), new Expr.Call("integral",
                List.of(new Expr.BinOp('*', new Expr.Num(2), new Expr.Var("t")),
                        new Expr.Var("t"), new Expr.Num(0), new Expr.Num(1))), "F=Integral(2*t,t,0,1)");
        var list = IntegralSolver.extract(List.of(eq), Map.of());
        assertEquals(1, list.size());
        assertTrue(list.get(0).constantLimits());
        assertEquals(0.0, list.get(0).lower());
        assertEquals(1.0, list.get(0).upper());
    }

    @Test
    void integrateZeroSpan() {
        double val = IntegralSolver.integrate((t, f) -> t, 1.0, 1.0, 0.0, System.nanoTime() + 1000000000L);
        assertEquals(0.0, val);
    }

    @Test
    void rejectsNestedSelfReference() {
        EquationSystemSolver solver = new EquationSystemSolver();
        assertThrows(SolverException.class, () ->
                solver.solve("F = Integral(F, t, 0, b)\nb = 2"));
    }

    @Test
    void rejectsMissingExplicitDefinition() {
        EquationSystemSolver solver = new EquationSystemSolver();
        // x depends on t, but is not explicitly defined in the form x = ...
        // Circular dependency x = y + t and y = x involving integration variable t
        // forces the expanding check to trigger a SolverException
        assertThrows(SolverException.class, () ->
                solver.solve("F = Integral(x, t, 0, b)\nx = y + t\ny = x\nF = 9"));
    }

    @Test
    void integrationExceedsDeadline() {
        assertThrows(SolverException.class, () ->
                IntegralSolver.integrate((t, f) -> {
                    try { Thread.sleep(10); } catch(Exception e) {}
                    return t;
                }, 0.0, 1.0, 0.0, System.nanoTime() - 1000L));
    }
}
