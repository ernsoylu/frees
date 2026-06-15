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
    void bernoulliPressureDerivesThroughScaledSiblingTerm() {
        // P2 is additive; its unit comes from its sibling 0.5*rho*V2^2. The
        // bare 0.5 must not erase rho*V2^2's dimensions (Pa).
        var derived = solver.deriveUnits(
                "P1 + 0.5*rho*V1^2 + rho*g*h1 = P2 + 0.5*rho*V2^2 + rho*g*h2",
                Map.of("p1", "Pa", "rho", "kg/m^3", "v1", "m/s", "v2", "m/s",
                        "g", "m/s^2", "h1", "m", "h2", "m"));
        assertEquals("Pa", derived.get("P2"));
    }

    @Test
    void scaledQuantityKeepsDimensions() {
        // 0.5*m*v^2 is specific... here KE: a dimensionless literal factor must
        // pass the kg*m^2/s^2 dimensions through to E.
        var derived = solver.deriveUnits("E = 0.5 * m * v^2",
                Map.of("m", "kg", "v", "m/s"));
        assertEquals("J", derived.get("E"));
    }

    @Test
    void dividingByConstantKeepsDimensions() {
        // Bernoulli written with /2 instead of 0.5*: P2's sibling rho*V2^2/2
        // must keep its Pa dimensions despite the constant divisor.
        var derived = solver.deriveUnits(
                "P1 + rho*V1^2/2 = P2 + rho*V2^2/2",
                Map.of("p1", "Pa", "rho", "kg/m^3", "v1", "m/s", "v2", "m/s"));
        assertEquals("Pa", derived.get("P2"));
    }

    @Test
    void tableOutputUnitFlowsToDerivedVariables() {
        // A declared TABLE output unit ([Pa]) grounds the lookup result, so
        // variables computed from it resolve instead of showing '-'.
        String src = String.join("\n",
                "TABLE pumpCurve(Vc) [Pa]",
                "0.0    55000",
                "0.001  40000",
                "0.002  0",
                "END",
                "Vc = 0.001 [m^3/s]",
                "head = pumpCurve(Vc)",
                "W = head * Vc");
        var derived = solver.deriveUnits(src, Map.of());
        assertEquals("Pa", derived.get("head"));
        assertEquals("W", derived.get("W"));
    }

    @Test
    void tableInputUnitGroundsImplicitArgument() {
        // Vair appears only inside the lookup arg and a K*V^2 resistance, so no
        // single equation can ground it from output units alone. The declared
        // input unit [m^3/s] grounds Vair; the rest then resolves.
        String src = String.join("\n",
                "TABLE fan(Vair [m^3/s]) [Pa]",
                "0.0   250",
                "0.6   195",
                "1.18  0",
                "END",
                "K = 160 [kg/m^7]",
                "dP = fan(Vair)",
                "dP = K * Vair^2",
                "W = dP * Vair");
        var derived = solver.deriveUnits(src, Map.of());
        assertEquals("m^3/s", derived.get("Vair"));
        assertEquals("Pa", derived.get("dP"));
        assertEquals("W", derived.get("W"));
    }

    @Test
    void functionOutputUnitFlowsToDerivedVariables() {
        String src = String.join("\n",
                "FUNCTION sqr(x) [m^2]",
                "  sqr := x*x",
                "END",
                "A = sqr(3)");
        var derived = solver.deriveUnits(src, Map.of());
        assertEquals("m^2", derived.get("A"));
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
        assertNotEquals(null, t1);
        assertNotEquals(new Object(), t1);
        assertEquals(t1.hashCode(), t2.hashCode());
        assertTrue(t1.toString().contains("DimTerm"));
    }
}
