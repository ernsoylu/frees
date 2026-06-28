package com.frees.backend.parser;

import com.frees.backend.ast.Expr;
import com.frees.backend.core.dae.DaeAssembly;
import com.frees.backend.core.dae.IdaDaeSolver;
import com.frees.backend.core.ode.DynamicSolver;
import com.frees.backend.props.CubicEos;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pins the array-content equals/hashCode/toString overrides on the carrier
 * records flagged by SonarQube java:S6218 — two records with identical array
 * contents (but distinct array instances) must compare equal and hash equal,
 * and toString must render the contents rather than an array identity hash.
 */
class RecordValueSemanticsTest {

    @Test
    void daeAssemblyValueSemantics() {
        DaeAssembly a = new DaeAssembly(2, List.of("x", "y"), List.of("x"), List.of("y"),
                new double[]{1, 0}, null, new double[]{1, 2}, new double[]{0, 0},
                new int[][]{{0}, {1}}, null, List.of(), new boolean[]{false});
        DaeAssembly b = new DaeAssembly(2, List.of("x", "y"), List.of("x"), List.of("y"),
                new double[]{1, 0}, null, new double[]{1, 2}, new double[]{0, 0},
                new int[][]{{0}, {1}}, null, List.of(), new boolean[]{false});
        DaeAssembly different = new DaeAssembly(2, List.of("x", "y"), List.of("x"), List.of("y"),
                new double[]{1, 0}, null, new double[]{9, 9}, new double[]{0, 0},
                new int[][]{{0}, {1}}, null, List.of(), new boolean[]{false});

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, different);
        assertTrue(a.toString().contains("1.0"), a.toString());
    }

    @Test
    void idaStepValueSemantics() {
        IdaDaeSolver.Step a = new IdaDaeSolver.Step(0.5, new double[]{1, 2}, new double[]{0, 0}, 1, new int[]{0});
        IdaDaeSolver.Step b = new IdaDaeSolver.Step(0.5, new double[]{1, 2}, new double[]{0, 0}, 1, new int[]{0});
        IdaDaeSolver.Step different = new IdaDaeSolver.Step(0.5, new double[]{1, 9}, new double[]{0, 0}, 1, new int[]{0});

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, different);
        assertNotEquals(a, null);
        assertTrue(a.toString().contains("2.0"), a.toString());
    }

    @Test
    void linearizationValueSemantics() {
        DynamicSolver.Linearization a = new DynamicSolver.Linearization(
                List.of("x"), List.of("u"), List.of("y"),
                new double[][]{{1, 2}}, new double[][]{{3}}, new double[][]{{4, 5}}, new double[][]{{6}});
        DynamicSolver.Linearization b = new DynamicSolver.Linearization(
                List.of("x"), List.of("u"), List.of("y"),
                new double[][]{{1, 2}}, new double[][]{{3}}, new double[][]{{4, 5}}, new double[][]{{6}});
        DynamicSolver.Linearization different = new DynamicSolver.Linearization(
                List.of("x"), List.of("u"), List.of("y"),
                new double[][]{{9, 9}}, new double[][]{{3}}, new double[][]{{4, 5}}, new double[][]{{6}});

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, different);
        assertTrue(a.toString().contains("2.0"), a.toString());
    }

    @Test
    void cubicEosFluidValueSemantics() {
        CubicEos.Fluid a = new CubicEos.Fluid("R134a", 374.21, 4.0593e6, 0.32684, 0.102032, new double[]{1, 2, 3});
        CubicEos.Fluid b = new CubicEos.Fluid("R134a", 374.21, 4.0593e6, 0.32684, 0.102032, new double[]{1, 2, 3});
        CubicEos.Fluid different = new CubicEos.Fluid("R134a", 374.21, 4.0593e6, 0.32684, 0.102032, new double[]{1, 2, 9});

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, different);
        assertTrue(a.toString().contains("R134a"), a.toString());
    }

    @Test
    void matrixDataValueSemantics() {
        Expr[][] e1 = {{new Expr.Num(1.0, null, false), new Expr.Num(2.0, null, false)}};
        Expr[][] e2 = {{new Expr.Num(1.0, null, false), new Expr.Num(2.0, null, false)}};
        Expr[][] e3 = {{new Expr.Num(1.0, null, false), new Expr.Num(9.0, null, false)}};

        ControlSystemsFlattener.MatrixData a = new ControlSystemsFlattener.MatrixData("M", 1, 2, e1);
        ControlSystemsFlattener.MatrixData b = new ControlSystemsFlattener.MatrixData("M", 1, 2, e2);
        ControlSystemsFlattener.MatrixData different = new ControlSystemsFlattener.MatrixData("M", 1, 2, e3);

        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
        assertNotEquals(a, different);
        assertTrue(a.toString().contains("M"), a.toString());
    }
}
