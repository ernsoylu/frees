package com.frees.backend.api;

import com.frees.backend.core.Block;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.CurveFitter;
import com.frees.backend.core.Optimizer;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.core.VariableSpec;
import com.frees.backend.units.UnitRegistry;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.ast.Equation;
import com.frees.backend.ast.ProcDef;
import com.frees.backend.parser.MarkdownEquationExtractor;
import com.frees.backend.props.CoolProp;
import com.frees.backend.props.PropertyFunctions;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SolveController {

    /** Server-side ceilings on the client-supplied solve budget. They prevent a
     * request from pinning a worker thread indefinitely (a denial-of-service
     * guard): no single solve may run longer than this wall-clock time or more
     * than this many Newton iterations, whatever the request asks for. */
    static final int MAX_ITERATIONS_CAP = 10_000;
    static final double MAX_ELAPSED_SECONDS_CAP = 60.0;

    /** Default solve budget with the server-side ceilings applied, used when a
     * request omits stopCriteria entirely (so the cap can't be bypassed). */
    static SolverSettings cappedDefaults() {
        return new StopCriteriaDto(null, null, null, null, null).toSettings();
    }

    public record StopCriteriaDto(Integer maxIterations,
                                  Double relativeResiduals,
                                  Double changeInVariables,
                                  Double elapsedTimeSeconds,
                                  Boolean complexMode) {

        SolverSettings toSettings() {
            SolverSettings d = SolverSettings.DEFAULTS;
            int iterations = maxIterations != null ? maxIterations : d.maxIterations();
            double elapsed = elapsedTimeSeconds != null ? elapsedTimeSeconds : d.elapsedTimeSeconds();
            return new SolverSettings(
                    Math.min(Math.max(iterations, 1), MAX_ITERATIONS_CAP),
                    relativeResiduals != null ? relativeResiduals : d.relativeResiduals(),
                    changeInVariables != null ? changeInVariables : d.changeInVariables(),
                    Math.min(Math.max(elapsed, 0.0), MAX_ELAPSED_SECONDS_CAP),
                    complexMode != null ? complexMode : d.complexMode());
        }
    }
    public record VariableInfoDto(String name, Double guess, Double lower, Double upper,
                                  String units, Double uncertainty) {

        VariableSpec toSpec() {
            double factor = 1.0;
            double offset = 0.0;
            if (units != null && !units.isBlank() && !units.equals("-")) {
                try {
                    UnitRegistry.OffsetQuantity recorded = UnitRegistry.parseWithOffset(units);
                    factor = recorded.factor();
                    offset = recorded.offset();
                } catch (UnitRegistry.UnknownUnitException e) {
                    // Fall back to default factor 1.0, offset 0.0
                }
            }

            double lo = lower != null ? (lower * factor + offset) : Double.NEGATIVE_INFINITY;
            double hi = upper != null ? (upper * factor + offset) : Double.POSITIVE_INFINITY;
            double g = guess != null ? (guess * factor + offset)
                    : Math.clamp(VariableSpec.DEFAULT_GUESS, lo, hi);
            double unc = uncertainty != null ? (uncertainty * factor) : 0.0;
            return new VariableSpec(name, g, lo, hi, unc);
        }
    }

    public record SolveRequest(String text,
                               StopCriteriaDto stopCriteria,
                               List<VariableInfoDto> variableInfo,
                               Boolean findAllSolutions,
                               String displayUnitSystem,
                               Boolean fillMissing,
                               List<FunctionTableDto> functionTables) {}

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
            List<ProcDef.Curve> curves = new ArrayList<>();
            for (FunctionCurveDto curve : table.curves()) {
                List<List<Double>> pts = curve.points() == null ? List.of() : curve.points();
                List<List<Double>> valid = pts.stream()
                        .filter(p -> p != null && p.size() >= 2
                                && p.get(0) != null && p.get(1) != null)
                        .sorted(java.util.Comparator.comparingDouble(p -> p.get(0)))
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

    public record SolveResponse(boolean success,
                                List<VariableDto> variables,
                                List<BlockDto> blocks,
                                List<ResidualDto> residuals,
                                StatsDto stats,
                                List<SolutionDto> solutions,
                                List<String> unitWarnings,
                                String error,
                                List<String> formattedEquations,
                                List<Map<String, Double>> cyclePath,
                                String formattedReport,
                                List<FunctionTableDto> codeTables,
                                List<ParametricTableDto> parametricTables,
                                List<PlotDefDto> definedPlots,
                                // 1-based editor line a syntax error points at, or
                                // null for whole-system errors (no single line).
                                Integer errorLine,
                                List<StateTableDto> stateTableDefs) {

        /** Backward-compatible constructor for callers that predate state tables. */
        public SolveResponse(boolean success, List<VariableDto> variables,
                             List<BlockDto> blocks, List<ResidualDto> residuals,
                             StatsDto stats, List<SolutionDto> solutions,
                             List<String> unitWarnings, String error,
                             List<String> formattedEquations,
                             List<Map<String, Double>> cyclePath, String formattedReport,
                             List<FunctionTableDto> codeTables,
                             List<ParametricTableDto> parametricTables,
                             List<PlotDefDto> definedPlots, Integer errorLine) {
            this(success, variables, blocks, residuals, stats, solutions, unitWarnings,
                    error, formattedEquations, cyclePath, formattedReport, codeTables,
                    parametricTables, definedPlots, errorLine, List.of());
        }

        /** Backward-compatible constructor for the common no-error-line case. */
        public SolveResponse(boolean success, List<VariableDto> variables,
                             List<BlockDto> blocks, List<ResidualDto> residuals,
                             StatsDto stats, List<SolutionDto> solutions,
                             List<String> unitWarnings, String error,
                             List<String> formattedEquations,
                             List<Map<String, Double>> cyclePath, String formattedReport,
                             List<FunctionTableDto> codeTables,
                             List<ParametricTableDto> parametricTables,
                             List<PlotDefDto> definedPlots) {
            this(success, variables, blocks, residuals, stats, solutions, unitWarnings,
                    error, formattedEquations, cyclePath, formattedReport, codeTables,
                    parametricTables, definedPlots, null, List.of());
        }

        static SolveResponse failure(String error) {
            return failure(error, null);
        }

        static SolveResponse failure(String error, Integer errorLine) {
            return new SolveResponse(false, List.of(), List.of(), List.of(), null,
                    List.of(), List.of(), error, List.of(), List.of(), null, List.of(),
                    List.of(), List.of(), errorLine);
        }
    }

    /** A parametric run-table parsed from a PARAMETRIC ... END block: the
     * declared variables and the row-major value grid the frontend turns into
     * a Parametric Table. */
    public record ParametricTableDto(String name, List<String> vars, List<List<Double>> rows) {}

    static List<ParametricTableDto> parametricTablesOf(
            List<com.frees.backend.ast.ParametricTable> tables) {
        List<ParametricTableDto> out = new ArrayList<>();
        for (com.frees.backend.ast.ParametricTable t : tables) {
            out.add(new ParametricTableDto(t.name(), t.vars(), t.rows()));
        }
        return out;
    }

    /** A plot parsed from a PLOT 'name' ... END block: the name and a raw
     * attribute map the frontend maps onto its PlotSpec. */
    public record PlotDefDto(String name, Map<String, List<String>> attributes) {}

    static List<PlotDefDto> plotsOf(List<com.frees.backend.ast.PlotDef> plots) {
        List<PlotDefDto> out = new ArrayList<>();
        for (com.frees.backend.ast.PlotDef p : plots) {
            out.add(new PlotDefDto(p.name(), p.attributes()));
        }
        return out;
    }

    /** A fluid state table parsed from a STATE TABLE ... END block: its name,
     * the declared state-point variables, and the fluid every state uses. */
    public record StateTableDto(String name, List<String> variables, String fluid) {}

    static List<StateTableDto> stateTablesOf(List<com.frees.backend.ast.StateTableDef> tables) {
        List<StateTableDto> out = new ArrayList<>();
        for (com.frees.backend.ast.StateTableDef t : tables) {
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

    private static final String NO_EQUATIONS_MESSAGE = "No equations entered.";
    private static final String HMASS = "Hmass";
    private static final String SMASS = "Smass";
    private static final String DMASS = "Dmass";

    private final EquationSystemSolver solver;

    public SolveController(EquationSystemSolver solver) {
        this.solver = solver;
    }

    public record CheckResponse(boolean solvable,
                                int equations,
                                int unknowns,
                                List<String> variables,
                                List<String> unitWarnings,
                                Map<String, String> inferredUnits,
                                String message,
                                List<String> formattedEquations,
                                String formattedReport,
                                List<FunctionTableDto> codeTables,
                                List<ParametricTableDto> parametricTables,
                                List<PlotDefDto> definedPlots,
                                // 1-based editor line a syntax error points at, or
                                // null for whole-system errors (no single line).
                                Integer errorLine,
                                List<StateTableDto> stateTableDefs) {

        /** Backward-compatible constructor for callers that predate state tables. */
        public CheckResponse(boolean solvable, int equations, int unknowns,
                             List<String> variables, List<String> unitWarnings,
                             Map<String, String> inferredUnits, String message,
                             List<String> formattedEquations, String formattedReport,
                             List<FunctionTableDto> codeTables,
                             List<ParametricTableDto> parametricTables,
                             List<PlotDefDto> definedPlots, Integer errorLine) {
            this(solvable, equations, unknowns, variables, unitWarnings, inferredUnits,
                    message, formattedEquations, formattedReport, codeTables,
                    parametricTables, definedPlots, errorLine, List.of());
        }

        /** Backward-compatible constructor for the common no-error-line case. */
        public CheckResponse(boolean solvable, int equations, int unknowns,
                             List<String> variables, List<String> unitWarnings,
                             Map<String, String> inferredUnits, String message,
                             List<String> formattedEquations, String formattedReport,
                             List<FunctionTableDto> codeTables,
                             List<ParametricTableDto> parametricTables,
                             List<PlotDefDto> definedPlots) {
            this(solvable, equations, unknowns, variables, unitWarnings, inferredUnits,
                    message, formattedEquations, formattedReport, codeTables,
                    parametricTables, definedPlots, null, List.of());
        }
    }

    /** ANTLR syntax errors are formatted "line L:C msg" by CollectingErrorListener.
     * Because the extractor's cleanText is line-for-line aligned with the editor
     * text, that line number is also the editor line. Returns the 1-based line of
     * the first error, or null if none can be parsed. */
    private static final java.util.regex.Pattern ERROR_LINE_PATTERN =
            java.util.regex.Pattern.compile("^line (\\d+):");

    static Integer parseErrorLine(String message) {
        if (message == null) {
            return null;
        }
        String first = message.lines().findFirst().orElse(message).trim();
        java.util.regex.Matcher m = ERROR_LINE_PATTERN.matcher(first);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private static Map<String, String> unitsByVariable(List<VariableInfoDto> variableInfo) {
        Map<String, String> units = new HashMap<>();
        if (variableInfo != null) {
            for (VariableInfoDto dto : variableInfo) {
                if (dto.name() != null && dto.units() != null && !dto.units().isBlank()) {
                    units.put(dto.name().toLowerCase(), dto.units());
                }
            }
        }
        return units;
    }

    private Map<String, String> effectiveUnits(String text, List<VariableInfoDto> variableInfo) {
        Map<String, String> units = new HashMap<>();
        solver.inferUnits(text)
                .forEach((name, unit) -> units.put(name.toLowerCase(), unit));
        units.putAll(unitsByVariable(variableInfo));
        return units;
    }

    /** Declared + inferred + dimensionally derived units, keyed lowercase. */
    private Map<String, String> unitsByLowerName(String text,
                                                 List<VariableInfoDto> variableInfo) {
        Map<String, String> units = effectiveUnits(text, variableInfo);
        Map<String, String> byLower = new HashMap<>();
        solver.deriveUnits(text, units)
                .forEach((name, unit) -> byLower.put(name.toLowerCase(), unit));
        units.forEach((name, unit) -> byLower.put(name.toLowerCase(), unit));
        return byLower;
    }

    private static VariableDto toDisplay(String name, double siValue, Double siUnc, String unit,
                                         UnitRegistry.UnitSystem system,
                                         Map<String, String> explicitUnits) {
        double displayVal;
        double displayUnc = siUnc != null ? siUnc : 0.0;
        String displayUnit;
        
        if (unit == null || unit.isBlank() || unit.equals("-")) {
            displayVal = siValue;
            displayUnit = unit == null ? "" : unit;
        } else {
            UnitRegistry.OffsetQuantity recorded;
            try {
                recorded = UnitRegistry.parseWithOffset(unit);
                if (explicitUnits != null && explicitUnits.containsKey(name.toLowerCase())) {
                    displayVal = (siValue - recorded.offset()) / recorded.factor();
                    displayUnc = siUnc != null ? siUnc / recorded.factor() : 0.0;
                    displayUnit = unit;
                } else {
                    UnitRegistry.DisplayUnit preferred =
                            UnitRegistry.preferredDisplayUnit(recorded.dims(), system);
                    if (preferred != null) {
                        displayVal = (siValue - preferred.offset()) / preferred.factor();
                        displayUnc = siUnc != null ? siUnc / preferred.factor() : 0.0;
                        displayUnit = preferred.name();
                    } else {
                        displayVal = (siValue - recorded.offset()) / recorded.factor();
                        displayUnc = siUnc != null ? siUnc / recorded.factor() : 0.0;
                        displayUnit = unit;
                    }
                }
            } catch (UnitRegistry.UnknownUnitException e) {
                displayVal = siValue;
                displayUnit = unit;
            }
        }
        return new VariableDto(name, displayVal, displayUnit, siUnc != null ? displayUnc : null);
    }

    private static VariableDto toDisplay(String name, double siValue, String unit,
                                         UnitRegistry.UnitSystem system,
                                         Map<String, String> explicitUnits) {
        return toDisplay(name, siValue, null, unit, system, explicitUnits);
    }

    private static UnitRegistry.UnitSystem unitSystem(String requested) {
        if (requested == null) {
            return UnitRegistry.UnitSystem.SI;
        }
        try {
            return UnitRegistry.UnitSystem.valueOf(requested.toUpperCase());
        } catch (IllegalArgumentException e) {
            return UnitRegistry.UnitSystem.SI;
        }
    }

    @PostMapping("/check")
    public ResponseEntity<CheckResponse> check(@RequestBody SolveRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest().body(new CheckResponse(false, 0, 0, List.of(), List.of(),
                    Map.of(), NO_EQUATIONS_MESSAGE, List.of(), null, List.of(), List.of(), List.of()));
        }
        try {
            boolean complexMode = request.stopCriteria() != null && Boolean.TRUE.equals(request.stopCriteria().complexMode());
            var extraction = MarkdownEquationExtractor.extract(request.text());
            String cleanText = extraction.cleanText;

            EquationSystemSolver.CheckResult result = solver.check(cleanText, complexMode,
                    functionDefsOf(request.functionTables()));
            Map<String, String> effective = effectiveUnits(cleanText, request.variableInfo());
            Map<String, String> inferredUnits =
                    new HashMap<>(solver.deriveUnits(cleanText, effective));
            inferredUnits.putAll(solver.inferUnits(cleanText));
            List<String> unitWarnings = solver.checkUnits(cleanText, effective);

            EquationParser.ParseResult parsed = new EquationParser().parseResult(cleanText);
            List<String> formattedEquations = parsed.equations().stream()
                    .map(eq -> com.frees.backend.parser.LatexConverter.toLatex(eq, parsed.displayNames()))
                    .toList();

            String formattedReport = MarkdownEquationExtractor.generateFormattedReport(request.text(), extraction.equations, formattedEquations);

            return ResponseEntity.ok(new CheckResponse(
                    result.solvable(),
                    result.equationCount(),
                    result.unknownCount(),
                    result.variables(),
                    unitWarnings,
                    inferredUnits,
                    result.message(),
                    formattedEquations,
                    formattedReport,
                    codeTablesOf(parsed.defs()),
                    parametricTablesOf(parsed.parametricTables()),
                    plotsOf(parsed.plots()),
                    null,
                    stateTablesOf(parsed.stateTables())));
        } catch (EquationParser.ParseException e) {
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.badRequest().body(new CheckResponse(
                    false, 0, 0, List.of(), List.of(), Map.of(),
                    "Syntax error: " + firstError, List.of(), null, List.of(), List.of(), List.of(),
                    parseErrorLine(e.getMessage())));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new CheckResponse(
                            false, 0, 0, List.of(), List.of(), Map.of(),
                            e.getMessage() != null ? e.getMessage() : e.toString(), List.of(), null, List.of(), List.of(), List.of()));
        }
    }

    @PostMapping("/solve")
    public ResponseEntity<SolveResponse> solve(@RequestBody SolveRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure(NO_EQUATIONS_MESSAGE));
        }
        try {
            SolverSettings settings = request.stopCriteria() != null
                    ? request.stopCriteria().toSettings()
                    : cappedDefaults();
            Map<String, VariableSpec> specs = specsOf(request.variableInfo());
            boolean findAll = Boolean.TRUE.equals(request.findAllSolutions());

            var extraction = MarkdownEquationExtractor.extract(request.text());
            String cleanText = extraction.cleanText;

            Map<String, ProcDef> functionDefs = functionDefsOf(request.functionTables());
            EquationSystemSolver.Result rawResult = findAll
                    ? solver.solveAll(cleanText, settings, specs, functionDefs)
                    : solver.solve(cleanText, settings, specs, functionDefs);
            final EquationSystemSolver.Result result;
            List<Map<String, Double>> cyclePath = List.of();
            if (Boolean.TRUE.equals(request.fillMissing())) {
                result = resolveMissingProperties(rawResult, cleanText, null);
                String fluid = PropertyFunctions.detectFluid(cleanText);
                if (fluid == null) {
                    fluid = "Water";
                }
                cyclePath = generateCyclePath(result.variables(), fluid);
            } else {
                result = rawResult;
            }

            Map<String, String> explicitUnits = unitsByVariable(request.variableInfo());
            List<String> unitWarnings = solver.checkUnits(cleanText,
                    effectiveUnits(cleanText, request.variableInfo()));
            Map<String, String> unitsByLowerName =
                    unitsByLowerName(cleanText, request.variableInfo());
            UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());

            EquationParser.ParseResult parsed = new EquationParser().parseResult(cleanText);
            List<String> formattedEquations = parsed.equations().stream()
                    .map(eq -> com.frees.backend.parser.LatexConverter.toLatex(eq, parsed.displayNames()))
                    .toList();

            String formattedReport = MarkdownEquationExtractor.generateFormattedReport(request.text(), extraction.equations, formattedEquations);

            return ResponseEntity.ok(new SolveResponse(
                    true,
                    result.variables().entrySet().stream()
                            .filter(e -> !isInternalTemp(e.getKey()))
                            .map(e -> {
                                String canonicalName = e.getKey().toLowerCase();
                                Double siUnc = result.uncertainties() != null ? result.uncertainties().get(canonicalName) : null;
                                return toDisplay(e.getKey(), e.getValue(), siUnc,
                                        unitsByLowerName.getOrDefault(canonicalName, ""),
                                        system,
                                        explicitUnits);
                            })
                            .toList(),
                    result.blocks().stream()
                            .map(b -> toBlockDto(b, result.displayNames()))
                            .toList(),
                    result.residuals().stream()
                            .map(r -> new ResidualDto(r.equation(), r.residual()))
                            .toList(),
                    new StatsDto(
                            result.stats().equationCount(),
                            result.stats().unknownCount(),
                            result.stats().blockCount(),
                            result.stats().iterations(),
                            result.stats().elapsedMillis(),
                            result.stats().maxResidual()),
                    result.solutions().stream()
                            .map(s -> new SolutionDto(
                                    s.variables().entrySet().stream()
                                            .filter(e -> !isInternalTemp(e.getKey()))
                                            .map(e -> {
                                                String canonicalName = e.getKey().toLowerCase();
                                                Double siUnc = result.uncertainties() != null ? result.uncertainties().get(canonicalName) : null;
                                                return toDisplay(e.getKey(), e.getValue(), siUnc,
                                                        unitsByLowerName.getOrDefault(canonicalName, ""),
                                                        system,
                                                        explicitUnits);
                                            })
                                            .toList(),
                                    s.maxResidual()))
                            .toList(),
                    unitWarnings,
                    null,
                    formattedEquations,
                    cyclePath,
                    formattedReport,
                    codeTablesOf(parsed.defs()),
                    parametricTablesOf(parsed.parametricTables()),
                    plotsOf(parsed.plots()),
                    null,
                    stateTablesOf(parsed.stateTables())));
        } catch (EquationParser.ParseException e) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure("Syntax error:\n" + e.getMessage(),
                            parseErrorLine(e.getMessage())));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(SolveResponse.failure(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(SolveResponse.failure(e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    /** Prefixes of helper unknowns the matrix library materializes for a matrix
     * function used inside a larger expression (e.g. {@code x = Inverse(A) * b}).
     * They are real solver variables but an implementation detail, so they are
     * filtered out of the user-facing solution. A direct assignment like
     * {@code C = Inverse(A)} writes its output directly and never creates one. */
    private static final List<String> INTERNAL_TEMP_PREFIXES =
            List.of("inverse_temp_", "backslash_temp_", "solvelinear_temp_");

    /** True for an indexed element of an internal matrix-library temporary,
     * e.g. {@code inverse_temp_12[1,2]}. Matches on the canonical name (its
     * base index, before any '['), so a user variable such as {@code motor_temp_5}
     * is never affected. */
    private static boolean isInternalTemp(String name) {
        int bracket = name.indexOf('[');
        String base = (bracket >= 0 ? name.substring(0, bracket) : name).toLowerCase();
        for (String prefix : INTERNAL_TEMP_PREFIXES) {
            if (base.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    public record TableDto(
            List<String> variables,
            List<Map<String, Double>> rows
    ) {}

    public record SolveTableRequest(
            String text,
            StopCriteriaDto stopCriteria,
            List<VariableInfoDto> variableInfo,
            String displayUnitSystem,
            TableDto table,
            List<FunctionTableDto> functionTables
    ) {}

    public record TableRowResult(
            boolean success,
            Map<String, Double> values,
            String error
    ) {}

    public record TableStatsDto(
            int runs,
            int solved,
            int failed,
            int equations,
            int unknowns,
            int iterations,
            long elapsedMillis,
            double maxResidual
    ) {}

    public record SolveTableResponse(
            List<TableRowResult> results,
            TableStatsDto stats
    ) {}

    @PostMapping("/solve/table")
    public ResponseEntity<SolveTableResponse> solveTable(@RequestBody SolveTableRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.table() == null || request.table().rows() == null) {
            return ResponseEntity.badRequest().build();
        }

        var extraction = MarkdownEquationExtractor.extract(request.text());
        String cleanText = extraction.cleanText;

        SolverSettings settings = request.stopCriteria() != null
                ? request.stopCriteria().toSettings()
                : cappedDefaults();
        Map<String, VariableSpec> specs = specsOf(request.variableInfo());
        Map<String, String> unitsByLowerName =
                unitsByLowerName(cleanText, request.variableInfo());
        UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());
        Map<String, String> explicitUnits =
                unitsByVariable(request.variableInfo());

        long startNanos = System.nanoTime();
        int totalIterations = 0;
        int equations = 0;
        int unknowns = 0;
        double maxResidual = 0.0;

        TableRowContext context = new TableRowContext(
                cleanText, settings, specs, unitsByLowerName, system,
                request.table().variables(), explicitUnits,
                functionDefsOf(request.functionTables())
        );

        List<TableRowResult> results = new ArrayList<>();
        for (Map<String, Double> row : request.table().rows()) {
            RowOutcome outcome = solveTableRow(row, context);
            results.add(outcome.row());
            if (outcome.stats() != null) {
                totalIterations += outcome.stats().iterations();
                maxResidual = Math.max(maxResidual, outcome.stats().maxResidual());
                equations = outcome.stats().equationCount();
                unknowns = outcome.stats().unknownCount();
            }
        }

        int solved = (int) results.stream().filter(TableRowResult::success).count();
        TableStatsDto stats = new TableStatsDto(
                results.size(),
                solved,
                results.size() - solved,
                equations,
                unknowns,
                totalIterations,
                (System.nanoTime() - startNanos) / 1_000_000,
                maxResidual);

        return ResponseEntity.ok(new SolveTableResponse(results, stats));
    }

    private record RowOutcome(TableRowResult row, EquationSystemSolver.Stats stats) {}

    private record TableRowContext(
            String text,
            SolverSettings settings,
            Map<String, VariableSpec> specs,
            Map<String, String> unitsByLowerName,
            UnitRegistry.UnitSystem system,
            List<String> tableVariables,
            Map<String, String> explicitUnits,
            Map<String, ProcDef> functionDefs
    ) {}

    /** One parametric-table run: non-null cells are fixed, the rest solved. */
    private RowOutcome solveTableRow(Map<String, Double> row, TableRowContext context) {
        StringBuilder sb = new StringBuilder(context.text());
        for (Map.Entry<String, Double> entry : row.entrySet()) {
            if (entry.getValue() != null) {
                sb.append("\n").append(entry.getKey()).append(" = ").append(entry.getValue());
            }
        }
        try {
            EquationSystemSolver.Result result = solver.solve(sb.toString(),
                    context.settings(), context.specs(), context.functionDefs());
            java.util.Set<String> targetVars = new java.util.HashSet<>(context.tableVariables());
            result = resolveMissingProperties(result, sb.toString(), targetVars);
            Map<String, Double> rowValues = new HashMap<>();
            for (Map.Entry<String, Double> e : result.variables().entrySet()) {
                String name = e.getKey();
                String unit = context.unitsByLowerName().getOrDefault(name.toLowerCase(), "");
                rowValues.put(name, toDisplay(name, e.getValue(), unit, context.system(), context.explicitUnits()).value());
            }
            return new RowOutcome(new TableRowResult(true, rowValues, null), result.stats());
        } catch (Exception e) {
            return new RowOutcome(new TableRowResult(false, Map.of(), e.getMessage()), null);
        }
    }

    public record OptimizeRequest(String text,
                                  StopCriteriaDto stopCriteria,
                                  List<VariableInfoDto> variableInfo,
                                  String displayUnitSystem,
                                  String objective,
                                  String decision,
                                  Double lower,
                                  Double upper,
                                  Boolean maximize,
                                  List<String> decisions,
                                  List<Double> lowers,
                                  List<Double> uppers,
                                  String method,
                                  List<String> constraints) {}

    public record OptimizeResponse(boolean success,
                                   String error,
                                   String warning,
                                   VariableDto objective,
                                   VariableDto decision,
                                   List<VariableDto> decisions,
                                   int evaluations,
                                   List<VariableDto> variables) {

        static OptimizeResponse failure(String error) {
            return new OptimizeResponse(false, error, null, null, null, null, 0, List.of());
        }
    }

    private static Map<String, VariableSpec> specsOf(List<VariableInfoDto> variableInfo) {
        Map<String, VariableSpec> specs = new HashMap<>();
        if (variableInfo != null) {
            for (VariableInfoDto dto : variableInfo) {
                if (dto.name() != null && !dto.name().isBlank()) {
                    VariableSpec spec = dto.toSpec();
                    specs.put(spec.name(), spec);
                }
            }
        }
        return specs;
    }

    @PostMapping("/optimize")
    public ResponseEntity<OptimizeResponse> optimize(@RequestBody OptimizeRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest().body(OptimizeResponse.failure(NO_EQUATIONS_MESSAGE));
        }

        List<String> decisions = request.decisions();
        List<Double> lowers = request.lowers();
        List<Double> uppers = request.uppers();
        String method = request.method() != null ? request.method() : "brent";

        if (decisions == null || decisions.isEmpty()) {
            if (request.decision() == null) {
                return ResponseEntity.badRequest().body(OptimizeResponse.failure(
                        "Independent variable name is required."));
            }
            if (request.lower() == null || request.upper() == null) {
                return ResponseEntity.badRequest().body(OptimizeResponse.failure(
                        "Both bounds of the independent variable are required."));
            }
            decisions = List.of(request.decision());
            lowers = List.of(request.lower());
            uppers = List.of(request.upper());
        } else {
            if (lowers == null || uppers == null || lowers.size() != decisions.size() || uppers.size() != decisions.size()) {
                return ResponseEntity.badRequest().body(OptimizeResponse.failure(
                        "Each independent variable requires lower and upper bounds."));
            }
        }

        var extraction = MarkdownEquationExtractor.extract(request.text());
        String cleanText = extraction.cleanText;

        SolverSettings settings = request.stopCriteria() != null
                ? request.stopCriteria().toSettings()
                : cappedDefaults();
        try {
            List<String> constraints = request.constraints() != null
                    ? request.constraints() : List.of();
            Optimizer.OptimizeResult result = new Optimizer(solver).optimize(
                    new Optimizer.Problem(cleanText, settings,
                            specsOf(request.variableInfo()),
                            request.objective(), decisions,
                            lowers, uppers, method,
                            Boolean.TRUE.equals(request.maximize()),
                            constraints));

            Map<String, String> explicitUnits =
                    unitsByVariable(request.variableInfo());
            Map<String, String> unitsByLowerName =
                    unitsByLowerName(cleanText, request.variableInfo());
            UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());

            List<VariableDto> variables = result.solution().variables().entrySet().stream()
                    .map(e -> toDisplay(e.getKey(), e.getValue(),
                            unitsByLowerName.getOrDefault(e.getKey().toLowerCase(), ""),
                            system,
                            explicitUnits))
                    .toList();
            VariableDto objective = toDisplay(request.objective(),
                    result.objectiveValue(),
                    unitsByLowerName.getOrDefault(request.objective().toLowerCase(), ""),
                    system,
                    explicitUnits);

            List<VariableDto> decisionDtos = new ArrayList<>();
            for (int i = 0; i < decisions.size(); i++) {
                String dec = decisions.get(i);
                decisionDtos.add(toDisplay(dec,
                        result.decisionValues()[i],
                        unitsByLowerName.getOrDefault(dec.toLowerCase(), ""),
                        system,
                        explicitUnits));
            }

            VariableDto primaryDecision = decisionDtos.get(0);

            return ResponseEntity.ok(new OptimizeResponse(true, null, result.warning(),
                    objective, primaryDecision, decisionDtos, result.evaluations(), variables));
        } catch (EquationParser.ParseException e) {
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.badRequest().body(OptimizeResponse.failure("Syntax error: " + firstError));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(OptimizeResponse.failure(e.getMessage()));
        }
    }

    // ── Curve Fit (Story 9.7) ────────────────────────────────────────────────

    public record CurveFitRequest(
            String model,
            String yVariable,
            String xVariable,
            List<String> parameters,
            List<Double> xData,
            List<Double> yData,
            List<Double> initialGuess,
            List<Double> lowerBounds,
            List<Double> upperBounds) {}

    public record CurveFitResponse(
            boolean success,
            String error,
            List<Double> fittedParameters,
            List<String> parameterNames,
            double rSquared,
            double rmse,
            int iterations,
            List<Double> residuals,
            List<Double> fittedValues) {

        static CurveFitResponse failure(String error) {
            return new CurveFitResponse(false, error, List.of(), List.of(),
                    0.0, 0.0, 0, List.of(), List.of());
        }
    }

    @PostMapping("/curve-fit")
    public ResponseEntity<CurveFitResponse> curveFit(@RequestBody CurveFitRequest request) {
        if (request.model() == null || request.model().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(CurveFitResponse.failure("Model equation is required."));
        }
        if (request.xVariable() == null || request.xVariable().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(CurveFitResponse.failure("Independent variable name is required."));
        }
        if (request.yVariable() == null || request.yVariable().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(CurveFitResponse.failure("Dependent variable name is required."));
        }
        if (request.parameters() == null || request.parameters().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(CurveFitResponse.failure("At least one parameter to fit is required."));
        }
        if (request.xData() == null || request.yData() == null
                || request.xData().isEmpty() || request.yData().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(CurveFitResponse.failure("Data points are required."));
        }
        if (request.xData().size() != request.yData().size()) {
            return ResponseEntity.badRequest()
                    .body(CurveFitResponse.failure(
                            "x and y data must have the same length (got "
                            + request.xData().size() + " and " + request.yData().size() + ")."));
        }

        try {
            CurveFitter fitter = new CurveFitter();
            CurveFitter.FitResult result = fitter.fit(
                    request.model(),
                    request.yVariable(),
                    request.xVariable(),
                    request.parameters(),
                    request.xData(),
                    request.yData(),
                    request.initialGuess(),
                    request.lowerBounds(),
                    request.upperBounds());

            List<Double> fittedParams = new java.util.ArrayList<>();
            for (double v : result.fittedParameters()) fittedParams.add(v);
            List<Double> residuals = new java.util.ArrayList<>();
            for (double v : result.residuals()) residuals.add(v);
            List<Double> fittedVals = new java.util.ArrayList<>();
            for (double v : result.fittedValues()) fittedVals.add(v);

            return ResponseEntity.ok(new CurveFitResponse(
                    true, null,
                    fittedParams,
                    result.parameterNames(),
                    result.rSquared(),
                    result.rmse(),
                    result.iterations(),
                    residuals,
                    fittedVals));
        } catch (EquationParser.ParseException e) {
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.badRequest()
                    .body(CurveFitResponse.failure("Syntax error: " + firstError));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(CurveFitResponse.failure(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(CurveFitResponse.failure(
                            "Curve fitting failed: " + e.getMessage()));
        }
    }

    private static BlockDto toBlockDto(Block block, Map<String, String> displayNames) {
        return new BlockDto(
                block.index(),
                block.equations().stream().map(Equation::sourceText).toList(),
                block.variables().stream()
                        .map(v -> displayNames.getOrDefault(v, v))
                        .toList());
    }

    private record PropPair(String key1, String valKey1, String key2, String valKey2) {}

    private static final Map<String, String> PROPERTY_ALIASES = Map.ofEntries(
            Map.entry("t", "T"),
            Map.entry("drybulb", "T"),
            Map.entry("tdrybulb", "T"),
            Map.entry("p", "P"),
            Map.entry("pressure", "P"),
            Map.entry("v", "v"),
            Map.entry("volume", "v"),
            Map.entry("u", "u"),
            Map.entry("internalenergy", "u"),
            Map.entry("h", "h"),
            Map.entry("enthalpy", "h"),
            Map.entry("s", "s"),
            Map.entry("entropy", "s"),
            Map.entry("x", "x"),
            Map.entry("quality", "x"),
            Map.entry("rho", "rho"),
            Map.entry("density", "rho")
    );

    /** Property symbols, longest first, for leading-prefix matching of declared
     * state-table variables (so {@code rho...} beats {@code r...}, etc.). */
    private static final List<String> PROPERTY_PREFIXES = PROPERTY_ALIASES.keySet().stream()
            .sorted((a, b) -> Integer.compare(b.length(), a.length()))
            .toList();

    private static final java.util.regex.Pattern BLOCK_BRACKET_STATE =
            java.util.regex.Pattern.compile("^([a-zA-Z][a-zA-Z_]*)\\[(\\d+)\\]$");
    private static final java.util.regex.Pattern BLOCK_PLAIN_STATE =
            java.util.regex.Pattern.compile("^([a-zA-Z][a-zA-Z_]*?)(_?)(\\d+)$");

    private static final List<PropPair> PREFERRED_PAIRS = List.of(
            new PropPair("P", "P", "h", HMASS),
            new PropPair("P", "P", "s", SMASS),
            new PropPair("h", HMASS, "s", SMASS),
            new PropPair("P", "P", "x", "Q"),
            new PropPair("T", "T", "x", "Q"),
            new PropPair("T", "T", "P", "P"),
            new PropPair("T", "T", "s", SMASS),
            new PropPair("T", "T", "h", HMASS),
            new PropPair("P", "P", "v", DMASS),
            new PropPair("T", "T", "v", DMASS),
            new PropPair("P", "P", "rho", DMASS),
            new PropPair("T", "T", "rho", DMASS)
    );

    private static double getPropOrNaN(String output, String name1, double prop1, String name2, double prop2, String fluid) {
        try {
            return CoolProp.propsSIOrNaN(output, name1, prop1, name2, prop2, fluid);
        } catch (Exception e) {
            return Double.NaN;
        }
    }

    private EquationSystemSolver.Result resolveMissingProperties(EquationSystemSolver.Result result, String text, java.util.Set<String> targetVariables) {
        if (!CoolProp.isAvailable()) {
            return result;
        }
        String fluid = PropertyFunctions.detectFluid(text);
        if (fluid == null) {
            fluid = "Water";
        }

        // Explicit STATE TABLE blocks (if any) drive fluid-aware, per-circuit
        // grouping; otherwise fall back to the legacy global index detection.
        List<com.frees.backend.ast.StateTableDef> stateTables = List.of();
        try {
            stateTables = new EquationParser().parseResult(text).stateTables();
        } catch (RuntimeException ignored) {
            // text is still valid here (it solved); be defensive regardless.
        }

        // 1. Resolve variables of the main result
        Map<String, Double> mutableVars = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        mutableVars.putAll(result.variables());

        Map<String, String> mutableDisplayNames = new HashMap<>(result.displayNames());

        resolveStates(mutableVars, mutableDisplayNames, fluid, targetVariables, stateTables);

        // 2. Resolve variables of all solutions
        List<EquationSystemSolver.Solution> resolvedSolutions = new ArrayList<>();
        for (EquationSystemSolver.Solution sol : result.solutions()) {
            Map<String, Double> solVars = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            solVars.putAll(sol.variables());
            resolveStates(solVars, mutableDisplayNames, fluid, targetVariables, stateTables);
            resolvedSolutions.add(new EquationSystemSolver.Solution(solVars, sol.residuals(), sol.maxResidual()));
        }

        return new EquationSystemSolver.Result(
                mutableVars,
                result.blocks(),
                result.residuals(),
                result.stats(),
                resolvedSolutions,
                mutableDisplayNames,
                result.uncertainties()
        );
    }

    private static class StateData {
        final Map<Integer, Map<String, Double>> stateKnowns = new HashMap<>();
        final Map<Integer, String> stateStyle = new HashMap<>();
    }

    private void parseAndPopulateState(String name, Double value, StateData data, java.util.regex.Pattern pattern) {
        java.util.regex.Matcher m = pattern.matcher(name);
        if (!m.matches()) {
            return;
        }
        String propName = (m.group(1) != null) ? m.group(1) : m.group(3);
        String idxStr = (m.group(2) != null) ? m.group(2) : m.group(4);
        int index = Integer.parseInt(idxStr);

        String base = propName.replace("_", "").toLowerCase();
        String canonicalProp = PROPERTY_ALIASES.get(base);
        if (canonicalProp == null) {
            return;
        }
        data.stateKnowns.computeIfAbsent(index, k -> new HashMap<>()).put(canonicalProp, value);

        if (!data.stateStyle.containsKey(index)) {
            String template;
            if (name.contains("[")) {
                template = "%s[" + index + "]";
            } else if (name.contains("_")) {
                template = "%s_" + index;
            } else {
                template = "%s" + index;
            }
            data.stateStyle.put(index, template);
        }
    }

    private StateData parseStateVariables(Map<String, Double> variables) {
        StateData data = new StateData();
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "^([a-zA-Z][a-zA-Z_]*?)_?(\\d+)$|^([a-zA-Z][a-zA-Z_]*)\\[(\\d+)\\]$");

        for (Map.Entry<String, Double> entry : variables.entrySet()) {
            parseAndPopulateState(entry.getKey(), entry.getValue(), data, pattern);
        }
        return data;
    }

    private PropPair findMatchedPair(Map<String, Double> knowns) {
        for (PropPair pair : PREFERRED_PAIRS) {
            if (knowns.containsKey(pair.key1()) && knowns.containsKey(pair.key2())) {
                return pair;
            }
        }
        return null;
    }

    private boolean shouldSkipProp(String prop, String template, java.util.Set<String> targetVariables) {
        if (targetVariables == null) {
            return false;
        }
        String casedProp = prop;
        if ("rho".equals(prop)) {
            casedProp = "rho";
        } else if ("v".equals(prop) || "h".equals(prop) || "s".equals(prop) || "u".equals(prop) || "x".equals(prop)) {
            casedProp = prop.toLowerCase();
        } else if ("T".equals(prop) || "P".equals(prop)) {
            casedProp = prop.toUpperCase();
        }
        String varName = String.format(template, casedProp);
        return !containsIgnoreCase(targetVariables, varName);
    }


    private void populateSolvedProperties(Map<String, Double> solvedProps, String template, Map<String, Double> variables, Map<String, String> displayNames) {
        for (Map.Entry<String, Double> solved : solvedProps.entrySet()) {
            String propName = solved.getKey();
            String casedProp = propName;
            if ("rho".equals(propName)) {
                casedProp = "rho";
            } else if ("v".equals(propName) || "h".equals(propName) || "s".equals(propName) || "u".equals(propName) || "x".equals(propName)) {
                casedProp = propName.toLowerCase();
            } else if ("T".equals(propName) || "P".equals(propName)) {
                casedProp = propName.toUpperCase();
            }

            String varName = String.format(template, casedProp);
            variables.put(varName, solved.getValue());
            displayNames.put(varName.toLowerCase(), varName);
        }
    }

    private void solveSingleState(Map<String, Double> knowns, String template, Map<String, Double> variables, Map<String, String> displayNames, String fluid, java.util.Set<String> targetVariables) {
        PropPair matchedPair = findMatchedPair(knowns);
        if (matchedPair == null) {
            return;
        }

        double inputVal1 = knowns.get(matchedPair.key1());
        double inputVal2 = knowns.get(matchedPair.key2());
        double propVal1 = "v".equals(matchedPair.key1()) ? 1.0 / inputVal1 : inputVal1;
        double propVal2 = "v".equals(matchedPair.key2()) ? 1.0 / inputVal2 : inputVal2;

        Map<String, Double> solvedProps = new HashMap<>();
        Map<String, String> outputs = Map.of(
                "T", "T",
                "P", "P",
                "h", HMASS,
                "s", SMASS,
                "u", "Umass",
                "rho", DMASS
        );

        for (Map.Entry<String, String> out : outputs.entrySet()) {
            String canonical = out.getKey();
            if (knowns.containsKey(canonical) || shouldSkipProp(canonical, template, targetVariables)) {
                continue;
            }
            double res = getPropOrNaN(out.getValue(), matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
            if (Double.isFinite(res)) {
                solvedProps.put(canonical, res);
            }
        }

        // Specific volume v = 1 / Dmass
        if (!knowns.containsKey("v") && !shouldSkipProp("v", template, targetVariables)) {
            double resDmass = solvedProps.containsKey("rho") ? solvedProps.get("rho") :
                    getPropOrNaN(DMASS, matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
            if (Double.isFinite(resDmass) && resDmass != 0.0) {
                solvedProps.put("v", 1.0 / resDmass);
            }
        }

        // Quality x = Q
        if (!knowns.containsKey("x") && !shouldSkipProp("x", template, targetVariables)) {
            double resQ = getPropOrNaN("Q", matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
            if (Double.isFinite(resQ)) {
                solvedProps.put("x", resQ);
            }
        }

        populateSolvedProperties(solvedProps, template, variables, displayNames);
    }

    private void resolveForVariables(Map<String, Double> variables, Map<String, String> displayNames, String fluid, java.util.Set<String> targetVariables) {
        StateData data = parseStateVariables(variables);

        for (Map.Entry<Integer, Map<String, Double>> entry : data.stateKnowns.entrySet()) {
            int index = entry.getKey();
            Map<String, Double> knowns = entry.getValue();
            if (knowns.size() < 2) {
                continue;
            }

            String template = data.stateStyle.get(index);
            if (template != null) {
                solveSingleState(knowns, template, variables, displayNames, fluid, targetVariables);
            }
        }
    }

    /** Dispatch missing-property resolution: when STATE TABLE blocks are
     * declared, resolve each block's states with that block's fluid (so a
     * Water circuit's P1 and a R134a circuit's P1 never collide); otherwise use
     * the legacy global index-based detection. */
    private void resolveStates(Map<String, Double> variables, Map<String, String> displayNames,
                               String defaultFluid, java.util.Set<String> targetVariables,
                               List<com.frees.backend.ast.StateTableDef> stateTables) {
        if (stateTables.isEmpty()) {
            resolveForVariables(variables, displayNames, defaultFluid, targetVariables);
            return;
        }
        for (com.frees.backend.ast.StateTableDef st : stateTables) {
            String fluid = (st.fluid() != null && !st.fluid().isBlank()) ? st.fluid() : defaultFluid;
            resolveBlockStates(variables, displayNames, st.variables(), fluid, targetVariables);
        }
    }

    /** Group only this block's declared variables by state index and fill the
     * missing properties of each state with the block's fluid. */
    private void resolveBlockStates(Map<String, Double> variables, Map<String, String> displayNames,
                                    List<String> declaredVars, String fluid,
                                    java.util.Set<String> targetVariables) {
        StateData data = new StateData();
        for (String var : declaredVars) {
            Double val = variables.get(var); // case-insensitive map
            if (val != null) {
                parseBlockState(var, val, data);
            }
        }
        for (Map.Entry<Integer, Map<String, Double>> entry : data.stateKnowns.entrySet()) {
            Map<String, Double> knowns = entry.getValue();
            if (knowns.size() < 2) {
                continue;
            }
            String template = data.stateStyle.get(entry.getKey());
            if (template != null) {
                solveSingleState(knowns, template, variables, displayNames, fluid, targetVariables);
            }
        }
    }

    /** Parse a declared state-table variable as {@code <prop><tag><index>}: the
     * longest leading property symbol (P, T, h, …) is the property, any middle
     * characters are the circuit tag (e.g. the {@code w} in {@code Pw_1}), and
     * the trailing digits are the state index. The tag is preserved in the
     * write-back template so computed properties (e.g. {@code hw_1}) keep the
     * same naming. */
    private void parseBlockState(String name, Double value, StateData data) {
        String lower = name.toLowerCase();
        String prefix;
        int index;
        String tail;
        java.util.regex.Matcher br = BLOCK_BRACKET_STATE.matcher(lower);
        if (br.matches()) {
            prefix = br.group(1);
            index = Integer.parseInt(br.group(2));
            tail = "[" + index + "]";
        } else {
            java.util.regex.Matcher pl = BLOCK_PLAIN_STATE.matcher(lower);
            if (!pl.matches()) {
                return;
            }
            prefix = pl.group(1);
            index = Integer.parseInt(pl.group(3));
            tail = pl.group(2) + index; // group(2) is "_" or ""
        }
        String canonicalProp = null;
        String tag = "";
        for (String sym : PROPERTY_PREFIXES) {
            if (prefix.startsWith(sym)) {
                canonicalProp = PROPERTY_ALIASES.get(sym);
                tag = prefix.substring(sym.length());
                break;
            }
        }
        if (canonicalProp == null) {
            return;
        }
        data.stateKnowns.computeIfAbsent(index, k -> new HashMap<>()).put(canonicalProp, value);
        data.stateStyle.putIfAbsent(index, "%s" + tag + tail);
    }

    private static boolean containsIgnoreCase(java.util.Collection<String> list, String target) {
        if (list == null || target == null) return false;
        for (String s : list) {
            if (target.equalsIgnoreCase(s)) return true;
        }
        return false;
    }

    private Map<Integer, Map<String, Double>> groupStateKnowns(Map<String, Double> variables) {
        Map<Integer, Map<String, Double>> stateKnowns = new HashMap<>();
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "^([a-zA-Z][a-zA-Z_]*?)_?(\\d+)$|^([a-zA-Z][a-zA-Z_]*)\\[(\\d+)\\]$");

        for (Map.Entry<String, Double> entry : variables.entrySet()) {
            java.util.regex.Matcher m = pattern.matcher(entry.getKey());
            if (m.matches()) {
                String propName = (m.group(1) != null) ? m.group(1) : m.group(3);
                String idxStr = (m.group(2) != null) ? m.group(2) : m.group(4);
                int index = Integer.parseInt(idxStr);

                String base = propName.replace("_", "").toLowerCase();
                String canonicalProp = PROPERTY_ALIASES.get(base);
                if (canonicalProp != null) {
                    stateKnowns.computeIfAbsent(index, k -> new HashMap<>()).put(canonicalProp, entry.getValue());
                }
            }
        }
        return stateKnowns;
    }

    private List<Map<String, Double>> generateCyclePath(Map<String, Double> variables, String fluid) {
        List<Map<String, Double>> path = new ArrayList<>();
        if (!CoolProp.isAvailable()) {
            return path;
        }

        Map<Integer, Map<String, Double>> stateKnowns = groupStateKnowns(variables);

        List<Integer> indices = new ArrayList<>(stateKnowns.keySet());
        java.util.Collections.sort(indices);

        if (indices.size() < 2) {
            return path;
        }

        int segmentsCount = indices.size();
        for (int i = 0; i < segmentsCount; i++) {
            Map<String, Double> stateA = stateKnowns.get(indices.get(i));
            Map<String, Double> stateB = stateKnowns.get(indices.get((i + 1) % segmentsCount));

            List<Map<String, Double>> segmentPoints = interpolateProcess(stateA, stateB, fluid);
            if (i > 0 && !segmentPoints.isEmpty()) {
                path.addAll(segmentPoints.subList(1, segmentPoints.size()));
            } else {
                path.addAll(segmentPoints);
            }
        }

        return path;
    }

    private List<Map<String, Double>> interpolateIsobaric(double p, double sA, double sB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double s = sA + u * (sB - sA);
            points.add(flash("P", p, "S", s, fluid, s, p));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateIsentropic(double s, double pA, double pB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        double logPa = Math.log(pA);
        double logPb = Math.log(pB);
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double p = Math.exp(logPa + u * (logPb - logPa));
            points.add(flash("P", p, "S", s, fluid, s, p));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateIsothermal(double t, double sA, double sB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double s = sA + u * (sB - sA);
            points.add(flash("T", t, "S", s, fluid, s, null));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateIsenthalpic(double h, double pA, double pB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        double logPa = Math.log(pA);
        double logPb = Math.log(pB);
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double p = Math.exp(logPa + u * (logPb - logPa));
            points.add(flash("P", p, HMASS, h, fluid, null, p));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateIsochoric(double v, double tA, double tB, String fluid, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            double t = tA + u * (tB - tA);
            points.add(flash("T", t, DMASS, 1.0 / v, fluid, null, null));
        }
        return points;
    }

    private List<Map<String, Double>> interpolateDefault(Map<String, Double> stateA, Map<String, Double> stateB, int steps) {
        List<Map<String, Double>> points = new ArrayList<>();
        String[] keys = {"T", "P", "v", "h", "s"};
        for (int i = 0; i <= steps; i++) {
            double u = (double) i / steps;
            Map<String, Double> pt = new HashMap<>();
            for (String key : keys) {
                Double a = stateA.get(key);
                Double b = stateB.get(key);
                if (a != null && b != null) {
                    pt.put(key, a + u * (b - a));
                }
            }
            points.add(pt);
        }
        return points;
    }

    private List<Map<String, Double>> interpolateProcess(Map<String, Double> stateA, Map<String, Double> stateB, String fluid) {
        Double pA = stateA.get("P");
        Double pB = stateB.get("P");
        Double tA = stateA.get("T");
        Double tB = stateB.get("T");
        Double sA = stateA.get("s");
        Double sB = stateB.get("s");
        Double hA = stateA.get("h");
        Double hB = stateB.get("h");
        Double vA = stateA.get("v");
        Double vB = stateB.get("v");

        int steps = 30;

        if (sA != null && sB != null && isClose(pA, pB)) {
            return interpolateIsobaric(pA, sA, sB, fluid, steps);
        }
        if (pA != null && pB != null && isClose(sA, sB)) {
            return interpolateIsentropic(sA, pA, pB, fluid, steps);
        }
        if (sA != null && sB != null && isClose(tA, tB)) {
            return interpolateIsothermal(tA, sA, sB, fluid, steps);
        }
        if (pA != null && pB != null && isClose(hA, hB)) {
            return interpolateIsenthalpic(hA, pA, pB, fluid, steps);
        }
        if (tA != null && tB != null && isClose(vA, vB)) {
            return interpolateIsochoric(vA, tA, tB, fluid, steps);
        }
        return interpolateDefault(stateA, stateB, steps);
    }

    private double getFlashVal(String prop, String name1, double val1, String name2, double val2, String fluid) {
        if (prop.equals(name1)) {
            return val1;
        }
        if (prop.equals(name2)) {
            return val2;
        }
        return CoolProp.propsSIOrNaN(prop, name1, val1, name2, val2, fluid);
    }

    private Map<String, Double> flash(String name1, double val1, String name2, double val2, String fluid, Double fallbackS, Double fallbackP) {
        Map<String, Double> pt = new HashMap<>();

        // Output properties we want: T, P, v, h, s
        double tVal = getFlashVal("T", name1, val1, name2, val2, fluid);
        double pVal = getFlashVal("P", name1, val1, name2, val2, fluid);
        double hVal = getFlashVal(HMASS, name1, val1, name2, val2, fluid);
        double sVal = getFlashVal("S", name1, val1, name2, val2, fluid);
        double dVal = getFlashVal(DMASS, name1, val1, name2, val2, fluid);

        if (Double.isFinite(tVal)) pt.put("T", tVal);
        if (Double.isFinite(pVal)) pt.put("P", pVal);
        else if (fallbackP != null) pt.put("P", fallbackP);

        if (Double.isFinite(hVal)) pt.put("h", hVal);
        if (Double.isFinite(sVal)) pt.put("s", sVal);
        else if (fallbackS != null) pt.put("s", fallbackS);

        if (Double.isFinite(dVal) && dVal != 0.0) pt.put("v", 1.0 / dVal);

        return pt;
    }

    private static boolean isClose(Double a, Double b) {
        if (a == null || b == null) {
            return false;
        }
        double max = Math.max(Math.abs(a), Math.abs(b));
        if (max == 0.0) {
            return true;
        }
        return Math.abs(a - b) / max < 0.01;
    }
}
