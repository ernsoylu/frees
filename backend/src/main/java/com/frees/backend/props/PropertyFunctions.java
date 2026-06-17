package com.frees.backend.props;

import java.util.List;
import java.util.Map;

/**
 * Real-fluid property functions mapped onto CoolProp's PropsSI.
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
    private static final String VOLUME = "volume";

    /** Output function name -> CoolProp PropsSI output key. */
    private static final Map<String, String> OUTPUTS = Map.ofEntries(
            Map.entry("enthalpy", "Hmass"),
            Map.entry("entropy", "Smass"),
            Map.entry("temperature", "T"),
            Map.entry("pressure", "P"),
            Map.entry("density", DMASS),
            Map.entry(VOLUME, DMASS),
            Map.entry("intenergy", "Umass"),
            Map.entry("quality", "Q"),
            Map.entry("cp", "Cpmass"),
            Map.entry("specheat", "Cpmass"),
            Map.entry("cv", "Cvmass"),
            Map.entry("viscosity", "viscosity"),
            Map.entry("conductivity", "conductivity"),
            Map.entry("soundspeed", "speed_of_sound"));

    /** Indicator letter -> CoolProp PropsSI input key. */
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

    /** Lowercased accepted fluid spellings -> CoolProp canonical names. */
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
            // Spelled formulas (CO2, N2, CH4, ...) are ideal gases with
            // formation-reference enthalpy (see IdealGas); only full names
            // select the CoolProp real fluids.
            Map.entry("carbondioxide", CO2),
            Map.entry("r744", CO2),
            Map.entry("nitrogen", "Nitrogen"),
            Map.entry("oxygen", "Oxygen"),
            Map.entry("hydrogen", "Hydrogen"),
            Map.entry("helium", "Helium"),
            Map.entry("argon", "Argon"),
            Map.entry("methane", "Methane"),
            Map.entry("ethane", "Ethane"),
            Map.entry("propane", "Propane"),
            Map.entry("r290", "Propane"),
            Map.entry("isobutane", "IsoButane"),
            Map.entry("r600a", "IsoButane"),
            Map.entry("butane", "n-Butane"),
            Map.entry("r600", "n-Butane"));

    /** Humid-air output function name -> HAPropsSI output key. */
    private static final Map<String, String> HA_OUTPUTS = Map.ofEntries(
            Map.entry("enthalpy", "H"),
            Map.entry("entropy", "S"),
            Map.entry("temperature", "T"),
            Map.entry(VOLUME, "V"),
            Map.entry("humrat", "W"),
            Map.entry("relhum", "R"),
            Map.entry("wetbulb", "B"),
            Map.entry("dewpoint", "D"),
            Map.entry("cp", "C"),
            Map.entry("specheat", "C"));

    /** Humid-air indicator -> HAPropsSI input key. */
    private static final Map<String, String> HA_INPUTS = Map.ofEntries(
            Map.entry("t", "T"),
            Map.entry("p", "P"),
            Map.entry("h", "H"),
            Map.entry("s", "S"),
            Map.entry("v", "V"),
            Map.entry("w", "W"),
            Map.entry("r", "R"),
            Map.entry("rh", "R"),
            Map.entry("b", "B"),
            Map.entry("twb", "B"),
            Map.entry("d", "D"),
            Map.entry("tdp", "D"));

    /**
     * Aqueous glycol coolants, written as a base name plus the glycol mass
     * percentage, e.g. EG50 (50 % ethylene glycol / 50 % water) or PG30.
     * Accepted bases: ethylene glycol = EG / MEG / EthyleneGlycol; propylene
     * glycol = PG / MPG / PropyleneGlycol. An optional underscore is allowed
     * (EG_50). Resolved to CoolProp's incompressible mixtures
     * INCOMP::MEG[frac] / INCOMP::MPG[frac]. These are single-phase liquids:
     * use T and P as the two state indicators (quality does not apply).
     */
    private static final java.util.regex.Pattern GLYCOL_MIX =
            java.util.regex.Pattern.compile(
                    "(eg|meg|ethyleneglycol|pg|mpg|propyleneglycol)_?(\\d{1,3})");

    private PropertyFunctions() {}

    /**
     * Maps a written fluid token to a CoolProp fluid name: a known alias from
     * {@link #FLUIDS}, an aqueous glycol mixture (EG50, PG30, ...), or the
     * token unchanged so CoolProp can report an unknown fluid itself.
     */
    /** Whether the (lowercased) token names a CoolProp fluid alias or glycol mix. */
    public static boolean isKnownFluid(String token) {
        return FLUIDS.containsKey(token) || GLYCOL_MIX.matcher(token).matches();
    }

    static String resolveFluid(String token) {
        String alias = FLUIDS.get(token);
        if (alias != null) {
            return alias;
        }
        java.util.regex.Matcher m = GLYCOL_MIX.matcher(token);
        if (m.matches()) {
            String base = m.group(1);
            int percent = Integer.parseInt(m.group(2));
            if (percent <= 0 || percent >= 100) {
                throw new IllegalStateException(
                        "Glycol mixture concentration must be between 1 and 99 mass-%, "
                                + "got " + percent + "%. Example: EG50 for a 50 % "
                                + "ethylene-glycol / 50 % water coolant.");
            }
            String coolpropBase = (base.startsWith("p") || base.startsWith("mp")) ? "MPG" : "MEG";
            String fraction = java.math.BigDecimal.valueOf(percent).movePointLeft(2).toPlainString();
            return "INCOMP::" + coolpropBase + "[" + fraction + "]";
        }
        return token;
    }

    /** Canonical CoolProp fluid names available for property diagrams. */
    public static List<String> plotFluids() {
        return FLUIDS.values().stream()
                .distinct()
                .filter(f -> !"HumidAir".equals(f))
                .sorted()
                .toList();
    }

    private record Input(String key, double value) {}

    /** Evaluates an encoded property call against the indicator values. */
    public static double evaluate(String encoded, List<Double> values) {
        return evaluate(encoded, values, List.of());
    }

    /**
     * Evaluates an encoded property call. Real-fluid calls use {@code values}
     * (the two state indicators); chemistry calls (MolarMass/HeatingValue/
     * StoichAFR) use {@code tokens} (fluid/formula/mode strings, case-preserved).
     */
    public static double evaluate(String encoded, List<Double> values, List<String> tokens) {
        String[] parts = encoded.split("\\$");
        String output = parts[1];
        switch (output) {
            case "molarmass":
                return Combustion.molarMass(tokens.get(0));
            case "heatingvalue":
                return Combustion.heatingValue(tokens.get(0), tokens.size() > 1 ? tokens.get(1) : "lhv");
            case "stoichafr":
                return Combustion.stoichAFR(tokens.get(0));
            default:
                break;
        }
        if ("airh2o".equals(parts[2]) || "humidair".equals(parts[2])) {
            return evaluateHumidAir(output, parts, values);
        }
        if (IdealGas.isIdealGas(parts[2])) {
            return IdealGas.evaluate(output, parts, values);
        }
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
        String fluid = resolveFluid(parts[2]);
        Input first = toInput(parts[3], values.get(0), output);
        Input second = toInput(parts[4], values.get(1), output);
        double raw = CoolProp.propsSI(outputKey, first.key(), first.value(),
                second.key(), second.value(), fluid);
        // Volume is reported as specific volume = 1/density.
        return VOLUME.equals(output) ? 1.0 / raw : raw;
    }

    /** AirH2O calls map to HAPropsSI and need three indicators (e.g. T, P, R). */
    private static double evaluateHumidAir(String output, String[] parts, List<Double> values) {
        String outputKey = HA_OUTPUTS.get(output);
        if (outputKey == null) {
            throw new IllegalStateException("Unknown humid-air function: " + output
                    + ". Supported: " + String.join(", ", HA_OUTPUTS.keySet().stream().sorted().toList()));
        }
        if (parts.length != 6 || values.size() != 3) {
            throw new IllegalStateException(capitalize(output)
                    + "(AirH2O, ...) requires exactly three property indicators, "
                    + "e.g. " + capitalize(output) + "(AirH2O, T=300, P=101325, R=0.5)");
        }
        String[] keys = new String[3];
        for (int i = 0; i < 3; i++) {
            keys[i] = HA_INPUTS.get(parts[i + 3]);
            if (keys[i] == null) {
                throw new IllegalStateException("Unknown humid-air indicator '" + parts[i + 3]
                        + "' in " + capitalize(output) + "(AirH2O, ...). Supported: "
                        + String.join(", ", HA_INPUTS.keySet().stream().sorted().toList()));
            }
        }
        return CoolProp.haPropsSI(outputKey, keys[0], values.get(0),
                keys[1], values.get(1), keys[2], values.get(2));
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

    /**
     * Scans the equations text (case-insensitively) to find any mention of a known fluid.
     * Returns the canonical CoolProp fluid name if found, or "Water" as a fallback.
     */
    public static String detectFluid(String text) {
        if (text == null || text.isBlank()) {
            return WATER;
        }
        String lower = text.toLowerCase();

        // Sort keys by length descending to match longer names first (e.g. "airh2o" before "air")
        java.util.List<String> sortedKeys = new java.util.ArrayList<>(FLUIDS.keySet());
        sortedKeys.sort((a, b) -> Integer.compare(b.length(), a.length()));

        for (String key : sortedKeys) {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\b" + java.util.regex.Pattern.quote(key) + "\\b");
            if (pattern.matcher(lower).find()) {
                return FLUIDS.get(key);
            }
        }
        return WATER;
    }
}

