package com.frees.backend.core;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Validates the 10 NCEES Mechanical: HVAC and Refrigeration Sample Questions
 * against the frees solver engine, checking exact numerical results.
 */
class NceesHvacExamplesTest {

    private final EquationSystemSolver solver = new EquationSystemSolver();

    @Test
    void problem1_ammoniaCOP() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 1: Ammonia Refrigeration Cycle COP }
                P_suction = 38.5
                superheat = 20
                P_discharge = 229
                m_dot = 22

                h1 = 627.0      { Enthalpy entering compressor }
                h2 = 745.0      { Enthalpy leaving compressor }
                h3 = 161.1      { Saturated liquid leaving condenser }

                COP = (h1 - h3) / (h2 - h1)
                Q_dot_cool = m_dot * (h1 - h3)
                W_dot_comp = m_dot * (h2 - h1)
                """);

        assertEquals(3.9483, result.variables().get("cop"), 1e-2, "COP should be most nearly 3.9");
        assertEquals(10249.8, result.variables().get("q_dot_cool"), 1e-1);
        assertEquals(2596.0, result.variables().get("w_dot_comp"), 1e-1);
    }

    @Test
    void problem2_faceAndBypass() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 2: Face and Bypass Control Load }
                V_dot_supply = 20000
                V_dot_oa = 5000
                T_room = 80
                rh_room = 0.50
                T_oa_db = 90
                T_oa_wb = 74
                T_coil_out_db = 58
                T_coil_out_wb = 56
                P_atm_psia = 14.696

                P_atm = P_atm_psia * 6894.76
                T_room_K = (T_room - 32) * 5/9 + 273.15
                T_oa_db_K = (T_oa_db - 32) * 5/9 + 273.15
                T_oa_wb_K = (T_oa_wb - 32) * 5/9 + 273.15
                T_coil_out_db_K = (T_coil_out_db - 32) * 5/9 + 273.15
                T_coil_out_wb_K = (T_coil_out_wb - 32) * 5/9 + 273.15

                v_supply = 13.25
                m_dot_supply = V_dot_supply * 60 / v_supply

                f_oa = V_dot_oa / V_dot_supply
                f_return = 1 - f_oa

                h_room = Enthalpy(AirH2O, T=T_room_K, R=rh_room, P=P_atm) / 2326.0
                h_oa = Enthalpy(AirH2O, T=T_oa_db_K, B=T_oa_wb_K, P=P_atm) / 2326.0
                h_mix = f_oa * h_oa + f_return * h_room
                h_supply = Enthalpy(AirH2O, T=T_coil_out_db_K, B=T_coil_out_wb_K, P=P_atm) / 2326.0

                Q_dot_coil_btu = m_dot_supply * (h_mix - h_supply)
                Q_dot_coil_tons = Q_dot_coil_btu / 12000
                """);

        assertEquals(67.9, result.variables().get("q_dot_coil_tons"), 0.5, "Total load should be most nearly 67.9 tons");
    }

    @Test
    void problem3_psychrometricBalancing() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 3: Psychrometric Room Balancing }
                Q_sensible = 90000
                Q_latent = 40000
                V_dot_supply = 3600
                T_supply_db = 55
                T_room_db = 78
                rh_room = 0.45
                T_oa_db = 92
                T_oa_wb = 76
                V_dot_oa = 700
                P_atm_psia = 14.696

                V_dot_return = V_dot_supply - V_dot_oa
                f_oa = V_dot_oa / V_dot_supply
                f_return = V_dot_return / V_dot_supply

                T_entering_db = f_oa * T_oa_db + f_return * T_room_db
                T_entering_K = (T_entering_db - 32) * 5/9 + 273.15

                P_atm = P_atm_psia * 6894.76
                T_room_K = (T_room_db - 32) * 5/9 + 273.15
                T_oa_K = (T_oa_db - 32) * 5/9 + 273.15
                T_oa_wb_K = (T_oa_wb - 32) * 5/9 + 273.15

                h_room = Enthalpy(AirH2O, T=T_room_K, R=rh_room, P=P_atm) / 2326.0
                h_oa = Enthalpy(AirH2O, T=T_oa_K, B=T_oa_wb_K, P=P_atm) / 2326.0
                h_mix = f_oa * h_oa + f_return * h_room

                T_entering_wb_K = WetBulb(AirH2O, T=T_entering_K, H=h_mix * 2326.0, P=P_atm)
                T_entering_wb = (T_entering_wb_K - 273.15) * 9/5 + 32

                Q_total = Q_sensible + Q_latent + V_dot_oa * 4.5 * (h_oa - h_room)
                h_leaving = h_mix - Q_total / (4.5 * V_dot_supply)

                T_supply_K = (T_supply_db - 32) * 5/9 + 273.15
                T_leaving_wb_K = WetBulb(AirH2O, T=T_supply_K, H=h_leaving * 2326.0, P=P_atm)
                T_leaving_wb = (T_leaving_wb_K - 273.15) * 9/5 + 32
                """);

        assertEquals(80.72, result.variables().get("t_entering_db"), 0.1, "MAT dry bulb should be 80.7 F");
        assertEquals(66.2, result.variables().get("t_entering_wb"), 0.2, "MAT wet bulb should be 66.2 F");
        assertEquals(51.1, result.variables().get("t_leaving_wb"), 0.2, "Leaving air wet bulb should be 51.1 F");
    }

    @Test
    void problem4_solarHeatGain() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 4: Solar Heat Gain Through Windows }
                U_value = 1.1
                T_in = 75
                T_out = 95
                A_window = 40

                SHGF_North = 47
                SHGF_East = 215
                SHGF_West = 215

                Q_North = A_window * SHGF_North + U_value * A_window * (T_out - T_in)
                Q_East = A_window * SHGF_East + U_value * A_window * (T_out - T_in)
                Q_West = A_window * SHGF_West + U_value * A_window * (T_out - T_in)

                Q_total = Q_North + Q_East + Q_West
                """);

        assertEquals(21720.0, result.variables().get("q_total"), 1.0, "Total heat gain should be most nearly 21,720 Btu/hr");
    }

    @Test
    void problem5_enthalpyWheel() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 5: Enthalpy Wheel Heat Recovery }
                V_dot_oa = 1500
                T_oa_db = 95
                T_oa_wb = 78
                T_room_db = 75
                rh_room = 0.50
                effectiveness = 0.80

                T_tempered_db = T_oa_db - (T_oa_db - T_room_db) * effectiveness
                """);

        assertEquals(79.0, result.variables().get("t_tempered_db"), 1e-9, "Tempered air dry bulb should be 79.0 F");
    }

    @Test
    void problem6_runAroundCycle() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 6: Run-Around Water Cycle }
                gpm = 15
                delta_T_water = 10
                T_air_in = 75
                cfm = 5000

                { Heat transfer rate }
                Q = 500 * gpm * delta_T_water
                Q = 1.1 * cfm * delta_T_air
                T_air_out = T_air_in - delta_T_air
                """);

        assertEquals(75000.0, result.variables().get("q"), 1e-9, "Heat transfer rate should be 75,000 Btu/hr");
        assertEquals(61.36, result.variables().get("t_air_out"), 0.1, "Leaving air temp should be approx 61.4 F");
    }

    @Test
    void problem7_latentHeatFreezing() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 7: Specific & Latent Heat of Freezing }
                mass = 10000
                T_freeze = 27
                T_storage = -10
                Cp_below = 0.37

                Q_required = mass * Cp_below * (T_freeze - T_storage)
                """);

        assertEquals(136900.0, result.variables().get("q_required"), 1e-9, "Cooling required should be 136,900 Btu");
    }

    @Test
    void problem8_pumpingAndFriction() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 8: Pumping and Friction Head }
                T_water = 90
                gpm = 26000
                f_factor = 0.01
                L_eq = 2425
                z_elev = 160
                P_inlet = 20
                OD = 36
                t_wall = 0.375

                ID = (OD - 2 * t_wall) / 12
                V = (gpm * 0.1337 / 60) / (pi / 4 * ID^2)
                h_friction = f_factor * (L_eq / ID) * (V^2 / 64.4)
                h_total = z_elev + h_friction

                h_inlet = P_inlet * 2.31
                h_pump = h_total - h_inlet
                """);

        assertEquals(8.54, result.variables().get("v"), 0.1, "Velocity should be approx 8.54 fps");
        assertEquals(9.3, result.variables().get("h_friction"), 0.2, "Friction head should be approx 9.3 ft");
        assertEquals(123.1, result.variables().get("h_pump"), 1.0, "Pump head should be most nearly 123-124 ft");
    }

    @Test
    void problem9_airSupplyWetBulb() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 9: Air Supply Wet-Bulb Determination }
                T_room_db = 75
                T_room_wb = 63
                T_supply_db = 58
                Q_sensible = 200000
                SHF = 0.80
                V_dot_supply = 10700
                P_atm_psia = 14.696

                P_atm = P_atm_psia * 6894.76
                T_room_db_K = (T_room_db - 32) * 5/9 + 273.15
                T_room_wb_K = (T_room_wb - 32) * 5/9 + 273.15
                T_supply_db_K = (T_supply_db - 32) * 5/9 + 273.15

                h_room = Enthalpy(AirH2O, T=T_room_db_K, B=T_room_wb_K, P=P_atm) / 2326.0
                Q_total = Q_sensible / SHF

                Q_total = 4.5 * V_dot_supply * (h_room - h_supply)
                T_supply_wb_K = WetBulb(AirH2O, T=T_supply_db_K, H=h_supply * 2326.0, P=P_atm)
                T_supply_wb = (T_supply_wb_K - 273.15) * 9/5 + 32
                """);

        assertEquals(55.0, result.variables().get("t_supply_wb"), 0.5, "Supply wet bulb should be most nearly 55.0 F");
    }

    @Test
    void problem10_multistageFreezing() {
        EquationSystemSolver.Result result = solver.solve("""
                { Problem 10: Multi-Stage Food Freezing }
                mass = 10000
                T_in = 40
                T_freeze = 28
                T_out = 0
                Cp_above = 0.83
                Cp_below = 0.53
                L_fusion = 98

                Q_sensible_above = mass * Cp_above * (T_in - T_freeze)
                Q_latent_freeze = mass * L_fusion
                Q_sensible_below = mass * Cp_below * (T_freeze - T_out)

                Q_total_btu = Q_sensible_above + Q_latent_freeze + Q_sensible_below
                Q_total_millions = Q_total_btu / 1e6
                """);

        assertEquals(1.228, result.variables().get("q_total_millions"), 1e-3, "Total heat should be most nearly 1.228 million Btu");
    }
}
