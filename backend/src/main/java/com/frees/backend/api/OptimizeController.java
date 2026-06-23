package com.frees.backend.api;

import com.frees.backend.core.CurveFitter;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.MultiObjectiveOptimizer;
import com.frees.backend.core.Optimizer;
import com.frees.backend.core.SolverException;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.parser.MarkdownEquationExtractor;
import com.frees.backend.units.UnitRegistry;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.frees.backend.api.SolverApiSupport.NO_EQUATIONS_MESSAGE;
import static com.frees.backend.api.SolverApiSupport.SYNTAX_ERROR_PREFIX;
import static com.frees.backend.api.SolverApiSupport.cappedDefaults;
import static com.frees.backend.api.SolverApiSupport.specsOf;
import static com.frees.backend.api.SolverApiSupport.toDisplay;
import static com.frees.backend.api.SolverApiSupport.unitSystem;
import static com.frees.backend.api.SolverApiSupport.unitsByLowerName;
import static com.frees.backend.api.SolverApiSupport.unitsByVariable;

/**
 * The optimization and curve-fitting endpoints: single- and multi-objective
 * optimization ({@code /optimize}, {@code /optimize/multi}) and the
 * Levenberg-Marquardt least-squares fitter ({@code /curve-fit}).
 *
 * <p>Split out of the monolithic {@code SolveController}: these are a distinct
 * concern (searching an objective over a decision space, fitting a model to
 * data) from equation solving, and carry their own request/response DTOs and
 * validation. The shared solve-budget, unit-display and variable-spec helpers
 * live in {@link SolverApiSupport}.
 */
@RestController
@RequestMapping("/api")
public class OptimizeController {

    private final EquationSystemSolver solver;

    public OptimizeController(EquationSystemSolver solver) {
        this.solver = solver;
    }

