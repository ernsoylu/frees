package com.frees.backend.api;

import com.frees.backend.ast.ProcDef;
import com.frees.backend.compute.ComputeDispatcher;
import com.frees.backend.compute.ComputeTask;
import com.frees.backend.compute.JobTicket;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.parser.MarkdownEquationExtractor;
import com.frees.backend.props.PropertyFunctions;
import com.frees.backend.units.UnitRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.frees.backend.api.SolverApiSupport.NO_EQUATIONS_MESSAGE;
import static com.frees.backend.api.SolverApiSupport.applyOverrides;
import static com.frees.backend.api.SolverApiSupport.cappedDefaults;
import static com.frees.backend.api.SolverApiSupport.effectiveUnits;
import static com.frees.backend.api.SolverApiSupport.isInternalTemp;
import static com.frees.backend.api.SolverApiSupport.parseErrorLine;
import static com.frees.backend.api.SolverApiSupport.specsOf;
import static com.frees.backend.api.SolverApiSupport.toDisplay;
import static com.frees.backend.api.SolverApiSupport.unitSystem;
import static com.frees.backend.api.SolverApiSupport.unitsByLowerName;
import static com.frees.backend.api.SolverApiSupport.unitsByVariable;
import static com.frees.backend.api.SolveDtos.codeTablesOf;
import static com.frees.backend.api.SolveDtos.odeTablesOf;
import static com.frees.backend.api.SolveDtos.parametricTablesOf;
import static com.frees.backend.api.SolveDtos.plotsOf;
import static com.frees.backend.api.SolveDtos.stateTablesOf;
import static com.frees.backend.api.SolveDtos.toBlockDto;

/**
 * The equation-solving endpoints: {@code POST /api/solve} (a single solve,
 * optionally all-roots) and {@code POST /api/solve/table} (a parametric run
 * table, with optional parametric-accessor fixed-point iteration).
 *
 * <p>Formerly a ~2000-line god class that also owned Check, Optimize, Curve-Fit
 * and the thermodynamic cycle-path machinery. Those concerns have been split
 * into {@link CheckController}, {@link OptimizeController} and
 * {@link CyclePathResolver}; the shared solve-budget, unit-display and
 * variable-spec helpers live in {@link SolverApiSupport}; and the wire DTOs in
 * {@link SolveDtos}. What remains here is the solve path proper, its REPL
 * context caching, and the parametric-table runner.
 */
@RestController
@RequestMapping("/api")
public class SolveController {

    private static final Logger log = LoggerFactory.getLogger(SolveController.class);

    private final EquationSystemSolver solver;
    private final SolveContextCache contextCache;
    private final CyclePathResolver cyclePathResolver;
    /** Present only under the {@code api} profile, where solves are queued for
     *  a compute node instead of run inline. {@code null} on the synchronous
     *  default-profile path (local dev and the legacy unit tests). */
    private final ComputeDispatcher dispatcher;

    public SolveController(EquationSystemSolver solver, SolveContextCache contextCache,
                           CyclePathResolver cyclePathResolver,
                           org.springframework.beans.factory.ObjectProvider<ComputeDispatcher> dispatcherProvider) {
        this.solver = solver;
        this.contextCache = contextCache;
        this.cyclePathResolver = cyclePathResolver;
        this.dispatcher = dispatcherProvider.getIfAvailable();
    }

    public record SolveRequest(String text,
                               SolverApiSupport.StopCriteriaDto stopCriteria,
                               List<SolverApiSupport.VariableInfoDto> variableInfo,
                               Boolean findAllSolutions,
                               String displayUnitSystem,
                               Boolean fillMissing,
                               List<SolveDtos.FunctionTableDto> functionTables,
                               /** REPL overrides as equation strings ("eta = 0.75"): they
                                *  replace the editor's assignment of the same variable so the
                                *  terminal takes priority over the editor until cleared. */
                               List<String> overrides) {}

