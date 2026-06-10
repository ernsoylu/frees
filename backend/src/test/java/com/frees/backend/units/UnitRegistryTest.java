package com.frees.backend.units;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UnitRegistryTest {

    @Test
    void convertFtSquaredToInSquaredIs144() {
        // The canonical example from the EES manual (Story 2.2).
        assertEquals(144.0, UnitRegistry.convert("ft^2", "in^2"), 1e-9);
    }

    @Test
    void convertPsiToKpa() {
        assertEquals(6.894757293168, UnitRegistry.convert("psi", "kPa"), 1e-9);
    }

    @Test
    void convertHandlesCompoundUnitsWithDashMultiplication() {
        // kJ/kg-K -> J/kg-K is a factor of 1000 (dash multiplies kg and K).
        assertEquals(1000.0, UnitRegistry.convert("kJ/kg-K", "J/kg-K"), 1e-9);
    }

    @Test
    void exponentsWorkWithAndWithoutCaret() {
        assertEquals(UnitRegistry.convert("m^2", "ft^2"),
                UnitRegistry.convert("m2", "ft2"), 1e-12);
    }

    @Test
    void poundAliasesAreEquivalent() {
        assertEquals(UnitRegistry.convert("lb", "kg"), UnitRegistry.convert("lbs", "kg"), 1e-12);
        assertEquals(UnitRegistry.convert("lb", "kg"), UnitRegistry.convert("lbm", "kg"), 1e-12);
    }

    @Test
    void unitNamesAreCaseInsensitive() {
        assertEquals(UnitRegistry.convert("KPA", "PA"), UnitRegistry.convert("kPa", "Pa"), 1e-12);
    }

    @Test
    void convertBetweenDifferentDimensionsFails() {
        UnitRegistry.UnknownUnitException e = assertThrows(
                UnitRegistry.UnknownUnitException.class,
                () -> UnitRegistry.convert("kg", "m"));
        assertTrue(e.getMessage().contains("different dimensions"));
    }

    @Test
    void unknownUnitIsReported() {
        UnitRegistry.UnknownUnitException e = assertThrows(
                UnitRegistry.UnknownUnitException.class,
                () -> UnitRegistry.parse("foobars"));
        assertTrue(e.getMessage().contains("foobars"));
    }

    @Test
    void onlyOneSlashAllowed() {
        assertThrows(UnitRegistry.UnknownUnitException.class,
                () -> UnitRegistry.parse("m/s/s"));
    }

    @Test
    void dashAloneIsDimensionless() {
        assertTrue(UnitRegistry.parse("-").isDimensionless());
        assertTrue(UnitRegistry.parse("").isDimensionless());
    }

    @Test
    void heatTransferCoefficientUnits() {
        // Btu/hr-ft^2-R from the EES manual: dimensions of W/m^2-K.
        Quantity btu = UnitRegistry.parse("Btu/hr-ft^2-R");
        Quantity si = UnitRegistry.parse("W/m^2-K");
        assertTrue(btu.sameDimensionsAs(si));
        assertEquals(5.678263, UnitRegistry.convert("Btu/hr-ft^2-R", "W/m^2-K"), 1e-5);
    }
}
