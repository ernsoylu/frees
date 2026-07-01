package com.frees.backend.units;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Multi-slash unit expressions ("W/m^2/K", "kg/m^2/s") must parse: each
 * '/'-separated term after the first is a denominator factor. The correlation
 * unit rules (htc_* → W/m^2/K, mass_flux → kg/m^2/s) are written this way, so a
 * parse failure here silently made every htc/area-derived variable dimensionless.
 */
class MultiSlashParseTest {

    @Test
    void singleSlashStillParses() {
        assertDoesNotThrow(() -> UnitRegistry.parse("W/K"));
        assertDoesNotThrow(() -> UnitRegistry.parse("m^2"));
        assertDoesNotThrow(() -> UnitRegistry.parse("W/m-K"));
    }

    @Test
    void multiSlashParsesAsChainedDenominators() {
        assertDoesNotThrow(() -> UnitRegistry.parse("W/m^2/K"));
        assertDoesNotThrow(() -> UnitRegistry.parse("kg/m^2/s"));
        // "W/m^2/K" must mean W/(m^2·K) — identical to the dash form "W/m^2-K".
        assertEquals(UnitRegistry.parse("W/m^2-K"), UnitRegistry.parse("W/m^2/K"));
        assertEquals(UnitRegistry.parse("kg/m^2-s"), UnitRegistry.parse("kg/m^2/s"));
    }
}
