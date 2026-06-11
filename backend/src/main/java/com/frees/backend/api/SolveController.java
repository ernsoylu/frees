package com.frees.backend.api;

import com.frees.backend.core.Block;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.Optimizer;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.core.VariableSpec;
import com.frees.backend.units.UnitRegistry;
import com.frees.backend.parser.EquationParser;
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

    public record StopCriteriaDto(Integer maxIterations,
                                  Double relativeResiduals,
                                  Double changeInVariables,
                                  Double elapsedTimeSeconds,
                                  Boolean complexMode) {

        SolverSettings toSettings() {
            SolverSettings d = SolverSettings.DEFAULTS;
            return new SolverSettings(
                    maxIterations != null ? maxIterations : d.maxIterations(),
                    relativeResiduals != null ? relativeResiduals : d.relativeResiduals(),
                    changeInVariables != null ? changeInVariables : d.changeInVariables(),
                    elapsedTimeSeconds != null ? elapsedTimeSeconds : d.elapsedTimeSeconds(),
                    complexMode != null ? complexMode : d.complexMode());
        }
    }

    public record VariableInfoDto(String name, Double guess, Double lower, Double upper,
                                  String units) {

        VariableSpec toSpec() {
            double lo = lower != null ? lower : Double.NEGATIVE_INFINITY;
            double hi = upper != null ? upper : Double.POSITIVE_INFINITY;
            double g = guess != null ? guess
                    : Math.clamp(VariableSpec.DEFAULT_GUESS, lo, hi);
            return new VariableSpec(name, g, lo, hi);
        }
    }

    public record SolveRequest(String text,
                               StopCriteriaDto stopCriteria,
                               List<VariableInfoDto> variableInfo,
                               Boolean findAllSolutions,
                               String displayUnitSystem,
                               Boolean fillMissing) {}

    public record VariableDto(String name, double value, String units) {}

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
                                List<Map<String, Double>> cyclePath) {

        static SolveResponse failure(String error) {
            return new SolveResponse(false, List.of(), List.of(), List.of(), null,
                    List.of(), List.of(), error, List.of(), List.of());
        }
    }

    private static final String NO_EQUATIONS_MESSAGE = "No equations entered.";

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
                                List<String> formattedEquations) {}

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

    private static VariableDto toDisplay(String name, double siValue, String unit,
                                         UnitRegistry.UnitSystem system,
                                         Map<String, String> explicitUnits) {
        if (unit == null || unit.isBlank() || unit.equals("-")) {
            return new VariableDto(name, siValue, unit == null ? "" : unit);
        }
        UnitRegistry.OffsetQuantity recorded;
        try {
            recorded = UnitRegistry.parseWithOffset(unit);
        } catch (UnitRegistry.UnknownUnitException e) {
            return new VariableDto(name, siValue, unit);
        }
        if (explicitUnits != null && explicitUnits.containsKey(name.toLowerCase())) {
            return new VariableDto(name,
                    (siValue - recorded.offset()) / recorded.factor(), unit);
        }
        UnitRegistry.DisplayUnit preferred =
                UnitRegistry.preferredDisplayUnit(recorded.dims(), system);
        if (preferred != null) {
            return new VariableDto(name,
                    (siValue - preferred.offset()) / preferred.factor(), preferred.name());
        }
        return new VariableDto(name,
                (siValue - recorded.offset()) / recorded.factor(), unit);
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
            return ResponseEntity.ok(new CheckResponse(false, 0, 0, List.of(), List.of(),
                    Map.of(), NO_EQUATIONS_MESSAGE, List.of()));
        }
        try {
            boolean complexMode = request.stopCriteria() != null && Boolean.TRUE.equals(request.stopCriteria().complexMode());
            EquationSystemSolver.CheckResult result = solver.check(request.text(), complexMode);
            Map<String, String> effective = effectiveUnits(request.text(), request.variableInfo());
            Map<String, String> inferredUnits =
                    new HashMap<>(solver.deriveUnits(request.text(), effective));
            inferredUnits.putAll(solver.inferUnits(request.text()));
            List<String> unitWarnings = solver.checkUnits(request.text(), effective);

            EquationParser.ParseResult parsed = new EquationParser().parseResult(request.text());
            List<String> formattedEquations = parsed.equations().stream()
                    .map(eq -> com.frees.backend.parser.LatexConverter.toLatex(eq, parsed.displayNames()))
                    .toList();

            return ResponseEntity.ok(new CheckResponse(
                    result.solvable(),
                    result.equationCount(),
                    result.unknownCount(),
                    result.variables(),
                    unitWarnings,
                    inferredUnits,
                    result.message(),
                    formattedEquations));
        } catch (EquationParser.ParseException e) {
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.ok(new CheckResponse(
                    false, 0, 0, List.of(), List.of(), Map.of(),
                    "Syntax error: " + firstError, List.of()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new CheckResponse(
                            false, 0, 0, List.of(), List.of(), Map.of(),
                            e.getMessage() != null ? e.getMessage() : e.toString(), List.of()));
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
                    : SolverSettings.DEFAULTS;
            Map<String, VariableSpec> specs = specsOf(request.variableInfo());
            boolean findAll = Boolean.TRUE.equals(request.findAllSolutions());
            EquationSystemSolver.Result rawResult = findAll
                    ? solver.solveAll(request.text(), settings, specs)
                    : solver.solve(request.text(), settings, specs);
            final EquationSystemSolver.Result result;
            List<Map<String, Double>> cyclePath = List.of();
            if (Boolean.TRUE.equals(request.fillMissing())) {
                result = resolveMissingProperties(rawResult, request.text(), null);
                String fluid = PropertyFunctions.detectFluid(request.text());
                if (fluid == null) {
                    fluid = "Water";
                }
                cyclePath = generateCyclePath(result.variables(), fluid);
            } else {
                result = rawResult;
            }

            Map<String, String> explicitUnits = unitsByVariable(request.variableInfo());
            List<String> unitWarnings = solver.checkUnits(request.text(),
                    effectiveUnits(request.text(), request.variableInfo()));
            Map<String, String> unitsByLowerName =
                    unitsByLowerName(request.text(), request.variableInfo());
            UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());

            EquationParser.ParseResult parsed = new EquationParser().parseResult(request.text());
            List<String> formattedEquations = parsed.equations().stream()
                    .map(eq -> com.frees.backend.parser.LatexConverter.toLatex(eq, parsed.displayNames()))
                    .toList();

            return ResponseEntity.ok(new SolveResponse(
                    true,
                    result.variables().entrySet().stream()
                            .map(e -> toDisplay(e.getKey(), e.getValue(),
                                    unitsByLowerName.getOrDefault(e.getKey().toLowerCase(), ""),
                                    system,
                                    explicitUnits))
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
                                            .map(e -> toDisplay(e.getKey(), e.getValue(),
                                                    unitsByLowerName.getOrDefault(
                                                            e.getKey().toLowerCase(), ""),
                                                    system,
                                                    explicitUnits))
                                            .toList(),
                                    s.maxResidual()))
                            .toList(),
                    unitWarnings,
                    null,
                    formattedEquations,
                    cyclePath));
        } catch (EquationParser.ParseException e) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure("Syntax error:\n" + e.getMessage()));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(SolveResponse.failure(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(SolveResponse.failure(e.getMessage() != null ? e.getMessage() : e.toString()));
        }
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
            TableDto table
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

        SolverSettings settings = request.stopCriteria() != null
                ? request.stopCriteria().toSettings()
                : SolverSettings.DEFAULTS;
        Map<String, VariableSpec> specs = specsOf(request.variableInfo());
        Map<String, String> unitsByLowerName =
                unitsByLowerName(request.text(), request.variableInfo());
        UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());
        Map<String, String> explicitUnits =
                unitsByVariable(request.variableInfo());

        long startNanos = System.nanoTime();
        int totalIterations = 0;
        int equations = 0;
        int unknowns = 0;
        double maxResidual = 0.0;

        List<TableRowResult> results = new ArrayList<>();
        for (Map<String, Double> row : request.table().rows()) {
            RowOutcome outcome = solveTableRow(request.text(), row, settings, specs,
                    unitsByLowerName, system, request.table().variables(), explicitUnits);
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

    /** One parametric-table run: non-null cells are fixed, the rest solved. */
    private RowOutcome solveTableRow(String text, Map<String, Double> row,
                                     SolverSettings settings,
                                     Map<String, VariableSpec> specs,
                                     Map<String, String> unitsByLowerName,
                                     UnitRegistry.UnitSystem system,
                                     List<String> tableVariables,
                                     Map<String, String> explicitUnits) {
        StringBuilder sb = new StringBuilder(text);
        for (Map.Entry<String, Double> entry : row.entrySet()) {
            if (entry.getValue() != null) {
                sb.append("\n").append(entry.getKey()).append(" = ").append(entry.getValue());
            }
        }
        try {
            EquationSystemSolver.Result result = solver.solve(sb.toString(), settings, specs);
            java.util.Set<String> targetVars = new java.util.HashSet<>(tableVariables);
            result = resolveMissingProperties(result, sb.toString(), targetVars);
            Map<String, Double> rowValues = new HashMap<>();
            for (Map.Entry<String, Double> e : result.variables().entrySet()) {
                String name = e.getKey();
                String unit = unitsByLowerName.getOrDefault(name.toLowerCase(), "");
                rowValues.put(name, toDisplay(name, e.getValue(), unit, system, explicitUnits).value());
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
                                  Boolean maximize) {}

    public record OptimizeResponse(boolean success,
                                   String error,
                                   VariableDto objective,
                                   VariableDto decision,
                                   int evaluations,
                                   List<VariableDto> variables) {

        static OptimizeResponse failure(String error) {
            return new OptimizeResponse(false, error, null, null, 0, List.of());
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
            return ResponseEntity.ok(OptimizeResponse.failure(NO_EQUATIONS_MESSAGE));
        }
        if (request.lower() == null || request.upper() == null) {
            return ResponseEntity.ok(OptimizeResponse.failure(
                    "Both bounds of the independent variable are required."));
        }
        SolverSettings settings = request.stopCriteria() != null
                ? request.stopCriteria().toSettings()
                : SolverSettings.DEFAULTS;
        try {
            Optimizer.OptimizeResult result = new Optimizer(solver).optimize(
                    new Optimizer.Problem(request.text(), settings,
                            specsOf(request.variableInfo()),
                            request.objective(), request.decision(),
                            request.lower(), request.upper(),
                            Boolean.TRUE.equals(request.maximize())));

            Map<String, String> explicitUnits =
                    unitsByVariable(request.variableInfo());
            Map<String, String> unitsByLowerName =
                    unitsByLowerName(request.text(), request.variableInfo());
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
            VariableDto decision = toDisplay(request.decision(),
                    result.decisionValue(),
                    unitsByLowerName.getOrDefault(request.decision().toLowerCase(), ""),
                    system,
                    explicitUnits);
            return ResponseEntity.ok(new OptimizeResponse(true, null, objective,
                    decision, result.evaluations(), variables));
        } catch (EquationParser.ParseException e) {
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.ok(OptimizeResponse.failure("Syntax error: " + firstError));
        } catch (SolverException e) {
            return ResponseEntity.ok(OptimizeResponse.failure(e.getMessage()));
        }
    }

    private static BlockDto toBlockDto(Block block, Map<String, String> displayNames) {
        return new BlockDto(
                block.index(),
                block.equations().stream().map(eq -> eq.sourceText()).toList(),
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

    private static final List<PropPair> PREFERRED_PAIRS = List.of(
            new PropPair("P", "P", "h", "Hmass"),
            new PropPair("P", "P", "s", "Smass"),
            new PropPair("h", "Hmass", "s", "Smass"),
            new PropPair("P", "P", "x", "Q"),
            new PropPair("T", "T", "x", "Q"),
            new PropPair("T", "T", "P", "P"),
            new PropPair("T", "T", "s", "Smass"),
            new PropPair("T", "T", "h", "Hmass"),
            new PropPair("P", "P", "v", "Dmass"),
            new PropPair("T", "T", "v", "Dmass"),
            new PropPair("P", "P", "rho", "Dmass"),
            new PropPair("T", "T", "rho", "Dmass")
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

        // 1. Resolve variables of the main result
        Map<String, Double> mutableVars = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        mutableVars.putAll(result.variables());

        Map<String, String> mutableDisplayNames = new HashMap<>(result.displayNames());

        resolveForVariables(mutableVars, mutableDisplayNames, fluid, targetVariables);

        // 2. Resolve variables of all solutions
        List<EquationSystemSolver.Solution> resolvedSolutions = new ArrayList<>();
        for (EquationSystemSolver.Solution sol : result.solutions()) {
            Map<String, Double> solVars = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            solVars.putAll(sol.variables());
            resolveForVariables(solVars, mutableDisplayNames, fluid, targetVariables);
            resolvedSolutions.add(new EquationSystemSolver.Solution(solVars, sol.residuals(), sol.maxResidual()));
        }

        return new EquationSystemSolver.Result(
                mutableVars,
                result.blocks(),
                result.residuals(),
                result.stats(),
                resolvedSolutions,
                mutableDisplayNames
        );
    }

    private void resolveForVariables(Map<String, Double> variables, Map<String, String> displayNames, String fluid, java.util.Set<String> targetVariables) {
        // Find state variables and group them by state index
        Map<Integer, Map<String, Double>> stateKnowns = new HashMap<>();
        Map<Integer, String> stateStyle = new HashMap<>();

        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "^([a-zA-Z]+(?:_[a-zA-Z]+)*?)_?(\\d+)$|^([a-zA-Z]+)\\[(\\d+)\\]$");

        for (Map.Entry<String, Double> entry : variables.entrySet()) {
            String name = entry.getKey();
            java.util.regex.Matcher m = pattern.matcher(name);
            if (m.matches()) {
                String propName = (m.group(1) != null) ? m.group(1) : m.group(3);
                String idxStr = (m.group(2) != null) ? m.group(2) : m.group(4);
                int index = Integer.parseInt(idxStr);

                String base = propName.replace("_", "").toLowerCase();
                String canonicalProp = PROPERTY_ALIASES.get(base);
                if (canonicalProp != null) {
                    stateKnowns.computeIfAbsent(index, k -> new HashMap<>()).put(canonicalProp, entry.getValue());

                    // Determine template style
                    if (!stateStyle.containsKey(index)) {
                        String template;
                        if (name.contains("[")) {
                            template = "%s[" + index + "]";
                        } else if (name.contains("_")) {
                            template = "%s_" + index;
                        } else {
                            template = "%s" + index;
                        }
                        stateStyle.put(index, template);
                    }
                }
            }
        }

        // Solve each state that has >= 2 known properties
        for (Map.Entry<Integer, Map<String, Double>> entry : stateKnowns.entrySet()) {
            int index = entry.getKey();
            Map<String, Double> knowns = entry.getValue();
            if (knowns.size() < 2) {
                continue;
            }

            // Find a valid pair of inputs for CoolProp
            PropPair matchedPair = null;
            for (PropPair pair : PREFERRED_PAIRS) {
                if (knowns.containsKey(pair.key1()) && knowns.containsKey(pair.key2())) {
                    matchedPair = pair;
                    break;
                }
            }

            if (matchedPair == null) {
                continue;
            }

            double inputVal1 = knowns.get(matchedPair.key1());
            double inputVal2 = knowns.get(matchedPair.key2());

            // If the property is specific volume (v), convert to density (Dmass = 1/v) for CoolProp inputs
            double propVal1 = "v".equals(matchedPair.key1()) ? 1.0 / inputVal1 : inputVal1;
            double propVal2 = "v".equals(matchedPair.key2()) ? 1.0 / inputVal2 : inputVal2;

            // Query CoolProp for all standard outputs
            Map<String, String> outputs = Map.of(
                    "T", "T",
                    "P", "P",
                    "h", "Hmass",
                    "s", "Smass",
                    "u", "Umass",
                    "rho", "Dmass"
            );

            Map<String, Double> solvedProps = new HashMap<>();
            String template = stateStyle.get(index);
            if (template == null) {
                continue;
            }

            for (Map.Entry<String, String> out : outputs.entrySet()) {
                String canonical = out.getKey();
                String coolpropKey = out.getValue();

                // Do not query if already known in variables (we want to preserve exact solved value)
                if (knowns.containsKey(canonical)) {
                    continue;
                }

                // Optimization: skip if this variable is not requested in targetVariables
                if (targetVariables != null) {
                    String casedProp = canonical;
                    if ("rho".equals(canonical)) {
                        casedProp = "rho";
                    } else if ("v".equals(canonical) || "h".equals(canonical) || "s".equals(canonical) || "u".equals(canonical) || "x".equals(canonical)) {
                        casedProp = canonical.toLowerCase();
                    } else if ("T".equals(canonical) || "P".equals(canonical)) {
                        casedProp = canonical.toUpperCase();
                    }
                    String varName = String.format(template, casedProp);
                    if (!containsIgnoreCase(targetVariables, varName)) {
                        continue;
                    }
                }

                double res = getPropOrNaN(coolpropKey, matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
                if (Double.isFinite(res)) {
                    solvedProps.put(canonical, res);
                }
            }

            // Specific volume v = 1 / Dmass, solve if not already known
            if (!knowns.containsKey("v")) {
                boolean needV = true;
                if (targetVariables != null) {
                    String varName = String.format(template, "v");
                    needV = containsIgnoreCase(targetVariables, varName);
                }
                if (needV) {
                    double resDmass = solvedProps.containsKey("rho") ? solvedProps.get("rho") :
                            getPropOrNaN("Dmass", matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
                    if (Double.isFinite(resDmass) && resDmass != 0.0) {
                        solvedProps.put("v", 1.0 / resDmass);
                    }
                }
            }

            // Quality x = Q, solve if not already known
            if (!knowns.containsKey("x")) {
                boolean needX = true;
                if (targetVariables != null) {
                    String varName = String.format(template, "x");
                    needX = containsIgnoreCase(targetVariables, varName);
                }
                if (needX) {
                    double resQ = getPropOrNaN("Q", matchedPair.valKey1(), propVal1, matchedPair.valKey2(), propVal2, fluid);
                    if (Double.isFinite(resQ)) {
                        solvedProps.put("x", resQ);
                    }
                }
            }

            // Add solved values back to variables map
            for (Map.Entry<String, Double> solved : solvedProps.entrySet()) {
                String propName = solved.getKey();
                double val = solved.getValue();

                // Format variable name with matching casing and notation style
                // Casings: T, P, v, h, s, u, x, rho
                String casedProp = propName;
                if ("rho".equals(propName)) {
                    casedProp = "rho";
                } else if ("v".equals(propName) || "h".equals(propName) || "s".equals(propName) || "u".equals(propName) || "x".equals(propName)) {
                    casedProp = propName.toLowerCase();
                } else if ("T".equals(propName) || "P".equals(propName)) {
                    casedProp = propName.toUpperCase();
                }

                String varName = String.format(template, casedProp);
                variables.put(varName, val);
                displayNames.put(varName.toLowerCase(), varName);
            }
        }
    }

    private static boolean containsIgnoreCase(java.util.Collection<String> list, String target) {
        if (list == null || target == null) return false;
        for (String s : list) {
            if (target.equalsIgnoreCase(s)) return true;
        }
        return false;
    }

    private List<Map<String, Double>> generateCyclePath(Map<String, Double> variables, String fluid) {
        List<Map<String, Double>> path = new ArrayList<>();
        if (!CoolProp.isAvailable()) {
            return path;
        }

        // Group variables by state index
        Map<Integer, Map<String, Double>> stateKnowns = new HashMap<>();
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                "^([a-zA-Z]+(?:_[a-zA-Z]+)*?)_?(\\d+)$|^([a-zA-Z]+)\\[(\\d+)\\]$");

        for (Map.Entry<String, Double> entry : variables.entrySet()) {
            String name = entry.getKey();
            java.util.regex.Matcher m = pattern.matcher(name);
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

        // Get sorted list of state indices
        List<Integer> indices = new ArrayList<>(stateKnowns.keySet());
        java.util.Collections.sort(indices);

        if (indices.size() < 2) {
            return path;
        }

        // Build the loop segments
        int segmentsCount = indices.size();
        for (int i = 0; i < segmentsCount; i++) {
            int idxA = indices.get(i);
            int idxB = indices.get((i + 1) % segmentsCount); // loop back to start

            Map<String, Double> stateA = stateKnowns.get(idxA);
            Map<String, Double> stateB = stateKnowns.get(idxB);

            // Interpolate process between A and B
            List<Map<String, Double>> segmentPoints = interpolateProcess(stateA, stateB, fluid);
            if (i > 0 && !segmentPoints.isEmpty()) {
                // Skip the first point of subsequent segments to avoid duplication
                path.addAll(segmentPoints.subList(1, segmentPoints.size()));
            } else {
                path.addAll(segmentPoints);
            }
        }

        return path;
    }

    private List<Map<String, Double>> interpolateProcess(Map<String, Double> stateA, Map<String, Double> stateB, String fluid) {
        List<Map<String, Double>> points = new ArrayList<>();
        int steps = 30;

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

        // Detect process type
        boolean isobaric = isClose(pA, pB);
        boolean isothermal = isClose(tA, tB);
        boolean isentropic = isClose(sA, sB);
        boolean isenthalpic = isClose(hA, hB);
        boolean isochoric = isClose(vA, vB);

        // We need at least the inputs to perform JNA flashes
        if (isobaric && pA != null && sA != null && sB != null) {
            // Isobaric process: sweep entropy s
            for (int i = 0; i <= steps; i++) {
                double u = (double) i / steps;
                double s = sA + u * (sB - sA);
                points.add(flash("P", pA, "S", s, fluid, s, pA));
            }
        } else if (isentropic && sA != null && pA != null && pB != null) {
            // Isentropic process: sweep pressure P log-linearly
            double logPa = Math.log(pA);
            double logPb = Math.log(pB);
            for (int i = 0; i <= steps; i++) {
                double u = (double) i / steps;
                double p = Math.exp(logPa + u * (logPb - logPa));
                points.add(flash("P", p, "S", sA, fluid, sA, p));
            }
        } else if (isothermal && tA != null && sA != null && sB != null) {
            // Isothermal process: sweep entropy s
            for (int i = 0; i <= steps; i++) {
                double u = (double) i / steps;
                double s = sA + u * (sB - sA);
                points.add(flash("T", tA, "S", s, fluid, s, null));
            }
        } else if (isenthalpic && hA != null && pA != null && pB != null) {
            // Isenthalpic process: sweep pressure P log-linearly
            double logPa = Math.log(pA);
            double logPb = Math.log(pB);
            for (int i = 0; i <= steps; i++) {
                double u = (double) i / steps;
                double p = Math.exp(logPa + u * (logPb - logPa));
                points.add(flash("P", p, "Hmass", hA, fluid, null, p));
            }
        } else if (isochoric && vA != null && tA != null && tB != null) {
            // Isochoric process: sweep temperature T
            for (int i = 0; i <= steps; i++) {
                double u = (double) i / steps;
                double t = tA + u * (tB - tA);
                points.add(flash("T", t, "Dmass", 1.0 / vA, fluid, null, null));
            }
        } else {
            // Default: linear interpolation in state space
            for (int i = 0; i <= steps; i++) {
                double u = (double) i / steps;
                Map<String, Double> pt = new HashMap<>();
                if (tA != null && tB != null) pt.put("T", tA + u * (tB - tA));
                if (pA != null && pB != null) pt.put("P", pA + u * (pB - pA));
                if (vA != null && vB != null) pt.put("v", vA + u * (vB - vA));
                if (hA != null && hB != null) pt.put("h", hA + u * (hB - hA));
                if (sA != null && sB != null) pt.put("s", sA + u * (sB - sA));
                points.add(pt);
            }
        }
        return points;
    }

    private Map<String, Double> flash(String name1, double val1, String name2, double val2, String fluid, Double fallbackS, Double fallbackP) {
        Map<String, Double> pt = new HashMap<>();

        // Output properties we want: T, P, v, h, s
        double tVal = "T".equals(name1) ? val1 : ("T".equals(name2) ? val2 : CoolProp.propsSIOrNaN("T", name1, val1, name2, val2, fluid));
        double pVal = "P".equals(name1) ? val1 : ("P".equals(name2) ? val2 : CoolProp.propsSIOrNaN("P", name1, val1, name2, val2, fluid));
        double hVal = "Hmass".equals(name1) ? val1 : ("Hmass".equals(name2) ? val2 : CoolProp.propsSIOrNaN("Hmass", name1, val1, name2, val2, fluid));
        double sVal = "S".equals(name1) ? val1 : ("S".equals(name2) ? val2 : CoolProp.propsSIOrNaN("S", name1, val1, name2, val2, fluid));
        double dVal = "Dmass".equals(name1) ? val1 : ("Dmass".equals(name2) ? val2 : CoolProp.propsSIOrNaN("Dmass", name1, val1, name2, val2, fluid));

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
