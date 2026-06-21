package com.frees.backend.props;

import java.util.List;
import java.util.Map;

/**
 * Bulk physical properties of common engineering solids, returned by the
 * EES-style material functions {@code k_}, {@code rho_}, {@code c_}, {@code E_},
 * and {@code nu_}. Values are representative room-temperature figures from
 * standard references (Incropera, Cengel); they are treated as constants — the
 * temperature-dependence of solid properties is not modelled here.
 *
 * <p>Surface-finish-dependent quantities (emissivity) and liquid-only
 * quantities (viscosity, vapour pressure) are deliberately not provided, since a
 * single material-level value would be misleading.
 */
public final class SolidProperties {

    private SolidProperties() {
    }

    /** k [W/m-K], rho [kg/m^3], c [J/kg-K], E [Pa], nu [-]; null where not provided. */
    private record Material(Double k, Double rho, Double c, Double e, Double nu) {
    }

    private static final Map<String, Material> DB = Map.ofEntries(
            Map.entry("aluminum", new Material(237.0, 2702.0, 903.0, 70e9, 0.33)),
            Map.entry("aluminium", new Material(237.0, 2702.0, 903.0, 70e9, 0.33)),
            Map.entry("copper", new Material(401.0, 8933.0, 385.0, 110e9, 0.34)),
            Map.entry("steel", new Material(60.5, 7854.0, 434.0, 200e9, 0.29)),
            Map.entry("carbonsteel", new Material(60.5, 7854.0, 434.0, 200e9, 0.29)),
            Map.entry("stainlesssteel", new Material(15.1, 7900.0, 477.0, 193e9, 0.30)),
            Map.entry("iron", new Material(80.2, 7870.0, 447.0, 211e9, 0.29)),
            Map.entry("brass", new Material(110.0, 8530.0, 380.0, 100e9, 0.34)),
            Map.entry("bronze", new Material(54.0, 8800.0, 380.0, 110e9, 0.34)),
            Map.entry("gold", new Material(317.0, 19300.0, 129.0, 78e9, 0.44)),
            Map.entry("silver", new Material(429.0, 10500.0, 235.0, 83e9, 0.37)),
            Map.entry("lead", new Material(35.3, 11340.0, 129.0, 16e9, 0.44)),
            Map.entry("nickel", new Material(90.7, 8900.0, 444.0, 200e9, 0.31)),
            Map.entry("titanium", new Material(21.9, 4500.0, 522.0, 116e9, 0.32)),
            Map.entry("tungsten", new Material(174.0, 19300.0, 132.0, 411e9, 0.28)),
            Map.entry("zinc", new Material(116.0, 7140.0, 389.0, 108e9, 0.25)),
            Map.entry("magnesium", new Material(156.0, 1740.0, 1024.0, 45e9, 0.29)),
            Map.entry("concrete", new Material(1.4, 2300.0, 880.0, 30e9, 0.20)),
            Map.entry("glass", new Material(1.4, 2500.0, 750.0, 70e9, 0.22)),
            Map.entry("brick", new Material(0.72, 1920.0, 835.0, null, null)),
            Map.entry("wood", new Material(0.17, 700.0, 2310.0, 11e9, null)),
            Map.entry("oak", new Material(0.17, 700.0, 2310.0, 11e9, null)),
            Map.entry("ice", new Material(2.22, 920.0, 2040.0, 9e9, 0.33)));

    /** Linear temperature slopes about the 300 K reference: dk/dT [W/m-K^2], dc/dT [J/kg-K^2]. */
    private record TempSlope(double dkdT, double dcdT) {
    }

    private static final double T_REF = 300.0;

    // Fits to standard tabulated data (Incropera) over roughly 250-600 K. Only
    // the well-characterised metals carry a slope; everything else is constant.
    private static final Map<String, TempSlope> SLOPES = Map.ofEntries(
            Map.entry("aluminum", new TempSlope(-0.02, 0.46)),
            Map.entry("aluminium", new TempSlope(-0.02, 0.46)),
            Map.entry("copper", new TempSlope(-0.073, 0.107)),
            Map.entry("steel", new TempSlope(-0.04, 0.42)),
            Map.entry("carbonsteel", new TempSlope(-0.04, 0.42)),
            Map.entry("iron", new TempSlope(-0.085, 0.42)),
            Map.entry("nickel", new TempSlope(-0.10, 0.40)),
            Map.entry("titanium", new TempSlope(-0.015, 0.29)),
            Map.entry("tungsten", new TempSlope(-0.15, 0.05)));

    public static double lookup(String material, String property) {
        return lookup(material, property, null);
    }

    /**
     * Property of a solid material, optionally at temperature {@code tempK} (in
     * kelvin). Thermal conductivity and specific heat receive a linear
     * temperature correction about 300 K where reliable slope data exists; the
     * other properties are treated as constants.
     */
    public static double lookup(String material, String property, Double tempK) {
        Material m = DB.get(material.toLowerCase());
        if (m == null) {
            throw new PropertyEvaluationException("Unknown material '" + material
                    + "'. Known materials: " + String.join(", ", DB.keySet().stream().sorted().toList()));
        }
        Double value = switch (property) {
            case "k_" -> m.k();
            case "rho_" -> m.rho();
            case "c_" -> m.c();
            case "e_" -> m.e();
            case "nu_" -> m.nu();
            default -> null;
        };
        if (value == null) {
            throw new PropertyEvaluationException(propertyLabel(property)
                    + " is not available for material '" + material + "'.");
        }
        return applyTemperature(value, property, material, tempK);
    }

    private static double applyTemperature(double value, String property, String material, Double tempK) {
        if (tempK == null || !(property.equals("k_") || property.equals("c_"))) {
            return value;
        }
        TempSlope slope = SLOPES.get(material.toLowerCase());
        if (slope == null) {
            return value;
        }
        double dvdt = property.equals("k_") ? slope.dkdT() : slope.dcdT();
        return value + dvdt * (tempK - T_REF);
    }

    private static String propertyLabel(String property) {
        return switch (property) {
            case "k_" -> "Thermal conductivity";
            case "rho_" -> "Density";
            case "c_" -> "Specific heat";
            case "e_" -> "Young's modulus";
            case "nu_" -> "Poisson's ratio";
            default -> property;
        };
    }

    /** The material function names this class serves (lower-cased, with the trailing underscore). */
    public static List<String> functionNames() {
        return List.of("k_", "rho_", "c_", "e_", "nu_");
    }
}
