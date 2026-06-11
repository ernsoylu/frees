package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Story 5.1: real fluid property calls mapped to CoolProp. */
class RealFluidPropertiesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @BeforeEach
    void requireCoolProp() {
        assumeTrue(CoolProp.isAvailable(),
                "CoolProp native library not available; skipping property tests");
    }

    @Test
    void fluidAndIndicatorNamesAreNotVariables() {
        EquationSystemSolver.CheckResult check =
                solver.check("h1 = Enthalpy(R134a, T=300, x=1)");
        assertTrue(check.solvable(), check.message());
        assertEquals(1, check.unknownCount());
        assertEquals("h1", check.variables().get(0));
    }

    @Test
    void waterSaturationPressureAtBoilingPoint() {
        EquationSystemSolver.Result result =
                solver.solve("P_sat = Pressure(Water, T=373.15, x=0)");
        // IAPWS-95: ~101418 Pa at 373.15 K.
        assertEquals(101400.0, result.variables().get("P_sat"), 1500.0);
    }

    @Test
    void saturationTemperatureFromPressure() {
        EquationSystemSolver.Result result =
                solver.solve("T_sat = Temperature(Water, P=101325, x=1)");
        assertEquals(373.1, result.variables().get("T_sat"), 0.5);
    }

    @Test
    void specificVolumeIsInverseDensity() {
        EquationSystemSolver.Result result = solver.solve(
                "v1 = Volume(Air, T=300, P=100000)\nrho1 = Density(Air, T=300, P=100000)");
        double v = result.variables().get("v1");
        double rho = result.variables().get("rho1");
        assertEquals(1.0, v * rho, 1e-9);
        // Ideal-gas ballpark: R*T/P = 287*300/100000 = 0.861 m3/kg.
        assertEquals(0.861, v, 0.01);
    }

    @Test
    void propertyArgumentsMayBeVariables() {
        EquationSystemSolver.Result result = solver.solve(
                "T1 = 280 + 20\nh1 = Enthalpy(R134a, T=T1, x=1)");
        // Saturated vapor enthalpy of R134a at 300 K (~414 kJ/kg, CoolProp ref).
        double h1 = result.variables().get("h1");
        assertTrue(h1 > 380_000 && h1 < 440_000, "h1 = " + h1);
    }

    /** Milestone 5: a standard ideal vapor-compression refrigeration cycle. */
    @Test
    void solvesVaporCompressionCycle() {
        String cycle = """
                T_evap = 263.15
                T_cond = 313.15
                h1 = Enthalpy(R134a, T=T_evap, x=1)
                s1 = Entropy(R134a, T=T_evap, x=1)
                P_cond = Pressure(R134a, T=T_cond, x=1)
                h2 = Enthalpy(R134a, P=P_cond, s=s1)
                h3 = Enthalpy(R134a, T=T_cond, x=0)
                h4 = h3
                q_evap = h1 - h4
                w_comp = h2 - h1
                COP = q_evap / w_comp
                """;
        EquationSystemSolver.Result result = solver.solve(cycle);
        double h1 = result.variables().get("h1");
        double h2 = result.variables().get("h2");
        double h3 = result.variables().get("h3");
        double cop = result.variables().get("COP");
        assertTrue(h2 > h1, "compression must raise enthalpy");
        assertTrue(h1 > h3, "evaporator exit above condenser exit");
        // Ideal R134a cycle between -10 °C and 40 °C: COP ≈ 4.2.
        assertTrue(cop > 3.5 && cop < 5.5, "COP = " + cop);
    }

    @Test
    void unknownFluidGivesClearError() {
        Exception e = org.junit.jupiter.api.Assertions.assertThrows(Exception.class,
                () -> solver.solve("h1 = Enthalpy(Unobtainium, T=300, x=1)"));
        assertTrue(e.getMessage().contains("CoolProp")
                        || e.getMessage().toLowerCase().contains("fluid"),
                e.getMessage());
    }
}
