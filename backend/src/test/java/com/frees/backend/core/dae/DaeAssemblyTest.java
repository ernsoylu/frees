package com.frees.backend.core.dae;

import com.frees.backend.ast.DynamicSystem;
import com.frees.backend.ast.Equation;
import com.frees.backend.ast.Expr;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.core.ode.DynamicSolver;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Phase S1 — the DAE assembler (expanded scalar system → IDA residual) and the
 * finite-difference combined Jacobian. Pure Java: these run with or without the
 * SUNDIALS native library, exercising the frees-side half of the solver core.
 */
class DaeAssemblyTest {

    private static DynamicSolver solverFor(DynamicSystem ds) {
        // Seeding AlgebraicSolve is irrelevant here (assembleDae try/catches it);
        // return empty so seeds fall back to zero and we test residuals explicitly.
        DynamicSolver.AlgebraicSolve algebraic = (ordinary, pinned, warm) -> Map.of();
        return new DynamicSolver(ds, Map.of(), Map.<String, ProcDef>of(),
                algebraic, System.nanoTime() + 60_000_000_000L);
    }

    private static DynamicSystem.Options idaOptions() {
        return new DynamicSystem.Options("ida", "t", 0.0, 1.0, 5, null, 1e-8, 1e-8, null);
    }

    @Test
    void assemblesSingleStateResidual() {
        // der(x) = -x ; x(0)=1
        Equation der = new Equation(
                new Expr.Call("der", List.of(new Expr.Var("x"))),
                new Expr.Neg(new Expr.Var("x")), "der(x)=-x");
        DynamicSystem ds = new DynamicSystem("decay", idaOptions(),
                List.of(der), List.of(),
                List.of(new DynamicSystem.InitialCondition("x", List.of(), new Expr.Num(1.0))),
                List.of(), "src");

        DaeAssembly dae = solverFor(ds).assembleDae();
        assertEquals(1, dae.n());
        assertEquals(List.of("x"), dae.variables());
        assertArrayEquals(new double[] {1.0}, dae.id());
        assertEquals(1.0, dae.y0()[0], 1e-12);

        double[] res = new double[1];
        // consistent: yp = -x  -> residual 0
        dae.residual().eval(0.0, new double[] {1.0}, new double[] {-1.0}, res);
        assertEquals(0.0, res[0], 1e-12);
        // inconsistent: yp = 0  -> residual = 0 - (-1) = 1
        dae.residual().eval(0.0, new double[] {1.0}, new double[] {0.0}, res);
        assertEquals(1.0, res[0], 1e-12);
    }

    @Test
    void assemblesStateWithAuxiliaryAndSparsity() {
        // der(x) = -x + a ; a = 2 x ; x(0)=1
        Equation der = new Equation(
                new Expr.Call("der", List.of(new Expr.Var("x"))),
                new Expr.BinOp('+', new Expr.Neg(new Expr.Var("x")), new Expr.Var("a")),
                "der(x)=-x+a");
        Equation aux = new Equation(new Expr.Var("a"),
                new Expr.BinOp('*', new Expr.Num(2.0), new Expr.Var("x")), "a=2x");
        DynamicSystem ds = new DynamicSystem("coupled", idaOptions(),
                List.of(der, aux), List.of(),
                List.of(new DynamicSystem.InitialCondition("x", List.of(), new Expr.Num(1.0))),
                List.of(), "src");

        DaeAssembly dae = solverFor(ds).assembleDae();
        assertEquals(2, dae.n());
        assertEquals(List.of("x", "a"), dae.variables());
        assertEquals(List.of("x"), dae.states());
        assertEquals(List.of("a"), dae.aux());
        assertArrayEquals(new double[] {1.0, 0.0}, dae.id()); // x differential, a algebraic

        // both equations depend on both columns
        assertArrayEquals(new int[] {0, 1}, dae.sparsity()[0]);
        assertArrayEquals(new int[] {0, 1}, dae.sparsity()[1]);

        // consistent state x=1,a=2,der_x = -1+2 = 1
        double[] res = new double[2];
        dae.residual().eval(0.0, new double[] {1.0, 2.0}, new double[] {1.0, 0.0}, res);
        assertArrayEquals(new double[] {0.0, 0.0}, res, 1e-12);
    }

    @Test
    void coloredJacobianEqualsDense() {
        // S2: the colored finite-difference Jacobian (fewer residual evals) must
        // equal the plain dense one entry-for-entry on the sparse pattern.
        DaeResidual res = (t, y, yp, r) -> {
            r[0] = yp[0] + y[0] - 0.5 * y[1];
            r[1] = y[1] - 2.0 * y[0] + 0.1 * y[2];
            r[2] = y[2] - y[1] + 3.0 * y[0];
        };
        int[][] sparsityRows = {{0, 1}, {0, 1, 2}, {0, 1, 2}};
        int[][] colRows = {{0, 1, 2}, {0, 1, 2}, {1, 2}};
        int[] color = DaeJacobian.colorColumns(sparsityRows, 3);
        double cj = 7.0;
        double[] y = {1.0, 2.0, 3.0};
        double[] yp = {0.5, 0.0, 0.0};
        double[][] dense = DaeJacobian.dense(res, 0.0, cj, y, yp);
        double[][] colored = DaeJacobian.denseColored(res, 0.0, cj, y, yp, colRows, color);
        for (int c = 0; c < 3; c++) {
            for (int row : colRows[c]) {
                assertEquals(dense[row][c], colored[row][c], 1e-9, "entry (" + row + "," + c + ")");
            }
        }
    }

    @Test
    void combinedJacobianMatchesAnalytic() {
        // F0 = yp0 + y0 - y1 ; F1 = y1 - 2 y0
        DaeResidual res = (t, y, yp, r) -> {
            r[0] = yp[0] + y[0] - y[1];
            r[1] = y[1] - 2.0 * y[0];
        };
        double cj = 10.0;
        double[][] j = DaeJacobian.dense(res, 0.0, cj, new double[] {1.0, 2.0}, new double[] {1.0, 0.0});
        // J = dF/dy + cj dF/dyp = [[1+cj, -1], [-2, 1]]
        assertEquals(1.0 + cj, j[0][0], 1e-5);
        assertEquals(-1.0, j[0][1], 1e-5);
        assertEquals(-2.0, j[1][0], 1e-5);
        assertEquals(1.0, j[1][1], 1e-5);
    }
}