    public record OptimizeRequest(String text,
                                  SolverApiSupport.StopCriteriaDto stopCriteria,
                                  List<SolverApiSupport.VariableInfoDto> variableInfo,
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
                                   SolveDtos.VariableDto objective,
                                   SolveDtos.VariableDto decision,
                                   List<SolveDtos.VariableDto> decisions,
                                   int evaluations,
                                   List<SolveDtos.VariableDto> variables) {

        static OptimizeResponse failure(String error) {
            return new OptimizeResponse(false, error, null, null, null, null, 0, List.of());
        }
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

            return buildOptimizeResponse(result, request, cleanText, decisions);
        } catch (EquationParser.ParseException e) {
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.badRequest().body(OptimizeResponse.failure(SYNTAX_ERROR_PREFIX + firstError));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(OptimizeResponse.failure(e.getMessage()));
        }
    }

    public record MultiObjectiveRequest(String text,
                                        SolverApiSupport.StopCriteriaDto stopCriteria,
                                        List<SolverApiSupport.VariableInfoDto> variableInfo,
                                        List<String> objectives,
                                        List<Boolean> maximize,
                                        List<String> decisions,
                                        List<Double> lowers,
                                        List<Double> uppers,
                                        Integer populationSize,
                                        Integer generations,
                                        List<String> constraints) {}

    public record ParetoPointDto(List<Double> decisions, List<Double> objectives) {}

    public record ParetoResponse(boolean success, String error,
                                 List<String> decisionNames, List<String> objectiveNames,
                                 List<ParetoPointDto> front, int evaluations) {
        static ParetoResponse failure(String error) {
            return new ParetoResponse(false, error, List.of(), List.of(), List.of(), 0);
        }
    }

    @PostMapping("/optimize/multi")
    public ResponseEntity<ParetoResponse> optimizeMulti(@RequestBody MultiObjectiveRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest().body(ParetoResponse.failure(NO_EQUATIONS_MESSAGE));
        }
        if (request.objectives() == null || request.objectives().size() < 2) {
            return ResponseEntity.badRequest().body(ParetoResponse.failure(
                    "Multi-objective optimization needs at least two objective variables."));
        }
        if (request.decisions() == null || request.decisions().isEmpty()
                || request.lowers() == null || request.uppers() == null
                || request.lowers().size() != request.decisions().size()
                || request.uppers().size() != request.decisions().size()) {
            return ResponseEntity.badRequest().body(ParetoResponse.failure(
                    "Each decision variable requires matching lower and upper bounds."));
        }
        List<Boolean> maximize = request.maximize() != null && request.maximize().size() == request.objectives().size()
                ? request.maximize()
                : request.objectives().stream().map(o -> Boolean.FALSE).toList();

        String cleanText = MarkdownEquationExtractor.extract(request.text()).cleanText;
        SolverSettings settings = request.stopCriteria() != null
                ? request.stopCriteria().toSettings() : cappedDefaults();
        int population = clampPositive(request.populationSize(), 40, 200);
        int generations = clampPositive(request.generations(), 40, 200);

        try {
            MultiObjectiveOptimizer.Result result = new MultiObjectiveOptimizer(solver).optimize(
                    new MultiObjectiveOptimizer.Problem(cleanText, settings,
                            specsOf(request.variableInfo()),
                            request.objectives(), maximize,
                            request.decisions(), request.lowers(), request.uppers(),
                            population, generations, 42L,
                            request.constraints() != null ? request.constraints() : List.of()));

            List<ParetoPointDto> front = result.front().stream()
                    .map(pt -> new ParetoPointDto(
                            java.util.Arrays.stream(pt.decisions()).boxed().toList(),
                            java.util.Arrays.stream(pt.objectives()).boxed().toList()))
                    .toList();
            return ResponseEntity.ok(new ParetoResponse(true, null,
                    request.decisions(), request.objectives(), front, result.evaluations()));
        } catch (EquationParser.ParseException e) {
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.badRequest().body(ParetoResponse.failure(SYNTAX_ERROR_PREFIX + firstError));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ParetoResponse.failure(e.getMessage()));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ParetoResponse.failure(e.getMessage()));
        }
    }

    private static int clampPositive(Integer value, int fallback, int max) {
        if (value == null || value <= 0) {
            return fallback;
        }
        return Math.min(value, max);
    }

    /** Assembles the optimize response: display-converted objective, decisions and all variables. */
    private ResponseEntity<OptimizeResponse> buildOptimizeResponse(Optimizer.OptimizeResult result,
            OptimizeRequest request, String cleanText, List<String> decisions) {
        Map<String, String> explicitUnits = unitsByVariable(request.variableInfo());
        Map<String, String> unitsByLower = unitsByLowerName(cleanText, request.variableInfo(), solver);
        UnitRegistry.UnitSystem system = unitSystem(request.displayUnitSystem());

        List<SolveDtos.VariableDto> variables = result.solution().variables().entrySet().stream()
                .map(e -> toDisplay(e.getKey(), e.getValue(),
                        unitsByLower.getOrDefault(e.getKey().toLowerCase(), ""),
                        system,
                        explicitUnits))
                .toList();
        SolveDtos.VariableDto objective = toDisplay(request.objective(),
                result.objectiveValue(),
                unitsByLower.getOrDefault(request.objective().toLowerCase(), ""),
                system,
                explicitUnits);

        List<SolveDtos.VariableDto> decisionDtos = new ArrayList<>();
        for (int i = 0; i < decisions.size(); i++) {
            String dec = decisions.get(i);
            decisionDtos.add(toDisplay(dec,
                    result.decisionValues()[i],
                    unitsByLower.getOrDefault(dec.toLowerCase(), ""),
                    system,
                    explicitUnits));
        }

        SolveDtos.VariableDto primaryDecision = decisionDtos.get(0);

        return ResponseEntity.ok(new OptimizeResponse(true, null, result.warning(),
                objective, primaryDecision, decisionDtos, result.evaluations(), variables));
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

    /** Validates a curve-fit request, returning a bad-request response on the first
     *  problem or null when the request is well-formed. */
    private ResponseEntity<CurveFitResponse> validateCurveFitRequest(CurveFitRequest request) {
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
        return null;
    }

    @PostMapping("/curve-fit")
    public ResponseEntity<CurveFitResponse> curveFit(@RequestBody CurveFitRequest request) {
        ResponseEntity<CurveFitResponse> validationError = validateCurveFitRequest(request);
        if (validationError != null) {
            return validationError;
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

            List<Double> fittedParams = new ArrayList<>();
            for (double v : result.fittedParameters()) fittedParams.add(v);
            List<Double> residuals = new ArrayList<>();
            for (double v : result.residuals()) residuals.add(v);
            List<Double> fittedVals = new ArrayList<>();
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
                    .body(CurveFitResponse.failure(SYNTAX_ERROR_PREFIX + firstError));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(CurveFitResponse.failure(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(CurveFitResponse.failure(
                            "Curve fitting failed: " + e.getMessage()));
        }
    }
}
