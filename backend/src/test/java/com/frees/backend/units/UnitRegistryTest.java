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

    @Test
    void newElectricalUnitsWork() {
        // Coulomb & Couloumb
        Quantity c1 = UnitRegistry.parse("coulomb");
        Quantity c2 = UnitRegistry.parse("couloumb");
        assertTrue(c1.sameDimensionsAs(c2));
        assertEquals(1.0, UnitRegistry.convert("coulomb", "couloumb"), 1e-12);
        assertEquals("C", UnitRegistry.siName(c1.dims()));

        // Siemens & Siemes
        Quantity s1 = UnitRegistry.parse("siemens");
        Quantity s2 = UnitRegistry.parse("siemes");
        assertTrue(s1.sameDimensionsAs(s2));
        assertEquals(1.0, UnitRegistry.convert("siemens", "siemes"), 1e-12);
        assertEquals("S", UnitRegistry.siName(s1.dims()));

        // Hertz
        Quantity hz = UnitRegistry.parse("hz");
        Quantity hertz = UnitRegistry.parse("hertz");
        assertTrue(hz.sameDimensionsAs(hertz));
        assertEquals(1.0, UnitRegistry.convert("hz", "hertz"), 1e-12);
        assertEquals("Hz", UnitRegistry.siName(hz.dims()));

        // Tesla & t
        Quantity t1 = UnitRegistry.parse("tesla");
        Quantity t2 = UnitRegistry.parse("t");
        assertTrue(t1.sameDimensionsAs(t2));
        assertEquals(1.0, UnitRegistry.convert("tesla", "t"), 1e-12);
        assertEquals("T", UnitRegistry.siName(t1.dims()));

        // Weber & wb
        Quantity wb1 = UnitRegistry.parse("weber");
        Quantity wb2 = UnitRegistry.parse("wb");
        assertTrue(wb1.sameDimensionsAs(wb2));
        assertEquals(1.0, UnitRegistry.convert("weber", "wb"), 1e-12);
        assertEquals("Wb", UnitRegistry.siName(wb1.dims()));

        // Weber/m^2 vs Tesla
        Quantity weberPerMeterSquared = UnitRegistry.parse("weber/m^2");
        assertTrue(weberPerMeterSquared.sameDimensionsAs(t1));
        assertEquals(1.0, UnitRegistry.convert("weber/m^2", "tesla"), 1e-12);
        assertEquals("T", UnitRegistry.siName(weberPerMeterSquared.dims()));

        // Farad and Henry siName
        assertEquals("F", UnitRegistry.siName(UnitRegistry.parse("farad").dims()));
        assertEquals("H", UnitRegistry.siName(UnitRegistry.parse("henry").dims()));
    }
}
