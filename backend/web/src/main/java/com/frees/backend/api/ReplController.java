package com.frees.backend.api;

import com.frees.backend.units.UnitRegistry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REPL endpoints: evaluate a single expression against the cached solved
 * workspace, and expose the in-scope variable names for tab-completion.
 *
 * <p>Stateless apart from the {@link SolveContextCache} it reads. The context is
 * populated by a successful {@code /api/solve}; until then evaluate returns a
 * friendly "solve first" message rather than an error.
 */
@RestController
@RequestMapping("/api/repl")
public class ReplController {

    private final SolveContextCache cache;
    private final ReplEvaluator evaluator;

    public ReplController(SolveContextCache cache, ReplEvaluator evaluator) {
        this.cache = cache;
        this.evaluator = evaluator;
    }

    public record ReplRequest(String sessionId, String expression, String unitSystem) {}

    public record ReplVarDto(String name, double value, String units, Double uncertainty) {}

    public record ReplResponse(boolean success, Double value, String text,
                               String unit, Double uncertainty, String error, String name,
                               java.util.List<ReplVarDto> assignedVariables) {}

    @PostMapping("/evaluate")
    public ResponseEntity<ReplResponse> evaluate(@RequestBody ReplRequest request) {
        // session() (not peek) so assignments and literal math work even before a
        // solve; references to unknown variables still fail naturally.
        SolveContextCache.Session session = cache.session(request.sessionId());
        // Apply the caller's current preferred unit system on every call so the
        // REPL labels results with the live preference (e.g. kPa under ENG_SI)
        // rather than the system pinned by the last solve.
        if (request.unitSystem() != null && !request.unitSystem().isBlank()) {
            try {
                session.setSystem(UnitRegistry.UnitSystem.valueOf(request.unitSystem().toUpperCase()));
            } catch (IllegalArgumentException ignored) {
                // Unknown system string — keep the session's current system.
            }
        }
        ReplEvaluator.Outcome o = evaluator.evaluate(request.expression(), session);
        return ResponseEntity.ok(new ReplResponse(
                o.success(), o.value(), o.text(), o.unit(), o.uncertainty(), o.error(), o.assignedName(), o.assignedVariables()));
    }

    /** Drops all (or a specific) REPL-defined/overridden variables for the session
     *  (the `clear` or `clear <var>` command). */
    @PostMapping("/clear")
    public ResponseEntity<Void> clear(@RequestBody ReplRequest request) {
        SolveContextCache.Session session = cache.peek(request.sessionId());
        if (session != null) {
            String expr = request.expression();
            if (expr != null && !expr.isBlank()) {
                session.clearVariable(expr.trim().toLowerCase());
            } else {
                session.clearOverlay();
            }
        }
        return ResponseEntity.ok().build();
    }

    /** Variable names currently in the workspace (plus REPL-defined), for tab-completion. */
    @GetMapping("/variables")
    public ResponseEntity<List<String>> variables(
            @RequestParam(name = "sessionId", required = false) String sessionId) {
        SolveContextCache.Session session = cache.peek(sessionId);
        return ResponseEntity.ok(session == null ? List.of() : session.completionNames());
    }
}
