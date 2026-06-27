package com.frees.backend.core.dae;

import com.sun.jna.Callback;
import com.sun.jna.Library;
import com.sun.jna.Native;
import com.sun.jna.Pointer;
import com.sun.jna.ptr.DoubleByReference;
import com.sun.jna.ptr.PointerByReference;

/**
 * Minimal JNA binding to the SUNDIALS <b>IDA</b> implicit-DAE integrator —
 * Phase&nbsp;S1 of the two-phase / refrigeration re-architecture (see
 * {@code todo.md} §7-S1). IDA supplies exactly the machinery the two-phase
 * physics need and which a hand-rolled BDF would have to reinvent:
 *
 * <ul>
 *   <li>variable-order, variable-step <b>BDF</b> for stiff DAEs;</li>
 *   <li>{@code IDARootFind} <b>state events</b> (§4.8 Tier-2: zone collapse, valve switch);</li>
 *   <li>{@code IDACalcIC} <b>consistent initialization</b> (cold start <em>and</em>
 *       mode-frozen post-event restart — the same machinery for both);</li>
 *   <li>a dense {@code SUNLinearSolver} (KLU sparse can be slotted in the same way).</li>
 * </ul>
 *
 * <p><b>Toolchain.</b> This mirrors {@link com.frees.backend.props.CoolProp}: a
 * JNA binding that <em>degrades gracefully</em> when the native library is
 * absent ({@link #isAvailable()} returns {@code false} rather than failing
 * class-load), so the whole backend still builds and runs on a box without
 * SUNDIALS — the IDA-dependent tests simply skip, exactly like the
 * CoolProp-gated tests. The library path comes from the
 * {@code SUNDIALS_LIBRARY} environment variable (explicit file path), falling
 * back to a normal system lookup of {@code sundials_ida}.
 *
 * <p><b>Version.</b> Targets the SUNDIALS&nbsp;≥6 C API, which introduced the
 * mandatory {@code SUNContext}. The dependent shared objects
 * ({@code nvecserial}, {@code sunmatrixdense}, {@code sunlinsoldense}, and on
 * v7 {@code core}) are pre-loaded so their symbols resolve through the IDA
 * handle; set {@code LD_LIBRARY_PATH} if they live outside the default search
 * path.
 */
public final class SundialsIda {

    private SundialsIda() {}

    // IDASolve itask
    public static final int IDA_NORMAL = 1;
    public static final int IDA_ONE_STEP = 2;
    // IDACalcIC icopt
    public static final int IDA_YA_YDP_INIT = 1;
    public static final int IDA_Y_INIT = 2;
    // success
    public static final int IDA_SUCCESS = 0;
    public static final int IDA_ROOT_RETURN = 2;
    public static final int IDA_TSTOP_RETURN = 1;

    /** IDA's {@code IDAResFn}: writes F(t,yy,yp) into {@code rr}; returns 0 on success. */
    public interface IdaResFn extends Callback {
        int invoke(double t, Pointer yy, Pointer yp, Pointer rr, Pointer userData);
    }

    /** IDA's {@code IDARootFn}: writes the switching functions into {@code gout}; returns 0. */
    public interface IdaRootFn extends Callback {
        int invoke(double t, Pointer yy, Pointer yp, Pointer gout, Pointer userData);
    }

    /** IDA's {@code IDALsJacFn}: fills the system matrix {@code JJ = ∂F/∂y + cj·∂F/∂y'}. */
    public interface IdaLsJacFn extends Callback {
        int invoke(double tt, double cj, Pointer yy, Pointer yp, Pointer rr, Pointer jj,
                   Pointer userData, Pointer tmp1, Pointer tmp2, Pointer tmp3);
    }

    /** Compressed-sparse-column storage type for {@code SUNSparseMatrix}. */
    public static final int CSC_MAT = 0;

    interface Lib extends Library {
        // --- SUNContext (SUNDIALS >= 6) ---
        int SUNContext_Create(Pointer comm, PointerByReference ctx);
        void SUNContext_Free(PointerByReference ctx);

        // --- serial N_Vector ---
        Pointer N_VNew_Serial(long length, Pointer sunctx);
        Pointer N_VGetArrayPointer(Pointer v);
        void N_VDestroy(Pointer v);

        // --- dense matrix + linear solver ---
        Pointer SUNDenseMatrix(long m, long n, Pointer sunctx);
        Pointer SUNLinSol_Dense(Pointer y, Pointer a, Pointer sunctx);
        int SUNLinSolFree(Pointer s);
        void SUNMatDestroy(Pointer a);

        // IDASetJacFn lives in the IDA library (IDALS); the sparse matrix and KLU
        // solver factories live in their own shared objects (SparseMatLib/KluLib),
        // because a function resolves only through the handle of the library that
        // defines it (or that library's NEEDED dependencies) — and libsundials_ida
        // depends on the dense libs but not the optional KLU ones.
        int IDASetJacFn(Pointer idaMem, IdaLsJacFn jac);

