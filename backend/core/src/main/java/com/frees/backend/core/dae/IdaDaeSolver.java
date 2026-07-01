package com.frees.backend.core.dae;

import com.sun.jna.Pointer;
import com.sun.jna.ptr.DoubleByReference;
import com.sun.jna.ptr.PointerByReference;
import java.util.Arrays;

/**
 * High-level Java wrapper over {@link SundialsIda} — the frees-facing DAE
 * integrator API for Phase&nbsp;S1. It hides all native bookkeeping (SUNContext,
 * serial vectors, dense matrix, linear solver, callback marshalling, memory
 * release) behind a clean closure-based interface:
 *
 * <pre>{@code
 * try (IdaDaeSolver s = new IdaDaeSolver(n, residual)) {
 *     s.setTolerances(1e-8, 1e-8);
 *     s.setVariableId(id);          // 1=differential, 0=algebraic
 *     s.setRoots(nroots, rootFn);   // §4.8 Tier-2 structural events
 *     s.init(t0, y0, yp0);
 *     s.calcConsistentIc(SundialsIda.IDA_YA_YDP_INIT, t0 + 1e-3);
 *     IdaDaeSolver.Step out = s.step(tout);
 * }
 * }</pre>
 *
 * <p>Marshalling is handled in the residual/root callbacks: the IDA serial
 * {@code N_Vector}s are read into Java arrays via {@code N_VGetArrayPointer},
 * the user closure runs in pure Java, and the result is written straight back
 * into the native buffer. The callback objects are held as fields so they are
 * never GC'd while IDA holds a pointer to them.
 *
 * <p>{@link AutoCloseable}: {@link #close()} frees every native object in the
 * reverse order it was created. Not thread-safe — one solver instance per
 * integration.
 */
public final class IdaDaeSolver implements AutoCloseable {

    /** One IDA return: the state at {@code t}, the solver flag, and any roots that fired. */
    public record Step(double t, double[] y, double[] yp, int flag, int[] rootsFound) {
        public boolean rootReturn() {
            return flag == SundialsIda.IDA_ROOT_RETURN;
        }

        // equals/hashCode/toString consider array contents — java:S6218.
        @Override
        public boolean equals(Object o) {
            if (this == o) {
                return true;
            }
            if (!(o instanceof Step other)) {
                return false;
            }
            return Double.compare(t, other.t) == 0
                    && flag == other.flag
                    && Arrays.equals(y, other.y)
                    && Arrays.equals(yp, other.yp)
                    && Arrays.equals(rootsFound, other.rootsFound);
        }

        @Override
        public int hashCode() {
            int result = Double.hashCode(t);
            result = 31 * result + flag;
            result = 31 * result + Arrays.hashCode(y);
            result = 31 * result + Arrays.hashCode(yp);
            result = 31 * result + Arrays.hashCode(rootsFound);
            return result;
        }

        @Override
        public String toString() {
            return "Step[t=" + t + ", y=" + Arrays.toString(y) + ", yp=" + Arrays.toString(yp)
                    + ", flag=" + flag + ", rootsFound=" + Arrays.toString(rootsFound) + "]";
        }
    }

    private final SundialsIda.Lib lib;
    private final int n;
    private final DaeResidual residual;

    private double rtol = 1e-6;
    private double atol = 1e-8;
    private long maxSteps = 50_000;
    private double[] variableId;
    private int nroots;
    private DaeRootFn rootFn;
    private int[][] colRows;   // CSC: rows present in each column
    private int[] colStart;    // CSC column pointers (fixed pattern)
    private int[] color;       // S2 column coloring (structurally-orthogonal groups)
    private int nnz;
    private boolean useSparse;

    // native handles
    private final PointerByReference ctxRef = new PointerByReference();
    private Pointer ctx;
    private Pointer yy;
    private Pointer yp;
    private Pointer idVec;
    private Pointer mat;
    private Pointer ls;
    private final PointerByReference idaMemRef = new PointerByReference();
    private Pointer idaMem;
    private boolean initialized;

    // strong refs so JNA callbacks survive GC while IDA holds their pointers
    private SundialsIda.IdaResFn nativeRes;
    private SundialsIda.IdaRootFn nativeRoot;
    private SundialsIda.IdaLsJacFn nativeJac;

    public IdaDaeSolver(int n, DaeResidual residual) {
        if (n < 1) {
            throw new IllegalArgumentException("DAE dimension must be >= 1");
        }
        this.lib = SundialsIda.lib();
        this.n = n;
        this.residual = residual;
    }

    public IdaDaeSolver setTolerances(double rtol, double atol) {
        this.rtol = rtol;
        this.atol = atol;
        return this;
    }

    public IdaDaeSolver setMaxSteps(long maxSteps) {
        this.maxSteps = maxSteps;
        return this;
    }

    /** Marks each state differential (1) or algebraic (0); needed for {@code IDA_YA_YDP_INIT}. */
    public IdaDaeSolver setVariableId(double[] id) {
        if (id.length != n) {
            throw new IllegalArgumentException("id length must equal the DAE dimension");
        }
        this.variableId = id.clone();
        return this;
    }

