package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Humid air property calls (AirH2O) mapped to CoolProp's HAPropsSI.
 * Reference state: 25 C, 1 atm, 50% relative humidity (ASHRAE values:
 * W = 0.00989 kg/kg, Twb = 17.9 C, Tdp = 13.8 C, v = 0.858 m3/kg dry air,
 * h = 50.4 kJ/kg dry air).
 */
class HumidAirTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @BeforeEach
    void requireCoolProp() {
        assumeTrue(CoolProp.isAvailable(),
                "CoolProp native library not available; skipping property tests");
    }

    @Test
    void humidityRatioAtStandardComfortState() {
        EquationSystemSolver.Result result = solver.solve(
                "w = HumRat(AirH2O, T=298.15, P=101325, R=0.5)");
        assertEquals(0.00989, result.variables().get("w"), 3e-4);
    }

    @Test
    void wetBulbAndDewPoint() {
        EquationSystemSolver.Result result = solver.solve("""
                T_wb = WetBulb(AirH2O, T=298.15, P=101325, R=0.5)
                T_dp = DewPoint(AirH2O, T=298.15, P=101325, R=0.5)
                """);
        assertEquals(291.05, result.variables().get("T_wb"), 0.3);
        assertEquals(286.95, result.variables().get("T_dp"), 0.5);
    }

    @Test
    void enthalpyAndVolumePerDryAir() {
        EquationSystemSolver.Result result = solver.solve("""
                h = Enthalpy(AirH2O, T=298.15, P=101325, R=0.5)
                v = Volume(AirH2O, T=298.15, P=101325, R=0.5)
                """);
        assertEquals(50_400.0, result.variables().get("h"), 600.0);
        assertEquals(0.858, result.variables().get("v"), 0.005);
    }

    @Test
    void relativeHumidityRoundTripsThroughHumidityRatio() {
        EquationSystemSolver.Result result = solver.solve("""
                w = HumRat(AirH2O, T=298.15, P=101325, R=0.5)
                rh = RelHum(AirH2O, T=298.15, P=101325, w=w)
                """);
        assertEquals(0.5, result.variables().get("rh"), 1e-6);
    }

    @Test
    void humidAirRequiresThreeIndicators() {
        Exception e = assertThrows(Exception.class,
                () -> solver.solve("h = Enthalpy(AirH2O, T=298.15, P=101325)"));
        assertTrue(e.getMessage().contains("three"), e.getMessage());
    }
}
