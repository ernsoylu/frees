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

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SolveController {

    public record StopCriteriaDto(Integer maxIterations,
                                  Double relativeResiduals,
                                  Double changeInVariables,
                                  Double elapsedTimeSeconds) {

        SolverSettings toSettings() {
            SolverSettings d = SolverSettings.DEFAULTS;
            return new SolverSettings(
                    maxIterations != null ? maxIterations : d.maxIterations(),
                    relativeResiduals != null ? relativeResiduals : d.relativeResiduals(),
                    changeInVariables != null ? changeInVariables : d.changeInVariables(),
                    elapsedTimeSeconds != null ? elapsedTimeSeconds : d.elapsedTimeSeconds());
        }
    }

    public record VariableInfoDto(String name, Double guess, Double lower, Double upper,
                                  String units) {

        VariableSpec toSpec() {
            double lo = lower != null ? lower : Double.NEGATIVE_INFINITY;
            double hi = upper != null ? upper : Double.POSITIVE_INFINITY;
            // An explicit guess outside the bounds is the user's error; the
            // implicit default of 1.0 is clamped into the bounds instead.
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
                                String error) {

        static SolveResponse failure(String error) {
            return new SolveResponse(false, List.of(), List.of(), List.of(), null,
                    List.of(), List.of(), error);
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
                                String message) {}

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

    /**
     * Inferred units from annotated constants, overridden by explicit
     * Variable Info. Keys are normalized to lowercase so the override is
     * deterministic regardless of display casing.
     */
    private Map<String, String> effectiveUnits(String text, List<VariableInfoDto> variableInfo) {
        Map<String, String> units = new HashMap<>();
        solver.inferUnits(text)
                .forEach((name, unit) -> units.put(name.toLowerCase(), unit));
        units.putAll(unitsByVariable(variableInfo));
        return units;
    }

    /**
     * Values are computed in SI; this converts a variable for display only
     * (the Mathcad/SMath model). The recorded unit (declared or derived) is
     * the default display target — so a variable declared in bar shows in bar
     * — and the Preferences unit system overrides it by dimension.
     */
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
                    Map.of(), "No equations entered."));
        }
        try {
            EquationSystemSolver.CheckResult result = solver.check(request.text());
            Map<String, String> effective = effectiveUnits(request.text(), request.variableInfo());
            // Inferred (from annotations) plus dimensionally derived SI units,
            // so the Variable Info table fills in computed variables too.
            Map<String, String> inferredUnits =
                    new HashMap<>(solver.deriveUnits(request.text(), effective));
            inferredUnits.putAll(solver.inferUnits(request.text()));
            List<String> unitWarnings = solver.checkUnits(request.text(), effective);
            return ResponseEntity.ok(new CheckResponse(
                    result.solvable(),
                    result.equationCount(),
                    result.unknownCount(),
                    result.variables(),
                    unitWarnings,
                    inferredUnits,
                    result.message()));
        } catch (EquationParser.ParseException e) {
            // EES halts at the first syntax error; report the first one found.
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.ok(new CheckResponse(
                    false, 0, 0, List.of(), List.of(), Map.of(),
                    "Syntax error: " + firstError));
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
            // EES checks units automatically after calculations finish.
            Map<String, String> units = effectiveUnits(request.text(), request.variableInfo());
            List<String> unitWarnings = solver.checkUnits(request.text(), units);
            Map<String, String> unitsByLowerName = new HashMap<>();
            // Derived SI units fill in computed variables; declared units win.
            solver.deriveUnits(request.text(), units)
                    .forEach((name, unit) -> unitsByLowerName.put(name.toLowerCase(), unit));
            units.forEach((name, unit) -> unitsByLowerName.put(name.toLowerCase(), unit));
            UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());
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
                    null));
        } catch (EquationParser.ParseException e) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure("Syntax error:\n" + e.getMessage()));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(SolveResponse.failure(e.getMessage()));
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
}