        // --- IDA core ---
        Pointer IDACreate(Pointer sunctx);
        int IDAInit(Pointer idaMem, IdaResFn res, double t0, Pointer yy0, Pointer yp0);
        int IDAReInit(Pointer idaMem, double t0, Pointer yy0, Pointer yp0);
        int IDASStolerances(Pointer idaMem, double reltol, double abstol);
        int IDASetUserData(Pointer idaMem, Pointer userData);
        int IDASetLinearSolver(Pointer idaMem, Pointer ls, Pointer a);
        int IDASetId(Pointer idaMem, Pointer id);
        int IDASetStopTime(Pointer idaMem, double tstop);
        int IDASetMaxNumSteps(Pointer idaMem, long mxsteps);
        int IDACalcIC(Pointer idaMem, int icopt, double tout1);
        int IDAGetConsistentIC(Pointer idaMem, Pointer yy0Mod, Pointer yp0Mod);
        int IDARootInit(Pointer idaMem, int nrtfn, IdaRootFn g);
        int IDAGetRootInfo(Pointer idaMem, int[] rootsfound);
        int IDASolve(Pointer idaMem, double tout, DoubleByReference tret,
                     Pointer yret, Pointer ypret, int itask);
        void IDAFree(PointerByReference idaMem);
    }

    /** Sparse {@code SUNMatrix} factory + CSC accessors (libsundials_sunmatrixsparse). */
    interface SparseMatLib extends Library {
        Pointer SUNSparseMatrix(long m, long n, long nnz, int sparsetype, Pointer sunctx);
        Pointer SUNSparseMatrix_Data(Pointer a);
        Pointer SUNSparseMatrix_IndexValues(Pointer a);
        Pointer SUNSparseMatrix_IndexPointers(Pointer a);
    }

    /** KLU {@code SUNLinearSolver} factory (libsundials_sunlinsolklu). */
    interface KluLib extends Library {
        Pointer SUNLinSol_KLU(Pointer y, Pointer a, Pointer sunctx);
    }

    private static final Lib LIB = load();
    private static final SparseMatLib SPARSE_LIB = loadOptional("sundials_sunmatrixsparse", SparseMatLib.class);
    private static final KluLib KLU_LIB = loadOptional("sundials_sunlinsolklu", KluLib.class);

    private static Lib load() {
        // Pre-load dependent shared objects so their symbols are resident; failures
        // here are non-fatal (a fully-static or differently-packaged build may not
        // need them).
        for (String dep : new String[] {"sundials_core", "sundials_nvecserial",
                "sundials_sunmatrixdense", "sundials_sunlinsoldense",
                "sundials_sunmatrixsparse", "sundials_sunlinsolklu"}) {
            tryPreload(dep);
        }
        try {
            String explicit = System.getenv("SUNDIALS_LIBRARY");
            String name = explicit != null && !explicit.isBlank() ? explicit : "sundials_ida";
            // Probe for the SUNDIALS >= 6 SUNContext API. A pre-6 build (e.g. the
            // libsundials_ida v5 bundled inside some numerical environments) loads fine but lacks this
            // symbol and would crash at init(); reject it here so isAvailable() is
            // honest and the IDA-gated tests skip rather than fault.
            com.sun.jna.NativeLibrary probe = com.sun.jna.NativeLibrary.getInstance(name);
            probe.getFunction("SUNContext_Create");
            return Native.load(name, Lib.class);
        } catch (UnsatisfiedLinkError | NoClassDefFoundError e) {
            return null;
        }
    }

    private static void tryPreload(String name) {
        try {
            Native.load(name, Library.class);
        } catch (Throwable ignored) {
            // best-effort; the symbol may already be linked into sundials_ida
        }
    }

    private static <T extends Library> T loadOptional(String name, Class<T> iface) {
        try {
            return Native.load(name, iface);
        } catch (UnsatisfiedLinkError | NoClassDefFoundError e) {
            return null;
        }
    }

    public static boolean isAvailable() {
        return LIB != null;
    }

    /** Whether the KLU sparse linear-solver path is usable (sparse matrix + KLU libs present). */
    public static boolean sparseAvailable() {
        return LIB != null && SPARSE_LIB != null && KLU_LIB != null;
    }

    static SparseMatLib sparseMatLib() {
        return SPARSE_LIB;
    }

    static KluLib kluLib() {
        return KLU_LIB;
    }

    static Lib lib() {
        if (LIB == null) {
            throw new IllegalStateException(
                    "The SUNDIALS IDA native library is not available. Set the "
                            + "SUNDIALS_LIBRARY environment variable to the path of "
                            + "libsundials_ida.so (and put its dependencies on "
                            + "LD_LIBRARY_PATH) to enable the DAE integrator.");
        }
        return LIB;
    }
}
