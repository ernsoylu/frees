package com.frees.backend.api;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.parser.EquationParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.frees.backend.api.SolverApiSupport.NO_EQUATIONS_MESSAGE;
import static com.frees.backend.api.SolverApiSupport.SYNTAX_ERROR_PREFIX;
import static com.frees.backend.api.SolverApiSupport.applyOverrides;
import static com.frees.backend.api.SolverApiSupport.effectiveUnits;
import static com.frees.backend.api.SolverApiSupport.parseErrorLine;
import static com.frees.backend.api.SolveDtos.codeTablesOf;
import static com.frees.backend.api.SolveDtos.parametricTablesOf;
import static com.frees.backend.api.SolveDtos.plotsOf;
import static com.frees.backend.api.SolveDtos.stateTablesOf;

/**
 * The Check-before-Solve endpoint. {@code POST /api/check} verifies syntax and
 * structural solvability (degrees of freedom + complete equation↔variable
 * matching) without solving, and reports the unit warnings and parsed
 * block definitions (tables, plots, state tables) so the frontend can gate
 * the Solve button before solving is allowed.
 *
 * <p>Split out of the monolithic {@code SolveController} so the check path —
 * which runs on every edit before solving is allowed — has its own focused
 * controller and its own response DTO.
 */
@RestController
@RequestMapping("/api")
public class CheckController {

    private static final Logger log = LoggerFactory.getLogger(CheckController.class);

    private final EquationSystemSolver solver;

    public CheckController(EquationSystemSolver solver) {
        this.solver = solver;
    }

    public record CheckResponse(boolean solvable,
                                int equations,
                                int unknowns,
                                List<String> variables,
                                List<String> unitWarnings,
                                Map<String, String> inferredUnits,
                                String message,
                                List<SolveDtos.FunctionTableDto> codeTables,
                                List<SolveDtos.ParametricTableDto> parametricTables,
                                List<SolveDtos.PlotDefDto> definedPlots,
                                // 1-based editor line a syntax error points at, or
                                // null for whole-system errors (no single line).
                                Integer errorLine,
                                List<SolveDtos.StateTableDto> stateTableDefs,
                                // Every syntax error the parse collected (ANTLR
                                // recovers per line), so the editor marks them all —
                                // errorLine/message keep pointing at the first.
                                List<SolveDtos.SyntaxErrorDto> errors,
                                // Connection topology of the component network
                                // (domain + instance.port endpoints per node) —
                                // the rendered schematic's data layer.
                                List<SolveDtos.ConnectionDto> connections) {

        /** Backward-compatible constructor for callers that predate connections. */
        public CheckResponse(boolean solvable, int equations, int unknowns,
                             List<String> variables, List<String> unitWarnings,
                             Map<String, String> inferredUnits, String message,
                             List<SolveDtos.FunctionTableDto> codeTables,
                             List<SolveDtos.ParametricTableDto> parametricTables,
                             List<SolveDtos.PlotDefDto> definedPlots, Integer errorLine,
                             List<SolveDtos.StateTableDto> stateTableDefs,
                             List<SolveDtos.SyntaxErrorDto> errors) {
            this(solvable, equations, unknowns, variables, unitWarnings, inferredUnits,
                    message, codeTables, parametricTables, definedPlots, errorLine,
                    stateTableDefs, errors, List.of());
        }

        /** Backward-compatible constructor for callers that predate the error list. */
        public CheckResponse(boolean solvable, int equations, int unknowns,
                             List<String> variables, List<String> unitWarnings,
                             Map<String, String> inferredUnits, String message,
                             List<SolveDtos.FunctionTableDto> codeTables,
                             List<SolveDtos.ParametricTableDto> parametricTables,
                             List<SolveDtos.PlotDefDto> definedPlots, Integer errorLine,
                             List<SolveDtos.StateTableDto> stateTableDefs) {
            this(solvable, equations, unknowns, variables, unitWarnings, inferredUnits,
                    message, codeTables,
                    parametricTables, definedPlots, errorLine, stateTableDefs, List.of());
        }

        /** Backward-compatible constructor for callers that predate state tables. */
        public CheckResponse(boolean solvable, int equations, int unknowns,
                             List<String> variables, List<String> unitWarnings,
                             Map<String, String> inferredUnits, String message,
                             List<SolveDtos.FunctionTableDto> codeTables,
                             List<SolveDtos.ParametricTableDto> parametricTables,
                             List<SolveDtos.PlotDefDto> definedPlots, Integer errorLine) {
            this(solvable, equations, unknowns, variables, unitWarnings, inferredUnits,
                    message, codeTables,
                    parametricTables, definedPlots, errorLine, List.of(), List.of());
        }

        /** Backward-compatible constructor for the common no-error-line case. */
        public CheckResponse(boolean solvable, int equations, int unknowns,
                             List<String> variables, List<String> unitWarnings,
                             Map<String, String> inferredUnits, String message,
                             List<SolveDtos.FunctionTableDto> codeTables,
                             List<SolveDtos.ParametricTableDto> parametricTables,
                             List<SolveDtos.PlotDefDto> definedPlots) {
            this(solvable, equations, unknowns, variables, unitWarnings, inferredUnits,
                    message, codeTables,
                    parametricTables, definedPlots, null, List.of(), List.of());
        }
    }

