package com.frees.backend.api;

import com.frees.backend.ast.Equation;
import com.frees.backend.ast.ParametricTable;
import com.frees.backend.ast.PlotDef;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.ast.StateTableDef;
import com.frees.backend.core.Block;
import com.frees.backend.core.ode.OdeTableResult;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Wire-format DTOs shared across the solve-family controllers, plus the static
 * converters that turn parsed solver/AST objects into those DTOs. Keeping them
 * here (rather than nested in {@code SolveController}) lets {@link CheckController}
 * and {@link OptimizeController} reuse the same response shapes without a
 * circular dependency on the solve controller.
 */
final class SolveDtos {

    private SolveDtos() {}

    public record VariableDto(String name, double value, String units, Double uncertainty) {
        public VariableDto(String name, double value, String units) {
            this(name, value, units, null);
        }
    }

    public record BlockDto(int index, List<String> equations, List<String> variables) {}

    public record ResidualDto(String equation, double value) {}

    public record StatsDto(int equations,
                           int unknowns,
                           int blocks,
                           int iterations,
                           long elapsedMillis,
                           double maxResidual) {}

    public record SolutionDto(List<VariableDto> variables, double maxResidual) {}

    /** One curve of a Function Table: family parameter value (null for a lone
     * curve) and [x, y] sample pairs. */
    public record FunctionCurveDto(Double param, List<List<Double>> points) {}

    /** A Function Table (Epic 8): the table name is the function name callable
     * from equations; argNames holds the column names (lookup argument
     * first, then the family parameter name, if any). */
    public record FunctionTableDto(String name,
                                   List<String> argNames,
                                   Boolean xLog,
                                   Boolean yLog,
                                   List<FunctionCurveDto> curves) {}

    /** A parametric run-table parsed from a PARAMETRIC ... END block: the
     * declared variables and the row-major value grid the frontend turns into
     * a Parametric Table. */
    public record ParametricTableDto(String name, List<String> vars, List<List<Double>> rows) {}

    /** An ODE Table produced by a solved DYNAMIC block: columns
     * {@code [time, states…, auxiliaries…]} and the sampled trajectory rows, plus
     * any event firings. Shaped like {@link ParametricTableDto} so the frontend
     * renders it in the Tables window and plots it through the parametric path. */
    public record OdeTableDto(String name, List<String> vars, List<List<Double>> rows,
                              List<OdeEventDto> events, String method, boolean stopped,
                              double endTime) {}

    public record OdeEventDto(String name, double time) {}

    /** A plot parsed from a PLOT 'name' ... END block: the name and a raw
     * attribute map the frontend maps onto its PlotSpec. */
    public record PlotDefDto(String name, Map<String, List<String>> attributes) {}

    /** A fluid state table parsed from a STATE TABLE ... END block: its name,
     * the declared state-point variables, and the fluid every state uses. */
    public record StateTableDto(String name, List<String> variables, String fluid) {}

    static BlockDto toBlockDto(Block block, Map<String, String> displayNames) {
        return new BlockDto(
                block.index(),
                block.equations().stream().map(Equation::sourceText).toList(),
                block.variables().stream()
                        .map(v -> displayNames.getOrDefault(v, v))
                        .toList());
    }

    /** Converts Function Table DTOs into solver definitions, keyed by the
     * case-insensitive function name. Curves are sorted ascending by x. */
    static Map<String, ProcDef> functionDefsOf(List<FunctionTableDto> tables) {
        if (tables == null || tables.isEmpty()) {
            return Map.of();
        }
        Map<String, ProcDef> defs = new HashMap<>();
        for (FunctionTableDto table : tables) {
            if (table.name() == null || table.name().isBlank() || table.curves() == null) {
                continue;
            }
            String name = table.name().trim().toLowerCase();
            List<ProcDef.Curve> curves = curvesOf(table);
            if (!curves.isEmpty()) {
                defs.put(name, new ProcDef.FunctionTableDef(name,
                        table.argNames() == null ? List.of() : table.argNames(),
                        Boolean.TRUE.equals(table.xLog()),
                        Boolean.TRUE.equals(table.yLog()),
                        curves));
            }
        }
        return defs;
    }

    /** Builds the sorted, validated curves for one Function Table DTO (curves
     *  needing fewer than two finite points are skipped). */
    private static List<ProcDef.Curve> curvesOf(FunctionTableDto table) {
        List<ProcDef.Curve> curves = new ArrayList<>();
        for (FunctionCurveDto curve : table.curves()) {
            List<List<Double>> pts = curve.points() == null ? List.of() : curve.points();
            List<List<Double>> valid = pts.stream()
                    .filter(p -> p != null && p.size() >= 2
                            && p.get(0) != null && p.get(1) != null)
                    .sorted(Comparator.comparingDouble(p -> p.get(0)))
                    .toList();
            if (valid.isEmpty()) {
                continue;
            }
            double[] xs = new double[valid.size()];
            double[] ys = new double[valid.size()];
            for (int i = 0; i < valid.size(); i++) {
                xs[i] = valid.get(i).get(0);
                ys[i] = valid.get(i).get(1);
            }
            curves.add(new ProcDef.Curve(curve.param(), xs, ys));
        }
        return curves;
    }

    static List<ParametricTableDto> parametricTablesOf(
            List<ParametricTable> tables) {
        List<ParametricTableDto> out = new ArrayList<>();
        for (ParametricTable t : tables) {
            out.add(new ParametricTableDto(t.name(), t.vars(), t.rows()));
        }
        return out;
    }

    static List<OdeTableDto> odeTablesOf(
            List<OdeTableResult> tables) {
        List<OdeTableDto> out = new ArrayList<>();
        for (OdeTableResult t : tables) {
            List<OdeEventDto> events = new ArrayList<>();
            for (OdeTableResult.EventHit e : t.events()) {
                events.add(new OdeEventDto(e.name(), e.time()));
            }
            out.add(new OdeTableDto(t.name(), t.columns(), t.rows(), events,
                    t.method(), t.stopped(), t.endTime()));
        }
        return out;
    }

    static List<PlotDefDto> plotsOf(List<PlotDef> plots) {
        List<PlotDefDto> out = new ArrayList<>();
        for (PlotDef p : plots) {
            out.add(new PlotDefDto(p.name(), p.attributes()));
        }
        return out;
    }

    static List<StateTableDto> stateTablesOf(List<StateTableDef> tables) {
        List<StateTableDto> out = new ArrayList<>();
        for (StateTableDef t : tables) {
            out.add(new StateTableDto(t.name(), t.variables(), t.fluid()));
        }
        return out;
    }

    /** Function tables parsed from the editor text (TABLE ... END blocks), in
     * the same wire format the GUI sends, so the frontend can show them in the
     * Tables window badged as defined-in-code. */
    static List<FunctionTableDto> codeTablesOf(Map<String, ProcDef> defs) {
        List<FunctionTableDto> out = new ArrayList<>();
        for (ProcDef def : defs.values()) {
            if (def instanceof ProcDef.FunctionTableDef td) {
                List<FunctionCurveDto> curves = new ArrayList<>();
                for (ProcDef.Curve c : td.curves()) {
                    List<List<Double>> points = new ArrayList<>();
                    for (int i = 0; i < c.xs().length; i++) {
                        points.add(List.of(c.xs()[i], c.ys()[i]));
                    }
                    curves.add(new FunctionCurveDto(c.param(), points));
                }
                out.add(new FunctionTableDto(td.name(), td.argNames(),
                        td.xLog(), td.yLog(), curves));
            }
        }
        return out;
    }
}
