package com.frees.backend.api;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.core.SolverSettings;
import com.frees.backend.core.VariableSpec;
import com.frees.backend.units.UnitRegistry;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The stateless request-shaping helpers shared by the solve-family controllers:
 * solve-budget capping, unit-aware variable specs, syntax-error line
 * extraction, display-unit conversion, matrix-temp filtering, and REPL
 * override splicing.
 */
class SolverApiSupportTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    // --- solve budget -------------------------------------------------------

    @Test
    void cappedDefaultsApplyTheServerCeilings() {
        SolverSettings s = SolverApiSupport.cappedDefaults();
        assertEquals(SolverSettings.DEFAULTS.maxIterations(), s.maxIterations());
        // the 3600 s library default must be capped to the 60 s request ceiling
        assertEquals(SolverApiSupport.MAX_ELAPSED_SECONDS_CAP, s.elapsedTimeSeconds());
        assertFalse(s.complexMode());
    }

    @Test
    void stopCriteriaAreClampedIntoTheAllowedRange() {
        SolverSettings s = new SolverApiSupport.StopCriteriaDto(
                999_999, 1e-9, 1e-10, 4000.0, true).toSettings();
        assertEquals(SolverApiSupport.MAX_ITERATIONS_CAP, s.maxIterations());
        assertEquals(1e-9, s.relativeResiduals());
        assertEquals(1e-10, s.changeInVariables());
        assertEquals(SolverApiSupport.MAX_ELAPSED_SECONDS_CAP, s.elapsedTimeSeconds());
        assertTrue(s.complexMode());

        SolverSettings floor = new SolverApiSupport.StopCriteriaDto(
                0, null, null, 0.5, null).toSettings();
        assertEquals(1, floor.maxIterations());
        assertEquals(0.5, floor.elapsedTimeSeconds());
    }

    // --- variable specs -----------------------------------------------------

    @Test
    void variableInfoConvertsGuessBoundsAndUncertaintyToSi() {
        VariableSpec spec = new SolverApiSupport.VariableInfoDto(
                "P", 100.0, 1.0, 200.0, "kPa", 5.0).toSpec();
        assertEquals(100_000.0, spec.guess(), 1e-9);
        assertEquals(1_000.0, spec.lower(), 1e-9);
        assertEquals(200_000.0, spec.upper(), 1e-9);
        assertEquals(5_000.0, spec.uncertainty(), 1e-9);
    }

    @Test
    void variableInfoHandlesOffsetUnits() {
        VariableSpec spec = new SolverApiSupport.VariableInfoDto(
                "T", 25.0, null, null, "C", null).toSpec();
        assertEquals(298.15, spec.guess(), 1e-9);
        assertEquals(Double.NEGATIVE_INFINITY, spec.lower());
        assertEquals(Double.POSITIVE_INFINITY, spec.upper());
    }

    @Test
    void variableInfoFallsBackOnUnknownUnitsAndClampsTheDefaultGuess() {
        VariableSpec raw = new SolverApiSupport.VariableInfoDto(
                "x", 25.0, null, null, "zorks", null).toSpec();
        assertEquals(25.0, raw.guess(), 1e-9);

        // no guess given: the 1.0 default is clamped into [lower, upper]
        VariableSpec clamped = new SolverApiSupport.VariableInfoDto(
                "y", null, 5.0, 9.0, null, null).toSpec();
        assertEquals(5.0, clamped.guess(), 1e-9);
    }

    @Test
    void specsOfAndUnitsByVariableFilterBlankEntries() {
        List<SolverApiSupport.VariableInfoDto> info = Arrays.asList(
                new SolverApiSupport.VariableInfoDto("a", 2.0, null, null, "m", null),
                new SolverApiSupport.VariableInfoDto("  ", 1.0, null, null, "s", null),
                new SolverApiSupport.VariableInfoDto(null, 1.0, null, null, "s", null),
                new SolverApiSupport.VariableInfoDto("b", null, null, null, " ", null));
        Map<String, VariableSpec> specs = SolverApiSupport.specsOf(info);
        assertEquals(2, specs.size());
        assertEquals(2.0, specs.get("a").guess(), 1e-9);

        // unitsByVariable filters null names and null/blank units (names are
        // trusted as-is: a blank name never matches a real solver variable)
        Map<String, String> units = SolverApiSupport.unitsByVariable(info);
        assertEquals("m", units.get("a"));
        assertFalse(units.containsValue(" "), "blank units must be dropped");

        assertTrue(SolverApiSupport.specsOf(null).isEmpty());
        assertTrue(SolverApiSupport.unitsByVariable(null).isEmpty());
    }

    // --- syntax error line --------------------------------------------------

    @Test
    void parseErrorLineExtractsTheFirstLineNumber() {
        assertEquals(42, SolverApiSupport.parseErrorLine("line 42:7 mismatched input"));
        assertEquals(3, SolverApiSupport.parseErrorLine("line 3:1 first\nline 9:2 second"));
        assertNull(SolverApiSupport.parseErrorLine("no location here"));
        assertNull(SolverApiSupport.parseErrorLine(null));
        assertNull(SolverApiSupport.parseErrorLine("line 99999999999999999999:1 overflow"));
    }

    // --- unit system + internal temps ---------------------------------------

    @Test
    void unitSystemParsesLenientlyAndDefaultsToSi() {
        assertEquals(UnitRegistry.UnitSystem.SI, SolverApiSupport.unitSystem(null));
        assertEquals(UnitRegistry.UnitSystem.ENGLISH, SolverApiSupport.unitSystem("english"));
        assertEquals(UnitRegistry.UnitSystem.SI, SolverApiSupport.unitSystem("bogus"));
    }

    @Test
    void internalMatrixTempsAreFilteredButUserVariablesAreNot() {
        assertTrue(SolverApiSupport.isInternalTemp("inverse_temp_12[1,2]"));
        assertTrue(SolverApiSupport.isInternalTemp("Backslash_Temp_1[3]"));
        assertTrue(SolverApiSupport.isInternalTemp("solvelinear_temp_2"));
        assertFalse(SolverApiSupport.isInternalTemp("motor_temp_5"));
        assertFalse(SolverApiSupport.isInternalTemp("x"));
    }

    // --- display conversion -------------------------------------------------

    @Test
    void blankOrDashUnitsPassTheSiValueThrough() {
        SolveDtos.VariableDto blank = SolverApiSupport.toDisplay(
                "x", 3.5, null, UnitRegistry.UnitSystem.SI, Map.of());
        assertEquals(3.5, blank.value(), 1e-12);
        assertEquals("", blank.units());

        SolveDtos.VariableDto dash = SolverApiSupport.toDisplay(
                "x", 3.5, "-", UnitRegistry.UnitSystem.SI, Map.of());
        assertEquals("-", dash.units());
    }

    @Test
    void explicitUserUnitsWinOverThePreferredDisplayUnit() {
        SolveDtos.VariableDto dto = SolverApiSupport.toDisplay(
                "P", 250_000.0, 1000.0, "kPa",
                UnitRegistry.UnitSystem.SI, Map.of("p", "kPa"));
        assertEquals(250.0, dto.value(), 1e-9);
        assertEquals("kPa", dto.units());
        assertEquals(1.0, dto.uncertainty(), 1e-9);
    }

    @Test
    void unknownUnitsFallBackToTheRawSiValue() {
        SolveDtos.VariableDto dto = SolverApiSupport.toDisplay(
                "q", 7.0, "zorks", UnitRegistry.UnitSystem.SI, Map.of());
        assertEquals(7.0, dto.value(), 1e-12);
        assertEquals("zorks", dto.units());
    }

    @Test
    void preferredDisplayUnitPathProducesAFiniteLabelledValue() {
        SolveDtos.VariableDto dto = SolverApiSupport.toDisplay(
                "P", 101_325.0, "Pa", UnitRegistry.UnitSystem.SI, Map.of());
        assertTrue(Double.isFinite(dto.value()));
        assertFalse(dto.units().isBlank());
    }

    // --- unit maps from a parsed document ------------------------------------

    @Test
    void effectiveUnitsMergesInferredAndExplicitUnits() {
        String text = "x = 2 [m]\nt = 4 [s]\nv = x / t";
        Map<String, String> units = SolverApiSupport.effectiveUnits(
                text,
                List.of(new SolverApiSupport.VariableInfoDto("T", null, null, null, "min", null)),
                solver);
        assertEquals("m", units.get("x"));
        assertEquals("min", units.get("t"));   // explicit user unit wins over [s]
    }

    @Test
    void unitsByLowerNameAddsDimensionallyDerivedUnits() {
        String text = "x = 2 [m]\nt = 4 [s]\nv = x / t";
        Map<String, String> units = SolverApiSupport.unitsByLowerName(text, null, solver);
        assertEquals("m", units.get("x"));
        assertEquals("m/s", units.get("v"));
    }

    // --- REPL overrides -------------------------------------------------------

    @Test
    void applyOverridesWithNothingToApplyReturnsTheTextUnchanged() {
        assertEquals("a = 1", SolverApiSupport.applyOverrides("a = 1", null));
        assertEquals("a = 1", SolverApiSupport.applyOverrides("a = 1", List.of()));
        // overrides that carry no assignment are ignored entirely
        assertEquals("a = 1", SolverApiSupport.applyOverrides("a = 1",
                Arrays.asList(null, "no assignment", "= 5")));
    }

    @Test
    void applyOverridesReplacesTheEditorAssignmentAndKeepsSiblings() {
        String text = "a = 1\nB = 2; c = 3";
        String out = SolverApiSupport.applyOverrides(text, List.of("b = 99"));
        assertFalse(out.contains("B = 2"), out);
        assertTrue(out.contains("c = 3"), out);
        assertTrue(out.contains("b = 99"), out);
        assertTrue(out.contains("a = 1"), out);
    }

    @Test
    void applyOverridesAppendsNewVariables() {
        String out = SolverApiSupport.applyOverrides("a = 1", List.of("d = 5"));
        assertTrue(out.contains("a = 1"));
        assertTrue(out.contains("d = 5"));
    }
}
