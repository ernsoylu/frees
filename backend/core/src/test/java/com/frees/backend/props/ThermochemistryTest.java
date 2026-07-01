package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Ideal-gas mixture properties and adiabatic flame temperature. */
class ThermochemistryTest {

    private static final String AIR = "N2:0.79, O2:0.21";

    @Test
    void airMixtureMolarMass() {
        // ~0.79·28.01 + 0.21·32.00 ≈ 28.85 g/mol → 0.02885 kg/mol
        assertEquals(0.02885, Thermochemistry.mixtureMolarMass(AIR), 5e-4);
    }

    @Test
    void airSpecificHeatIsAroundOneThousand() {
        double cp = Thermochemistry.mixtureCp(AIR, 300.0);
        assertTrue(cp > 950.0 && cp < 1100.0, "air cp at 300K should be ~1005 J/kg-K, was " + cp);
    }

    @Test
    void enthalpyIncreasesWithTemperature() {
        assertTrue(Thermochemistry.mixtureEnthalpy(AIR, 600.0) > Thermochemistry.mixtureEnthalpy(AIR, 300.0));
    }

    @Test
    void entropyIsFiniteAndRisesWithTemperature() {
        double s300 = Thermochemistry.mixtureEntropy(AIR, 300.0, 101325.0);
        double s600 = Thermochemistry.mixtureEntropy(AIR, 600.0, 101325.0);
        assertTrue(Double.isFinite(s300));
        assertTrue(s600 > s300);
    }

    @Test
    void stoichiometricMethaneFlameTemperature() {
        // CH4 + 2(O2+3.76 N2) at 298 K, no dissociation → ~2300 K.
        double t = Thermochemistry.adiabaticFlameTemp("CH4", 1.0, 298.15);
        assertTrue(t > 2100.0 && t < 2600.0, "stoichiometric CH4 flame temp out of range: " + t);
    }

    @Test
    void leanerMixtureBurnsCooler() {
        double stoich = Thermochemistry.adiabaticFlameTemp("CH4", 1.0, 298.15);
        double lean = Thermochemistry.adiabaticFlameTemp("CH4", 0.6, 298.15);
        assertTrue(lean < stoich, "lean flame (phi=0.6) should be cooler than stoichiometric");
    }

    @Test
    void richCombustionIsRejected() {
        assertThrows(PropertyEvaluationException.class,
                () -> Thermochemistry.adiabaticFlameTemp("CH4", 1.5, 298.15));
    }

    @Test
    void nonPositiveEquivalenceRatioIsRejected() {
        assertThrows(PropertyEvaluationException.class,
                () -> Thermochemistry.adiabaticFlameTemp("CH4", 0.0, 298.15));
    }

    @Test
    void nonCombustibleFuelIsRejected() {
        // N2 has no carbon/hydrogen → zero oxygen demand.
        assertThrows(PropertyEvaluationException.class,
                () -> Thermochemistry.adiabaticFlameTemp("N2", 1.0, 298.15));
    }

    @Test
    void malformedCompositionTokenIsRejected() {
        assertThrows(PropertyEvaluationException.class,
                () -> Thermochemistry.mixtureMolarMass("N2 0.79"));
    }

    @Test
    void negativeAmountIsRejected() {
        assertThrows(PropertyEvaluationException.class,
                () -> Thermochemistry.mixtureMolarMass("N2:-1"));
    }

    @Test
    void emptyCompositionIsRejected() {
        assertThrows(PropertyEvaluationException.class,
                () -> Thermochemistry.mixtureMolarMass("N2:0"));
    }
}
