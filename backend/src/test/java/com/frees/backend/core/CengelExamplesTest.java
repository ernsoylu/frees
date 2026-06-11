package com.frees.backend.core;

import com.frees.backend.props.CoolProp;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Worked examples from Cengel & Boles, "Thermodynamics: An Engineering
 * Approach" (9th ed., ch. 3), solved as frEES equation systems against
 * CoolProp. All values SI: K, Pa, J/kg, m3/kg.
 *
 * Note: the book's R134a tables use the ASHRAE reference state while
 * CoolProp defaults to IIR, so R134a checks use reference-independent
 * quantities (h_fg, quality, T, v). Water tables share CoolProp's
 * reference (u = 0 for saturated liquid at the triple point), so water
 * energies are compared directly.
 */
class CengelExamplesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @BeforeEach
    void requireCoolProp() {
        assumeTrue(CoolProp.isAvailable(),
                "CoolProp native library not available; skipping property tests");
    }

    /** Example 3-3: 200 g of saturated water fully vaporized at 100 kPa. */
    @Test
    void example3_3_volumeAndEnergyChangeDuringEvaporation() {
        EquationSystemSolver.Result result = solver.solve("""
                m = 0.2
                P_atm = 100000
                v_f = Volume(Water, P=P_atm, x=0)
                v_g = Volume(Water, P=P_atm, x=1)
                DELTAV = m * (v_g - v_f)
                h_f = Enthalpy(Water, P=P_atm, x=0)
                h_g = Enthalpy(Water, P=P_atm, x=1)
                E_in = m * (h_g - h_f)
                """);
        // Book: DeltaV = 0.3386 m3, E = 451.5 kJ (h_fg = 2257.5 kJ/kg).
        assertEquals(0.3386, result.variables().get("DELTAV"), 0.001);
        assertEquals(451_500.0, result.variables().get("E_in"), 600.0);
    }

    /** Example 3-4: rigid tank, 10 kg water at 90 C, 8 kg liquid + 2 kg vapor. */
    @Test
    void example3_4_pressureAndVolumeOfSaturatedMixture() {
        EquationSystemSolver.Result result = solver.solve("""
                T_tank = 363.15
                m_total = 10
                m_f = 8
                m_g = 2
                P_tank = Pressure(Water, T=T_tank, x=0)
                v_f = Volume(Water, T=T_tank, x=0)
                v_g = Volume(Water, T=T_tank, x=1)
                Vol = m_f * v_f + m_g * v_g
                x = m_g / m_total
                v_avg = v_f + x * (v_g - v_f)
                Vol2 = m_total * v_avg
                """);
        // Book: P = Psat@90C = 70.183 kPa, V = 4.73 m3 (x = 0.2, v = 0.473).
        assertEquals(70_183.0, result.variables().get("P_tank"), 100.0);
        assertEquals(0.2, result.variables().get("x"), 1e-9);
        assertEquals(4.73, result.variables().get("Vol"), 0.02);
        assertEquals(result.variables().get("Vol"), result.variables().get("Vol2"), 1e-6);
    }

    /** Example 3-5: 80-L vessel with 4 kg of R134a at 160 kPa. */
    @Test
    void example3_5_propertiesOfSaturatedLiquidVaporMixture() {
        EquationSystemSolver.Result result = solver.solve("""
                Vol_vessel = 0.080
                m = 4
                P_ves = 160000
                v_avg = Vol_vessel / m
                T_sat = Temperature(R134a, P=P_ves, x=0)
                x = Quality(R134a, P=P_ves, v=v_avg)
                vol_f = Volume(R134a, P=P_ves, x=0)
                vol_g = Volume(R134a, P=P_ves, x=1)
                x_check = (v_avg - vol_f) / (vol_g - vol_f)
                h_f = Enthalpy(R134a, P=P_ves, x=0)
                h_g = Enthalpy(R134a, P=P_ves, x=1)
                h_fg = h_g - h_f
                m_vap = x * m
                Vol_vapor = m_vap * vol_g
                """);
        // Book: T = -15.60 C = 257.55 K, x = 0.157, h_fg = 209.96 kJ/kg,
        // m_g = 0.628 kg, V_g = 0.0776 m3.
        assertEquals(257.55, result.variables().get("T_sat"), 0.3);
        assertEquals(0.157, result.variables().get("x"), 0.003);
        assertEquals(result.variables().get("x"), result.variables().get("x_check"), 1e-6);
        assertEquals(209_960.0, result.variables().get("h_fg"), 1500.0);
        assertEquals(0.628, result.variables().get("m_vap"), 0.012);
        assertEquals(0.0776, result.variables().get("Vol_vapor"), 0.002);
    }

    /** Example 3-7: temperature of superheated steam at 0.5 MPa, h = 2890 kJ/kg. */
    @Test
    void example3_7_temperatureOfSuperheatedVapor() {
        EquationSystemSolver.Result result = solver.solve("""
                P1 = 500000
                h1 = 2890000
                T1 = Temperature(Steam, P=P1, h=h1)
                """);
        // Book (linear interpolation in Table A-6): T = 216.3 C = 489.45 K.
        assertEquals(489.45, result.variables().get("T1"), 1.5);
    }

    /** Example 3-8: compressed liquid water at 80 C and 5 MPa vs saturated-liquid approximation. */
    @Test
    void example3_8_approximatingCompressedLiquidAsSaturatedLiquid() {
        EquationSystemSolver.Result result = solver.solve("""
                T1 = 353.15
                P1 = 5000000
                u_exact = IntEnergy(Water, T=T1, P=P1)
                u_approx = IntEnergy(Water, T=T1, x=0)
                err_pct = (u_approx - u_exact) / u_exact * 100
                """);
        // Book: u = 333.82 kJ/kg (Table A-7), u_f@80C = 334.97 kJ/kg, error 0.34%.
        assertEquals(333_820.0, result.variables().get("u_exact"), 700.0);
        assertEquals(334_970.0, result.variables().get("u_approx"), 700.0);
        assertEquals(0.34, result.variables().get("err_pct"), 0.1);
    }
}