    @PostMapping("/check")
    public ResponseEntity<CheckResponse> check(@RequestBody SolveController.SolveRequest request) {
        if (request.text() == null || request.text().isBlank()) {
            return ResponseEntity.badRequest().body(new CheckResponse(false, 0, 0, List.of(), List.of(),
                    Map.of(), NO_EQUATIONS_MESSAGE, List.of(), List.of(), List.of()));
        }
        try {
            boolean complexMode = request.stopCriteria() != null && Boolean.TRUE.equals(request.stopCriteria().complexMode());
            String cleanText = applyOverrides(request.text(), request.overrides());

            // Parse once and thread the result through every solver call below;
            // check/deriveUnits/inferUnits/checkUnits otherwise each re-parse the
            // same text (this endpoint runs on the hot Check-before-Solve path).
            EquationParser.ParseResult parsed = solver.parse(cleanText);

            EquationSystemSolver.CheckResult result = solver.check(parsed, complexMode,
                    SolveDtos.functionDefsOf(request.functionTables()));
            Map<String, String> effective = effectiveUnits(parsed, request.variableInfo(), solver);
            Map<String, String> inferredUnits =
                    new HashMap<>(solver.deriveUnits(parsed, effective));
            inferredUnits.putAll(solver.inferUnits(parsed));
            List<String> unitWarnings = solver.checkUnits(parsed, effective);

            return ResponseEntity.ok(new CheckResponse(
                    result.solvable(),
                    result.equationCount(),
                    result.unknownCount(),
                    result.variables(),
                    unitWarnings,
                    inferredUnits,
                    result.message(),
                    codeTablesOf(parsed.defs()),
                    parametricTablesOf(parsed.parametricTables()),
                    plotsOf(parsed.plots()),
                    null,
                    stateTablesOf(parsed.stateTables()),
                    List.of(),
                    SolveDtos.connectionsOf(parsed)));
        } catch (EquationParser.ParseException e) {
            String firstError = e.getMessage().lines().findFirst().orElse(e.getMessage());
            List<SolveDtos.SyntaxErrorDto> errors = syntaxErrorDtos(e);
            String suffix = errors.size() > 1
                    ? " (+" + (errors.size() - 1) + " more — all marked in the editor)"
                    : "";
            return ResponseEntity.badRequest().body(new CheckResponse(
                    false, 0, 0, List.of(), List.of(), Map.of(),
                    SYNTAX_ERROR_PREFIX + firstError + suffix, List.of(), List.of(), List.of(),
                    parseErrorLine(e.getMessage()), List.of(), errors));
        } catch (Exception e) {
            log.error("Unexpected error while checking equations", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new CheckResponse(
                            false, 0, 0, List.of(), List.of(), Map.of(),
                            e.getMessage() != null ? e.getMessage() : e.toString(), List.of(), List.of(), List.of()));
        }
    }

    /** Structured syntax errors for the editor: the first error per line,
     *  capped, so a recovery cascade can never flood the lint gutter. */
    private static List<SolveDtos.SyntaxErrorDto> syntaxErrorDtos(EquationParser.ParseException e) {
        List<SolveDtos.SyntaxErrorDto> out = new java.util.ArrayList<>();
        java.util.Set<Integer> seenLines = new java.util.HashSet<>();
        for (EquationParser.SyntaxError err : e.syntaxErrors()) {
            if (!seenLines.add(err.line())) {
                continue;
            }
            out.add(new SolveDtos.SyntaxErrorDto(err.line(), err.column(), err.message()));
            if (out.size() >= 8) {
                break;
            }
        }
        return out;
    }
}
