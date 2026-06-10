package com.frees.backend.api;

import com.frees.backend.core.Block;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.core.VariableSpec;
import com.frees.backend.units.UnitRegistry;
import com.frees.backend.parser.EquationParser;
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
                               String displayUnitSystem) {}

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
                                List<String> formattedEquations) {

        static SolveResponse failure(String error) {
            return new SolveResponse(false, List.of(), List.of(), List.of(), null,
                    List.of(), List.of(), error, List.of());
        }
    }

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

    private static VariableDto toDisplay(String name, double siValue, String unit,
                                         UnitRegistry.UnitSystem system) {
        if (unit == null || unit.isBlank() || unit.equals("-")) {
            return new VariableDto(name, siValue, unit == null ? "" : unit);
        }
        UnitRegistry.OffsetQuantity recorded;
        try {
            recorded = UnitRegistry.parseWithOffset(unit);
        } catch (UnitRegistry.UnknownUnitException e) {
            return new VariableDto(name, siValue, unit);
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
                    Map.of(), "No equations entered.", List.of()));
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
        }
    }

    @PostMapping("/solve")
    public ResponseEntity<SolveResponse> solve(@RequestBody SolveRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure("No equations entered."));
        }
        try {
            SolverSettings settings = request.stopCriteria() != null
                    ? request.stopCriteria().toSettings()
                    : SolverSettings.DEFAULTS;
            Map<String, VariableSpec> specs = new HashMap<>();
            if (request.variableInfo() != null) {
                for (VariableInfoDto dto : request.variableInfo()) {
                    if (dto.name() != null && !dto.name().isBlank()) {
                        VariableSpec spec = dto.toSpec();
                        specs.put(spec.name(), spec);
                    }
                }
            }
            boolean findAll = Boolean.TRUE.equals(request.findAllSolutions());
            EquationSystemSolver.Result result = findAll
                    ? solver.solveAll(request.text(), settings, specs)
                    : solver.solve(request.text(), settings, specs);
            Map<String, String> units = effectiveUnits(request.text(), request.variableInfo());
            List<String> unitWarnings = solver.checkUnits(request.text(), units);
            Map<String, String> unitsByLowerName = new HashMap<>();
            solver.deriveUnits(request.text(), units)
                    .forEach((name, unit) -> unitsByLowerName.put(name.toLowerCase(), unit));
            units.forEach((name, unit) -> unitsByLowerName.put(name.toLowerCase(), unit));
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
                                    system))
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
                                                    system))
                                            .toList(),
                                    s.maxResidual()))
                            .toList(),
                    unitWarnings,
                    null,
                    formattedEquations));
        } catch (EquationParser.ParseException e) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure("Syntax error:\n" + e.getMessage()));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(SolveResponse.failure(e.getMessage()));
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

        Map<String, VariableSpec> specs = new HashMap<>();
        if (request.variableInfo() != null) {
            for (VariableInfoDto dto : request.variableInfo()) {
                if (dto.name() != null && !dto.name().isBlank()) {
                    VariableSpec spec = dto.toSpec();
                    specs.put(spec.name(), spec);
                }
            }
        }

        Map<String, String> units = effectiveUnits(request.text(), request.variableInfo());
        Map<String, String> unitsByLowerName = new HashMap<>();
        solver.deriveUnits(request.text(), units)
                .forEach((name, unit) -> unitsByLowerName.put(name.toLowerCase(), unit));
        units.forEach((name, unit) -> unitsByLowerName.put(name.toLowerCase(), unit));
        UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());

        long startNanos = System.nanoTime();
        int totalIterations = 0;
        int equations = 0;
        int unknowns = 0;
        double maxResidual = 0.0;

        List<TableRowResult> results = new ArrayList<>();
        for (Map<String, Double> row : request.table().rows()) {
            StringBuilder sb = new StringBuilder(request.text());
            for (Map.Entry<String, Double> entry : row.entrySet()) {
                if (entry.getValue() != null) {
                    sb.append("\n").append(entry.getKey()).append(" = ").append(entry.getValue());
                }
            }
            try {
                EquationSystemSolver.Result result = solver.solve(sb.toString(), settings, specs);
                Map<String, Double> rowValues = new HashMap<>();
                for (Map.Entry<String, Double> e : result.variables().entrySet()) {
                    String name = e.getKey();
                    double siValue = e.getValue();
                    String unit = unitsByLowerName.getOrDefault(name.toLowerCase(), "");
                    VariableDto display = toDisplay(name, siValue, unit, system);
                    rowValues.put(name, display.value());
                }
                results.add(new TableRowResult(true, rowValues, null));
                totalIterations += result.stats().iterations();
                maxResidual = Math.max(maxResidual, result.stats().maxResidual());
                equations = result.stats().equationCount();
                unknowns = result.stats().unknownCount();
            } catch (Exception e) {
                results.add(new TableRowResult(false, Map.of(), e.getMessage()));
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

    private static BlockDto toBlockDto(Block block, Map<String, String> displayNames) {
        return new BlockDto(
                block.index(),
                block.equations().stream().map(eq -> eq.sourceText()).toList(),
                block.variables().stream()
                        .map(v -> displayNames.getOrDefault(v, v))
                        .toList());
    }
}
