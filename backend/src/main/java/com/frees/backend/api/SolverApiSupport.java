package com.frees.backend.api;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.core.VariableSpec;
import com.frees.backend.parser.EquationParser;
import com.frees.backend.units.UnitRegistry;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Stateless helpers and request-scoped DTOs shared across the solve-family
 * controllers ({@link SolveController}, {@link CheckController},
 * {@link OptimizeController}). Extracting them here lets each controller hold
 * only the endpoints and response assembly it owns, instead of one ~2000-line
 * god class re-declaring the same budget caps, unit display logic and REPL
 * override handling.
 *
 * <p>Everything here is either a {@code public static} utility or a wire record
 * with no Spring coupling, so the controllers can reference the members
 * directly without injection.
 */
final class SolverApiSupport {

    private SolverApiSupport() {}

    /** Server-side ceilings on the client-supplied solve budget. They prevent a
     * request from pinning a worker thread indefinitely (a denial-of-service
     * guard): no single solve may run longer than this wall-clock time or more
     * than this many Newton iterations, whatever the request asks for. */
    static final int MAX_ITERATIONS_CAP = 10_000;
    static final double MAX_ELAPSED_SECONDS_CAP = 60.0;

    static final String NO_EQUATIONS_MESSAGE = "No equations entered.";
    static final String SYNTAX_ERROR_PREFIX = "Syntax error: ";

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

    static Map<String, String> unitsByVariable(List<VariableInfoDto> variableInfo) {
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

    static Map<String, VariableSpec> specsOf(List<VariableInfoDto> variableInfo) {
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

    static UnitRegistry.UnitSystem unitSystem(String requested) {
        if (requested == null) {
            return UnitRegistry.UnitSystem.SI;
        }
        try {
            return UnitRegistry.UnitSystem.valueOf(requested.toUpperCase());
        } catch (IllegalArgumentException e) {
            return UnitRegistry.UnitSystem.SI;
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
    static boolean isInternalTemp(String name) {
        int bracket = name.indexOf('[');
        String base = (bracket >= 0 ? name.substring(0, bracket) : name).toLowerCase();
        for (String prefix : INTERNAL_TEMP_PREFIXES) {
            if (base.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    static SolveDtos.VariableDto toDisplay(String name, double siValue, Double siUnc, String unit,
                                           UnitRegistry.UnitSystem system,
                                           Map<String, String> explicitUnits) {
        if (unit == null || unit.isBlank() || unit.equals("-")) {
            return new SolveDtos.VariableDto(name, siValue, unit == null ? "" : unit, siUnc);
        }
        return convertToDisplayUnit(name, siValue, siUnc, unit, system, explicitUnits);
    }

    static SolveDtos.VariableDto toDisplay(String name, double siValue, String unit,
                                           UnitRegistry.UnitSystem system,
                                           Map<String, String> explicitUnits) {
        return toDisplay(name, siValue, null, unit, system, explicitUnits);
    }

    /** Converts an SI value/uncertainty to the explicit or preferred display unit;
     *  on an unknown unit it falls back to the SI value with the raw unit string. */
    private static SolveDtos.VariableDto convertToDisplayUnit(String name, double siValue, Double siUnc, String unit,
                                                              UnitRegistry.UnitSystem system, Map<String, String> explicitUnits) {
        double displayVal;
        double displayUnc = siUnc != null ? siUnc : 0.0;
        String displayUnit;
        try {
            UnitRegistry.OffsetQuantity recorded = UnitRegistry.parseWithOffset(unit);
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
        return new SolveDtos.VariableDto(name, displayVal, displayUnit, siUnc != null ? displayUnc : null);
    }

    /** Declared + inferred units (no dimensional derivation), keyed lowercase. */
    static Map<String, String> effectiveUnits(String text, List<VariableInfoDto> variableInfo,
                                              EquationSystemSolver solver) {
        return effectiveUnits(solver.parse(text), variableInfo, solver);
    }

    /** Overload reusing an already-parsed source (avoids re-parsing on the check/solve path). */
    static Map<String, String> effectiveUnits(EquationParser.ParseResult parsed,
                                              List<VariableInfoDto> variableInfo,
                                              EquationSystemSolver solver) {
        Map<String, String> units = new HashMap<>();
        solver.inferUnits(parsed)
                .forEach((name, unit) -> units.put(name.toLowerCase(), unit));
        units.putAll(unitsByVariable(variableInfo));
        return units;
    }

    /** Declared + inferred + dimensionally derived units, keyed lowercase. */
    static Map<String, String> unitsByLowerName(String text,
                                                List<VariableInfoDto> variableInfo,
                                                EquationSystemSolver solver) {
        return unitsByLowerName(solver.parse(text), variableInfo, solver);
    }

    /** Overload reusing an already-parsed source (avoids re-parsing on the check/solve path). */
    static Map<String, String> unitsByLowerName(EquationParser.ParseResult parsed,
                                                List<VariableInfoDto> variableInfo,
                                                EquationSystemSolver solver) {
        Map<String, String> units = effectiveUnits(parsed, variableInfo, solver);
        Map<String, String> byLower = new HashMap<>();
        solver.deriveUnits(parsed, units)
                .forEach((name, unit) -> byLower.put(name.toLowerCase(), unit));
        units.forEach((name, unit) -> byLower.put(name.toLowerCase(), unit));
        return byLower;
    }

    /** Applies REPL overrides to the solve text: each override is an equation string
     *  like {@code "eta = 0.75"}. The editor's own bare assignment of that variable
     *  ({@code eta = …}) is removed and the override appended, so the terminal value
     *  wins. Operates per {@code ;}-separated segment to preserve other equations on
     *  the same line. New variables (no editor assignment) are simply appended. */
    static String applyOverrides(String cleanText, List<String> overrides) {
        if (overrides == null || overrides.isEmpty()) {
            return cleanText;
        }
        java.util.Map<String, String> byName = new java.util.LinkedHashMap<>();
        for (String ov : overrides) {
            if (ov == null) {
                continue;
            }
            int eq = ov.indexOf('=');
            if (eq <= 0) {
                continue;
            }
            String name = ov.substring(0, eq).trim().toLowerCase();
            if (!name.isEmpty()) {
                byName.put(name, ov.trim());
            }
        }
        if (byName.isEmpty()) {
            return cleanText;
        }
        java.util.List<java.util.regex.Pattern> assigns = byName.keySet().stream()
                .map(n -> java.util.regex.Pattern.compile(
                        "^\\s*" + java.util.regex.Pattern.quote(n) + "\\s*=.*",
                        java.util.regex.Pattern.CASE_INSENSITIVE))
                .toList();

        StringBuilder sb = new StringBuilder();
        for (String line : cleanText.split("\n", -1)) {
            java.util.List<String> kept = new ArrayList<>();
            for (String seg : line.split(";")) {
                boolean overridden = assigns.stream().anyMatch(p -> p.matcher(seg).matches());
                if (!overridden) {
                    kept.add(seg);
                }
            }
            sb.append(String.join(";", kept)).append('\n');
        }
        for (String ov : byName.values()) {
            sb.append(ov).append('\n');
        }
        return sb.toString();
    }
}
