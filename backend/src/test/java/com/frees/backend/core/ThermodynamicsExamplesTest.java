package com.frees.backend.core;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Known engineering problems from Cengel & Boles, "Thermodynamics: An
 * Engineering Approach" (9th ed.), solved with frEES and compared against the
 * book's published answers.
 */
class ThermodynamicsExamplesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    /**
     * Example 1-1: Electric power generation by a wind turbine.
     * A 30 kW wind turbine operates 2200 h/year; electricity costs $0.12/kWh.
     * Book answers: 66,000 kWh generated, $7,920 saved per year,
     * equivalently 2.38e8 kJ (rounded from 2.376e8).
     */
    @Test
    void example1_1_windTurbineEnergyAndSavings() {
        // frEES computes in SI: 30 kW -> 30000 W, 2200 h -> 7.92e6 s, so
        // E_total lands in joules; kWh is recovered via Convert for the
        // book comparison.
        EquationSystemSolver.Result result = solver.solve("""
                { Cengel & Boles Example 1-1 }
                W_dot = 30 [kW]                  { rated power -> W }
                hours = 2200 [h]                 { operating time -> s }
                unitcost = 0.12                  { $/kWh }
                E_total = W_dot * hours          { J per year }
                E_kWh = E_total * Convert(J, kWh)
                money = E_kWh * unitcost         { $ per year }
                """);

        assertEquals(2.376e11, result.variables().get("e_total"), 1e3,
                "total energy [J] must match the book (2.38e8 kJ rounded)");
        assertEquals(66000.0, result.variables().get("e_kwh"), 1e-3,
                "total energy [kWh] must match the book");
        assertEquals(7920.0, result.variables().get("money"), 1e-3,
                "money saved [$] must match the book");

        // The system is fully sequential: six 1x1 blocks.
        assertEquals(6, result.blocks().size());
        // Residuals are absolute; with energies of order 1e11 J a relative
        // convergence of 1e-6 corresponds to ~1e5 absolute.
        assertTrue(result.stats().maxResidual() / 2.376e11 < 1e-6);
    }

    /**
     * Same problem checked for dimensional consistency: kW * h resolves to
     * energy, so declaring E_total in kWh must produce no unit warnings.
     */
    @Test
    void example1_1_unitsAreConsistent() {
        var warnings = solver.checkUnits(
                "E_total = W_dot * hours",
                java.util.Map.of("e_total", "kWh", "w_dot", "kW", "hours", "h"));
        assertEquals(java.util.List.of(), warnings);
    }

    /**
     * Example 1-2: Mass of oil in a tank from density and volume.
     * rho = 850 kg/m^3, V = 2 m^3. Book answer: m = rho*V = 1700 kg.
     */
    @Test
    void example1_2_oilTankMass() {
        EquationSystemSolver.Result result = solver.solve("""
                { Cengel & Boles Example 1-2 }
                rho = 850 [kg/m^3]   { oil density }
                V = 2 [m^3]          { tank volume }
                m = rho * V          { mass in the tank }
                """);

        assertEquals(1700.0, result.variables().get("m"), 1e-9,
                "oil mass [kg] must match the book");
        assertTrue(result.stats().maxResidual() < 1e-9);
    }

    /**
     * Example 1-2's central lesson ("every term in an equation must have the
     * same units"): m = rho*V resolves to kg, so declaring m in kg is
     * consistent, while declaring m in kg/m^3 must be flagged.
     */
    @Test
    void example1_2_unitsAreConsistent() {
        var consistent = solver.checkUnits("m = rho * V",
                java.util.Map.of("m", "kg", "rho", "kg/m^3", "v", "m^3"));
        assertEquals(java.util.List.of(), consistent);

        var flagged = solver.checkUnits("m = rho * V",
                java.util.Map.of("m", "kg/m^3", "rho", "kg/m^3", "v", "m^3"));
        assertEquals(1, flagged.size());
        assertTrue(flagged.get(0).contains("do not match"));
    }

    /**
     * Example 1-9: Measuring pressure with a manometer.
     * Manometer fluid SG = 0.85, column height h = 55 cm, atmospheric
     * pressure 96 kPa. P = P_atm + rho*g*h.
     * Book answers: rho = 850 kg/m^3, P = 100.6 kPa (gage pressure 4.6 kPa).
     */
    @Test
    void example1_9_manometerAbsolutePressure() {
        // SI throughout: 55 cm -> 0.55 m and 96 kPa -> 96000 Pa automatically,
        // so P = P_atm + rho*g*h needs no manual conversion factors at all.
        EquationSystemSolver.Result result = solver.solve("""
                { Cengel & Boles Example 1-9 }
                SG = 0.85                      { specific gravity of manometer fluid }
                rho_water = 1000 [kg/m^3]      { standard density of water }
                rho = SG * rho_water           { manometer fluid density }
                h = 55 [cm]                    { column height -> m }
                g = 9.81 [m/s^2]               { gravitational acceleration }
                P_atm = 96 [kPa]               { atmospheric pressure -> Pa }
                P = P_atm + rho * g * h
                P_kPa = P * Convert(Pa, kPa)
                P_gage = P - P_atm
                """);

        assertEquals(850.0, result.variables().get("rho"), 1e-9,
                "manometer fluid density [kg/m^3] must match the book");
        assertEquals(100586.175, result.variables().get("p"), 1e-6,
                "absolute pressure [Pa] must match the book (100.6 kPa rounded)");
        assertEquals(100.586175, result.variables().get("p_kpa"), 1e-6,
                "absolute pressure [kPa] must match the book");
        assertEquals(4586.175, result.variables().get("p_gage"), 1e-6,
                "gage pressure [Pa] must match the book discussion (4.6 kPa rounded)");
        assertTrue(result.stats().maxResidual() < 1e-6);
    }

    /**
     * Example 1-9's unit logic: P_atm + rho*g*h mixes kPa with Pa, which is
     * dimensionally consistent (same dimensions, different scale), while
     * adding pressure to a length must be flagged.
     */
    @Test
    void example1_9_unitsAreConsistent() {
        var consistent = solver.checkUnits("P = P_atm + rho * g * h",
                java.util.Map.of("p", "Pa", "p_atm", "Pa",
                        "rho", "kg/m^3", "g", "m/s^2", "h", "m"));
        assertEquals(java.util.List.of(), consistent);

        var flagged = solver.checkUnits("P = P_atm + h",
                java.util.Map.of("p", "Pa", "p_atm", "Pa", "h", "m"));
        assertEquals(1, flagged.size());
        assertTrue(flagged.get(0).contains("add/subtract"));
    }
}
