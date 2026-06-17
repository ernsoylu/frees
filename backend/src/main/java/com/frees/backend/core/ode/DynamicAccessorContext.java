package com.frees.backend.core.ode;

import com.frees.backend.ast.DynamicSystem;
import com.frees.backend.core.SolverException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Thread-bound bridge that makes ODE Table accessors <em>live</em> during the
 * analytic solve. When {@link OdeAccessors} encounters {@code MaxValue('h')} the
 * {@link com.frees.backend.ast.Evaluator} calls {@link #resolve}, which finds the
 * {@code DYNAMIC} block owning that column, integrates it with the current Newton
 * iterate (the {@code values} map), and computes the requested statistic. Tarjan
 * blocking and the Newton Jacobian see the coupling because the accessor's
 * equation is augmented with zero-valued terms in the block's input variables.
 *
 * <p>Results are cached per block keyed by the block's input-variable signature
 * so multiple accessors at the same Newton point reuse one integration. The
 * context is removed while the ODE itself runs, preventing re-entrant accessor
 * resolution.
 */
public final class DynamicAccessorContext {

    /** Integrates one block against a value map, producing its ODE table. */
    @FunctionalInterface
    public interface BlockRunner {
        OdeTableResult run(DynamicSystem system, Map<String, Double> values);
    }

    private static final ThreadLocal<DynamicAccessorContext> CURRENT = new ThreadLocal<>();

    private final List<DynamicSystem> systems;
    private final List<DynamicAnalysis.Shape> shapes;
    private final BlockRunner runner;
    private final Map<Integer, CacheEntry> cache = new HashMap<>();

    private record CacheEntry(List<Double> signature, OdeTableResult table) {}

    private DynamicAccessorContext(List<DynamicSystem> systems, BlockRunner runner) {
        this.systems = systems;
        this.runner = runner;
        this.shapes = new ArrayList<>();
        for (DynamicSystem ds : systems) {
            shapes.add(DynamicAnalysis.analyze(ds));
        }
    }

    public static DynamicAccessorContext install(List<DynamicSystem> systems, BlockRunner runner) {
        DynamicAccessorContext ctx = new DynamicAccessorContext(systems, runner);
        CURRENT.set(ctx);
        return ctx;
    }

    public static void clear() {
        CURRENT.remove();
    }

    /** Resolves an accessor from the active context, or 0 if none is installed. */
    public static double resolve(String function, String column, Double arg,
                                 Map<String, Double> values) {
        DynamicAccessorContext ctx = CURRENT.get();
        if (ctx == null) {
            return 0.0;
        }
        return ctx.doResolve(function, column, arg, values);
    }

    /** The set of input variables of the block owning {@code column} (for the
     *  structural-dependency augmentation); empty if no block owns it. */
    public static List<String> inputVarsForColumn(List<DynamicSystem> systems, String column) {
        String col = column.toLowerCase();
        for (DynamicSystem ds : systems) {
            DynamicAnalysis.Shape shape = DynamicAnalysis.analyze(ds);
            if (ownsColumn(shape, col)) {
                return new ArrayList<>(shape.inputVars());
            }
        }
        return List.of();
    }

    /** Whether a block owns a column, matching array-element columns
     *  ({@code t[4]}) by their base state/aux name ({@code t}), since the static
     *  analysis does not expand the FOR/array discretization. */
    private static boolean ownsColumn(DynamicAnalysis.Shape shape, String col) {
        if (shape.columns().contains(col)) {
            return true;
        }
        int bracket = col.indexOf('[');
        if (bracket > 0) {
            String base = col.substring(0, bracket);
            return shape.states().contains(base) || shape.aux().contains(base);
        }
        return false;
    }

    private double doResolve(String function, String column, Double arg, Map<String, Double> values) {
        int block = ownerBlock(column);
        if (block < 0) {
            throw new SolverException("ODE accessor: no DYNAMIC block has a column '" + column
                    + "'. Check the column name.");
        }
        OdeTableResult table = tableFor(block, values);
        return OdeAccessors.compute(table, function, column, arg);
    }

    private int ownerBlock(String column) {
        String col = column.toLowerCase();
        for (int i = 0; i < shapes.size(); i++) {
            if (ownsColumn(shapes.get(i), col)) {
                return i;
            }
        }
        return -1;
    }

    private OdeTableResult tableFor(int block, Map<String, Double> values) {
        List<Double> signature = signatureOf(block, values);
        CacheEntry cached = cache.get(block);
        if (cached != null && cached.signature().equals(signature)) {
            return cached.table();
        }
        // Remove the context while integrating so the block's own algebraic
        // solves can't re-enter accessor resolution.
        DynamicAccessorContext self = CURRENT.get();
        CURRENT.remove();
        try {
            OdeTableResult table = runner.run(systems.get(block), values);
            cache.put(block, new CacheEntry(signature, table));
            return table;
        } finally {
            CURRENT.set(self);
        }
    }

    private List<Double> signatureOf(int block, Map<String, Double> values) {
        List<Double> sig = new ArrayList<>();
        for (String v : shapes.get(block).inputVars()) {
            sig.add(values.get(v));
        }
        return sig;
    }
}
