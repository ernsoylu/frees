package com.frees.backend.core;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IntegralSolverTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @ParameterizedTest
    @ValueSource(strings = {
            // wrong argument count
            "F = Integral(t^2, t, 0)",
            // integration variable is not a variable
            "F = Integral(t^2, 5, 0, 1)",
            // non-constant step size
            "F = Integral(t^2, t, 0, 1, h)",
            // integral with variable limits referencing its own result
            "F = Integral(F, t, 0, b)\nb = 2",
            // x depends on t through a circular chain with no explicit definition
            "F = Integral(x, t, 0, b)\nx = y + t\ny = x\nF = 9"
    })
    void rejectsMalformedIntegrals(String source) {
        assertThrows(SolverException.class, () -> solver.solve(source));
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
    void integrationExceedsDeadline() {
        long expiredDeadline = System.nanoTime() - 1000L;
        assertThrows(SolverException.class, () ->
                IntegralSolver.integrate((t, f) -> t, 0.0, 1.0, 0.0, expiredDeadline));
    }

    @Test
    void solvesIntegralNestedInExpression() {
        // A = 1 + integral of 2t over [0,1] = 1 + 1 = 2
        var result = solver.solve("A = 1 + Integral(2*t, t, 0, 1)");
        assertEquals(2.0, result.variables().get("a"), 1e-6);
    }

    @Test
    void solvesInitialValueProblemWithNestedIntegral() {
        // dy/dt = y*cos(t), y(0) = 1  =>  y(t) = exp(sin(t))
        var result = solver.solve("y = y0 + Integral(dydt, t, 0, 5)\n"
                + "dydt = y * cos(t)\n"
                + "y0 = 1");
        assertEquals(Math.exp(Math.sin(5.0)), result.variables().get("y"), 1e-3);
    }

    @Test
    void checkAcceptsIntegralNestedInExpression() {
        var check = solver.check("y = y0 + Integral(dydt, t, 0, 5)\n"
                + "dydt = y * cos(t)\n"
                + "y0 = 1");
        assertTrue(check.solvable(), check.message());
    }

    @Test
    void hoistNestedLeavesAloneFormUntouched() {
        Equation alone = new Equation(new Expr.Var("F"), new Expr.Call("integral",
                List.of(new Expr.Var("t"), new Expr.Var("t"), new Expr.Num(0), new Expr.Num(1))),
                "F=Integral(t,t,0,1)");
        List<Equation> hoisted = IntegralSolver.hoistNested(List.of(alone));
        assertEquals(List.of(alone), hoisted);
    }

    @Test
    void hoistNestedIntroducesSyntheticEquation() {
        // y = 1 + Integral(t, t, 0, 1) becomes y = 1 + integral_1 plus
        // integral_1 = Integral(t, t, 0, 1)
        Expr call = new Expr.Call("integral",
                List.of(new Expr.Var("t"), new Expr.Var("t"), new Expr.Num(0), new Expr.Num(1)));
        Equation nested = new Equation(new Expr.Var("y"),
                new Expr.BinOp('+', new Expr.Num(1), call), "y=1+Integral(t,t,0,1)");
        List<Equation> hoisted = IntegralSolver.hoistNested(List.of(nested));
        assertEquals(2, hoisted.size());
        assertEquals(new Equation(new Expr.Var("y"),
                new Expr.BinOp('+', new Expr.Num(1), new Expr.Var("integral_1")),
                "y=1+Integral(t,t,0,1)"), hoisted.get(0));
        assertEquals(new Equation(new Expr.Var("integral_1"), call,
                "y=1+Integral(t,t,0,1)"), hoisted.get(1));
    }
}
