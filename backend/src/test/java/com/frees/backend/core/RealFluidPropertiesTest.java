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
    void propertyCallsCarryInferredSiUnits() {
        var equations = new com.frees.backend.parser.EquationParser().parse("""
                h1 = Enthalpy(R134a, T=300, x=1)
                s1 = Entropy(R134a, T=300, x=1)
                P1 = Pressure(R134a, T=300, x=1)
                v1 = Volume(R134a, T=300, x=1)
                """);
        var derived = com.frees.backend.units.UnitChecker
                .check(equations, java.util.Map.of()).derivedUnits();
        // Derived-unit keys are lowercased variable names.
        assertEquals("J/kg", derived.get("h1"));
        assertEquals("J/kg-K", derived.get("s1"));
        assertEquals("Pa", derived.get("p1"));
        assertEquals("m^3/kg", derived.get("v1"));
    }

    @Test
    void ethyleneGlycolMixtureResolvesToIncompressibleSolution() {
        // EG50 = 50 mass-% ethylene glycol / 50 % water (CoolProp INCOMP::MEG[0.5]).
        EquationSystemSolver.Result result = solver.solve(
                "rho = Density(EG50, T=293.15, P=101325)\n"
                        + "cp = Cp(EG50, T=293.15, P=101325)");
        // ~1065 kg/m3 and ~3312 J/kg-K at 20 C for a 50/50 mix.
        assertEquals(1065.0, result.variables().get("rho"), 5.0);
        assertEquals(3312.0, result.variables().get("cp"), 20.0);
    }

    @Test
    void glycolConcentrationIsConfigurable() {
        // A leaner 10 % mix is closer to water: lower density, higher cp than 50 %.
        EquationSystemSolver.Result result = solver.solve(
                "rho10 = Density(EG10, T=293.15, P=101325)\n"
                        + "rho50 = Density(EG50, T=293.15, P=101325)\n"
                        + "cp10 = Cp(EG10, T=293.15, P=101325)\n"
                        + "cp50 = Cp(EG50, T=293.15, P=101325)");
        assertTrue(result.variables().get("rho10") < result.variables().get("rho50"),
                "10% mix should be less dense than 50%");
        assertTrue(result.variables().get("cp10") > result.variables().get("cp50"),
                "10% mix should have higher specific heat than 50%");
    }

    @Test
    void propyleneGlycolMixtureIsSupported() {
        // PG30 = 30 mass-% propylene glycol (CoolProp INCOMP::MPG[0.3]).
        EquationSystemSolver.Result result =
                solver.solve("rho = Density(PG30, T=293.15, P=101325)");
        double rho = result.variables().get("rho");
        assertTrue(rho > 1000.0 && rho < 1060.0, "rho = " + rho);
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
