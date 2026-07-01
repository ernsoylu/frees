package com.frees.backend.api;

import com.frees.backend.core.EquationSystemSolver;
import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Missing-property back-filling and cycle-path interpolation for numbered
 * state points: each naming style (T1 / T_1 / STATE TABLE tag), the
 * target-variable filter, and every process-interpolation branch (isobaric,
 * isentropic, isothermal, isenthalpic, isochoric, default). CoolProp-gated.
 */
class CyclePathResolverTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();
    private final CyclePathResolver resolver = new CyclePathResolver();

    // --- resolveMissingProperties -------------------------------------------

    @Test
    void backFillsThePropertiesOfANumberedState() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String text = "T1 = 400 [K]\nP1 = 101325 [Pa]";
        EquationSystemSolver.Result raw = solver.solve(text);
        EquationSystemSolver.Result out = resolver.resolveMissingProperties(raw, text, null);
        Map<String, Double> v = out.variables();
        // superheated steam at 400 K / 1 atm: h, s, u, rho, v all resolvable
        assertTrue(v.containsKey("h1"), v.keySet().toString());
        assertTrue(v.containsKey("s1"), v.keySet().toString());
        assertTrue(v.containsKey("u1"), v.keySet().toString());
        assertTrue(v.containsKey("rho1"), v.keySet().toString());
        assertTrue(v.containsKey("v1"), v.keySet().toString());
        assertTrue(v.get("h1") > 2.5e6, "steam enthalpy should be ~2.7 MJ/kg, got " + v.get("h1"));
        // v = 1/rho consistency
        assertTrue(Math.abs(v.get("v1") - 1.0 / v.get("rho1")) < 1e-9);
    }

    @Test
    void underscoreStyleStatesKeepTheirNamingInWriteBack() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String text = "T_1 = 500 [K]\nP_1 = 200000 [Pa]";
        EquationSystemSolver.Result out =
                resolver.resolveMissingProperties(solver.solve(text), text, null);
        assertTrue(out.variables().containsKey("h_1"), out.variables().keySet().toString());
        assertTrue(out.variables().containsKey("s_1"), out.variables().keySet().toString());
    }

    @Test
    void targetVariablesRestrictWhichPropertiesAreAdded() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String text = "T1 = 400 [K]\nP1 = 101325 [Pa]";
        EquationSystemSolver.Result out = resolver.resolveMissingProperties(
                solver.solve(text), text, Set.of("h1"));
        assertTrue(out.variables().containsKey("h1"));
        assertFalse(out.variables().containsKey("s1"),
                "s1 was not requested and must not be added");
    }

    @Test
    void stateTableBlocksResolveTaggedStatesWithTheirOwnFluid() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String text = """
                Tw1 = 400 [K]
                Pw1 = 101325 [Pa]
                STATE TABLE WaterCircuit(Tw1, Pw1)
                  FLUID = Water
                END
                """;
        EquationSystemSolver.Result out =
                resolver.resolveMissingProperties(solver.solve(text), text, null);
        // the circuit tag "w" is preserved in the computed property names
        assertTrue(out.variables().containsKey("hw1"), out.variables().keySet().toString());
        assertTrue(out.variables().containsKey("sw1"), out.variables().keySet().toString());
    }

    @Test
    void passesThroughWhenNoStatePairIsComplete() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        String text = "T1 = 400 [K]\nzeta = 2";
        EquationSystemSolver.Result out =
                resolver.resolveMissingProperties(solver.solve(text), text, null);
        // one known property is not enough to flash the state
        assertFalse(out.variables().containsKey("h1"));
    }

    // --- generateCyclePath ---------------------------------------------------

    @Test
    void fewerThanTwoStatesProducesNoPath() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> vars = new HashMap<>();
        vars.put("P1", 101325.0);
        vars.put("s1", 1000.0);
        assertTrue(resolver.generateCyclePath(vars, "Water").isEmpty());
    }

    @Test
    void equalPressuresInterpolateAnIsobar() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> vars = new HashMap<>();
        vars.put("P1", 101325.0);
        vars.put("s1", 1000.0);
        vars.put("P2", 101325.0);
        vars.put("s2", 3000.0);
        List<Map<String, Double>> path = resolver.generateCyclePath(vars, "Water");
        assertFalse(path.isEmpty());
        assertTrue(path.stream().allMatch(pt -> pt.containsKey("P") || pt.containsKey("T")),
                "flashed points must carry plottable properties");
    }

    @Test
    void equalEntropiesInterpolateAnIsentrope() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> vars = new HashMap<>();
        vars.put("P1", 101325.0);
        vars.put("s1", 6000.0);
        vars.put("P2", 1000000.0);
        vars.put("s2", 6000.0);
        assertFalse(resolver.generateCyclePath(vars, "Water").isEmpty());
    }

    @Test
    void equalTemperaturesInterpolateAnIsotherm() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> vars = new HashMap<>();
        vars.put("T1", 450.0);
        vars.put("s1", 2000.0);
        vars.put("T2", 450.0);
        vars.put("s2", 5000.0);
        assertFalse(resolver.generateCyclePath(vars, "Water").isEmpty());
    }

    @Test
    void equalEnthalpiesInterpolateAnIsenthalp() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> vars = new HashMap<>();
        vars.put("P1", 1000000.0);
        vars.put("h1", 2800000.0);
        vars.put("P2", 200000.0);
        vars.put("h2", 2800000.0);
        assertFalse(resolver.generateCyclePath(vars, "Water").isEmpty());
    }

    @Test
    void equalSpecificVolumesInterpolateAnIsochor() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> vars = new HashMap<>();
        vars.put("T1", 420.0);
        vars.put("v1", 0.5);
        vars.put("T2", 520.0);
        vars.put("v2", 0.5);
        assertFalse(resolver.generateCyclePath(vars, "Water").isEmpty());
    }

    @Test
    void unrelatedStatesFallBackToLinearInterpolation() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> vars = new HashMap<>();
        vars.put("T1", 300.0);
        vars.put("h1", 100000.0);
        vars.put("T2", 400.0);
        vars.put("h2", 500000.0);
        List<Map<String, Double>> path = resolver.generateCyclePath(vars, "Water");
        assertFalse(path.isEmpty());
        // linear interpolation carries the raw properties through
        assertTrue(path.get(0).containsKey("T"));
    }

    @Test
    void nonStateVariablesAreIgnoredWhenGrouping() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        Map<String, Double> vars = new HashMap<>();
        vars.put("zeta1", 5.0);       // not a recognized property prefix
        vars.put("eta", 0.8);         // no state index at all
        vars.put("P1", 101325.0);
        vars.put("s1", 1000.0);
        // only one real state -> no path (proves zeta1/eta didn't form a bogus state)
        assertTrue(resolver.generateCyclePath(vars, "Water").isEmpty());
    }
}