    /** Registers {@code nroots} switching functions (§4.8 Tier-2 events). Call before {@link #init}. */
    public IdaDaeSolver setRoots(int nroots, DaeRootFn rootFn) {
        this.nroots = nroots;
        this.rootFn = rootFn;
        return this;
    }

    /**
     * Selects the <b>KLU sparse</b> linear solver with the given per-row column
     * dependency pattern (as produced by the DAE assembler), instead of the dense
     * default. The combined system matrix is filled by a finite-difference
     * Jacobian honouring this sparsity ({@link DaeJacobian}). Call before
     * {@link #init}. (sunindextype is assumed 64-bit, the SUNDIALS default.)
     */
    public IdaDaeSolver setSparsity(int[][] sparsityRows) {
        if (sparsityRows.length != n) {
            throw new IllegalArgumentException("sparsity must have one row per equation");
        }
        // transpose per-row pattern into per-column row lists for CSC
        java.util.List<java.util.List<Integer>> cols = new java.util.ArrayList<>();
        for (int c = 0; c < n; c++) {
            cols.add(new java.util.ArrayList<>());
        }
        int count = 0;
        for (int i = 0; i < n; i++) {
            for (int col : sparsityRows[i]) {
                cols.get(col).add(i);
                count++;
            }
        }
        this.colRows = new int[n][];
        for (int c = 0; c < n; c++) {
            this.colRows[c] = cols.get(c).stream().mapToInt(Integer::intValue).toArray();
        }
        this.nnz = count;
        // S2: cumulative column offsets (the fixed CSC pointers) and a column
        // coloring so the Jacobian needs #colors residual evals, not n.
        this.colStart = new int[n + 1];
        for (int c = 0; c < n; c++) {
            this.colStart[c + 1] = this.colStart[c] + this.colRows[c].length;
        }
        this.color = DaeJacobian.colorColumns(sparsityRows, n);
        this.useSparse = true;
        return this;
    }

    /** Allocates native objects and initializes IDA at {@code (t0, y0, yp0)}. */
    public void init(double t0, double[] y0, double[] yp0) {
        require(y0.length == n && yp0.length == n, "y0/yp0 length must equal dimension");
        check(lib.SUNContext_Create(Pointer.NULL, ctxRef), "SUNContext_Create");
        ctx = ctxRef.getValue();

        yy = lib.N_VNew_Serial(n, ctx);
        yp = lib.N_VNew_Serial(n, ctx);
        writeVector(yy, y0);
        writeVector(yp, yp0);

        idaMem = lib.IDACreate(ctx);
        idaMemRef.setValue(idaMem);

        nativeRes = (t, yyv, ypv, rr, ud) -> {
            try {
                double[] yArr = readVector(yyv);
                double[] ypArr = readVector(ypv);
                double[] res = new double[n];
                residual.eval(t, yArr, ypArr, res);
                writeVector(rr, res);
                return 0;
            } catch (RuntimeException ex) {
                return 1; // recoverable error -> IDA retries with a smaller step
            }
        };
        check(lib.IDAInit(idaMem, nativeRes, t0, yy, yp), "IDAInit");
        check(lib.IDASStolerances(idaMem, rtol, atol), "IDASStolerances");
        check(lib.IDASetMaxNumSteps(idaMem, maxSteps), "IDASetMaxNumSteps");

        if (useSparse && SundialsIda.sparseAvailable()) {
            mat = SundialsIda.sparseMatLib().SUNSparseMatrix(n, n, nnz, SundialsIda.CSC_MAT, ctx);
            ls = SundialsIda.kluLib().SUNLinSol_KLU(yy, mat, ctx);
            check(lib.IDASetLinearSolver(idaMem, ls, mat), "IDASetLinearSolver");
            nativeJac = (tt, cj, yyv, ypv, rrv, jj, ud, t1, t2, t3) -> {
                try {
                    fillSparseJacobian(tt, cj, readVector(yyv), readVector(ypv), jj);
                    return 0;
                } catch (RuntimeException ex) {
                    return 1;
                }
            };
            check(lib.IDASetJacFn(idaMem, nativeJac), "IDASetJacFn");
        } else {
            mat = lib.SUNDenseMatrix(n, n, ctx);
            ls = lib.SUNLinSol_Dense(yy, mat, ctx);
            check(lib.IDASetLinearSolver(idaMem, ls, mat), "IDASetLinearSolver");
        }

        if (variableId != null) {
            idVec = lib.N_VNew_Serial(n, ctx);
            writeVector(idVec, variableId);
            check(lib.IDASetId(idaMem, idVec), "IDASetId");
        }

        if (rootFn != null && nroots > 0) {
            nativeRoot = (t, yyv, ypv, gout, ud) -> {
                try {
                    double[] g = new double[nroots];
                    rootFn.eval(t, readVector(yyv), readVector(ypv), g);
                    writePointer(gout, g);
                    return 0;
                } catch (RuntimeException ex) {
                    return 1;
                }
            };
            check(lib.IDARootInit(idaMem, nroots, nativeRoot), "IDARootInit");
        }
        initialized = true;
    }