    public record SolveResponse(boolean success,
                                List<SolveDtos.VariableDto> variables,
                                List<SolveDtos.BlockDto> blocks,
                                List<SolveDtos.ResidualDto> residuals,
                                SolveDtos.StatsDto stats,
                                List<SolveDtos.SolutionDto> solutions,
                                List<String> unitWarnings,
                                String error,
                                List<String> formattedEquations,
                                List<Map<String, Double>> cyclePath,
                                List<SolveDtos.FunctionTableDto> codeTables,
                                List<SolveDtos.ParametricTableDto> parametricTables,
                                List<SolveDtos.PlotDefDto> definedPlots,
                                // 1-based editor line a syntax error points at, or
                                // null for whole-system errors (no single line).
                                Integer errorLine,
                                List<SolveDtos.StateTableDto> stateTableDefs,
                                List<SolveDtos.OdeTableDto> odeTables) {

        /** Backward-compatible constructor for callers that predate ODE tables. */
        public SolveResponse(boolean success, List<SolveDtos.VariableDto> variables,
                             List<SolveDtos.BlockDto> blocks, List<SolveDtos.ResidualDto> residuals,
                             SolveDtos.StatsDto stats, List<SolveDtos.SolutionDto> solutions,
                             List<String> unitWarnings, String error,
                             List<String> formattedEquations,
                             List<Map<String, Double>> cyclePath,
                             List<SolveDtos.FunctionTableDto> codeTables,
                             List<SolveDtos.ParametricTableDto> parametricTables,
                             List<SolveDtos.PlotDefDto> definedPlots, Integer errorLine,
                             List<SolveDtos.StateTableDto> stateTableDefs) {
            this(success, variables, blocks, residuals, stats, solutions, unitWarnings,
                    error, formattedEquations, cyclePath, codeTables,
                    parametricTables, definedPlots, errorLine, stateTableDefs, List.of());
        }

        /** Backward-compatible constructor for callers that predate state tables. */
        public SolveResponse(boolean success, List<SolveDtos.VariableDto> variables,
                             List<SolveDtos.BlockDto> blocks, List<SolveDtos.ResidualDto> residuals,
                             SolveDtos.StatsDto stats, List<SolveDtos.SolutionDto> solutions,
                             List<String> unitWarnings, String error,
                             List<String> formattedEquations,
                             List<Map<String, Double>> cyclePath,
                             List<SolveDtos.FunctionTableDto> codeTables,
                             List<SolveDtos.ParametricTableDto> parametricTables,
                             List<SolveDtos.PlotDefDto> definedPlots, Integer errorLine) {
            this(success, variables, blocks, residuals, stats, solutions, unitWarnings,
                    error, formattedEquations, cyclePath, codeTables,
                    parametricTables, definedPlots, errorLine, List.of(), List.of());
        }

        /** Backward-compatible constructor for the common no-error-line case. */
        public SolveResponse(boolean success, List<SolveDtos.VariableDto> variables,
                             List<SolveDtos.BlockDto> blocks, List<SolveDtos.ResidualDto> residuals,
                             SolveDtos.StatsDto stats, List<SolveDtos.SolutionDto> solutions,
                             List<String> unitWarnings, String error,
                             List<String> formattedEquations,
                             List<Map<String, Double>> cyclePath,
                             List<SolveDtos.FunctionTableDto> codeTables,
                             List<SolveDtos.ParametricTableDto> parametricTables,
                             List<SolveDtos.PlotDefDto> definedPlots) {
            this(success, variables, blocks, residuals, stats, solutions, unitWarnings,
                    error, formattedEquations, cyclePath, codeTables,
                    parametricTables, definedPlots, null, List.of(), List.of());
        }

        static SolveResponse failure(String error) {
            return failure(error, null);
        }

        static SolveResponse failure(String error, Integer errorLine) {
            return new SolveResponse(false, List.of(), List.of(), List.of(), null,
                    List.of(), List.of(), error, List.of(), List.of(), List.of(), List.of(),
                    List.of(), errorLine, List.of(), List.of());
        }
    }

    private record CycleResolution(EquationSystemSolver.Result result, List<Map<String, Double>> cyclePath) {}

    /** When fill-missing is requested, resolves missing fluid properties and builds
     *  the cycle path (defaulting the fluid to Water); otherwise passes the raw result through. */
    private CycleResolution resolveFillMissing(EquationSystemSolver.Result rawResult, String cleanText, boolean fillMissing) {
        if (!fillMissing) {
            return new CycleResolution(rawResult, List.of());
        }
        EquationSystemSolver.Result result = cyclePathResolver.resolveMissingProperties(rawResult, cleanText, null);
        String fluid = PropertyFunctions.detectFluid(cleanText);
        if (fluid == null) {
            fluid = "Water";
        }
        return new CycleResolution(result, cyclePathResolver.generateCyclePath(result.variables(), fluid));
    }

