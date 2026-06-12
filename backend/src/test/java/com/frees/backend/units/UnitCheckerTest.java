package com.frees.backend.units;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UnitCheckerTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void milestoneTwoReynoldsNumberConsistent() {
        // Re = rho*u*D/mu resolves dimensionless with proper fluid units.
        List<String> warnings = solver.checkUnits("Re = rho * u * D / mu",
                Map.of("re", "-", "rho", "kg/m^3", "u", "m/s", "d", "m", "mu", "kg/m-s"));
        assertEquals(List.of(), warnings);
    }

    @Test
    void milestoneTwoReynoldsNumberFlaggedWhenNotDimensionless() {
        // Wrong viscosity units: Re no longer resolves to a dimensionless number.
        List<String> warnings = solver.checkUnits("Re = rho * u * D / mu",
                Map.of("re", "-", "rho", "kg/m^3", "u", "m/s", "d", "m", "mu", "kg/m"));
        assertEquals(1, warnings.size());
        assertTrue(warnings.get(0).contains("do not match"));
    }

    @Test
    void addingDifferentDimensionsIsFlagged() {
        List<String> warnings = solver.checkUnits("x = 5 [m] + 2 [s]", Map.of());
        assertEquals(1, warnings.size());
        assertTrue(warnings.get(0).contains("add/subtract"));
    }

    @Test
    void constantUnitsCheckAgainstVariableUnits() {
        List<String> warnings = solver.checkUnits("P = 140 [kPa]", Map.of("p", "kPa"));
        assertEquals(List.of(), warnings);

        warnings = solver.checkUnits("P = 140 [kPa]", Map.of("p", "m"));
        assertEquals(1, warnings.size());
    }

    @Test
    void blankUnitsAreWildcards() {
        // No units declared anywhere: nothing to check, no warnings.
        assertEquals(List.of(), solver.checkUnits("y = x * 2 + z", Map.of()));
    }

    @Test
    void transcendentalArgumentsMustBeDimensionless() {
        List<String> warnings = solver.checkUnits("y = sin(x)", Map.of("x", "m", "y", "-"));
        assertEquals(1, warnings.size());
        assertTrue(warnings.get(0).contains("dimensionless"));
    }

    @Test
    void sqrtHalvesDimensions() {
        List<String> warnings = solver.checkUnits("v = sqrt(e)",
                Map.of("v", "m/s", "e", "m^2/s^2"));
        assertEquals(List.of(), warnings);
    }

    @Test
    void unknownUnitOnVariableIsReported() {
        List<String> warnings = solver.checkUnits("x = 1", Map.of("x", "blorbs"));
        assertEquals(1, warnings.size());
        assertTrue(warnings.get(0).contains("blorbs"));
    }

    @Test
    void unitsInferredFromAnnotatedConstants() {
        // Keys carry the first-appearance spelling; values are SI (bar -> Pa).
        var inferred = solver.inferUnits("P = 100 [bar]\nA = 0.024 [m^2]\nF = P * A");
        assertEquals("Pa", inferred.get("P"));
        assertEquals("m^2", inferred.get("A"));
        assertEquals(null, inferred.get("F"));
        assertEquals(null, inferred.get("p"));
    }

    @Test
    void unitsDerivedForComputedVariables() {
        var derived = solver.deriveUnits(
                "P = 100 [bar]\nA = 0.024 [m^2]\nF = P * A",
                Map.of("p", "Pa", "a", "m^2"));
        assertEquals("N", derived.get("F"));
    }

    @Test
    void derivedUnitsSolveByRearrangement() {
        // m appears inside the product: dims(m) = dims(F) - dims(g) = kg.
        var derived = solver.deriveUnits("F = m * g",
                Map.of("f", "N", "g", "m/s^2"));
        assertEquals("kg", derived.get("m"));

        // Solving for a denominator: mu = rho*u*D/Re.
        var mu = solver.deriveUnits("Re = rho * u * D / mu",
                Map.of("re", "-", "rho", "kg/m^3", "u", "m/s", "d", "m"));
        assertEquals("Pa-s", mu.get("mu"));

        // Solving through a power: E = 0.5*m*v^2 gives v = sqrt(J/kg) = m/s.
        var v = solver.deriveUnits("E = 0.5 * m * v^2",
                Map.of("e", "J", "m", "kg"));
        assertEquals("m/s", v.get("v"));
    }

    @Test
    void rearrangementBailsOnNonMultiplicativeUnknowns() {
        // x trapped inside a sum with a wildcard term: not isolatable.
        var derived = solver.deriveUnits("F = m + x * 2",
                Map.of("f", "N"));
        assertEquals(null, derived.get("x"));
    }

    @Test
    void derivedUnitsPropagateThroughChains() {
        // m, g, A annotated; P derives Pa through the chain.
        var derived = solver.deriveUnits(
                "g = 9.81 [m/s^2]\nm = 120 [lb]\nA = 35 [cm^2]\nP = (m*g) / A",
                Map.of("g", "m/s^2", "m", "kg", "a", "m^2"));
        assertEquals("Pa", derived.get("P"));
    }

    @Test
    void inferredUnitsParticipateInChecking() {
        // With P inferred as bar, adding seconds must be flagged even though
        // the user never opened the Variable Information window.
        var inferred = solver.inferUnits("P = 100 [bar]\nx = P + 2 [s]");
        var warnings = solver.checkUnits("P = 100 [bar]\nx = P + 2 [s]", inferred);
        assertEquals(1, warnings.size());
        assertTrue(warnings.get(0).contains("add/subtract"));
    }

    @Test
    void energyBalanceWithMixedUnitsConsistent() {
        // Q = m*c*dT with engineering units is dimensionally consistent.
        List<String> warnings = solver.checkUnits("Q = m * c * dT",
                Map.of("q", "kJ", "m", "kg", "c", "kJ/kg-K", "dt", "K"));
        assertEquals(List.of(), warnings);
    }

    @Test
    void eigenCallsAcceptDimensionalMatrixEntries() {
        // Eigendecomposition of a dimensional matrix (D = K/m in 1/s^2) must not
        // trigger "argument must be dimensionless" warnings: eigenvalues inherit
        // the entry dimensions and eigenvector components are dimensionless.
        List<String> warnings = solver.checkUnits(
                "m = 10 [kg]\n" +
                "k = 1000 [N/m]\n" +
                "K[1,1] = 2*k;  K[1,2] = -k\n" +
                "K[2,1] = -k;   K[2,2] = 2*k\n" +
                "D[1,1] = K[1,1]/m; D[1,2] = K[1,2]/m\n" +
                "D[2,1] = K[2,1]/m; D[2,2] = K[2,2]/m\n" +
                "CALL Eigen(D[1..2,1..2] : lambda[1..2], Phi[1..2,1..2])\n" +
                "omega[1] = sqrt(lambda[1]);  omega[2] = sqrt(lambda[2])",
                Map.of());
        assertEquals(List.of(), warnings);
    }

    @Test
    void testDimTermRecordContracts() {
        double[] dims1 = {1, 0, 0, 0, 0, 0, 0};
        double[] dims2 = {1, 0, 0, 0, 0, 0, 0};
        double[] dims3 = {0, 1, 0, 0, 0, 0, 0};
        UnitChecker.DimTerm t1 = new UnitChecker.DimTerm(dims1, 2.0);
        UnitChecker.DimTerm t2 = new UnitChecker.DimTerm(dims2, 2.0);
        UnitChecker.DimTerm t3 = new UnitChecker.DimTerm(dims3, 2.0);
        UnitChecker.DimTerm t4 = new UnitChecker.DimTerm(dims1, 3.0);

        assertEquals(t1, t2);
        assertNotEquals(t1, t3);
        assertNotEquals(t1, t4);
        assertNotEquals(t1, null);
        assertNotEquals(t1, "string");
        assertEquals(t1.hashCode(), t2.hashCode());
        assertTrue(t1.toString().contains("DimTerm"));
    }
}
