package com.frees.backend.api;

import com.frees.backend.core.Block;
import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverException;
import com.frees.backend.parser.EquationParser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SolveController {

    public record SolveRequest(String text) {}

    public record VariableDto(String name, double value) {}

    public record BlockDto(int index, List<String> equations, List<String> variables) {}

    public record ResidualDto(String equation, double value) {}

    public record StatsDto(int equations,
                           int unknowns,
                           int blocks,
                           long elapsedMillis,
                           double maxResidual) {}

    public record SolveResponse(boolean success,
                                List<VariableDto> variables,
                                List<BlockDto> blocks,
                                List<ResidualDto> residuals,
                                StatsDto stats,
                                String error) {

        static SolveResponse failure(String error) {
            return new SolveResponse(false, List.of(), List.of(), List.of(), null, error);
        }
    }

    private final EquationSystemSolver solver;

    public SolveController(EquationSystemSolver solver) {
        this.solver = solver;
    }

    public record CheckResponse(boolean solvable,
                                int equations,
                                int unknowns,
                                String message) {}

    @PostMapping("/check")
    public ResponseEntity<CheckResponse> check(@RequestBody SolveRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.ok(new CheckResponse(false, 0, 0, "No equations entered."));
        }
        try {
            EquationSystemSolver.CheckResult result = solver.check(request.text());
            return ResponseEntity.ok(new CheckResponse(
                    result.solvable(),
                    result.equationCount(),
                    result.unknownCount(),
                    result.message()));
        } catch (EquationParser.ParseException e) {
            // EES halts at the first syntax error; report the first one found.
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            return ResponseEntity.ok(new CheckResponse(
                    false, 0, 0, "Syntax error: " + firstError));
        }
    }

    @PostMapping("/solve")
    public ResponseEntity<SolveResponse> solve(@RequestBody SolveRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure("No equations entered."));
        }
        try {
            EquationSystemSolver.Result result = solver.solve(request.text());
            return ResponseEntity.ok(new SolveResponse(
                    true,
                    result.variables().entrySet().stream()
                            .map(e -> new VariableDto(e.getKey(), e.getValue()))
                            .toList(),
                    result.blocks().stream()
                            .map(SolveController::toBlockDto)
                            .toList(),
                    result.residuals().stream()
                            .map(r -> new ResidualDto(r.equation(), r.residual()))
                            .toList(),
                    new StatsDto(
                            result.stats().equationCount(),
                            result.stats().unknownCount(),
                            result.stats().blockCount(),
                            result.stats().elapsedMillis(),
                            result.stats().maxResidual()),
                    null));
        } catch (EquationParser.ParseException e) {
            return ResponseEntity.badRequest()
                    .body(SolveResponse.failure("Syntax error:\n" + e.getMessage()));
        } catch (SolverException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(SolveResponse.failure(e.getMessage()));
        }
    }

    private static BlockDto toBlockDto(Block block) {
        return new BlockDto(
                block.index(),
                block.equations().stream().map(eq -> eq.sourceText()).toList(),
                block.variables());
    }
}
