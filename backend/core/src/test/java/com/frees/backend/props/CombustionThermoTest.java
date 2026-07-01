package com.frees.backend.props;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Combustion thermochemistry (NASA-7 + JANAF), ideal-gas mixtures, and the
 * Wiebe heat-release function. Adiabatic-flame-temperature values are
 * cross-checked against a standard thermodynamics textbook (complete combustion, no
 * dissociation): CH4/stoich ~2328 K, CH4/200% air ~1481 K,
 * CH4/150% air = 1789 K (Ex. 15-10), octane/stoich = 2395 K (Ex. 15-8).
 */
class CombustionThermoTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void nasaThermoFormationEnthalpies() {
        // NASA-7 enthalpy at 298.15 K equals the enthalpy of formation.
        assertEquals(-393_510.0, NasaThermo.molarEnthalpy("CO2", 298.15), 500.0);
        assertEquals(-241_820.0, NasaThermo.molarEnthalpy("H2O", 298.15), 500.0);
        assertEquals(0.0, NasaThermo.molarEnthalpy("N2", 298.15), 50.0);
        assertTrue(NasaThermo.has("C3H8") && NasaThermo.has("AR"));
    }

    @Test
    void adiabaticFlameTemperatureMethane() {
        assertEquals(2328.0, Thermochemistry.adiabaticFlameTemp("CH4", 1.0, 298.15), 12.0);
        // 200% theoretical air -> phi = 0.5.
        assertEquals(1481.0, Thermochemistry.adiabaticFlameTemp("CH4", 0.5, 298.15), 10.0);
        // 150% theoretical air -> phi = 1/1.5; standard textbook example = 1789 K.
        assertEquals(1789.0, Thermochemistry.adiabaticFlameTemp("CH4", 1.0 / 1.5, 298.15), 20.0);
    }

    @Test
    void adiabaticFlameTemperatureOctaneViaJanafFallback() {
        // Octane is absent from the standard mechanism, so this exercises the IdealGas fallback.
        // Standard textbook example (liquid octane, stoichiometric): 2395 K.
        assertEquals(2395.0, Thermochemistry.adiabaticFlameTemp("C8H18", 1.0, 298.15), 40.0);
    }

    @Test
    void richCombustionIsRejected() {
        assertThrows(PropertyEvaluationException.class,
                () -> Thermochemistry.adiabaticFlameTemp("CH4", 1.2, 298.15));
    }

    @Test
    void airMixtureProperties() {
        double mw = Thermochemistry.mixtureMolarMass("N2:0.79, O2:0.21");
        assertEquals(0.028850, mw, 1e-4);                 // air ~28.85 g/mol
        double cp = Thermochemistry.mixtureCp("N2:0.79, O2:0.21", 300.0);
        assertEquals(1009.0, cp, 12.0);                   // air cp ~1005 J/kg-K
        // Composition need not be normalized (mole ratios accepted).
        assertEquals(mw, Thermochemistry.mixtureMolarMass("N2:3.7619, O2:1.0"), 1e-4);
    }

    @Test
    void wiebeBurnedFractionAndRate() {
        // No burn before ignition; ~0.993 (= 1 - e^-5) at the end of combustion.
        assertEquals(0.0, Engine.wiebe(-10.0, 0.0, 60.0, 5.0, 2.0), 1e-12);
        assertEquals(1.0 - Math.exp(-5.0), Engine.wiebe(60.0, 0.0, 60.0, 5.0, 2.0), 1e-9);
        assertTrue(Engine.wiebe(30.0, 0.0, 60.0, 5.0, 2.0) > 0.0
                && Engine.wiebe(30.0, 0.0, 60.0, 5.0, 2.0) < 1.0);
        // The rate integrates (trapezoid) to the cumulative burned fraction.
        double theta0 = 0.0, dth = 60.0, a = 5.0, m = 2.0;
        int n = 6000;
        double integral = 0.0, prev = Engine.wiebeRate(theta0, theta0, dth, a, m);
        for (int i = 1; i <= n; i++) {
            double th = theta0 + dth * i / n;
            double r = Engine.wiebeRate(th, theta0, dth, a, m);
            integral += 0.5 * (prev + r) * (dth / n);
            prev = r;
        }
        assertEquals(Engine.wiebe(theta0 + dth, theta0, dth, a, m), integral, 1e-3);
    }

    @Test
    void wiredThroughSolver() {
        EquationSystemSolver.Result r = solver.solve("""
                T_react = 298.15
                T_ad = AdiabaticFlameTemp('CH4', 1.0, T_react)
                M_air = mix_mw('N2:0.79, O2:0.21')
                cp_air = mix_cp('N2:0.79, O2:0.21', 300)
                xb = wiebe(20, 0, 60, 5, 2)
                """);
        assertEquals(2328.0, r.variables().get("T_ad"), 15.0);
        assertEquals(0.028850, r.variables().get("M_air"), 1e-4);
        assertTrue(r.variables().get("cp_air") > 1000.0 && r.variables().get("cp_air") < 1020.0);
        assertTrue(r.variables().get("xb") > 0.0 && r.variables().get("xb") < 1.0);
    }
}
