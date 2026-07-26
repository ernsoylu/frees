package com.frees.backend.core.dae;

import com.sun.jna.Pointer;
import com.sun.jna.ptr.PointerByReference;

import java.util.List;

/**
 * Standalone CSC + KLU sparse linear solver for the steady Newton path,
 * reusing the native toolchain the DAE integrator already engages above its
 * state-count threshold. One instance is built per solved block — the
 * pattern is fixed by the block's structural incidence — and each Newton
 * iteration refills the values and solves. Degrades gracefully: without the
 * native libraries {@link #available()} is false, and any native-side
 * refusal surfaces as a {@code null} (never an exception), so the caller
 * falls back to the dense path.
 */
public final class SparseSteadyKlu implements AutoCloseable {

    private final SundialsIda.Lib lib;
    private final PointerByReference ctxRef = new PointerByReference();
    private Pointer ctx;
    private Pointer matrix;
    private Pointer xVec;
    private Pointer bVec;
    private Pointer linsol;
    private final int n;
    private final int nnz;

    public static boolean available() {
        return SundialsIda.sparseAvailable();
    }

    /**
     * Builds a solver for the fixed CSC pattern {@code column -> ascending row
     * list}; returns {@code null} when the native side refuses, so callers can
     * fall back to dense without special-casing.
     */
    public static SparseSteadyKlu create(List<List<Integer>> columnRows) {
        if (!available()) {
            return null;
        }
        try {
            return new SparseSteadyKlu(columnRows);
        } catch (RuntimeException | UnsatisfiedLinkError e) {
            return null;
        }
    }

    private SparseSteadyKlu(List<List<Integer>> columnRows) {
        this.lib = SundialsIda.lib();
        this.n = columnRows.size();
        int count = 0;
        for (List<Integer> rows : columnRows) {
            count += rows.size();
        }
        this.nnz = count;
        try {
            require(nnz > 0, "empty pattern");
            require(lib.SUNContext_Create(Pointer.NULL, ctxRef) == 0, "SUNContext_Create");
            ctx = ctxRef.getValue();
            xVec = lib.N_VNew_Serial(n, ctx);
            bVec = lib.N_VNew_Serial(n, ctx);
            matrix = SundialsIda.sparseMatLib().SUNSparseMatrix(n, n, nnz, SundialsIda.CSC_MAT, ctx);
            require(xVec != null && bVec != null && matrix != null, "sparse allocation");
            // The pattern is written once; sunindextype is 64-bit (the SUNDIALS
            // default, same assumption the DAE side already makes).
            Pointer colPtr = SundialsIda.sparseMatLib().SUNSparseMatrix_IndexPointers(matrix);
            Pointer rowIdx = SundialsIda.sparseMatLib().SUNSparseMatrix_IndexValues(matrix);
            int pos = 0;
            for (int j = 0; j < n; j++) {
                colPtr.setLong(8L * j, pos);
                for (int i : columnRows.get(j)) {
                    rowIdx.setLong(8L * pos, i);
                    pos++;
                }
            }
            colPtr.setLong(8L * n, pos);
            linsol = SundialsIda.kluLib().SUNLinSol_KLU(xVec, matrix, ctx);
            require(linsol != null, "SUNLinSol_KLU");
            require(lib.SUNLinSolInitialize(linsol) == 0, "SUNLinSolInitialize");
        } catch (RuntimeException e) {
            close();
            throw e;
        }
    }

    /** Number of stored entries; the caller sizes its value buffer with this. */
    public int nonzeros() {
        return nnz;
    }

    /**
     * Refills the matrix values (same CSC order the pattern was declared in),
     * factorizes and solves {@code A x = b}. Returns {@code null} when the
     * factorization or solve reports failure (e.g. a structurally or
     * numerically singular matrix) — the caller falls back to dense/SVD.
     */
    public double[] solve(double[] cscValues, double[] b) {
        Pointer data = SundialsIda.sparseMatLib().SUNSparseMatrix_Data(matrix);
        for (int k = 0; k < nnz; k++) {
            data.setDouble(8L * k, cscValues[k]);
        }
        Pointer bData = lib.N_VGetArrayPointer(bVec);
        for (int i = 0; i < n; i++) {
            bData.setDouble(8L * i, b[i]);
        }
        if (lib.SUNLinSolSetup(linsol, matrix) != 0) {
            return null;
        }
        if (lib.SUNLinSolSolve(linsol, matrix, xVec, bVec, 0.0) != 0) {
            return null;
        }
        Pointer xData = lib.N_VGetArrayPointer(xVec);
        double[] out = new double[n];
        for (int i = 0; i < n; i++) {
            out[i] = xData.getDouble(8L * i);
        }
        return out;
    }

    @Override
    public void close() {
        if (linsol != null) {
            lib.SUNLinSolFree(linsol);
            linsol = null;
        }
        if (matrix != null) {
            lib.SUNMatDestroy(matrix);
            matrix = null;
        }
        if (xVec != null) {
            lib.N_VDestroy(xVec);
            xVec = null;
        }
        if (bVec != null) {
            lib.N_VDestroy(bVec);
            bVec = null;
        }
        if (ctx != null) {
            lib.SUNContext_Free(ctxRef);
            ctx = null;
        }
    }

    private static void require(boolean ok, String what) {
        if (!ok) {
            throw new IllegalStateException(what + " failed");
        }
    }
}
