package com.frees.backend.props;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Story 5.2: spelled chemical formulas are ideal gases with the 298.15 K /
 * 1 atm enthalpy-of-formation reference (Cengel A-2c polynomials, A-26
 * formation data). Reference values from the Cengel ideal-gas tables.
 */
class IdealGasTest {

    private static double eval(String encoded, double... values) {
        return PropertyFunctions.evaluate(encoded,
                java.util.Arrays.stream(values).boxed().toList());
    }

    @Test
    void enthalpyAtReferenceIsFormationEnthalpy() {
        // hf(CO2) = -393,520 kJ/kmol over M = 44.01 -> -8941.6 kJ/kg.
        assertEquals(-393_520.0 / 44.01 * 1000.0,
                eval("prop$enthalpy$co2$t", 298.15), 1.0);
        // Elements have zero formation enthalpy.
        assertEquals(0.0, eval("prop$enthalpy$n2$t", 298.15), 1.0);
        assertEquals(0.0, eval("prop$enthalpy$o2$t", 298.15), 1.0);
    }

    @Test
    void sensibleEnthalpyMatchesIdealGasTables() {
        // Cengel A-18: h(N2, 1000 K) - h(N2, 298 K) = 30,129 - 8,669 kJ/kmol.
        double dh = eval("prop$enthalpy$n2$t", 1000.0)
                - eval("prop$enthalpy$n2$t", 298.15);
        assertEquals(21_460.0 / 28.013 * 1000.0, dh, 3000.0);

        // Cengel A-20: h(CO2, 1000 K) - h(CO2, 298 K) = 42,769 - 9,364 kJ/kmol.
        double dhCo2 = eval("prop$enthalpy$co2$t", 1000.0)
                - eval("prop$enthalpy$co2$t", 298.15);
        assertEquals(33_405.0 / 44.01 * 1000.0, dhCo2, 3000.0);
    }

    @Test
    void absoluteEntropyAndPressureDependence() {
        // s0(N2) = 191.61 kJ/kmol-K at 298.15 K, 1 atm.
        assertEquals(191.61 / 28.013 * 1000.0,
                eval("prop$entropy$n2$t$p", 298.15, 101_325.0), 2.0);
        // Doubling the pressure lowers s by R*ln(2).
        double drop = eval("prop$entropy$n2$t$p", 400.0, 101_325.0)
                - eval("prop$entropy$n2$t$p", 400.0, 202_650.0);
        assertEquals(8314.46 / 28.013 * Math.log(2.0), drop, 0.01);
    }

    @Test
    void temperatureInvertsEnthalpyAndEntropy() {
        double h = eval("prop$enthalpy$n2$t", 1200.0);
        assertEquals(1200.0, eval("prop$temperature$n2$h", h), 0.01);

        double s = eval("prop$entropy$o2$t$p", 800.0, 500_000.0);
        assertEquals(800.0, eval("prop$temperature$o2$s$p", s, 500_000.0), 0.01);
    }

    @Test
    void idealGasVolumeAndHeats() {
        // v = R*T/(M*P)
        assertEquals(8314.46 * 300.0 / (28.013 * 100_000.0),
                eval("prop$volume$n2$t$p", 300.0, 100_000.0), 1e-6);
        // cp - cv = R/M, both from the same polynomial.
        double cp = eval("prop$cp$n2$t", 500.0);
        double cv = eval("prop$cv$n2$t", 500.0);
        assertEquals(8314.46 / 28.013, cp - cv, 1e-6);
        // u = h - R*T/M.
        double u = eval("prop$intenergy$n2$t", 500.0);
        double h = eval("prop$enthalpy$n2$t", 500.0);
        assertEquals(8314.46 / 28.013 * 500.0, h - u, 1e-6);
    }

    @Test
    void fullNamesRemainRealFluids() {
        if (!CoolProp.isAvailable()) {
            return;
        }
        // Real nitrogen at its boiling point has a vapor dome; an ideal gas
        // has no quality. The full name must hit CoolProp.
        double hfg = eval("prop$enthalpy$nitrogen$p$x", 101_325.0, 1.0)
                - eval("prop$enthalpy$nitrogen$p$x", 101_325.0, 0.0);
        assertEquals(199_000.0, hfg, 5_000.0);
    }

    @Test
    void adiabaticFlameTemperatureWithIdealGasFunctions() {
        // CH4 + 2 O2 + 7.52 N2 -> CO2 + 2 H2O + 7.52 N2, adiabatic: the
        // formation reference makes the energy balance a single equation.
        String source = """
                M_ch4 = 16.043
                M_o2 = 31.999
                M_n2 = 28.013
                M_co2 = 44.01
                M_h2o = 18.015
                T_in = 298.15 [K]
                H_react = 1 * M_ch4 * Enthalpy(CH4, T=T_in) / 1000 + 2 * M_o2 * Enthalpy(O2, T=T_in) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_in) / 1000
                H_prod = 1 * M_co2 * Enthalpy(CO2, T=T_flame) / 1000 + 2 * M_h2o * Enthalpy(H2O, T=T_flame) / 1000 + 7.52 * M_n2 * Enthalpy(N2, T=T_flame) / 1000
                H_react = H_prod
                """;
        EquationSystemSolver.Result result = new EquationSystemSolver().solve(source);
        // H_react is pure formation enthalpy of CH4: -74,850 kJ/kmol fuel.
        assertEquals(-74_850.0, result.variables().get("H_react"), 50.0);
        double tFlame = result.variables().get("T_flame");
        assertTrue(tFlame > 2200 && tFlame < 2800, "T_flame = " + tFlame);
    }
}
