package com.frees.backend.units;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Correlation/geometry functions whose output-unit rules use multi-slash unit
 * strings ("W/m^2/K", "kg/m^2/s") must actually ground their result. Before the
 * unit parser accepted chained denominators, those strings threw, eosDim fell
 * back to UNKNOWN, and every htc/area-derived variable (and everything
 * multiplied by them) went dimensionless.
 */
class CorrelationUnitsTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void filmCoefficientResultIsWperM2K() {
        var d = solver.deriveUnits(
                "h = htc_evap('R1234yf', 350000, 0.5, 0.05, 0.006, 8e-5)", Map.of());
        assertNotNull(d.get("h"), "htc_evap result must carry units");
        // Must display as the engineering form, not the base-SI decomposition kg/s^3-K.
        assertEquals("W/m^2-K", d.get("h"));
        assertEquals(UnitRegistry.parse("W/m^2-K"), UnitRegistry.parse(d.get("h")));
    }

    @Test
    void overallConductanceResultIsWperK() {
        var d = solver.deriveUnits("UA = ua_hx(1000, 2.0, 800, 3.0, 1e-4)", Map.of());
        assertEquals(UnitRegistry.parse("W/K"), UnitRegistry.parse(d.get("UA")));
    }

    @Test
    void uaPropagatesThroughHtcTimesAreaProduct() {
        // The real failure mode: UA = htc * area. With htc grounded, the product
        // resolves to W/K instead of being poisoned to dimensionless.
        var d = solver.deriveUnits(
                "h = htc_1phase('Water', 200000, 290, 0.23, 0.008, 1.5e-5)\n"
                        + "A = 20 * hx_aconv(1.5e-4, 0.30, 0.008)\n"
                        + "UA = h * A", Map.of());
        assertEquals(UnitRegistry.parse("W/K"), UnitRegistry.parse(d.get("UA")));
    }
}
