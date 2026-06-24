package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tier 3 regular-grid 2-D interpolation ({@code CALL Interp2}). Covers the
 * bilinear small-grid path, the bicubic large-grid path (node-exact), and
 * boundary clamping.
 */
class Interp2Test {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    private static double v(EquationSystemSolver.Result r, String key) {
        Double d = r.variables().get(key);
        if (d == null) {
            throw new AssertionError("missing variable " + key + " in " + r.variables().keySet());
        }
        return d;
    }

    /** 2×2 grid, bilinear: centre is the average of the four corners. */
    @Test
    void bilinearCentre() {
        String src = "x = [0, 1]\ny = [0, 1]\nZ = [0, 1; 2, 3]\n"
                + "CALL Interp2(x, y, Z, 0.5, 0.5 : zc)\n"
                + "CALL Interp2(x, y, Z, 0.5, 0 : ze)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(1.5, v(r, "zc"), 1e-12);
        assertEquals(1.0, v(r, "ze"), 1e-12);
    }

    /** Bilinear is exact for an affine field f = 2x + 3y. */
    @Test
    void bilinearExactOnAffineField() {
        String src = "x = [0, 1, 2]\ny = [0, 1, 2, 3]\n"
                + "Z = [0, 3, 6, 9; 2, 5, 8, 11; 4, 7, 10, 13]\n"
                + "CALL Interp2(x, y, Z, 0.5, 1.5 : zq)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(2 * 0.5 + 3 * 1.5, v(r, "zq"), 1e-9);
    }

    /** 5×5 grid takes the bicubic path; node queries reproduce the grid exactly. */
    @Test
    void bicubicNodeExact() {
        String src = "x = [0, 1, 2, 3, 4]\ny = [0, 1, 2, 3, 4]\n"
                + "Z = [0, 1, 4, 9, 16; 1, 2, 5, 10, 17; 4, 5, 8, 13, 20; 9, 10, 13, 18, 25; 16, 17, 20, 25, 32]\n"
                + "CALL Interp2(x, y, Z, 2, 3 : zq)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(13.0, v(r, "zq"), 1e-9); // x²+y² = 4+9
    }

    /** Out-of-grid queries clamp to the boundary. */
    @Test
    void clampsOutside() {
        String src = "x = [0, 1]\ny = [0, 1]\nZ = [0, 1; 2, 3]\n"
                + "CALL Interp2(x, y, Z, 5, 5 : zq)\n";
        EquationSystemSolver.Result r = solver.solve(src);
        assertEquals(3.0, v(r, "zq"), 1e-12); // clamps to corner (1,1)
    }
}
