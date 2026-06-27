package com.frees.backend.core.dae;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase S1 — the SUNDIALS IDA DAE integrator wrapper. Gated on the native
 * SUNDIALS library exactly like the CoolProp-backed tests: where IDA is not
 * installed these skip rather than fail, so the suite stays green on any box.
 */
class IdaDaeSolverTest {

    @BeforeEach
    void requireSundials() {
        assumeTrue(SundialsIda.isAvailable(),
                "SUNDIALS IDA native library not available; skipping DAE integrator tests");
    }

    /**
     * Index-1 semi-explicit DAE:
     *   y1' = -y1            (differential)
     *   0  = y2 - 2*y1       (algebraic)
     * Exact: y1 = e^-t, y2 = 2 e^-t. This is the {@code C-R-C}-shaped case
     * (one storage state + one algebraic coupling) that must integrate cleanly.
     */
    @Test
    void integratesIndex1Dae() {
        DaeResidual res = (t, y, yp, r) -> {
            r[0] = yp[0] + y[0];
            r[1] = y[1] - 2.0 * y[0];
        };
        try (IdaDaeSolver s = new IdaDaeSolver(2, res)) {
            s.setTolerances(1e-9, 1e-9);
            s.setVariableId(new double[] {1.0, 0.0});
            s.init(0.0, new double[] {1.0, 2.0}, new double[] {-1.0, 0.0});
            s.calcConsistentIc(SundialsIda.IDA_YA_YDP_INIT, 1e-3);
            IdaDaeSolver.Step out = s.step(1.0);
            assertEquals(Math.exp(-1.0), out.y()[0], 1e-6);
            assertEquals(2.0 * Math.exp(-1.0), out.y()[1], 1e-6);
        }
    }

    /** Same DAE on the KLU sparse solver: exercises SUNSparseMatrix +
     *  SUNLinSol_KLU + IDASetJacFn + the CSC finite-difference Jacobian fill. */
    @Test
    void integratesIndex1DaeWithKluSparse() {
        assumeTrue(SundialsIda.sparseAvailable(), "SUNDIALS KLU sparse solver not available");
        DaeResidual res = (t, y, yp, r) -> {
            r[0] = yp[0] + y[0];        // depends on column 0 (y0, yp0)
            r[1] = y[1] - 2.0 * y[0];   // depends on columns 0 and 1
        };
        try (IdaDaeSolver s = new IdaDaeSolver(2, res)) {
            s.setTolerances(1e-9, 1e-9);
            s.setVariableId(new double[] {1.0, 0.0});
            s.setSparsity(new int[][] {{0}, {0, 1}});
            s.init(0.0, new double[] {1.0, 2.0}, new double[] {-1.0, 0.0});
            s.calcConsistentIc(SundialsIda.IDA_YA_YDP_INIT, 1e-3);
            IdaDaeSolver.Step out = s.step(1.0);
            assertEquals(Math.exp(-1.0), out.y()[0], 1e-6);
            assertEquals(2.0 * Math.exp(-1.0), out.y()[1], 1e-6);
        }
    }

    /** A switching function {@code g = y1 - 0.5} must fire at t = ln 2. */
    @Test
    void detectsRootEvent() {
        DaeResidual res = (t, y, yp, r) -> {
            r[0] = yp[0] + y[0];
            r[1] = y[1] - 2.0 * y[0];
        };
        DaeRootFn root = (t, y, yp, g) -> g[0] = y[0] - 0.5;
        try (IdaDaeSolver s = new IdaDaeSolver(2, res)) {
            s.setTolerances(1e-9, 1e-9);
            s.setVariableId(new double[] {1.0, 0.0});
            s.setRoots(1, root);
            s.init(0.0, new double[] {1.0, 2.0}, new double[] {-1.0, 0.0});
            s.calcConsistentIc(SundialsIda.IDA_YA_YDP_INIT, 1e-3);
            IdaDaeSolver.Step out = s.step(5.0);
            assertTrue(out.rootReturn(), "expected a root return before t=5");
            assertEquals(Math.log(2.0), out.t(), 1e-4);
            assertEquals(1, out.rootsFound()[0] != 0 ? 1 : 0);
        }
    }

    /** After a structural switch the solver re-inits and continues (mode-frozen restart). */
    @Test
    void reinitContinuesIntegration() {
        DaeResidual res = (t, y, yp, r) -> {
            r[0] = yp[0] + y[0];
            r[1] = y[1] - 2.0 * y[0];
        };
        try (IdaDaeSolver s = new IdaDaeSolver(2, res)) {
            s.setTolerances(1e-9, 1e-9);
            s.setVariableId(new double[] {1.0, 0.0});
            s.init(0.0, new double[] {1.0, 2.0}, new double[] {-1.0, 0.0});
            s.calcConsistentIc(SundialsIda.IDA_YA_YDP_INIT, 1e-3);
            IdaDaeSolver.Step mid = s.step(0.5);
            // restart from the mid state and integrate the remaining window
            s.reinit(mid.t(), mid.y(), mid.yp());
            IdaDaeSolver.Step out = s.step(1.0);
            assertEquals(Math.exp(-1.0), out.y()[0], 1e-6);
        }
    }
}