    /**
     * Re-initializes IDA at a new {@code (t0, y0, yp0)} keeping the same problem
     * structure — the §4.8 mode-frozen restart after a structural switch (and the
     * cheap re-launch path generally). Roots and linear solver persist.
     */
    public void reinit(double t0, double[] y0, double[] yp0) {
        requireInit();
        writeVector(yy, y0);
        writeVector(yp, yp0);
        check(lib.IDAReInit(idaMem, t0, yy, yp), "IDAReInit");
    }

    /**
     * Computes a consistent initial condition (IDA's {@code IDACalcIC}) and copies
     * the corrected {@code (y, y')} back. {@code icopt} is
     * {@link SundialsIda#IDA_YA_YDP_INIT} (needs {@link #setVariableId}) or
     * {@link SundialsIda#IDA_Y_INIT}. {@code tout1} is a point in the direction of
     * integration (only its sign/position relative to {@code t0} matters).
     */
    public void calcConsistentIc(int icopt, double tout1) {
        requireInit();
        check(lib.IDACalcIC(idaMem, icopt, tout1), "IDACalcIC");
        lib.IDAGetConsistentIC(idaMem, yy, yp);
    }

    /** Integrates to {@code tout} in IDA_NORMAL mode and returns the state (and any roots). */
    public Step step(double tout) {
        requireInit();
        DoubleByReference tret = new DoubleByReference();
        int flag = lib.IDASolve(idaMem, tout, tret, yy, yp, SundialsIda.IDA_NORMAL);
        if (flag < 0) {
            throw new IllegalStateException("IDASolve failed with flag " + flag);
        }
        int[] roots = new int[Math.max(nroots, 0)];
        if (flag == SundialsIda.IDA_ROOT_RETURN && nroots > 0) {
            lib.IDAGetRootInfo(idaMem, roots);
        }
        return new Step(tret.getValue(), readVector(yy), readVector(yp), flag, roots);
    }

    public double[] currentState() {
        requireInit();
        return readVector(yy);
    }

    public double[] currentDerivative() {
        requireInit();
        return readVector(yp);
    }

    @Override
    public void close() {
        if (idaMem != null) {
            lib.IDAFree(idaMemRef);
            idaMem = null;
        }
        if (ls != null) {
            lib.SUNLinSolFree(ls);
            ls = null;
        }
        if (mat != null) {
            lib.SUNMatDestroy(mat);
            mat = null;
        }
        destroy(yy);
        yy = null;
        destroy(yp);
        yp = null;
        destroy(idVec);
        idVec = null;
        if (ctx != null) {
            lib.SUNContext_Free(ctxRef);
            ctx = null;
        }
        initialized = false;
    }

    // --- helpers -------------------------------------------------------------

    private void destroy(Pointer vec) {
        if (vec != null) {
            lib.N_VDestroy(vec);
        }
    }

    /**
     * Fills the CSC {@code SUNSparseMatrix} with {@code J = ∂F/∂y + cj·∂F/∂y'}.
     * The values come from the S2 <b>colored</b> finite difference (#colors
     * residual evals instead of n; {@link DaeJacobian#denseColored}). The fixed
     * pattern (IndexPointers/IndexValues) is rewritten each call — cheap, and KLU
     * keeps its symbolic factorization because the pattern is unchanged. Index
     * arrays use 64-bit {@code sunindextype} (the SUNDIALS default build).
     */
    private void fillSparseJacobian(double t, double cj, double[] y, double[] yp, Pointer jj) {
        SundialsIda.SparseMatLib sm = SundialsIda.sparseMatLib();
        Pointer data = sm.SUNSparseMatrix_Data(jj);
        Pointer idxVals = sm.SUNSparseMatrix_IndexValues(jj);
        Pointer idxPtrs = sm.SUNSparseMatrix_IndexPointers(jj);
        double[][] j = DaeJacobian.denseColored(residual, t, cj, y, yp, colRows, color);
        for (int c = 0; c <= n; c++) {
            idxPtrs.setLong(8L * c, colStart[c]);
        }
        int pos = 0;
        for (int c = 0; c < n; c++) {
            for (int row : colRows[c]) {
                data.setDouble(8L * pos, j[row][c]);
                idxVals.setLong(8L * pos, row);
                pos++;
            }
        }
    }

    private double[] readVector(Pointer nvector) {
        Pointer data = lib.N_VGetArrayPointer(nvector);
        return data.getDoubleArray(0, n);
    }

    private void writeVector(Pointer nvector, double[] values) {
        Pointer data = lib.N_VGetArrayPointer(nvector);
        data.write(0, values, 0, n);
    }

    private static void writePointer(Pointer data, double[] values) {
        data.write(0, values, 0, values.length);
    }

    private void requireInit() {
        if (!initialized) {
            throw new IllegalStateException("IdaDaeSolver.init(...) must be called first");
        }
    }

    private static void require(boolean cond, String msg) {
        if (!cond) {
            throw new IllegalArgumentException(msg);
        }
    }

    private static void check(int flag, String call) {
        if (flag < 0) {
            throw new IllegalStateException(call + " failed with flag " + flag);
        }
    }
}
