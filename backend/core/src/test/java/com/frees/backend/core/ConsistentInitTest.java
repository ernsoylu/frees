package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import com.frees.backend.props.PropertyFunctions;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Phase A — consistent state initialization. The solver's auto-seeder now seeds
 * the reference-dependent enthalpy of every property-call argument to a
 * thermodynamically consistent value (instead of the 1.0 J/kg default that NaNs
 * CoolProp before a closed loop can propagate a real h). This validates the
 * seeding primitive {@link PropertyFunctions#nominalEnthalpy}: condensable fluids
 * get a mid-dome enthalpy, incompressibles fall back to T≈300 K, moist air gets a
 * nominal, and an unknown fluid returns NaN (caller keeps the default).
 */
class ConsistentInitTest {

    @Test
    void condensableFluidGetsMidDomeEnthalpy() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        double h = PropertyFunctions.nominalEnthalpy("r1234yf", 1.0e6);
        double ref = CoolProp.propsSIOrNaN("H", "P", 1.0e6, "Q", 0.5, "R1234yf");
        assertTrue(Double.isFinite(h), "R1234yf seed is finite");
        assertEquals(ref, h, 1.0, "mid-dome (Q=0.5) enthalpy for a condensable fluid");
        // and it is a physical refrigerant enthalpy, far above the 1.0 J/kg default
        assertTrue(h > 1.0e5 && h < 5.0e5, "physical refrigerant enthalpy: " + h);
    }

    @Test
    void incompressibleFallsBackToTemperature() {
        assumeTrue(CoolProp.isAvailable(), "CoolProp not available");
        // EG50 (INCOMP::MEG[0.50]) has no two-phase dome; Q=0.5 fails, T≈300 K wins
        double h = PropertyFunctions.nominalEnthalpy("eg50", 2.0e5);
        double ref = CoolProp.propsSIOrNaN("H", "P", 2.0e5, "T", 300.0, "INCOMP::MEG[0.50]");
        assertTrue(Double.isFinite(h), "EG50 seed is finite");
        assertEquals(ref, h, 1.0, "T=300 K enthalpy for an incompressible coolant");
    }

    @Test
    void moistAirAndUnknownFluid() {
        // moist air: a nominal (W is unknown at seed time); does not require CoolProp
        assertEquals(5.0e4, PropertyFunctions.nominalEnthalpy("airh2o", 1.0e5), 1.0);
        // unknown fluid: NaN, so the seeder leaves the default guess untouched
        assertTrue(Double.isNaN(PropertyFunctions.nominalEnthalpy("notafluid", 1.0e5)));
        // non-physical pressure: NaN (degrade gracefully, never throw)
        assertTrue(Double.isNaN(PropertyFunctions.nominalEnthalpy("r1234yf", -1.0)));
    }
}