    @PostMapping("/solve")
    public ResponseEntity<?> solve(@RequestBody SolveRequest request,
            @RequestHeader(name = "X-Frees-Session", required = false) String sessionId) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure(NO_EQUATIONS_MESSAGE));
        }
        if (dispatcher != null) {
            // Asynchronous path (api profile): reject syntax errors
            // synchronously (400), otherwise enqueue and return 202 + jobId.
            try {
                validateSyntax(request);
            } catch (EquationParser.ParseException e) {
                return ResponseEntity.badRequest()
                        .body(SolveResponse.failure("Syntax error:\n" + e.getMessage(),
                                parseErrorLine(e.getMessage())));
            }
            JobTicket ticket = dispatcher.dispatch(ComputeTask.SOLVE, sessionId, request);
            return ResponseEntity.accepted().body(ticket);
        }
        try {
            return ResponseEntity.ok(computeSolve(request, sessionId));
        } catch (EquationParser.ParseException e) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure("Syntax error:\n" + e.getMessage(),
                            parseErrorLine(e.getMessage())));
        } catch (SolverException e) {
            // Even when there's nothing to solve (e.g. a document that only defines
            // FUNCTION/TABLE blocks), expose those definitions to the REPL so they
            // can be called there.
            cacheDefsOnly(sessionId, request);
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(SolveResponse.failure(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error while solving equations", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(SolveResponse.failure(e.getMessage() != null ? e.getMessage() : e.toString()));
        }
    }

    /**
     * Runs the solve end-to-end and returns the response DTO. Used directly by
     * the synchronous path and, via {@link com.frees.backend.compute.ComputeTaskListener},
     * by the asynchronous compute worker. Throws so each caller can map
     * failures to the right status (400/422/500 inline, FAILED in Redis).
     */
    public SolveResponse computeSolve(SolveRequest request, String sessionId)
            throws EquationParser.ParseException, SolverException {
        SolverSettings settings = request.stopCriteria() != null
                ? request.stopCriteria().toSettings()
                : cappedDefaults();
        Map<String, com.frees.backend.core.VariableSpec> specs = specsOf(request.variableInfo());
        boolean findAll = Boolean.TRUE.equals(request.findAllSolutions());

        var extraction = MarkdownEquationExtractor.extract(request.text());
        // REPL overrides win over the editor: drop the editor's assignment of
        // each overridden variable and append the override equation.
        String cleanText = applyOverrides(extraction.cleanText, request.overrides());

        Map<String, ProcDef> functionDefs = SolveDtos.functionDefsOf(request.functionTables());
        EquationSystemSolver.Result rawResult = findAll
                ? solver.solveAll(cleanText, settings, specs, functionDefs)
                : solver.solve(cleanText, settings, specs, functionDefs);
        CycleResolution cr = resolveFillMissing(rawResult, cleanText, Boolean.TRUE.equals(request.fillMissing()));
        final EquationSystemSolver.Result result = cr.result();
        List<Map<String, Double>> cyclePath = cr.cyclePath();

        // Parse once and reuse for unit checks, formatting and the REPL cache;
        // checkUnits/effectiveUnits/unitsByLowerName otherwise each re-parse cleanText.
        EquationParser.ParseResult parsed = solver.parse(cleanText);

        Map<String, String> explicitUnits = unitsByVariable(request.variableInfo());
        List<String> unitWarnings = solver.checkUnits(parsed,
                effectiveUnits(parsed, request.variableInfo(), solver));
        Map<String, String> unitsByLower =
                unitsByLowerName(parsed, request.variableInfo(), solver);
        UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());

        List<String> formattedEquations = extraction.equations.stream()
                .map(eq -> EquationParser.toLatexEquation(eq.cleanEquation, parsed.displayNames()))
                .toList();

        List<SolveDtos.VariableDto> variableDtos = result.variables().entrySet().stream()
                .filter(e -> !isInternalTemp(e.getKey()))
                .map(e -> toVariableDto(e, result, unitsByLower, system, explicitUnits))
                .toList();

        // Cache the solved workspace so the REPL can evaluate against it without re-solving.
        Map<String, ProcDef> replDefs = new HashMap<>(parsed.defs());
        replDefs.putAll(functionDefs);
        cacheSolvedContext(sessionId, result, variableDtos, replDefs, system);

        return new SolveResponse(
                true,
                variableDtos,
                result.blocks().stream()
                        .map(b -> toBlockDto(b, result.displayNames()))
                        .toList(),
                result.residuals().stream()
                        .map(r -> new SolveDtos.ResidualDto(r.equation(), r.residual()))
                        .toList(),
                new SolveDtos.StatsDto(
                        result.stats().equationCount(),
                        result.stats().unknownCount(),
                        result.stats().blockCount(),
                        result.stats().iterations(),
                        result.stats().elapsedMillis(),
                        result.stats().maxResidual()),
                result.solutions().stream()
                        .map(s -> new SolveDtos.SolutionDto(
                                s.variables().entrySet().stream()
                                        .filter(e -> !isInternalTemp(e.getKey()))
                                        .map(e -> toVariableDto(e, result, unitsByLower, system, explicitUnits))
                                        .toList(),
                                s.maxResidual()))
                        .toList(),
                unitWarnings,
                null,
                formattedEquations,
                cyclePath,
                codeTablesOf(parsed.defs()),
                parametricTablesOf(parsed.parametricTables()),
                plotsOf(parsed.plots()),
                null,
                stateTablesOf(parsed.stateTables()),
                odeTablesOf(result.odeTables()));
    }

    /** Quick synchronous syntax check used by the asynchronous path to reject
     *  malformed requests with 400 before enqueueing them for a worker. */
    private void validateSyntax(SolveRequest request) throws EquationParser.ParseException {
        var extraction = MarkdownEquationExtractor.extract(request.text());
        String cleanText = applyOverrides(extraction.cleanText, request.overrides());
        solver.parse(cleanText);
    }

    /** Display-converts one solved variable, attaching its uncertainty if present. */
    private SolveDtos.VariableDto toVariableDto(Map.Entry<String, Double> e, EquationSystemSolver.Result result,
            Map<String, String> unitsByLowerName, UnitRegistry.UnitSystem system, Map<String, String> explicitUnits) {
        String canonicalName = e.getKey().toLowerCase();
        Double siUnc = result.uncertainties() != null ? result.uncertainties().get(canonicalName) : null;
        return toDisplay(e.getKey(), e.getValue(), siUnc,
                unitsByLowerName.getOrDefault(canonicalName, ""), system, explicitUnits);
    }

    /** Snapshots the solved workspace into the REPL context cache: SI values for
     *  expression math, display-converted values/units for bare-variable echoes,
     *  the display spellings for tab-completion, and the in-scope function defs. */
    private void cacheSolvedContext(String sessionId, EquationSystemSolver.Result result,
            List<SolveDtos.VariableDto> variableDtos, Map<String, ProcDef> defs, UnitRegistry.UnitSystem system) {
        Map<String, Double> siValues = new HashMap<>();
        result.variables().forEach((name, value) -> {
            if (!isInternalTemp(name)) {
                siValues.put(name.toLowerCase(), value);
            }
        });

        Map<String, SolveContextCache.ReplVar> displayVars = new HashMap<>();
        List<String> names = new ArrayList<>();
        for (SolveDtos.VariableDto dto : variableDtos) {
            displayVars.put(dto.name().toLowerCase(),
                    new SolveContextCache.ReplVar(dto.value(), dto.units(), dto.uncertainty()));
            names.add(dto.name());
        }

        contextCache.put(sessionId, siValues, displayVars, names, defs, system);
    }

    /** Caches only the document's FUNCTION/TABLE definitions (no solved values),
     *  so the REPL can call them even when the document isn't solvable. Best-effort:
     *  any parse failure here is swallowed — the original solve error still stands. */
    private void cacheDefsOnly(String sessionId, SolveRequest request) {
        try {
            String cleanText = MarkdownEquationExtractor.extract(request.text()).cleanText;
            Map<String, ProcDef> defs = new HashMap<>(new EquationParser().parseResult(cleanText).defs());
            defs.putAll(SolveDtos.functionDefsOf(request.functionTables()));
            if (defs.isEmpty()) {
                return;
            }
            contextCache.put(sessionId, Map.of(), Map.of(), List.of(), defs,
                    unitSystem(request.displayUnitSystem()));
        } catch (RuntimeException ignored) {
            // No usable definitions to cache; leave any prior session untouched.
        }
    }

    // ── Parametric / Solve Table ─────────────────────────────────────────────

    public record TableDto(
            List<String> variables,
            List<Map<String, Double>> rows
    ) {}

    public record SolveTableRequest(
            String text,
            SolverApiSupport.StopCriteriaDto stopCriteria,
            List<SolverApiSupport.VariableInfoDto> variableInfo,
            String displayUnitSystem,
            TableDto table,
            List<SolveDtos.FunctionTableDto> functionTables
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
            TableStatsDto stats,
            List<SolveDtos.VariableDto> variables
    ) {}

    @PostMapping("/solve/table")
    public ResponseEntity<?> solveTable(@RequestBody SolveTableRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.table() == null || request.table().rows() == null) {
            return ResponseEntity.badRequest().build();
        }
        if (dispatcher != null) {
            try {
                solver.parse(MarkdownEquationExtractor.extract(request.text()).cleanText);
            } catch (EquationParser.ParseException e) {
                return ResponseEntity.badRequest().build();
            }
            JobTicket ticket = dispatcher.dispatch(ComputeTask.SOLVE_TABLE, null, request);
            return ResponseEntity.accepted().body(ticket);
        }
        return ResponseEntity.ok(computeSolveTable(request));
    }

    /**
     * Runs the parametric solve table end-to-end and returns the response DTO.
     * Used by the synchronous path and the asynchronous compute worker.
     */
    public SolveTableResponse computeSolveTable(SolveTableRequest request) {
        var extraction = MarkdownEquationExtractor.extract(request.text());
        String cleanText = extraction.cleanText;

        SolverSettings settings = request.stopCriteria() != null
                ? request.stopCriteria().toSettings()
                : cappedDefaults();
        Map<String, com.frees.backend.core.VariableSpec> specs = specsOf(request.variableInfo());
        Map<String, String> unitsByLower =
                unitsByLowerName(cleanText, request.variableInfo(), solver);
        UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());
        Map<String, String> explicitUnits =
                unitsByVariable(request.variableInfo());

        long startNanos = System.nanoTime();
        int totalIterations = 0;
        int equations = 0;
        int unknowns = 0;
        double maxResidual = 0.0;

        TableRowContext context = new TableRowContext(
                cleanText, settings, specs, unitsByLower, system,
                request.table().variables(), explicitUnits,
                SolveDtos.functionDefsOf(request.functionTables())
        );

        List<Map<String, Double>> rows = request.table().rows();
        List<String> varOrder = request.table().variables() != null
                ? request.table().variables() : List.of();
        List<RowOutcome> outcomes = mentionsParametricAccessor(cleanText)
                ? solveTableWithAccessors(rows, varOrder, context)
                : solveTableRows(rows, context);

        List<TableRowResult> results = new ArrayList<>();
        for (RowOutcome outcome : outcomes) {
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

        List<SolveDtos.VariableDto> variables = outcomes.stream()
                .filter(o -> o.row().success())
                .reduce((first, second) -> second) // get last
                .map(RowOutcome::variables)
                .orElse(List.of());

        return new SolveTableResponse(results, stats, variables);
    }

    private record RowOutcome(TableRowResult row, EquationSystemSolver.Stats stats,
                              Map<String, Double> siValues,
                              List<SolveDtos.VariableDto> variables) {}

    private record TableRowContext(
            String text,
            SolverSettings settings,
            Map<String, com.frees.backend.core.VariableSpec> specs,
            Map<String, String> unitsByLowerName,
            UnitRegistry.UnitSystem system,
            List<String> tableVariables,
            Map<String, String> explicitUnits,
            Map<String, ProcDef> functionDefs
    ) {}

    /** Solves every parametric row independently (the common, accessor-free case). */
    private List<RowOutcome> solveTableRows(List<Map<String, Double>> rows, TableRowContext context) {
        List<RowOutcome> outcomes = new ArrayList<>();
        for (Map<String, Double> row : rows) {
            outcomes.add(solveTableRow(row, context));
        }
        return outcomes;
    }

    /** Maximum table-wide fixed-point passes when accessors are present. */
    private static final int MAX_PARAMETRIC_PASSES = 12;

    /**
     * Solves a parametric table whose equations use accessor functions
     * ({@code TableSum}, {@code IntegralValue}, …). Because a row may depend on an
     * aggregate of every row, the whole table is re-solved as a Gauss–Seidel fixed
     * point: pass 0 runs with no table data installed (accessors return 0), each
     * later pass installs the columns collected from the previous pass, until the
     * columns stop changing.
     */
    private List<RowOutcome> solveTableWithAccessors(List<Map<String, Double>> rows,
                                                     List<String> varOrder, TableRowContext context) {
        Map<String, double[]> columns = new HashMap<>();
        List<RowOutcome> outcomes = new ArrayList<>();
        for (int pass = 0; pass < MAX_PARAMETRIC_PASSES; pass++) {
            outcomes = new ArrayList<>();
            for (int i = 0; i < rows.size(); i++) {
                com.frees.backend.core.ParametricAccessorContext.install(i + 1, rows.size(), columns, varOrder);
                try {
                    outcomes.add(solveTableRow(rows.get(i), context));
                } finally {
                    com.frees.backend.core.ParametricAccessorContext.clear();
                }
            }
            Map<String, double[]> next = buildColumns(outcomes, rows.size());
            boolean converged = columnsConverged(columns, next);
            columns = next;
            if (converged) {
                break;
            }
        }
        return outcomes;
    }

    /** Collects each solved variable's SI value across all runs into a column array. */
    private static Map<String, double[]> buildColumns(List<RowOutcome> outcomes, int runCount) {
        Map<String, double[]> columns = new HashMap<>();
        for (int i = 0; i < outcomes.size(); i++) {
            for (Map.Entry<String, Double> e : outcomes.get(i).siValues().entrySet()) {
                columns.computeIfAbsent(e.getKey(), k -> {
                    double[] a = new double[runCount];
                    java.util.Arrays.fill(a, Double.NaN);
                    return a;
                })[i] = e.getValue();
            }
        }
        return columns;
    }

    private static boolean columnsConverged(Map<String, double[]> a, Map<String, double[]> b) {
        if (!a.keySet().equals(b.keySet())) {
            return false;
        }
        for (Map.Entry<String, double[]> e : a.entrySet()) {
            double[] av = e.getValue();
            double[] bv = b.get(e.getKey());
            for (int i = 0; i < av.length; i++) {
                double x = av[i];
                double y = bv[i];
                if (Double.isNaN(x) != Double.isNaN(y)) {
                    return false;
                }
                if (!Double.isNaN(x) && Math.abs(x - y) > 1e-9 * (1.0 + Math.abs(y))) {
                    return false;
                }
            }
        }
        return true;
    }

    private static final java.util.regex.Pattern PARAMETRIC_ACCESSOR_PATTERN =
            java.util.regex.Pattern.compile(
                    "(?i)\\b(TableRun#|TableRun|NParametricRuns|TableValue|TableSum|TableAvg|"
                            + "TableMin|TableMax|TableStdDev|IntegralValue)\\s*\\(");

    private static boolean mentionsParametricAccessor(String text) {
        return PARAMETRIC_ACCESSOR_PATTERN.matcher(text).find();
    }

    /** One parametric-table run: non-null cells are fixed, the rest solved. */
    private RowOutcome solveTableRow(Map<String, Double> row, TableRowContext context) {
        StringBuilder sb = new StringBuilder(context.text());
        for (Map.Entry<String, Double> entry : row.entrySet()) {
            if (entry.getValue() != null) {
                sb.append("\n").append(entry.getKey()).append(" = ").append(entry.getValue());
            }
        }
        try {
            EquationSystemSolver.Result result = solver.solvePermissive(sb.toString(),
                    context.settings(), context.specs(), context.functionDefs());
            Set<String> targetVars = new HashSet<>(context.tableVariables());
            EquationSystemSolver.Result finalResult = cyclePathResolver.resolveMissingProperties(result, sb.toString(), targetVars);
            Map<String, Double> rowValues = new HashMap<>();
            for (Map.Entry<String, Double> e : finalResult.variables().entrySet()) {
                String name = e.getKey();
                String unit = context.unitsByLowerName().getOrDefault(name.toLowerCase(), "");
                rowValues.put(name, toDisplay(name, e.getValue(), unit, context.system(), context.explicitUnits()).value());
            }
            Map<String, Double> siValues = new HashMap<>();
            for (Map.Entry<String, Double> e : finalResult.variables().entrySet()) {
                siValues.put(e.getKey().toLowerCase(), e.getValue());
            }
            List<SolveDtos.VariableDto> variableDtos = finalResult.variables().entrySet().stream()
                    .map(e -> toVariableDto(e, finalResult, context.unitsByLowerName(), context.system(), context.explicitUnits()))
                    .toList();
            return new RowOutcome(new TableRowResult(true, rowValues, null), finalResult.stats(), siValues, variableDtos);
        } catch (Exception e) {
            return new RowOutcome(new TableRowResult(false, Map.of(), e.getMessage()), null, Map.of(), List.of());
        }
    }
}
