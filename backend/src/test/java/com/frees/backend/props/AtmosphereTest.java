package com.frees.backend.props;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** ISA 1976 standard atmosphere: troposphere and lower-stratosphere layers. */
class AtmosphereTest {

    @Test
    void seaLevelMatchesIsaReference() {
        assertEquals(288.15, Atmosphere.temperature(0.0), 1e-9);
        assertEquals(101325.0, Atmosphere.pressure(0.0), 1e-6);
        assertEquals(1.225, Atmosphere.density(0.0), 1e-3);
    }

    @Test
    void tropopauseTemperatureIs216point65() {
        assertEquals(216.65, Atmosphere.temperature(11000.0), 1e-6);
    }

    @Test
    void stratosphereIsIsothermal() {
        // Above the tropopause the temperature is constant; pressure keeps falling.
        assertEquals(216.65, Atmosphere.temperature(15000.0), 1e-6);
        assertTrue(Atmosphere.pressure(15000.0) < Atmosphere.pressure(11000.0));
        assertTrue(Atmosphere.pressure(15000.0) > 0.0);
    }

    @Test
    void pressureAndDensityDecreaseWithAltitudeInTroposphere() {
        assertTrue(Atmosphere.pressure(5000.0) < Atmosphere.pressure(0.0));
        assertTrue(Atmosphere.density(5000.0) < Atmosphere.density(0.0));
    }
}
