package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** NASA-7 polynomial thermodynamic data: molar mass, cp, enthalpy, entropy, transport. */
class NasaThermoTest {

    @Test
    void knownAndUnknownSpecies() {
        assertTrue(NasaThermo.has("N2"));
        assertTrue(NasaThermo.has("co2"));   // case-insensitive
        assertFalse(NasaThermo.has("Unobtainium"));
    }

    @Test
    void molarMasses() {
        assertEquals(28.013, NasaThermo.molarMass("N2"), 0.1);
        assertEquals(44.01, NasaThermo.molarMass("CO2"), 0.1);
        assertEquals(18.015, NasaThermo.molarMass("H2O"), 0.1);
    }

    @Test
    void nitrogenHeatCapacityNearRoomTemperature() {
        // cp of N2 at 300 K ≈ 29.1 J/mol-K
        assertEquals(29.1, NasaThermo.molarCp("N2", 300.0), 1.0);
    }

    @Test
    void enthalpyIncreasesWithTemperature() {
        assertTrue(NasaThermo.molarEnthalpy("N2", 600.0) > NasaThermo.molarEnthalpy("N2", 300.0));
    }

    @Test
    void standardEntropyAndPressureDependence() {
        // Standard molar entropy of N2 ≈ 191.6 J/mol-K at the reference pressure.
        double sRef = NasaThermo.molarEntropy("N2", 298.15, 101325.0);
        assertEquals(191.6, sRef, 3.0);
        // Entropy falls as partial pressure rises.
        assertTrue(NasaThermo.molarEntropy("N2", 298.15, 202650.0) < sRef);
    }

    @Test
    void highTemperatureUsesUpperCoefficientRange() {
        // Above the 1000 K break the high-T coefficient set is selected; cp keeps rising.
        assertTrue(NasaThermo.molarCp("CO2", 2000.0) > NasaThermo.molarCp("CO2", 400.0));
    }

    @Test
    void unknownSpeciesThrows() {
        assertThrows(PropertyEvaluationException.class, () -> NasaThermo.molarMass("Xx"));
        assertThrows(PropertyEvaluationException.class, () -> NasaThermo.molarCp("Xx", 300.0));
    }

    @Test
    void transportParametersWhenTabulated() {
        if (NasaThermo.hasTransport("N2")) {
            assertTrue(NasaThermo.collisionDiameter("N2") > 0.0);
            assertTrue(NasaThermo.wellDepth("N2") > 0.0);
        }
    }
}
