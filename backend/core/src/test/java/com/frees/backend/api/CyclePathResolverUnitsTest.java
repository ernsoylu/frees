package com.frees.backend.api;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/** Fill-missing injects state properties into the result AFTER the solve, so
 * their units cannot come from the equation text — they are stamped from the
 * property identity instead (SolveController). */
class CyclePathResolverUnitsTest {

    @Test
    void mapsCanonicalStateProperties() {
        assertEquals("K", CyclePathResolver.siUnitForStateVariable("T1"));
        assertEquals("Pa", CyclePathResolver.siUnitForStateVariable("P_2"));
        assertEquals("J/kg", CyclePathResolver.siUnitForStateVariable("h1"));
        assertEquals("J/kg", CyclePathResolver.siUnitForStateVariable("u2"));
        assertEquals("J/kg-K", CyclePathResolver.siUnitForStateVariable("s[3]"));
        assertEquals("m^3/kg", CyclePathResolver.siUnitForStateVariable("v1"));
        assertEquals("kg/m^3", CyclePathResolver.siUnitForStateVariable("rho2"));
        assertEquals("J/kg", CyclePathResolver.siUnitForStateVariable("enthalpy4"));
    }

    @Test
    void qualityIsDimensionless() {
        assertNull(CyclePathResolver.siUnitForStateVariable("x1"));
    }

    @Test
    void nonStateNamesAreNotStamped() {
        assertNull(CyclePathResolver.siUnitForStateVariable("mass1"));
        assertNull(CyclePathResolver.siUnitForStateVariable("h"));
        assertNull(CyclePathResolver.siUnitForStateVariable("eta"));
        assertNull(CyclePathResolver.siUnitForStateVariable("motor_temp_5"));
    }
}
