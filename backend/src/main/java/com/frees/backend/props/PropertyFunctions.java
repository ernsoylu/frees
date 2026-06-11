package com.frees.backend.props;

import java.util.List;
import java.util.Map;

/**
 * EES real-fluid property functions mapped onto CoolProp's PropsSI.
 * Calls arrive encoded as prop$<output>$<fluid>$<ind1>$<ind2> with the two
 * indicator value expressions as arguments (see AstBuilder), e.g.
 * Enthalpy(R134a, T=T1, x=1) -> prop$enthalpy$r134a$t$x with [T1, 1].
 */
public final class PropertyFunctions {

    public static final String PREFIX = "prop$";

    private static final String WATER = "Water";
    private static final String CO2 = "CO2";
    /** CoolProp key for mass density, also used for the v/volume indicators. */
    private static final String DMASS = "Dmass";

    /** EES output function name -> CoolProp PropsSI output key. */
    private static final Map<String, String> OUTPUTS = Map.ofEntries(
            Map.entry("enthalpy", "Hmass"),
            Map.entry("entropy", "Smass"),
            Map.entry("temperature", "T"),
            Map.entry("pressure", "P"),
            Map.entry("density", DMASS),
            Map.entry("volume", DMASS),
            Map.entry("intenergy", "Umass"),
            Map.entry("quality", "Q"),
            Map.entry("cp", "Cpmass"),
            Map.entry("specheat", "Cpmass"),
            Map.entry("cv", "Cvmass"),
            Map.entry("viscosity", "viscosity"),
            Map.entry("conductivity", "conductivity"),
            Map.entry("soundspeed", "speed_of_sound"));

    /** EES indicator letter -> CoolProp PropsSI input key. */
    private static final Map<String, String> INPUTS = Map.ofEntries(
            Map.entry("t", "T"),
            Map.entry("p", "P"),
            Map.entry("h", "Hmass"),
            Map.entry("s", "Smass"),
            Map.entry("u", "Umass"),
            Map.entry("x", "Q"),
            Map.entry("q", "Q"),
            Map.entry("v", DMASS),
            Map.entry("d", DMASS),
            Map.entry("rho", DMASS));

    /** Lowercased EES fluid spellings -> CoolProp canonical names. */
    private static final Map<String, String> FLUIDS = Map.ofEntries(
            Map.entry("water", WATER),
            Map.entry("steam", WATER),
            Map.entry("steam_iapws", WATER),
            Map.entry("air", "Air"),
            Map.entry("airh2o", "HumidAir"),
            Map.entry("r134a", "R134a"),
            Map.entry("r12", "R12"),
            Map.entry("r22", "R22"),
            Map.entry("r32", "R32"),
            Map.entry("r123", "R123"),
            Map.entry("r245fa", "R245fa"),
            Map.entry("r404a", "R404A"),
            Map.entry("r407c", "R407C"),
            Map.entry("r410a", "R410A"),
            Map.entry("r1234yf", "R1234yf"),
            Map.entry("r1234ze", "R1234ze(E)"),
            Map.entry("ammonia", "Ammonia"),
            Map.entry("r717", "Ammonia"),
            Map.entry("carbondioxide", CO2),
            Map.entry("co2", CO2),
            Map.entry("r744", CO2),
            Map.entry("nitrogen", "Nitrogen"),
            Map.entry("n2", "Nitrogen"),
            Map.entry("oxygen", "Oxygen"),
            Map.entry("o2", "Oxygen"),
            Map.entry("hydrogen", "Hydrogen"),
            Map.entry("h2", "Hydrogen"),
            Map.entry("helium", "Helium"),
            Map.entry("argon", "Argon"),
            Map.entry("methane", "Methane"),
            Map.entry("ch4", "Methane"),
            Map.entry("ethane", "Ethane"),
            Map.entry("propane", "Propane"),
            Map.entry("r290", "Propane"),
            Map.entry("isobutane", "IsoButane"),
            Map.entry("r600a", "IsoButane"),
            Map.entry("butane", "n-Butane"),
            Map.entry("r600", "n-Butane"));

    private PropertyFunctions() {}

    private record Input(String key, double value) {}

    /** Evaluates an encoded property call against the two indicator values. */
    public static double evaluate(String encoded, List<Double> values) {
        String[] parts = encoded.split("\\$");
        String output = parts[1];
        String outputKey = OUTPUTS.get(output);
        if (outputKey == null) {
            throw new IllegalStateException("Unknown property function: " + output
                    + ". Supported: " + String.join(", ", OUTPUTS.keySet().stream().sorted().toList()));
        }
        if (parts.length != 5 || values.size() != 2) {
            throw new IllegalStateException(capitalize(output)
                    + " requires a fluid and exactly two property indicators, "
                    + "e.g. " + capitalize(output) + "(R134a, T=300, x=1)");
        }
        String fluid = FLUIDS.getOrDefault(parts[2], parts[2]);
        Input first = toInput(parts[3], values.get(0), output);
        Input second = toInput(parts[4], values.get(1), output);
        double raw = CoolProp.propsSI(outputKey, first.key(), first.value(),
                second.key(), second.value(), fluid);
        // Volume is reported as specific volume = 1/density.
        return "volume".equals(output) ? 1.0 / raw : raw;
    }

    private static Input toInput(String indicator, double value, String output) {
        String key = INPUTS.get(indicator);
        if (key == null) {
            throw new IllegalStateException("Unknown property indicator '" + indicator
                    + "' in " + capitalize(output) + "(...). Supported: "
                    + String.join(", ", INPUTS.keySet().stream().sorted().toList()));
        }
        // The v indicator is specific volume; CoolProp expects density.
        if ("v".equals(indicator)) {
            if (value == 0.0) {
                throw new IllegalStateException(
                        "Specific volume must be nonzero in " + capitalize(output) + "(...)");
            }
            return new Input(key, 1.0 / value);
        }
        return new Input(key, value);
    }

    private static String capitalize(String s) {
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }
}
