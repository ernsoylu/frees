package com.frees.backend.props;

import com.frees.backend.core.EquationSystemSolver;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Ideal-gas mixture transport (Chapman-Enskog + Wilke) and combustion-product
 * chemical equilibrium (Kp method). Transport values check against handbook air
 * data; the equilibrium flame temperature checks against the frozen result and
 * the dissociation-corrected value (~2225 K for stoichiometric CH4).
 */
class EquilibriumTransportTest {

    private static final String AIR = "N2:0.79, O2:0.21";
    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void airViscosityAndConductivity() {
        // Handbook air: mu ~1.85e-5 Pa-s at 300 K, ~4.15e-5 at 1000 K; k ~0.026 W/m-K.
        assertEquals(1.85e-5, GasTransport.mixtureViscosity(AIR, 300.0), 0.05e-5);
        assertEquals(4.28e-5, GasTransport.mixtureViscosity(AIR, 1000.0), 0.15e-5);
        assertEquals(0.0255, GasTransport.mixtureConductivity(AIR, 300.0), 0.002);
        // Viscosity rises with temperature for a gas.
        assertTrue(GasTransport.mixtureViscosity(AIR, 1000.0) > GasTransport.mixtureViscosity(AIR, 300.0));
    }

    @Test
    void equilibriumConstantMatchesJanafTable() {
        // CO2 = CO + 1/2 O2, ln Kp from standard JANAF tables (index 0).
        assertEquals(-6.635, Equilibrium.lnKp(2000.0)[0], 0.02);
        assertEquals(-3.860, Equilibrium.lnKp(2400.0)[0], 0.02);
        assertEquals(-2.801, Equilibrium.lnKp(2600.0)[0], 0.02);
    }

    @Test
    void equilibriumCompositionHasDissociation() {
        // Stoichiometric methane-air at 2300 K, 1 atm: small but nonzero CO, OH, O2.
        double xCO = Equilibrium.moleFraction("CH4", 1.0, 2300.0, 101325.0, "CO");
        double xO2 = Equilibrium.moleFraction("CH4", 1.0, 2300.0, 101325.0, "O2");
        double xCO2 = Equilibrium.moleFraction("CH4", 1.0, 2300.0, 101325.0, "CO2");
        assertEquals(0.0115, xCO, 0.003);
        assertEquals(0.0069, xO2, 0.003);
        assertTrue(xCO2 > 0.07 && xCO2 < 0.09, "most carbon stays CO2: " + xCO2);
        // Mole fractions over the full pool sum to one.
        double sum = xCO2 + xCO + xO2;
        for (String s : new String[]{"H2O", "H2", "OH", "H", "O", "N2"}) {
            sum += Equilibrium.moleFraction("CH4", 1.0, 2300.0, 101325.0, s);
        }
        assertEquals(1.0, sum, 1e-6);
    }

    @Test
    void equilibriumFlameTempBelowFrozen() {
        double frozen = Thermochemistry.adiabaticFlameTemp("CH4", 1.0, 298.15);
        double equil = Equilibrium.adiabaticFlameTemp("CH4", 1.0, 298.15, 101325.0);
        // Dissociation lowers the peak temperature toward the textbook ~2225 K.
        assertEquals(2230.0, equil, 25.0);
        assertTrue(equil < frozen - 50.0, "equilibrium AFT must be well below frozen " + frozen);
    }

    @Test
    void richCombustionIsSupported() {
        // Rich (phi > 1) is rejected by the frozen model but solved by equilibrium.
        double tRich = Equilibrium.adiabaticFlameTemp("CH4", 1.1, 298.15, 101325.0);
        assertTrue(tRich > 1800.0 && tRich < 2300.0, "rich flame temp out of range: " + tRich);
    }

    @Test
    void wiredThroughSolver() {
        EquationSystemSolver.Result r = solver.solve("""
                mu_air  = mix_viscosity('N2:0.79, O2:0.21', 300)
                k_air   = mix_conductivity('N2:0.79, O2:0.21', 300)
                x_CO    = eq_molefraction('CH4', 1.0, 2300, 101325, 'CO')
                T_flame = AdiabaticFlameTempEq('CH4', 1.0, 298.15, 101325)
                """);
        assertEquals(1.85e-5, r.variables().get("mu_air"), 0.06e-5);
        assertEquals(0.0255, r.variables().get("k_air"), 0.002);
        assertTrue(r.variables().get("x_CO") > 0.005);
        assertEquals(2230.0, r.variables().get("T_flame"), 25.0);
    }
}
