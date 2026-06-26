package com.frees.backend.props;

/**
 * U.S. / ISA 1976 Standard Atmosphere (Phase G) — temperature, pressure and
 * density as a function of geopotential altitude, for grounding altitude-dependent
 * inputs (aerospace, HVAC fresh-air, engine intake derating). Two layers are
 * modelled: the troposphere (0–11 km, lapse rate 6.5 K/km) and the lower
 * stratosphere (11–20 km, isothermal at 216.65 K). All SI: altitude m, T in K,
 * P in Pa, ρ in kg/m³.
 */
public final class Atmosphere {

    private Atmosphere() {}

    private static final double T0 = 288.15;          // sea-level temperature [K]
    private static final double P0 = 101325.0;        // sea-level pressure [Pa]
    private static final double LAPSE = 0.0065;       // tropospheric lapse rate [K/m]
    private static final double R_AIR = 287.058;      // specific gas constant of air [J/kg-K]
    private static final double G0 = 9.80665;         // standard gravity [m/s^2]
    private static final double H_TROPO = 11000.0;    // tropopause altitude [m]
    private static final double T_TROPO = T0 - LAPSE * H_TROPO;   // 216.65 K
    private static final double P_TROPO = P0 * Math.pow(T_TROPO / T0, G0 / (R_AIR * LAPSE));

    /** ISA temperature [K] at geopotential altitude {@code alt} [m]. */
    public static double temperature(double alt) {
        if (alt <= H_TROPO) {
            return T0 - LAPSE * alt;
        }
        return T_TROPO;   // isothermal lower stratosphere
    }

    /** ISA pressure [Pa] at geopotential altitude {@code alt} [m]. */
    public static double pressure(double alt) {
        if (alt <= H_TROPO) {
            double t = T0 - LAPSE * alt;
            return P0 * Math.pow(t / T0, G0 / (R_AIR * LAPSE));
        }
        return P_TROPO * Math.exp(-G0 * (alt - H_TROPO) / (R_AIR * T_TROPO));
    }

    /** ISA density [kg/m³] from the ideal-gas law at the layer T and P. */
    public static double density(double alt) {
        return pressure(alt) / (R_AIR * temperature(alt));
    }
}
